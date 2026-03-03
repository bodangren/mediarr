import type {
  CustomFormatCondition,
  CustomFormatWithScores,
} from '../repositories/CustomFormatRepository';
import { normalizeTitle, levenshteinDistance } from '../utils/stringUtils';

/**
 * Release candidate for custom format evaluation
 */
export interface ReleaseCandidate {
  title: string;
  size: number;
  indexerId: number;
  protocol: 'torrent' | 'usenet';
  language?: string | undefined;
  releaseGroup?: string | undefined;
  source?: string | undefined;
  resolution?: number | undefined;
  qualityModifier?: string | undefined;
  indexerFlags?: string[] | undefined;
  seeders?: number;
}

/**
 * Result of scoring a release against custom formats
 */
export interface ScoringResult {
  matchedFormats: Array<{
    id: number;
    name: string;
    score: number;
  }>;
  totalScore: number;
}

export interface UnifiedScoringResult extends ScoringResult {
  breakdown: {
    customFormatScore: number;
    confidenceScore: number;
    indexerScore: number;
    seedScore: number;
  };
}

export interface TargetParams {
  title?: string;
  year?: number;
  season?: number;
  episode?: number;
}

/**
 * Custom Format Scoring Engine
 * 
 * Evaluates releases against custom format conditions and calculates scores
 * based on quality profile configurations.
 */
export class CustomFormatScoringEngine {
  /**
   * Calculates a comprehensive score that includes Custom Formats, Title Confidence, Indexer Priority, and Seeders.
   */
  scoreCandidateUnified(
    candidate: { title: string; seeders?: number },
    formatScores: Array<{ customFormat: CustomFormatWithScores; score: number }>,
    targetParams: TargetParams,
    indexerPriority: number = 0,
  ): UnifiedScoringResult {
    // 1. Calculate Custom Format Score
    let customFormatScore = 0;
    const matchedFormats: UnifiedScoringResult['matchedFormats'] = [];
    
    // We create a dummy ReleaseCandidate just for format scoring if needed,
    // though typically the caller passes a full candidate.
    const releaseCandidate = candidate as ReleaseCandidate;
    
    for (const { customFormat, score } of formatScores) {
      if (this.evaluate(releaseCandidate, customFormat)) {
        matchedFormats.push({
          id: customFormat.id,
          name: customFormat.name,
          score,
        });
        customFormatScore += score;
      }
    }

    // 2. Calculate Confidence Score (0 to 100)
    let confidenceScore = 0;
    if (targetParams.title) {
      const normalizedTarget = normalizeTitle(targetParams.title);
      // Remove common release group/quality strings before comparing
      let cleanCandidateTitle = candidate.title;
      const qualityIndex = cleanCandidateTitle.search(/\d{3,4}p|BluRay|WEB|HDTV|DVD|S\d{2}/i);
      if (qualityIndex > 0) {
        cleanCandidateTitle = cleanCandidateTitle.substring(0, qualityIndex);
      }
      
      const normalizedCandidate = normalizeTitle(cleanCandidateTitle);
      
      if (normalizedCandidate === normalizedTarget || normalizedCandidate.includes(normalizedTarget)) {
        confidenceScore = 100;
      } else {
        const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
        const maxLength = Math.max(normalizedTarget.length, normalizedCandidate.length);
        const similarity = Math.max(0, 1 - distance / (maxLength || 1));
        confidenceScore = Math.round(similarity * 100);
      }
      
      // Bonus for exact season/episode match in title if applicable
      if (targetParams.season !== undefined && targetParams.episode !== undefined) {
        const s = targetParams.season.toString().padStart(2, '0');
        const e = targetParams.episode.toString().padStart(2, '0');
        if (candidate.title.match(new RegExp(`S${s}E${e}`, 'i'))) {
          confidenceScore = Math.min(100, confidenceScore + 20);
        }
      }
    }

    // 3. Calculate Indexer Score (Priority * 5)
    const indexerScore = (indexerPriority || 0) * 5;

    // 4. Calculate Seeds Score (log10(seeds) * 10)
    const seeders = candidate.seeders || 0;
    const seedScore = seeders > 0 ? Math.round(Math.log10(seeders) * 10) : 0;

    const totalScore = customFormatScore + confidenceScore + indexerScore + seedScore;

    return {
      matchedFormats,
      totalScore,
      breakdown: {
        customFormatScore,
        confidenceScore,
        indexerScore,
        seedScore,
      }
    };
  }

  /**
   * Evaluate a single condition against a release candidate
   */
  private evaluateCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    let result = false;

    switch (condition.type) {
      case 'regex':
        result = this.evaluateRegexCondition(release, condition);
        break;

      case 'size':
        result = this.evaluateSizeCondition(release, condition);
        break;

      case 'language':
        result = this.evaluateLanguageCondition(release, condition);
        break;

      case 'indexerFlag':
        result = this.evaluateIndexerFlagCondition(release, condition);
        break;

      case 'releaseGroup':
        result = this.evaluateReleaseGroupCondition(release, condition);
        break;

      case 'source':
        result = this.evaluateSourceCondition(release, condition);
        break;

      case 'resolution':
        result = this.evaluateResolutionCondition(release, condition);
        break;

      case 'qualityModifier':
        result = this.evaluateQualityModifierCondition(release, condition);
        break;

      default:
        result = false;
    }

    // Apply negation if specified
    if (condition.negate) {
      result = !result;
    }

