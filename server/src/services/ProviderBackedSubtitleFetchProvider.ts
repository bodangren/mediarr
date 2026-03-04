import type { ManualSearchCandidate } from './SubtitleInventoryApiService';
import { SubtitleProviderFactory } from './SubtitleProviderFactory';
import { SubtitleScoringService } from './SubtitleScoringService';
import type { FetchProviderContext, SubtitleFetchCandidate, SubtitleFetchProvider } from './VariantSubtitleFetchService';

/**
 * Resolves best wanted subtitle candidates from registered manual providers.
 */
export class ProviderBackedSubtitleFetchProvider implements SubtitleFetchProvider {
  constructor(
    private readonly providerFactory: SubtitleProviderFactory,
    private readonly scoringService: SubtitleScoringService = new SubtitleScoringService(),
  ) {}

  async searchBestSubtitle(context: FetchProviderContext): Promise<SubtitleFetchCandidate | null> {
    const providerEntries = this.providerFactory.resolveAllManualProviders();
    const collected: ManualSearchCandidate[] = [];

    for (const entry of providerEntries) {
      try {
        const candidates = await entry.provider.search({
          variant: context.variant,
          audioTracks: context.audioTracks,
        });

        for (const candidate of candidates) {
          collected.push({
            ...candidate,
            provider: candidate.provider || entry.name,
          });
        }
      } catch (error) {
        console.warn(
          `[ProviderBackedSubtitleFetchProvider] Provider '${entry.name}' search failed:`,
          error,
        );
      }
    }

    if (collected.length === 0) {
      return null;
    }

    const ranked = this.scoringService.rankForWanted(
      collected,
      {
        languageCode: context.wantedSubtitle.languageCode,
        isForced: context.wantedSubtitle.isForced,
        isHi: context.wantedSubtitle.isHi,
      },
      context.variant.releaseName,
    );

    const best = ranked[0];
    if (!best) {
      return null;
    }

    const provider = this.providerFactory.resolveManualProvider(best.provider.toLowerCase());
    const downloaded = provider.download ? await provider.download(best) : best;

    return {
      languageCode: downloaded.languageCode,
      isForced: downloaded.isForced,
      isHi: downloaded.isHi,
      provider: downloaded.provider,
      score: downloaded.score,
      extension: downloaded.extension,
      content: downloaded.content,
    };
  }
}
