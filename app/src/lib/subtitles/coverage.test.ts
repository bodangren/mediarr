import { describe, expect, it } from 'vitest';
import {
  normalizeLanguageCodes,
  subtitleStatusBadgeClass,
  subtitleStatusLabel,
  summarizeSubtitleCoverage,
} from './coverage';

describe('normalizeLanguageCodes', () => {
  it('trims and lowercases each code', () => {
    expect(normalizeLanguageCodes(['  EN ', 'ZH'])).toEqual(['en', 'zh']);
  });

  it('deduplicates codes', () => {
    expect(normalizeLanguageCodes(['en', 'en', 'zh'])).toEqual(['en', 'zh']);
  });

  it('filters out empty strings', () => {
    expect(normalizeLanguageCodes(['en', '', '  '])).toEqual(['en']);
  });

  it('returns sorted codes', () => {
    expect(normalizeLanguageCodes(['zh', 'en', 'th'])).toEqual(['en', 'th', 'zh']);
  });
});

describe('summarizeSubtitleCoverage', () => {
  it('returns complete when available and no missing', () => {
    const result = summarizeSubtitleCoverage(['en', 'zh'], []);
    expect(result.status).toBe('complete');
    expect(result.availableLanguages).toEqual(['en', 'zh']);
    expect(result.missingLanguages).toEqual([]);
  });

  it('returns partial when both available and missing', () => {
    const result = summarizeSubtitleCoverage(['en'], ['zh']);
    expect(result.status).toBe('partial');
  });

  it('returns missing when none available but some missing', () => {
    const result = summarizeSubtitleCoverage([], ['en']);
    expect(result.status).toBe('missing');
  });

  it('returns none when both arrays are empty', () => {
    const result = summarizeSubtitleCoverage([], []);
    expect(result.status).toBe('none');
  });

  it('normalizes input codes', () => {
    const result = summarizeSubtitleCoverage(['EN'], ['ZH']);
    expect(result.availableLanguages).toEqual(['en']);
    expect(result.missingLanguages).toEqual(['zh']);
  });
});

describe('subtitleStatusLabel', () => {
  it('returns correct labels', () => {
    expect(subtitleStatusLabel('complete')).toBe('Subtitles Complete');
    expect(subtitleStatusLabel('partial')).toBe('Subtitles Partial');
    expect(subtitleStatusLabel('missing')).toBe('Subtitles Missing');
    expect(subtitleStatusLabel('none')).toBe('No Subtitle Data');
  });
});

describe('subtitleStatusBadgeClass', () => {
  it('returns distinct class strings for each status', () => {
    const complete = subtitleStatusBadgeClass('complete');
    const partial = subtitleStatusBadgeClass('partial');
    const missing = subtitleStatusBadgeClass('missing');
    const none = subtitleStatusBadgeClass('none');

    expect(complete).toContain('text-status-completed');
    expect(partial).toContain('text-accent-warning');
    expect(missing).toContain('text-status-error');
    expect(none).toContain('text-text-secondary');
    expect(new Set([complete, partial, missing, none]).size).toBe(4);
  });
});