    return result;
  }

  private evaluateRegexCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const value = String(condition.value);
    const field = condition.field ?? 'title';

    let targetValue: string;
    switch (field) {
      case 'title':
        targetValue = release.title;
        break;
      case 'releaseGroup':
        targetValue = release.releaseGroup ?? '';
        break;
      case 'source':
        targetValue = release.source ?? '';
        break;
      default:
        targetValue = release.title;
    }

    const operator = condition.operator ?? 'contains';

    switch (operator) {
      case 'regex': {
        try {
          const regex = new RegExp(value, 'i');
          return regex.test(targetValue);
        } catch {
          return false;
        }
      }

      case 'notRegex': {
        try {
          const regex = new RegExp(value, 'i');
          return !regex.test(targetValue);
        } catch {
          return true;
        }
      }

      case 'contains':
        return targetValue.toLowerCase().includes(value.toLowerCase());

      case 'notContains':
        return !targetValue.toLowerCase().includes(value.toLowerCase());

      case 'equals':
        return targetValue.toLowerCase() === value.toLowerCase();

      default:
        return false;
    }
  }

  private evaluateSizeCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const targetValue = release.size;
    const conditionValue = Number(condition.value);

    if (!Number.isFinite(conditionValue)) {
      return false;
    }

    const operator = condition.operator ?? 'equals';

    switch (operator) {
      case 'greaterThan':
        return targetValue > conditionValue;

      case 'lessThan':
        return targetValue < conditionValue;

      case 'equals':
        return targetValue === conditionValue;

      default:
        return false;
    }
  }

  private evaluateLanguageCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const releaseLanguage = release.language?.toLowerCase() ?? '';
    const conditionValue = String(condition.value).toLowerCase();

    const operator = condition.operator ?? 'contains';

    switch (operator) {
      case 'contains':
        return releaseLanguage.includes(conditionValue);

      case 'notContains':
        return !releaseLanguage.includes(conditionValue);

      case 'equals':
        return releaseLanguage === conditionValue;

      default:
        return false;
    }
  }

  private evaluateIndexerFlagCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const flags = release.indexerFlags ?? [];
    const conditionValue = String(condition.value).toLowerCase();

    return flags.some(flag => flag.toLowerCase() === conditionValue);
  }

  private evaluateReleaseGroupCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const releaseGroup = release.releaseGroup?.toLowerCase() ?? '';
    const conditionValue = String(condition.value).toLowerCase();

    const operator = condition.operator ?? 'equals';

    switch (operator) {
      case 'contains':
        return releaseGroup.includes(conditionValue);

      case 'notContains':
        return !releaseGroup.includes(conditionValue);

      case 'equals':
        return releaseGroup === conditionValue;

      case 'regex': {
        try {
          const regex = new RegExp(conditionValue, 'i');
          return regex.test(releaseGroup);
        } catch {
          return false;
        }
      }

      default:
        return false;
    }
  }

  private evaluateSourceCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const source = release.source?.toLowerCase() ?? '';
    const conditionValue = String(condition.value).toLowerCase();

    const operator = condition.operator ?? 'equals';

    switch (operator) {
      case 'contains':
        return source.includes(conditionValue);

      case 'notContains':
        return !source.includes(conditionValue);

      case 'equals':
        return source === conditionValue;

      default:
        return false;
    }
  }

  private evaluateResolutionCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const resolution = release.resolution ?? 0;
    const conditionValue = Number(condition.value);

    if (!Number.isFinite(conditionValue)) {
      return false;
    }

    const operator = condition.operator ?? 'equals';

    switch (operator) {
      case 'equals':
        return resolution === conditionValue;

      case 'greaterThan':
        return resolution > conditionValue;

      case 'lessThan':
        return resolution < conditionValue;

      default:
        return false;
    }
  }

  private evaluateQualityModifierCondition(
    release: ReleaseCandidate,
    condition: CustomFormatCondition,
  ): boolean {
    const modifier = release.qualityModifier?.toLowerCase() ?? '';
    const conditionValue = String(condition.value).toLowerCase();

    return modifier.includes(conditionValue);
  }

  /**
   * Evaluate a release against a custom format
   * Returns true if ALL conditions match (AND logic)
   */
  evaluate(release: ReleaseCandidate, format: CustomFormatWithScores): boolean {
    const conditions = format.conditions;

    if (conditions.length === 0) {
      return false;
    }

    // All conditions must match for the format to match
    return conditions.every(condition => this.evaluateCondition(release, condition));
  }

  /**
   * Score a release against multiple custom formats
   * Returns matched formats and total score
   */
  scoreRelease(
    release: ReleaseCandidate,
    formats: Array<{ format: CustomFormatWithScores; score: number }>,
  ): ScoringResult {
    const matchedFormats: ScoringResult['matchedFormats'] = [];
    let totalScore = 0;

    for (const { format, score } of formats) {
      if (this.evaluate(release, format)) {
        matchedFormats.push({
          id: format.id,
          name: format.name,
          score,
        });
        totalScore += score;
      }
    }

    return {
      matchedFormats,
      totalScore,
    };
  }

  /**
   * Score a release using formats with their associated quality profile scores
   */
  scoreReleaseForQualityProfile(
    release: ReleaseCandidate,
    formatScores: Array<{
      customFormat: CustomFormatWithScores;
      score: number;
    }>,
  ): ScoringResult {
    const matchedFormats: ScoringResult['matchedFormats'] = [];
    let totalScore = 0;

    for (const { customFormat, score } of formatScores) {
      if (this.evaluate(release, customFormat)) {
        matchedFormats.push({
          id: customFormat.id,
          name: customFormat.name,
          score,
        });
        totalScore += score;
      }
    }

    return {
      matchedFormats,
      totalScore,
    };
  }
}
