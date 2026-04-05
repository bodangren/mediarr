import { describe, it, expect, beforeEach } from 'vitest';
import { CustomFormatScoringEngine } from './CustomFormatScoringEngine';
import type { CustomFormatWithScores, CustomFormatCondition } from '../repositories/CustomFormatRepository';
import type { ReleaseCandidate } from './CustomFormatScoringEngine';

function makeFormat(id: number, name: string, conditions: CustomFormatCondition[]): CustomFormatWithScores {
  return {
    id,
    name,
    includeCustomFormatWhenRenaming: false,
    conditions,
    createdAt: new Date(),
    updatedAt: new Date(),
    scores: [{ id: 1, qualityProfileId: 1, score: 10 }],
  };
}

function makeRelease(candidate: Partial<ReleaseCandidate> & { title: string; size: number }): ReleaseCandidate {
  return {
    title: candidate.title,
    size: candidate.size,
    indexerId: candidate.indexerId ?? 1,
    protocol: candidate.protocol ?? 'torrent',
    language: candidate.language,
    releaseGroup: candidate.releaseGroup,
    source: candidate.source,
    resolution: candidate.resolution,
    qualityModifier: candidate.qualityModifier,
    indexerFlags: candidate.indexerFlags,
    seeders: candidate.seeders,
  };
}

