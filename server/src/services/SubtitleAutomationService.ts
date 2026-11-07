import type { WantedSubtitleState } from '../db/schema';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';
import { SettingsService } from './SettingsService';
import {
  VariantMissingSubtitleService,
} from './VariantMissingSubtitleService';
import { VariantWantedService } from './VariantWantedService';
import { VariantSubtitleFetchService, type SubtitleFetchProvider } from './VariantSubtitleFetchService';
import type { LanguageProfileItem } from './SubtitleRequirementEngine';

const FETCHABLE_STATES: WantedSubtitleState[] = ['PENDING', 'FAILED'];

export interface SubtitleAutomationStats {
  variantsScanned: number;
  wantedQueued: number;
  downloaded: number;
  failed: number;
  /**
   * Wanted rows deliberately not attempted this cycle. With no subtitle
   * provider configured the queue used to fail every row on every run: 1,900
   * failed downloads and 9,069 failed searches in 24 h on 2026-11-08, all of
   * which were "No subtitle found" against zero providers.
   */
  skippedNoProvider: number;
  /**
   * Variants that could not be processed because their inventory row is gone
   * (deleted file, cleaned-up variant). One stale id must not abort the whole
   * cycle: on 2026-11-07 a single orphaned variant failed the entire
   * `subtitle-wanted-search` task with "Variant 5260 not found".
   */
  variantsSkipped: number;
}

/**
 * Orchestrates wanted subtitle sync and automated subtitle fetch loops.
 */
