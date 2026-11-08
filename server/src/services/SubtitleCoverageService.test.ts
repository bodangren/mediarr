import { describe, expect, it } from 'vitest';
import {
  isChineseLanguage,
  isEnglishLanguage,
  summarizeCoverage,
  type CoverageInput,
} from './SubtitleCoverageService';

function item(overrides: Partial<CoverageInput> = {}): CoverageInput {
  return { kind: 'movie', id: 1, bucket: 'backfill', hasChinese: false, hasEnglish: false, ...overrides };
}

describe('language classification', () => {
  it('recognises the Chinese codes the library actually stores', () => {
    for (const code of ['zho', 'chi', 'zh', 'CHS', 'cht', 'cmn', 'yue']) {
      expect(isChineseLanguage(code)).toBe(true);
    }
  });

  it('recognises English codes and rejects others', () => {
    expect(isEnglishLanguage('eng')).toBe(true);
    expect(isEnglishLanguage('EN')).toBe(true);
    expect(isEnglishLanguage('spa')).toBe(false);
    expect(isChineseLanguage('spa')).toBe(false);
    expect(isChineseLanguage(null)).toBe(false);
  });
});

describe('summarizeCoverage', () => {
  it('returns every bucket in the priority order, even when empty', () => {
    const report = summarizeCoverage([]);
    expect(report.buckets.map((entry) => entry.bucket)).toEqual([
      'continue-watching',
      'recently-watched',
      'recently-added',
      'backfill',
    ]);
    expect(report.highPriority).toEqual({ total: 0, covered: 0, missing: 0 });
  });

  it('counts coverage per bucket and in the totals', () => {
    const report = summarizeCoverage([
      item({ id: 1, bucket: 'continue-watching', hasChinese: true, hasEnglish: true }),
      item({ id: 2, bucket: 'continue-watching', hasChinese: false, hasEnglish: true }),
      item({ id: 3, bucket: 'recently-watched', hasChinese: true, hasEnglish: false }),
      item({ id: 4, bucket: 'recently-added' }),
      item({ id: 5, bucket: 'backfill', hasEnglish: true }),
    ]);

    const watching = report.buckets[0];
    expect(watching).toEqual({
      bucket: 'continue-watching',
      total: 2,
      withChinese: 1,
      withEnglish: 2,
      withBoth: 1,
      missingChinese: 1,
      missingBoth: 0,
    });

    expect(report.totals).toEqual({
      total: 5,
      withChinese: 2,
      withEnglish: 3,
      withBoth: 1,
      missingChinese: 3,
      missingBoth: 1,
    });
  });

  it('defines high priority as the first two buckets only', () => {
    const report = summarizeCoverage([
      item({ id: 1, bucket: 'continue-watching', hasChinese: true, hasEnglish: true }),
      item({ id: 2, bucket: 'recently-watched' }),
      item({ id: 3, bucket: 'recently-added' }),
      item({ id: 4, bucket: 'backfill' }),
    ]);
    expect(report.highPriority).toEqual({ total: 2, covered: 1, missing: 1 });
  });

  it('counts an item with only Chinese as covered but not bilingual-ready', () => {
    const report = summarizeCoverage([
      item({ bucket: 'continue-watching', hasChinese: true, hasEnglish: false }),
    ]);
    expect(report.buckets[0]!.withChinese).toBe(1);
    expect(report.buckets[0]!.withBoth).toBe(0);
    expect(report.highPriority.covered).toBe(1);
  });
});
