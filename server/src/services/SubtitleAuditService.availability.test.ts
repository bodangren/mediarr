import { describe, expect, it } from 'vitest';
import { coverageStatus, subtitleAvailability } from './SubtitleAuditService';

/**
 * Per-item EN/ZH availability is what the TV client renders as a badge. It must
 * agree with the mutually-exclusive `coverageStatus` classification the playback
 * coverage surfaces already use, otherwise the badge and the coverage report
 * disagree about the same file.
 */
describe('subtitleAvailability', () => {
  it('reports both languages for a dual subtitle set', () => {
    expect(subtitleAvailability(['en', 'zho'])).toEqual({ zh: true, en: true });
    expect(subtitleAvailability(['eng', 'chi'])).toEqual({ zh: true, en: true });
  });

  it('accepts every Chinese code the library writes (zho/chi/zh/cmn) and en/eng', () => {
    for (const code of ['zho', 'chi', 'zh', 'cmn', 'ZHO', 'Chi']) {
      expect(subtitleAvailability([code])).toEqual({ zh: true, en: false });
    }
    for (const code of ['en', 'eng', 'EN', 'Eng']) {
      expect(subtitleAvailability([code])).toEqual({ zh: false, en: true });
    }
  });

  it('ignores unrelated languages, empty and null codes', () => {
    expect(subtitleAvailability(['es', 'fr', 'de'])).toEqual({ zh: false, en: false });
    expect(subtitleAvailability([null, undefined, ''])).toEqual({ zh: false, en: false });
    expect(subtitleAvailability([])).toEqual({ zh: false, en: false });
  });

  it('agrees with coverageStatus for every classification', () => {
    const cases: Array<[string[], ReturnType<typeof coverageStatus>]> = [
      [['en', 'zho'], 'dual'],
      [['chi'], 'zho-only'],
      [['eng'], 'en-only'],
      [[], 'none'],
    ];
    for (const [codes, status] of cases) {
      const { zh, en } = subtitleAvailability(codes);
      const derived = zh && en ? 'dual' : zh ? 'zho-only' : en ? 'en-only' : 'none';
      expect(derived).toBe(status);
      expect(coverageStatus(codes)).toBe(status);
    }
  });
});
