import { describe, expect, it } from 'vitest';
import { SubtitleScoringService } from './SubtitleScoringService';
import type { ManualSearchCandidate } from './SubtitleInventoryApiService';

describe('SubtitleScoringService', () => {
  const service = new SubtitleScoringService();

  it('prioritizes language/forced/HI match for wanted ranking', () => {
    const candidates: ManualSearchCandidate[] = [
      {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 10,
      },
      {
        languageCode: 'th',
        isForced: false,
        isHi: false,
        provider: 'subdl',
        score: 5,
      },
    ];

    const ranked = service.rankForWanted(candidates, {
      languageCode: 'th',
      isForced: false,
      isHi: false,
    });

    expect(ranked[0]?.languageCode).toBe('th');
  });

  it('boosts release-name overlap for manual ranking', () => {
    const candidates: ManualSearchCandidate[] = [
      {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'opensubtitles',
        score: 5,
        releaseName: 'Movie.Name.2025.1080p.WEB',
      },
      {
        languageCode: 'en',
        isForced: false,
        isHi: false,
        provider: 'assrt',
        score: 8,
        releaseName: 'Different.Release.720p',
      },
    ];

    const ranked = service.rankManual(candidates, 'Movie.Name.2025.1080p.BluRay');
    expect(ranked[0]?.releaseName).toContain('Movie.Name.2025');
  });
});
