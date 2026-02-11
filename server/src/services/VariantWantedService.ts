import type { WantedSubtitle } from '@prisma/client';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

/**
 * Creates variant-scoped wanted subtitles from persisted missing subtitle state.
 */
export class VariantWantedService {
  constructor(private readonly repository: SubtitleVariantRepository) {}

  async syncWantedForVariant(variantId: number): Promise<WantedSubtitle[]> {
    const missing = await this.repository.listMissingSubtitles(variantId);
    const targets = missing.map(item => ({
      languageCode: item.languageCode,
      isForced: item.isForced,
      isHi: item.isHi,
    }));

    await this.repository.deleteWantedSubtitlesNotInTargets(variantId, targets);

    const wantedItems: WantedSubtitle[] = [];
    for (const item of missing) {
      const wanted = await this.repository.upsertWantedSubtitle({
        variantId,
        languageCode: item.languageCode,
        isForced: item.isForced,
        isHi: item.isHi,
      });
      wantedItems.push(wanted);
    }

    return wantedItems;
  }
}
