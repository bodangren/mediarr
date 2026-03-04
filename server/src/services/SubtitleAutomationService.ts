import type { WantedSubtitleState } from '@prisma/client';
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
  ) {}

  async syncAllVariants(): Promise<number> {
    const variants = await this.repository.listMonitoredVariants();
    const wantedLanguages = await this.resolveWantedLanguages();

    for (const variant of variants) {
      await this.syncVariantState(variant.id, wantedLanguages);
    }

    return variants.length;
  }

  async processWantedQueue(limit = 100): Promise<{ downloaded: number; failed: number; queued: number }> {
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
    };
  }

  async runAutomationCycle(limit = 100): Promise<SubtitleAutomationStats> {
    const variantsScanned = await this.syncAllVariants();
    const queue = await this.processWantedQueue(limit);

    return {
      variantsScanned,
      wantedQueued: queue.queued,
      downloaded: queue.downloaded,
      failed: queue.failed,
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
    const wantedLanguages = await this.resolveWantedLanguages();

    let downloaded = 0;
    let failed = 0;
    let queued = 0;

    for (const variantId of variantIds) {
      await this.syncVariantState(variantId, wantedLanguages);
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