describe('CustomFormatScoringEngine — Condition Evaluators: Regex, Size, Language', () => {
  let engine: CustomFormatScoringEngine;

  beforeEach(() => {
    engine = new CustomFormatScoringEngine();
  });

  describe('regex condition', () => {
    it('matches title with valid regex pattern', () => {
      const format = makeFormat(1, 'HDR Format', [
        { type: 'regex', field: 'title', operator: 'regex', value: 'HDR|HDR10|DV' },
      ]);
      const release = makeRelease({ title: 'Movie.Name.2023.2160p.HDR10.BluRay.x265', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false for invalid regex pattern (does not crash)', () => {
      const format = makeFormat(1, 'Bad Regex', [
        { type: 'regex', field: 'title', operator: 'regex', value: '[invalid' },
      ]);
      const release = makeRelease({ title: 'Movie.Name.2023.1080p.BluRay.x264', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('notRegex with invalid pattern returns true', () => {
      const format = makeFormat(1, 'No Bad Regex', [
        { type: 'regex', field: 'title', operator: 'notRegex', value: '[invalid' },
      ]);
      const release = makeRelease({ title: 'Movie.Name.2023.1080p.BluRay.x264', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('matches releaseGroup field with regex', () => {
      const format = makeFormat(1, 'Top Groups', [
        { type: 'regex', field: 'releaseGroup', operator: 'regex', value: 'SPARKS|GECKOS' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01.1080p.WEB.x264-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('matches source field with regex', () => {
      const format = makeFormat(1, 'WEB Sources', [
        { type: 'regex', field: 'source', operator: 'regex', value: 'WEB-DL|WEBRip' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p.WEB-DL.x264', size: 1e10, source: 'WEB-DL' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('regex contains operator works', () => {
      const format = makeFormat(1, 'Contains Test', [
        { type: 'regex', field: 'title', operator: 'contains', value: 'BluRay' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.BluRay.1080p.x264', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('regex notContains operator works', () => {
      const format = makeFormat(1, 'Not Contains Test', [
        { type: 'regex', field: 'title', operator: 'notContains', value: 'CAM' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.BluRay.1080p.x264', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('regex equals operator works', () => {
      const format = makeFormat(1, 'Equals Test', [
        { type: 'regex', field: 'title', operator: 'equals', value: 'exact title' },
      ]);
      const release = makeRelease({ title: 'Exact Title', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('regex defaults to title field when field is unspecified', () => {
      const format = makeFormat(1, 'Default Field', [
        { type: 'regex', operator: 'regex', value: 'Movie' } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Movie.Name.2023.1080p', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('size condition', () => {
    it('greaterThan matches when release is larger', () => {
      const format = makeFormat(1, 'Large Files', [
        { type: 'size', operator: 'greaterThan', value: 5e9 },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('lessThan matches when release is smaller', () => {
      const format = makeFormat(1, 'Small Files', [
        { type: 'size', operator: 'lessThan', value: 5e9 },
      ]);
      const release = makeRelease({ title: 'Movie.2023.720p', size: 2e9 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('equals matches exact size', () => {
      const format = makeFormat(1, 'Exact Size', [
        { type: 'size', operator: 'equals', value: 5e9 },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 5e9 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false for non-finite condition value', () => {
      const format = makeFormat(1, 'Bad Size', [
        { type: 'size', operator: 'greaterThan', value: 'NaN' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('defaults operator to equals when unspecified', () => {
      const format = makeFormat(1, 'Default Op', [
        { type: 'size', value: 1e10 } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('language condition', () => {
    it('contains matches language substring', () => {
      const format = makeFormat(1, 'English', [
        { type: 'language', operator: 'contains', value: 'en' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'English' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('notContains rejects matching language', () => {
      const format = makeFormat(1, 'No French', [
        { type: 'language', operator: 'notContains', value: 'fr' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'English' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('equals matches exact language', () => {
      const format = makeFormat(1, 'Exact Lang', [
        { type: 'language', operator: 'equals', value: 'english' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'English' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('is case-insensitive', () => {
      const format = makeFormat(1, 'Case Test', [
        { type: 'language', operator: 'equals', value: 'ENGLISH' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'english' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('defaults operator to contains when unspecified', () => {
      const format = makeFormat(1, 'Default Lang Op', [
        { type: 'language', value: 'en' } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'English' });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });
});

describe('CustomFormatScoringEngine — Condition Evaluators: IndexerFlag, ReleaseGroup, Source, Resolution, QualityModifier', () => {
  let engine: CustomFormatScoringEngine;

  beforeEach(() => {
    engine = new CustomFormatScoringEngine();
  });

  describe('indexerFlag condition', () => {
    it('matches when flag is present in array', () => {
      const format = makeFormat(1, 'Freeleech', [
        { type: 'indexerFlag', value: 'freeleech' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, indexerFlags: ['freeleech', 'internal'] });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false when no flags are present', () => {
      const format = makeFormat(1, 'Freeleech', [
        { type: 'indexerFlag', value: 'freeleech' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, indexerFlags: [] });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('returns false when indexerFlags is undefined', () => {
      const format = makeFormat(1, 'Freeleech', [
        { type: 'indexerFlag', value: 'freeleech' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('is case-insensitive', () => {
      const format = makeFormat(1, 'Freeleech', [
        { type: 'indexerFlag', value: 'FREELEECH' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, indexerFlags: ['Freeleech'] });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('releaseGroup condition', () => {
    it('contains matches group substring', () => {
      const format = makeFormat(1, 'Group Contains', [
        { type: 'releaseGroup', operator: 'contains', value: 'SPARK' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('equals matches exact group', () => {
      const format = makeFormat(1, 'Group Exact', [
        { type: 'releaseGroup', operator: 'equals', value: 'SPARKS' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('regex matches group pattern', () => {
      const format = makeFormat(1, 'Group Regex', [
        { type: 'releaseGroup', operator: 'regex', value: 'SPARKS|GECKOS' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-GECKOS', size: 1e10, releaseGroup: 'GECKOS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('notContains rejects matching group', () => {
      const format = makeFormat(1, 'No Bad Group', [
        { type: 'releaseGroup', operator: 'notContains', value: 'CAM' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false for unknown operator', () => {
      const format = makeFormat(1, 'Bad Op', [
        { type: 'releaseGroup', operator: 'greaterThan' as any, value: 'SPARKS' },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('defaults operator to equals when unspecified', () => {
      const format = makeFormat(1, 'Default RG Op', [
        { type: 'releaseGroup', value: 'SPARKS' } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Show.S01E01-SPARKS', size: 1e10, releaseGroup: 'SPARKS' });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('source condition', () => {
    it('contains matches source substring', () => {
      const format = makeFormat(1, 'WEB Sources', [
        { type: 'source', operator: 'contains', value: 'WEB' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, source: 'WEB-DL' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('equals matches exact source', () => {
      const format = makeFormat(1, 'Exact Source', [
        { type: 'source', operator: 'equals', value: 'BluRay' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, source: 'BluRay' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('notContains rejects matching source', () => {
      const format = makeFormat(1, 'No CAM', [
        { type: 'source', operator: 'notContains', value: 'CAM' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, source: 'BluRay' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('defaults operator to equals when unspecified', () => {
      const format = makeFormat(1, 'Default Src Op', [
        { type: 'source', value: 'WEB-DL' } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, source: 'WEB-DL' });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('resolution condition', () => {
    it('equals matches exact resolution', () => {
      const format = makeFormat(1, '1080p', [
        { type: 'resolution', operator: 'equals', value: 1080 },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('greaterThan matches higher resolution', () => {
      const format = makeFormat(1, 'HD+', [
        { type: 'resolution', operator: 'greaterThan', value: 720 },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('lessThan matches lower resolution', () => {
      const format = makeFormat(1, 'SD', [
        { type: 'resolution', operator: 'lessThan', value: 1080 },
      ]);
      const release = makeRelease({ title: 'Movie.2023.720p', size: 1e10, resolution: 720 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false for non-finite condition value', () => {
      const format = makeFormat(1, 'Bad Res', [
        { type: 'resolution', operator: 'equals', value: 'NaN' },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, resolution: 1080 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('returns false when resolution is undefined (defaults to 0)', () => {
      const format = makeFormat(1, '4K Only', [
        { type: 'resolution', operator: 'equals', value: 2160 },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('defaults operator to equals when unspecified', () => {
      const format = makeFormat(1, 'Default Res Op', [
        { type: 'resolution', value: 1080 } as CustomFormatCondition,
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });

  describe('qualityModifier condition', () => {
    it('contains matches modifier substring', () => {
      const format = makeFormat(1, 'REPACK', [
        { type: 'qualityModifier', value: 'REPACK' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.REPACK.1080p', size: 1e10, qualityModifier: 'REPACK' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('is case-insensitive', () => {
      const format = makeFormat(1, 'Repack Lower', [
        { type: 'qualityModifier', value: 'repack' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.REPACK.1080p', size: 1e10, qualityModifier: 'REPACK' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false when qualityModifier is undefined', () => {
      const format = makeFormat(1, 'REPACK', [
        { type: 'qualityModifier', value: 'REPACK' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });
  });

  describe('negation (negate: true)', () => {
    it('negates regex condition result', () => {
      const format = makeFormat(1, 'No CAM', [
        { type: 'regex', field: 'title', operator: 'regex', value: 'CAM|TS', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.BluRay.1080p', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negated condition that would match returns false', () => {
      const format = makeFormat(1, 'No CAM', [
        { type: 'regex', field: 'title', operator: 'regex', value: 'CAM|TS', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.CAM.1080p', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('negates size condition result', () => {
      const format = makeFormat(1, 'Not Small', [
        { type: 'size', operator: 'lessThan', value: 1e9, negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 5e9 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates language condition result', () => {
      const format = makeFormat(1, 'Not Foreign', [
        { type: 'language', operator: 'contains', value: 'foreign', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, language: 'English' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates indexerFlag condition result', () => {
      const format = makeFormat(1, 'Not Freeleech', [
        { type: 'indexerFlag', value: 'freeleech', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, indexerFlags: ['internal'] });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates releaseGroup condition result', () => {
      const format = makeFormat(1, 'Not Bad Group', [
        { type: 'releaseGroup', operator: 'equals', value: 'BADGRP', negate: true },
      ]);
      const release = makeRelease({ title: 'Show.S01E01-GOOD', size: 1e10, releaseGroup: 'GOODGRP' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates source condition result', () => {
      const format = makeFormat(1, 'Not CAM Source', [
        { type: 'source', operator: 'equals', value: 'CAM', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10, source: 'BluRay' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates resolution condition result', () => {
      const format = makeFormat(1, 'Not SD', [
        { type: 'resolution', operator: 'equals', value: 480, negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('negates qualityModifier condition result', () => {
      const format = makeFormat(1, 'Not PROPER', [
        { type: 'qualityModifier', value: 'PROPER', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, qualityModifier: 'REPACK' });
      expect(engine.evaluate(release, format)).toBe(true);
    });
  });
});

describe('CustomFormatScoringEngine — evaluate() and scoreRelease()', () => {
  let engine: CustomFormatScoringEngine;

  beforeEach(() => {
    engine = new CustomFormatScoringEngine();
  });

  describe('evaluate()', () => {
    it('returns false for empty conditions array', () => {
      const format = makeFormat(1, 'Empty', []);
      const release = makeRelease({ title: 'Movie.2023', size: 1e10 });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('returns true when all conditions match (AND logic)', () => {
      const format = makeFormat(1, '1080p BluRay', [
        { type: 'resolution', operator: 'equals', value: 1080 },
        { type: 'source', operator: 'equals', value: 'BluRay' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p.BluRay', size: 1e10, resolution: 1080, source: 'BluRay' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('returns false when one condition fails (AND logic)', () => {
      const format = makeFormat(1, '1080p BluRay', [
        { type: 'resolution', operator: 'equals', value: 1080 },
        { type: 'source', operator: 'equals', value: 'BluRay' },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p.WEB', size: 1e10, resolution: 1080, source: 'WEB-DL' });
      expect(engine.evaluate(release, format)).toBe(false);
    });

    it('handles mixed negated and non-negated conditions correctly', () => {
      const format = makeFormat(1, '1080p not CAM', [
        { type: 'resolution', operator: 'equals', value: 1080 },
        { type: 'source', operator: 'equals', value: 'CAM', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p.BluRay', size: 1e10, resolution: 1080, source: 'BluRay' });
      expect(engine.evaluate(release, format)).toBe(true);
    });

    it('fails when negated condition matches (AND logic)', () => {
      const format = makeFormat(1, '1080p not CAM', [
        { type: 'resolution', operator: 'equals', value: 1080 },
        { type: 'source', operator: 'equals', value: 'CAM', negate: true },
      ]);
      const release = makeRelease({ title: 'Movie.2023.1080p.CAM', size: 1e10, resolution: 1080, source: 'CAM' });
      expect(engine.evaluate(release, format)).toBe(false);
    });
  });

  describe('scoreRelease()', () => {
    it('scores matching format and sums scores', () => {
      const formats = [
        { format: makeFormat(1, '1080p', [{ type: 'resolution', operator: 'equals', value: 1080 }]), score: 10 },
        { format: makeFormat(2, 'BluRay', [{ type: 'source', operator: 'equals', value: 'BluRay' }]), score: 20 },
      ];
      const release = makeRelease({ title: 'Movie.2023.1080p.BluRay', size: 1e10, resolution: 1080, source: 'BluRay' });
      const result = engine.scoreRelease(release, formats);
      expect(result.totalScore).toBe(30);
      expect(result.matchedFormats).toHaveLength(2);
      expect(result.matchedFormats.map(f => f.id)).toEqual([1, 2]);
    });

    it('only scores matching formats', () => {
      const formats = [
        { format: makeFormat(1, '1080p', [{ type: 'resolution', operator: 'equals', value: 1080 }]), score: 10 },
        { format: makeFormat(2, '4K', [{ type: 'resolution', operator: 'equals', value: 2160 }]), score: 20 },
      ];
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      const result = engine.scoreRelease(release, formats);
      expect(result.totalScore).toBe(10);
      expect(result.matchedFormats).toHaveLength(1);
      expect(result.matchedFormats[0].id).toBe(1);
    });

    it('returns zero score when no formats match', () => {
      const formats = [
        { format: makeFormat(1, '4K', [{ type: 'resolution', operator: 'equals', value: 2160 }]), score: 20 },
      ];
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      const result = engine.scoreRelease(release, formats);
      expect(result.totalScore).toBe(0);
      expect(result.matchedFormats).toHaveLength(0);
    });
  });

  describe('scoreReleaseForQualityProfile()', () => {
    it('scores using quality profile format scores', () => {
      const formatScores = [
        { customFormat: makeFormat(1, '1080p', [{ type: 'resolution', operator: 'equals', value: 1080 }]), score: 15 },
      ];
      const release = makeRelease({ title: 'Movie.2023.1080p', size: 1e10, resolution: 1080 });
      const result = engine.scoreReleaseForQualityProfile(release, formatScores);
      expect(result.totalScore).toBe(15);
      expect(result.matchedFormats).toHaveLength(1);
    });
  });
});

describe('CustomFormatScoringEngine — scoreCandidateUnified()', () => {
  let engine: CustomFormatScoringEngine;

  beforeEach(() => {
    engine = new CustomFormatScoringEngine();
  });

  describe('unified scoring components', () => {
    it('calculates all four score components', () => {
      const candidate = makeRelease({ title: 'Breaking Bad S01E01 1080p BluRay', size: 1e10, resolution: 1080, source: 'BluRay', seeders: 100 });
      const formatScores = [
        { customFormat: makeFormat(1, '1080p', [{ type: 'resolution', operator: 'equals', value: 1080 }]), score: 10 },
        { customFormat: makeFormat(2, 'BluRay', [{ type: 'source', operator: 'equals', value: 'BluRay' }]), score: 20 },
      ];
      const targetParams = { title: 'Breaking Bad', season: 1, episode: 1 };
      const result = engine.scoreCandidateUnified(candidate, formatScores, targetParams, 3);
      expect(result.breakdown.customFormatScore).toBe(30);
      expect(result.breakdown.confidenceScore).toBe(100);
      expect(result.breakdown.indexerScore).toBe(15);
      expect(result.breakdown.seedScore).toBe(20);
      expect(result.totalScore).toBe(165);
    });

    it('confidence score is 100 for exact title match', () => {
      const candidate = makeRelease({ title: 'Breaking Bad S01E01 1080p', size: 1e10 });
      const targetParams = { title: 'Breaking Bad' };
      const result = engine.scoreCandidateUnified(candidate, [], targetParams);
      expect(result.breakdown.confidenceScore).toBe(100);
    });

    it('confidence score uses Levenshtein for partial match', () => {
      const candidate = makeRelease({ title: 'Braking Bad S01E01', size: 1e10 });
      const targetParams = { title: 'Breaking Bad' };
      const result = engine.scoreCandidateUnified(candidate, [], targetParams);
      expect(result.breakdown.confidenceScore).toBeGreaterThan(0);
      expect(result.breakdown.confidenceScore).toBeLessThan(100);
    });

    it('confidence score uses AI-parsed relevanceScore when available', () => {
      const candidate = makeRelease({ title: 'Some Title', size: 1e10 });
      const parsedRelease = { relevanceScore: 85 } as any;
      const targetParams = { title: 'Different Title' };
      const result = engine.scoreCandidateUnified(candidate, [], targetParams, 0, parsedRelease);
      expect(result.breakdown.confidenceScore).toBe(85);
    });

    it('season/episode bonus adds 20 to confidence score', () => {
      const candidate = makeRelease({ title: 'Breaking Bad S01E05 1080p', size: 1e10 });
      const targetParams = { title: 'Breaking Bad', season: 1, episode: 5 };
      const result = engine.scoreCandidateUnified(candidate, [], targetParams);
      const base = engine.scoreCandidateUnified(
        makeRelease({ title: 'Breaking Bad 1080p', size: 1e10 }),
        [],
        { title: 'Breaking Bad' },
      );
      expect(result.breakdown.confidenceScore).toBe(Math.min(100, base.breakdown.confidenceScore + 20));
    });

    it('confidence score caps at 100 even with bonus', () => {
      const candidate = makeRelease({ title: 'Breaking Bad S01E01', size: 1e10 });
      const targetParams = { title: 'Breaking Bad', season: 1, episode: 1 };
      const result = engine.scoreCandidateUnified(candidate, [], targetParams);
      expect(result.breakdown.confidenceScore).toBe(100);
    });

    it('indexer score is priority * 5', () => {
      const candidate = makeRelease({ title: 'Movie.2023', size: 1e10 });
      const result = engine.scoreCandidateUnified(candidate, [], {}, 4);
      expect(result.breakdown.indexerScore).toBe(20);
    });

    it('indexer score is 0 when priority is 0', () => {
      const candidate = makeRelease({ title: 'Movie.2023', size: 1e10 });
      const result = engine.scoreCandidateUnified(candidate, [], {}, 0);
      expect(result.breakdown.indexerScore).toBe(0);
    });

    it('seed score is log10(seeders) * 10', () => {
      const candidate = makeRelease({ title: 'Movie.2023', size: 1e10, seeders: 1000 });
      const result = engine.scoreCandidateUnified(candidate, [], {});
      expect(result.breakdown.seedScore).toBe(30);
    });

    it('seed score is 0 for zero seeders', () => {
      const candidate = makeRelease({ title: 'Movie.2023', size: 1e10, seeders: 0 });
      const result = engine.scoreCandidateUnified(candidate, [], {});
      expect(result.breakdown.seedScore).toBe(0);
    });

    it('seed score is 0 for undefined seeders', () => {
      const candidate = makeRelease({ title: 'Movie.2023', size: 1e10 });
      const result = engine.scoreCandidateUnified(candidate, [], {});
      expect(result.breakdown.seedScore).toBe(0);
    });

    it('total score is sum of all components', () => {
      const candidate = makeRelease({ title: 'Breaking Bad S01E01 1080p BluRay', size: 1e10, resolution: 1080, source: 'BluRay', seeders: 100 });
      const formatScores = [
        { customFormat: makeFormat(1, '1080p', [{ type: 'resolution', operator: 'equals', value: 1080 }]), score: 10 },
        { customFormat: makeFormat(2, 'BluRay', [{ type: 'source', operator: 'equals', value: 'BluRay' }]), score: 20 },
      ];
      const targetParams = { title: 'Breaking Bad', season: 1, episode: 1 };
      const result = engine.scoreCandidateUnified(candidate, formatScores, targetParams, 3);
      const expected = result.breakdown.customFormatScore + result.breakdown.confidenceScore + result.breakdown.indexerScore + result.breakdown.seedScore;
      expect(result.totalScore).toBe(expected);
    });
  });
});
