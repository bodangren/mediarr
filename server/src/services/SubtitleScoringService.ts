import type { ManualSearchCandidate } from './SubtitleInventoryApiService';

export interface WantedSubtitlePreference {
  languageCode: string;
  isForced: boolean;
  isHi: boolean;
}

const RELEASE_TOKENS_REGEX = /[.\-_\s]+/g;

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractReleaseTokens(value: string): Set<string> {
  return new Set(
    value
      .split(RELEASE_TOKENS_REGEX)
      .map(token => normalizeToken(token))
      .filter(token => token.length >= 3),
  );
}

/**
 * Deterministic subtitle scoring used by manual and automated subtitle selection.
 */
export class SubtitleScoringService {
  scoreCandidate(
    candidate: ManualSearchCandidate,
    options: {
      variantReleaseName?: string | null;
      wanted?: WantedSubtitlePreference;
    } = {},
  ): number {
    let total = Number.isFinite(candidate.score) ? candidate.score : 0;

    if (options.wanted) {
      const wantedLanguage = options.wanted.languageCode.toLowerCase();
      const candidateLanguage = candidate.languageCode.toLowerCase();

      if (candidateLanguage === wantedLanguage) {
        total += 100;
      } else {
        total -= 80;
      }

      total += candidate.isForced === options.wanted.isForced ? 12 : -8;
      total += candidate.isHi === options.wanted.isHi ? 12 : -8;
    }

    if (options.variantReleaseName && candidate.releaseName) {
      const releaseTokens = extractReleaseTokens(options.variantReleaseName);
      const candidateTokens = extractReleaseTokens(candidate.releaseName);
      let overlap = 0;
      for (const token of candidateTokens) {
        if (releaseTokens.has(token)) {
          overlap += 1;
        }
      }

      total += Math.min(overlap * 5, 30);
    }

    if (candidate.provider === 'opensubtitles') {
      total += 2;
    }

    return total;
  }

  rankManual(
    candidates: ManualSearchCandidate[],
    variantReleaseName?: string | null,
  ): ManualSearchCandidate[] {
    return [...candidates].sort((left, right) => {
      const rightScore = this.scoreCandidate(right, { variantReleaseName });
      const leftScore = this.scoreCandidate(left, { variantReleaseName });
      return rightScore - leftScore;
    });
  }

  rankForWanted(
    candidates: ManualSearchCandidate[],
    wanted: WantedSubtitlePreference,
    variantReleaseName?: string | null,
  ): ManualSearchCandidate[] {
    return [...candidates].sort((left, right) => {
      const rightScore = this.scoreCandidate(right, {
        variantReleaseName,
        wanted,
      });
      const leftScore = this.scoreCandidate(left, {
        variantReleaseName,
        wanted,
      });
      return rightScore - leftScore;
    });
  }
}
