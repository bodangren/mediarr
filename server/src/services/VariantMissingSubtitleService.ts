import {
  SubtitleRequirementEngine,
  type LanguageProfileItem,
  type RequirementResult,
} from './SubtitleRequirementEngine';
import { SubtitleVariantRepository } from '../repositories/SubtitleVariantRepository';

/**
 * Computes and persists variant-scoped missing subtitle state.
 */
export class VariantMissingSubtitleService {
  constructor(
    private readonly repository: SubtitleVariantRepository,
    private readonly requirementEngine: SubtitleRequirementEngine = new SubtitleRequirementEngine(),
  ) {}

  async computeAndPersistForVariant(
    variantId: number,
    profileItems: LanguageProfileItem[],
    cutoffId: number | null,
  ): Promise<RequirementResult> {
    const inventory = await this.repository.getVariantInventory(variantId);
    if (!inventory.variant) {
      throw new Error(`Variant ${variantId} not found`);
    }

    const result = this.requirementEngine.compute({
      variantId,
      profileItems,
      cutoffId,
      audioTracks: inventory.audioTracks.map(track => ({
        languageCode: track.languageCode,
        isCommentary: track.isCommentary,
      })),
      existingSubtitles: inventory.subtitleTracks
        .filter(track => Boolean(track.languageCode))
        .map(track => ({
          languageCode: track.languageCode!,
          isForced: track.isForced,
          isHi: track.isHi,
        })),
    });

    await this.repository.replaceMissingSubtitles(
      variantId,
      result.missingSubtitles.map(subtitle => ({
        languageCode: subtitle.languageCode,
        isForced: subtitle.isForced,
        isHi: subtitle.isHi,
      })),
    );

    return result;
  }
}
