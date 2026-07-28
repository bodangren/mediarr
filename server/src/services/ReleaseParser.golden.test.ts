import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { releaseParser } from './ReleaseParser';
import { RELEASE_PARSER_GOLDEN, GOLDEN_TITLES } from './__fixtures__/releaseParserGolden';

// ── FR-1: golden-set regression for the regex fallback ───────────────────────
//
// Runs against the real public parse() path with no AI provider configured, so there
// are no mocks and no network. With AI disabled parse() returns regexFallback(title)
// directly, which makes this an offline characterisation test of the fallback every
// deployment relies on when no key is set — and the path the parser silently used for
// every request while the default model was slower than its own abort deadline.
//
// These assertions describe what the fallback ACTUALLY does today, bugs included.
// See the header of releaseParserGolden.ts: values must not be "corrected" to look
// smarter, or the fixture stops being a regression oracle.

const AI_ENV_VARS = [
  'AI_GATEWAY_BASE_URL',
  'AI_GATEWAY_MODEL',
  'AI_GATEWAY_API_KEY',
  'API_SECRET_KEY',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
];

describe('ReleaseParser — golden set, regex fallback', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    // This machine's .env sets OPENROUTER_API_KEY; clear every provider var
    // explicitly or the suite would silently make live network calls.
    for (const name of AI_ENV_VARS) {
      vi.stubEnv(name, undefined as unknown as string);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('has a substantial fixture', () => {
    expect(RELEASE_PARSER_GOLDEN.length).toBeGreaterThanOrEqual(40);
    expect(GOLDEN_TITLES).toHaveLength(RELEASE_PARSER_GOLDEN.length);
  });

  it('has no duplicate titles', () => {
    expect(new Set(GOLDEN_TITLES).size).toBe(GOLDEN_TITLES.length);
  });

  it.each(RELEASE_PARSER_GOLDEN.map(entry => [entry.title, entry] as const))(
    'regex fallback for %s',
    async (_title, entry) => {
      const result = await releaseParser.parse(entry.title);
      expect(result).toEqual(entry.regexFallbackExpected);
    },
  );

  it('makes no AI call when no provider is configured', async () => {
    // Guards the premise of every assertion above: if a provider leaked into the
    // environment, these would be live calls asserting model output, not the regex.
    for (const name of AI_ENV_VARS) {
      expect(process.env[name]).toBeUndefined();
    }
  });
});

// ── Characterisation of known fallback defects ───────────────────────────────
//
// Recorded as explicit tests so that fixing them is a deliberate, visible change
// rather than an unexplained mass diff across the golden fixture.
describe('ReleaseParser — known regex-fallback defects', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const name of AI_ENV_VARS) {
      vi.stubEnv(name, undefined as unknown as string);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('misclassifies a season range as a season pack for the first season', async () => {
    // `\bS\d{1,2}\b` matches the leading S01 of "S01-S09", so a complete-series
    // release is reported as season 1. WantedSearchService skips season_pack when
    // hunting complete series (WantedSearchService.ts:408), so this defect can hide a
    // legitimate complete-series release from an automatic grab.
    const result = await releaseParser.parse('Seinfeld.S01-S09.Complete.1080p.BluRay-GRP');

    expect(result?.matchType).toBe('season_pack');
    expect(result?.seasonNumber).toBe(1);
  });

  it('destroys internal punctuation when normalising separators', async () => {
    // .replace(/[._]/g, ' ') is applied to the whole leading segment, so "House.M.D."
    // becomes "House M D" rather than "House M.D.".
    const result = await releaseParser.parse('House.M.D.S04E01E02.720p.HDTV.x264-GRP');

    expect(result?.title).toBe('House M D');
  });

  it('never extracts a year, even when the title carries a disambiguation year', async () => {
    const result = await releaseParser.parse('Archer.2009.S10E04.1080p.WEB-DL-GRP');

    expect(result?.year).toBeNull();
    expect(result?.title).toContain('2009');
  });

  it('returns null for NNxNN titles', async () => {
    expect(await releaseParser.parse('House.1x05.720p.HDTV.x264-KILLERS')).toBeNull();
  });
});