export class SubtitleAutomationService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly settingsService: SettingsService,
    private readonly missingService: VariantMissingSubtitleService,
    private readonly wantedService: VariantWantedService,
    private readonly fetchService: VariantSubtitleFetchService,
    private readonly fetchProvider: SubtitleFetchProvider,
    /** Number of configured subtitle search providers; omit when unknown. */
    private readonly providersAvailable?: () => number,
  ) {}

  async syncAllVariants(): Promise<number> {
    const variants = await this.repository.listMonitoredVariants();
    const wantedLanguages = await this.resolveWantedLanguages();

    for (const variant of variants) {
      await this.syncVariantState(variant.id, wantedLanguages);
    }

    return variants.length;
  }

  /**
   * Whether at least one subtitle search provider is registered.
   *
   * The provider factory resolves nothing until a provider is configured, so
   * an unconfigured install cannot ever satisfy a wanted row. Detecting that
   * up front keeps the automation from burning the queue (and the indexers)
   * every cycle.
   */
  private async hasUsableProvider(): Promise<boolean> {
    if (typeof this.fetchProvider.hasUsableProvider === 'function') {
      return this.fetchProvider.hasUsableProvider();
    }
    // Hosts that inject a custom provider do not report configuration; assume
    // it works and keep the normal path.
    return this.providersAvailable ? this.providersAvailable() > 0 : true;
  }

  async processWantedQueue(limit = 100): Promise<{ downloaded: number; failed: number; queued: number; skippedNoProvider: number }> {
    if (!await this.hasUsableProvider()) {
      return { downloaded: 0, failed: 0, queued: 0, skippedNoProvider: 1 };
    }

    const wanted = await this.repository.listWantedSubtitlesByStates(FETCHABLE_STATES, limit);

    let downloaded = 0;
    let failed = 0;

    for (const item of wanted) {
      try {
        const result = await this.fetchService.fetchWantedSubtitle(item.id, this.fetchProvider);
        if (result) {
          downloaded += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        await this.repository.updateWantedSubtitleState(item.id, 'FAILED');
        console.warn(
          `[SubtitleAutomationService] Failed to fetch wanted subtitle ${item.id}:`,
          error,
        );
      }
    }

    return {
      downloaded,
      failed,
      queued: wanted.length,
      skippedNoProvider: 0,
    };
  }

  async runTargetedAutomationCycle(options: { recentDays?: number; limit?: number } = {}): Promise<SubtitleAutomationStats> {
    // The scheduled task enters here, not runAutomationCycle. With no usable
    // provider this path still re-synced every recently-added variant (about
    // 9.5 s of per-variant queries per run on this library) for nothing.
    if (!await this.hasUsableProvider()) {
      return {
        variantsScanned: 0,
        wantedQueued: 0,
        downloaded: 0,
        failed: 0,
        variantsSkipped: 0,
        skippedNoProvider: 1,
      };
    }

    const recentDays = options.recentDays ?? 7;
    const limit = options.limit ?? 100;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - recentDays);

    // Get variants for recently-added movies/episodes
    const recentVariants = await this.repository.listRecentlyAddedVariants(cutoff);

    // Get variants that have FAILED wanted subtitles (eligible for retry)
    const failedVariants = await this.repository.listVariantsWithFailedWanted();

    // Merge and deduplicate variant IDs
    const variantIds = [...new Set([
      ...recentVariants.map((v: { id: number }) => v.id),
      ...failedVariants.map((v: { id: number }) => v.id),
    ])];

    const wantedLanguages = await this.resolveWantedLanguages();
    let variantsSkipped = 0;
    for (const variantId of variantIds) {
      try {
        await this.syncVariantState(variantId, wantedLanguages);
      } catch (error) {
        // A stale variant id (its inventory row was removed) is not a reason to
        // fail the scheduled task; count it and keep going.
        variantsSkipped += 1;
        console.warn(
          `Subtitle automation skipped variant ${variantId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const queue = await this.processWantedQueue(limit);

    return {
      variantsScanned: variantIds.length,
      wantedQueued: queue.queued,
      downloaded: queue.downloaded,
      failed: queue.failed,
      variantsSkipped,
      skippedNoProvider: queue.skippedNoProvider,
    };
  }

  async runAutomationCycle(limit = 100): Promise<SubtitleAutomationStats> {
    // With nothing configured the whole cycle (variant scan included) is pure
    // waste: it took ~10 s per run on this library and could not download
    // anything. Idle the cycle completely instead.
    if (!await this.hasUsableProvider()) {
      return {
        variantsScanned: 0,
        wantedQueued: 0,
        downloaded: 0,
        failed: 0,
        variantsSkipped: 0,
        skippedNoProvider: 1,
      };
    }

    const variantsScanned = await this.syncAllVariants();
    const queue = await this.processWantedQueue(limit);

    return {
      variantsScanned,
      wantedQueued: queue.queued,
      downloaded: queue.downloaded,
      failed: queue.failed,
      variantsSkipped: 0,
      skippedNoProvider: queue.skippedNoProvider,
    };
  }

  async onMovieImported(movieId: number): Promise<SubtitleAutomationStats> {
    const variants = await this.repository.listMovieVariants(movieId);
    return this.runForVariants(variants.map(variant => variant.id));
  }

  async onEpisodeImported(episodeId: number): Promise<SubtitleAutomationStats> {
    const variants = await this.repository.listEpisodeVariants(episodeId);
    return this.runForVariants(variants.map(variant => variant.id));
  }

  private async runForVariants(variantIds: number[]): Promise<SubtitleAutomationStats> {
    if (!await this.hasUsableProvider()) {
      return {
        variantsScanned: 0,
        wantedQueued: 0,
        downloaded: 0,
        failed: 0,
        variantsSkipped: 0,
        skippedNoProvider: 1,
      };
    }

    const wantedLanguages = await this.resolveWantedLanguages();

    let downloaded = 0;
    let failed = 0;
    let queued = 0;
    let variantsSkipped = 0;

    for (const variantId of variantIds) {
      try {
        await this.syncVariantState(variantId, wantedLanguages);
      } catch (error) {
        variantsSkipped += 1;
        console.warn(
          `Subtitle automation skipped variant ${variantId}:`,
          error instanceof Error ? error.message : error,
        );
        continue;
      }
      const wanted = await this.repository.listWantedSubtitlesByVariant(variantId);
      const fetchable = wanted.filter(item => FETCHABLE_STATES.includes(item.state));
      queued += fetchable.length;

      for (const item of fetchable) {
        try {
          const result = await this.fetchService.fetchWantedSubtitle(item.id, this.fetchProvider);
          if (result) {
            downloaded += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
          await this.repository.updateWantedSubtitleState(item.id, 'FAILED');
        }
      }
    }

    return {
      variantsScanned: variantIds.length,
      wantedQueued: queued,
      downloaded,
      failed,
      variantsSkipped,
      skippedNoProvider: 0,
    };
  }

  private async syncVariantState(
    variantId: number,
    wantedLanguages: string[],
  ): Promise<void> {
    const profileItems = this.toLanguageProfileItems(wantedLanguages);

    await this.missingService.computeAndPersistForVariant(
      variantId,
      profileItems,
      null,
    );

    await this.wantedService.syncWantedForVariant(variantId);
  }

  private async resolveWantedLanguages(): Promise<string[]> {
    const settings = await this.settingsService.get();
    const normalized = (settings.wantedLanguages ?? [])
      .map(code => code.trim().toLowerCase())
      .filter(code => code.length > 0);
    return Array.from(new Set(normalized));
  }

  private toLanguageProfileItems(wantedLanguages: string[]): LanguageProfileItem[] {
    return wantedLanguages.map((language, index) => ({
      id: index + 1,
      language,
      forced: 'False',
      hi: 'False',
      audio_exclude: 'False',
      audio_only_include: 'False',
    }));
  }
}
