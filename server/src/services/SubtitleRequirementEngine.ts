export type ProfileBoolean = 'True' | 'False';

export const ANY_CUTOFF_ID = 65535;

export interface LanguageProfileItem {
  id: number;
  language: string;
  forced: ProfileBoolean;
  hi: ProfileBoolean;
  audio_exclude: ProfileBoolean;
  audio_only_include: ProfileBoolean;
}

export interface AudioTrackContext {
  languageCode: string | null;
  isCommentary?: boolean;
}

export interface SubtitleTrackState {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
}

export interface VariantRequirementInput {
  variantId: number;
  profileItems: LanguageProfileItem[];
  cutoffId: number | null;
  audioTracks: AudioTrackContext[];
  existingSubtitles: SubtitleTrackState[];
}

export interface RequirementResult {
  desiredSubtitles: SubtitleTrackState[];
  missingSubtitles: SubtitleTrackState[];
  cutoffMet: boolean;
}

export type RequirementResultByVariant = Record<number, RequirementResult>;

const toBool = (value: ProfileBoolean): boolean => value === 'True';

const normalizeCode = (code: string | null): string | null => {
  if (!code) {
    return null;
  }
  return code.trim().toLowerCase();
};

const subtitleEquals = (a: SubtitleTrackState, b: SubtitleTrackState): boolean =>
  a.languageCode === b.languageCode &&
  a.isForced === b.isForced &&
  a.isHi === b.isHi;

/**
 * Computes desired and missing subtitles from profile settings and media tracks.
 * The rules mirror Bazarr semantics for audio include/exclude and HI fallback.
 */
export class SubtitleRequirementEngine {
  compute(input: VariantRequirementInput): RequirementResult {
    const desiredSubtitles = this.getDesiredSubtitles(
      input.profileItems,
      input.audioTracks,
    );
    const cutoffMet = this.isCutoffMet(
      input.cutoffId,
      input.profileItems,
      input.audioTracks,
      input.existingSubtitles,
    );

    if (cutoffMet) {
      return {
        desiredSubtitles,
        missingSubtitles: [],
        cutoffMet: true,
      };
    }

    const missingSubtitles = desiredSubtitles.filter(
      subtitle => !this.isSubtitlePresent(subtitle, input.existingSubtitles),
    );

    return {
      desiredSubtitles,
      missingSubtitles,
      cutoffMet: false,
    };
  }

  computeByVariant(inputs: VariantRequirementInput[]): RequirementResultByVariant {
    const result: RequirementResultByVariant = {};

    for (const input of inputs) {
      result[input.variantId] = this.compute(input);
    }

    return result;
  }

  private getDesiredSubtitles(
    profileItems: LanguageProfileItem[],
    audioTracks: AudioTrackContext[],
  ): SubtitleTrackState[] {
    const desiredSubtitles: SubtitleTrackState[] = [];

    for (const item of profileItems) {
      const audioMatches = this.matchesAudioLanguage(item.language, audioTracks);

      if (toBool(item.audio_exclude) && audioMatches) {
        continue;
      }
      if (toBool(item.audio_only_include) && !audioMatches) {
        continue;
      }

      desiredSubtitles.push({
        languageCode: item.language.toLowerCase(),
        isForced: toBool(item.forced),
        isHi: toBool(item.hi),
      });
    }

    return desiredSubtitles;
  }

  private isCutoffMet(
    cutoffId: number | null,
    profileItems: LanguageProfileItem[],
    audioTracks: AudioTrackContext[],
    existingSubtitles: SubtitleTrackState[],
  ): boolean {
    if (cutoffId === null) {
      return false;
    }

    const candidates =
      cutoffId === ANY_CUTOFF_ID
        ? profileItems
        : profileItems.filter(item => item.id === cutoffId);

    for (const candidate of candidates) {
      const target: SubtitleTrackState = {
        languageCode: candidate.language.toLowerCase(),
        isForced: toBool(candidate.forced),
        isHi: toBool(candidate.hi),
      };

      const audioMatches = this.matchesAudioLanguage(
        candidate.language,
        audioTracks,
      );

      if (toBool(candidate.audio_only_include) && !audioMatches) {
        continue;
      }

      if (toBool(candidate.audio_exclude) && audioMatches) {
        return true;
      }

      if (this.isSubtitlePresent(target, existingSubtitles)) {
        return true;
      }
    }

    return false;
  }

  private isSubtitlePresent(
    target: SubtitleTrackState,
    existingSubtitles: SubtitleTrackState[],
  ): boolean {
    const normalizedExisting = existingSubtitles.map(existing => ({
      languageCode: existing.languageCode.toLowerCase(),
      isForced: existing.isForced,
      isHi: existing.isHi,
    }));

    if (normalizedExisting.some(existing => subtitleEquals(existing, target))) {
      return true;
    }

    // Bazarr behavior: HI subtitles satisfy non-HI requirements.
    if (!target.isForced && !target.isHi) {
      return normalizedExisting.some(
        existing =>
          existing.languageCode === target.languageCode &&
          !existing.isForced &&
          existing.isHi,
      );
    }

    return false;
  }

  private matchesAudioLanguage(
    languageCode: string,
    audioTracks: AudioTrackContext[],
  ): boolean {
    const target = normalizeCode(languageCode);
    if (!target) {
      return false;
    }

    for (const track of audioTracks) {
      if (track.isCommentary) {
        continue;
      }

      const code = normalizeCode(track.languageCode);
      if (code && code === target) {
        return true;
      }
    }

    return false;
  }
}
