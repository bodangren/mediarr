import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { releaseParser, ParsedReleaseSchema, ParsedReleaseWithScoreSchema } from './ReleaseParser';
import type { ParsedRelease, ParsedReleaseWithScore, SearchContext } from './ReleaseParser';
import {
  DEFAULT_PARSE_TIMEOUT_MS,
  DEFAULT_BATCH_TIMEOUT_MS,
  DEFAULT_FILES_TIMEOUT_MS,
} from './ReleaseParserProvider';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-openrouter-model')),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mock-openai-compatible-model')),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    json: vi.fn(() => 'mock-json-output'),
  },
}));

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
const mockCreateOpenAI = vi.mocked(createOpenAI);
const mockCreateOpenRouter = vi.mocked(createOpenRouter);
const mockGenerateText = vi.mocked(generateText);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the minimal shape generateText resolves to when Output.object is used. */
function makeTextResult<T>(output: T): { output: T } {
  return { output } as { output: T };
}

function makeParsed(overrides: Partial<ParsedRelease> = {}): ParsedRelease {
  return {
    title: 'Breaking Bad',
    type: 'series',
    matchType: 'episode',
    seasonNumber: 3,
    episodeNumbers: [5],
    year: null,
    quality: null,
    ...overrides,
  };
}

function makeScored(overrides: Partial<ParsedReleaseWithScore> = {}): ParsedReleaseWithScore {
  return { ...makeParsed(), relevanceScore: 90, ...overrides };
}

// ── Suites ───────────────────────────────────────────────────────────────────

describe('ReleaseParser — parse()', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
    mockCreateOpenAI.mockClear();
    mockCreateOpenRouter.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ParsedRelease on success', async () => {
    const expected = makeParsed();
    mockGenerateText.mockResolvedValueOnce(makeTextResult(expected) as never);

    const result = await releaseParser.parse('Breaking.Bad.S03E05.1080p.BluRay.mkv');
    expect(result).toMatchObject(expected);
  });

  it('returns regex fallback when generateText throws on all retries', async () => {
    // 3 attempts total (attempt 0, 1, 2)
    mockGenerateText
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    const result = await releaseParser.parse('unparseable-garbage');
    // regex returns null for garbage input
    expect(result).toBeNull();
  });

  it('falls back to regex for SxxExx filenames when AI fails', async () => {
    mockGenerateText
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));

    const result = await releaseParser.parse('Breaking.Bad.S03E05.1080p.BluRay.mkv');
    expect(result).not.toBeNull();
    expect(result?.matchType).toBe('episode');
    expect(result?.seasonNumber).toBe(3);
    expect(result?.episodeNumbers).toEqual([5]);
  });

  it('skips AI and falls back to regex when OPENROUTER_API_KEY is absent', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const result = await releaseParser.parse('The.Wire.S02E03.720p.mkv');
    expect(mockGenerateText).not.toHaveBeenCalled();
    expect(result?.seasonNumber).toBe(2);
    expect(result?.episodeNumbers).toEqual([3]);
  });

  it('prefers the local gateway when AI_GATEWAY_BASE_URL is configured', async () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'http://127.0.0.1:3030/api/v1');
    vi.stubEnv('AI_GATEWAY_MODEL', 'openai/gpt-4o-mini');
    vi.stubEnv('AI_GATEWAY_API_KEY', 'gateway-secret');
    const expected = makeParsed({ title: 'Gateway Parsed' });
    mockGenerateText.mockResolvedValueOnce(makeTextResult(expected) as never);

    const result = await releaseParser.parse('Gateway.Show.S01E01.mkv');

    expect(result?.title).toBe('Gateway Parsed');
    expect(mockCreateOpenAI).toHaveBeenCalledWith({
      baseURL: 'http://127.0.0.1:3030/api/v1',
      apiKey: 'gateway-secret',
    });
    expect(mockCreateOpenRouter).not.toHaveBeenCalled();
    expect(mockGenerateText.mock.calls[0]?.[0]).toMatchObject({
      model: 'mock-openai-compatible-model',
    });
  });

  it('uses OPENROUTER_MODEL as the gateway model fallback when AI_GATEWAY_MODEL is absent', async () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'http://127.0.0.1:3030/api/v1');
    vi.stubEnv('OPENROUTER_MODEL', 'openai/gpt-4.1-mini');
    mockGenerateText.mockResolvedValueOnce(makeTextResult(makeParsed({ title: 'Fallback Model' })) as never);

    await releaseParser.parse('Gateway.Fallback.S01E01.mkv');

    expect(mockCreateOpenAI).toHaveBeenCalled();
    expect(mockGenerateText.mock.calls[0]?.[0]).toMatchObject({
      model: 'mock-openai-compatible-model',
    });
  });

  it('regex fallback recognises lone season marker as season_pack', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const result = await releaseParser.parse('The.Big.Bang.Theory.S02.1080p.BluRay');
    expect(result?.matchType).toBe('season_pack');
    expect(result?.seasonNumber).toBe(2);
    expect(result?.episodeNumbers).toEqual([]);
  });

  it('regex fallback returns null when no pattern matches', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const result = await releaseParser.parse('Oppenheimer.2023.2160p.UHD.BluRay');
    expect(result).toBeNull();
  });

  it('regex fallback captures all episode numbers in multi-episode release S01E01E02', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const result = await releaseParser.parse('Breaking.Bad.S01E01E02.1080p.BluRay.mkv');
    expect(result?.matchType).toBe('episode');
    expect(result?.seasonNumber).toBe(1);
    expect(result?.episodeNumbers).toEqual([1, 2]);
  });

  it('regex fallback captures all episode numbers in triple-episode release S01E01E02E03', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const result = await releaseParser.parse('Show.S01E01E02E03.720p.HDTV.mkv');
    expect(result?.matchType).toBe('episode');
    expect(result?.seasonNumber).toBe(1);
    expect(result?.episodeNumbers).toEqual([1, 2, 3]);
  });

  it('serial queue — second call waits for first', async () => {
    const order: number[] = [];
    mockGenerateText
      .mockImplementationOnce(async () => {
        await new Promise(r => setTimeout(r, 20));
        order.push(1);
        return makeTextResult(makeParsed({ title: 'First' })) as never;
      })
      .mockImplementationOnce(async () => {
        order.push(2);
        return makeTextResult(makeParsed({ title: 'Second' })) as never;
      });

    const [r1, r2] = await Promise.all([
      releaseParser.parse('First.S01E01.mkv'),
      releaseParser.parse('Second.S01E02.mkv'),
    ]);

    expect(order).toEqual([1, 2]);
    expect(r1?.title).toBe('First');
    expect(r2?.title).toBe('Second');
  });

  it('queue survives a failure — subsequent call still executes', async () => {
    mockGenerateText
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValueOnce(makeTextResult(makeParsed({ title: 'Recovered' })) as never);

    await releaseParser.parse('bad-title');
    const result = await releaseParser.parse('Good.Show.S01E01.mkv');
    expect(result?.title).toBe('Recovered');
  });
});

describe('ReleaseParser — parseBatch()', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
    mockCreateOpenAI.mockClear();
    mockCreateOpenRouter.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns scored array aligned with input order', async () => {
    const results: ParsedReleaseWithScore[] = [
      makeScored({ title: 'The Big Bang Theory', matchType: 'season_pack', relevanceScore: 95 }),
      makeScored({ title: 'The Big Bang Theory', matchType: 'complete_series', relevanceScore: 45 }),
      makeScored({ title: 'The Big Bang Theory', matchType: 'episode', relevanceScore: 70 }),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const titles = [
      'The.Big.Bang.Theory.S02.1080p.BluRay',
      'The.Big.Bang.Theory.Complete.Series.BluRay',
      'The.Big.Bang.Theory.S02E01.1080p.BluRay',
    ];
    const context: SearchContext = { seriesTitle: 'The Big Bang Theory', seasonNumber: 2, preferredResolution: '1080p' };

    const output = await releaseParser.parseBatch(titles, context);

    expect(output).toHaveLength(3);
    expect(output[0]?.matchType).toBe('season_pack');
    expect(output[0]?.relevanceScore).toBe(95);
    expect(output[1]?.matchType).toBe('complete_series');
    expect(output[2]?.matchType).toBe('episode');
  });

  it('season_pack scores higher than complete_series for season-specific context', async () => {
    const results: ParsedReleaseWithScore[] = [
      makeScored({ matchType: 'season_pack', relevanceScore: 92 }),
      makeScored({ matchType: 'complete_series', relevanceScore: 48 }),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(
      ['TBBT.S02.1080p', 'TBBT.Complete.Series'],
      { seriesTitle: 'The Big Bang Theory', seasonNumber: 2 },
    );

    expect(output[0]!.relevanceScore).toBeGreaterThan(output[1]!.relevanceScore);
  });

  // Contract change (FR-2): parseBatch always returns exactly titles.length slots.
  // A total failure is "every slot unattributed", i.e. [null], not [].
  it('returns an all-null slot array when OPENROUTER_API_KEY is absent', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const output = await releaseParser.parseBatch(['Some.Show.S01.mkv']);
    expect(output).toEqual([null]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('uses the local gateway for parseBatch when configured', async () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'http://127.0.0.1:3030/api/v1');
    vi.stubEnv('AI_GATEWAY_MODEL', 'openai/gpt-4o-mini');
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results: [makeScored({ title: 'Gateway Batch' })] }) as never);

    const output = await releaseParser.parseBatch(['Gateway.Batch.S01E01.mkv']);

    expect(output[0]?.title).toBe('Gateway Batch');
    expect(mockCreateOpenAI).toHaveBeenCalledTimes(1);
    expect(mockCreateOpenRouter).not.toHaveBeenCalled();
    expect(mockGenerateText.mock.calls[0]?.[0]).toMatchObject({
      model: 'mock-openai-compatible-model',
    });
  });

  it('returns [] when titles array is empty', async () => {
    const output = await releaseParser.parseBatch([]);
    expect(output).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns an all-null slot array when generateText throws', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('timeout'));

    const output = await releaseParser.parseBatch(['Some.Show.S01E01.mkv']);
    expect(output).toEqual([null]);
  });

  it('includes context block in prompt when context is provided', async () => {
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results: [makeScored()] }) as never);

    await releaseParser.parseBatch(
      ['Breaking.Bad.S03.1080p'],
      { seriesTitle: 'Breaking Bad', seasonNumber: 3, preferredResolution: '1080p' },
    );

    const callArgs = mockGenerateText.mock.calls[0]![0] as { prompt: string };
    expect(callArgs.prompt).toContain('Breaking Bad');
    expect(callArgs.prompt).toContain('Season: 3');
    expect(callArgs.prompt).toContain('1080p');
  });
});

// ── FR-2: batch alignment ────────────────────────────────────────────────────
//
// parseBatch results were matched to input titles by array position. A live probe on
// 2026-07-28 saw mistral-nemo return 7 results for 8 titles (twice) and
// openrouter/free return 6 for 8. With a positional zip, dropping title #3 shifts
// results 4-8 up one slot, so five releases receive another release's parse — and
// relevanceScore feeds CustomFormatScoringEngine, which auto-grabs at a total of 50.
// The failure mode is downloading the wrong release, so these tests assert
// attribution, not merely array length.
describe('ReleaseParser — parseBatch() alignment', () => {
  /** Eight distinguishable titles; the Nth title parses to title "Show N". */
  const EIGHT_TITLES = [
    'Show.One.S01E01.1080p.WEB-DL.x264-GRP',
    'Show.Two.S02.1080p.BluRay.x265-GRP',
    'Show.Three.S03E07.720p.HDTV.x264-GRP',
    'Show.Four.Complete.Series.1080p.BluRay-GRP',
    'Show.Five.S05E01E02.1080p.AMZN.WEB-DL-GRP',
    'Show.Six.S06.2160p.NF.WEB-DL.HEVC-GRP',
    'Show.Seven.S07E12.1080p.WEBRip-GRP',
    'Show.Eight.S08E03.480p.DVDRip.XviD-GRP',
  ];

  /** A scored result tagged with the 1-based index it claims to belong to. */
  function indexed(index: number | null, name: string, overrides: Partial<ParsedReleaseWithScore> = {}) {
    return { ...makeScored({ title: name, ...overrides }), index };
  }

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
    mockCreateOpenAI.mockClear();
    mockCreateOpenRouter.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('attributes each parse to its own title when the model truncates (7 of 8)', async () => {
    // The model drops title 3 but correctly indexes everything it did return.
    const results = [
      indexed(1, 'Show One'),
      indexed(2, 'Show Two'),
      indexed(4, 'Show Four'),
      indexed(5, 'Show Five'),
      indexed(6, 'Show Six'),
      indexed(7, 'Show Seven'),
      indexed(8, 'Show Eight'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES);

    expect(output).toHaveLength(8);
    expect(output[0]?.title).toBe('Show One');
    expect(output[1]?.title).toBe('Show Two');
    // The dropped title must be an empty slot, NOT the next result shifted up.
    expect(output[2]).toBeNull();
    expect(output[3]?.title).toBe('Show Four');
    expect(output[4]?.title).toBe('Show Five');
    expect(output[5]?.title).toBe('Show Six');
    expect(output[6]?.title).toBe('Show Seven');
    expect(output[7]?.title).toBe('Show Eight');
  });

  it('attributes correctly when the model returns results out of order', async () => {
    const results = [
      indexed(3, 'Show Three'),
      indexed(1, 'Show One'),
      indexed(8, 'Show Eight'),
      indexed(2, 'Show Two'),
      indexed(5, 'Show Five'),
      indexed(4, 'Show Four'),
      indexed(7, 'Show Seven'),
      indexed(6, 'Show Six'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES);

    expect(output.map(slot => slot?.title)).toEqual([
      'Show One', 'Show Two', 'Show Three', 'Show Four',
      'Show Five', 'Show Six', 'Show Seven', 'Show Eight',
    ]);
  });

  it('discards both results when an index is duplicated', async () => {
    // A duplicate index makes attribution ambiguous. Guessing risks assigning the
    // wrong parse, so both claimants are dropped and the slot stays empty.
    const results = [
      indexed(1, 'Show One'),
      indexed(2, 'Ambiguous A'),
      indexed(2, 'Ambiguous B'),
      indexed(3, 'Show Three'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES.slice(0, 3));

    expect(output).toHaveLength(3);
    expect(output[0]?.title).toBe('Show One');
    expect(output[1]).toBeNull();
    expect(output[2]?.title).toBe('Show Three');
  });

  it.each([
    ['zero (indices are 1-based)', 0],
    ['negative', -1],
    ['past the end of the input', 9],
  ])('discards a result whose index is %s', async (_label, badIndex) => {
    const results = [
      indexed(1, 'Show One'),
      indexed(badIndex, 'Bogus'),
      indexed(3, 'Show Three'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES.slice(0, 3));

    expect(output).toHaveLength(3);
    expect(output[0]?.title).toBe('Show One');
    expect(output[1]).toBeNull();
    expect(output[2]?.title).toBe('Show Three');
    // The bogus result must not land anywhere at all.
    expect(output.some(slot => slot?.title === 'Bogus')).toBe(false);
  });

  it('rejects the whole batch when results carry no index and the count is short', async () => {
    // No index to match on and a length mismatch means every position is suspect.
    // Fail closed: this mirrors the guard parseFiles() has always had.
    const results = [
      indexed(null, 'Show One'),
      indexed(null, 'Show Two'),
      indexed(null, 'Show Three'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES);

    expect(output).toHaveLength(8);
    expect(output.every(slot => slot === null)).toBe(true);
  });

  it('honours positional order when results carry no index but the count matches exactly', async () => {
    // Backwards compatibility: a model that ignores the index instruction but returns
    // one entry per title is still trustworthy, because nothing can have shifted.
    const results = EIGHT_TITLES.map((_, i) => indexed(null, `Show ${i + 1}`));
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES);

    expect(output.map(slot => slot?.title)).toEqual([
      'Show 1', 'Show 2', 'Show 3', 'Show 4', 'Show 5', 'Show 6', 'Show 7', 'Show 8',
    ]);
  });

  it('rejects extra results the model invented beyond the input length', async () => {
    const results = [
      indexed(1, 'Show One'),
      indexed(2, 'Show Two'),
      indexed(3, 'Hallucinated'),
    ];
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results }) as never);

    const output = await releaseParser.parseBatch(EIGHT_TITLES.slice(0, 2));

    expect(output).toHaveLength(2);
    expect(output[0]?.title).toBe('Show One');
    expect(output[1]?.title).toBe('Show Two');
  });
});

// ── FR-3: configurable abort deadlines ───────────────────────────────────────
describe('ReleaseParser — abort deadlines', () => {
  let timeoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
    timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
  });

  afterEach(() => {
    timeoutSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('uses the configured batch deadline, not a hardcoded 20s', async () => {
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results: [] }) as never);

    await releaseParser.parseBatch(['Some.Show.S01E01.mkv']);

    expect(timeoutSpy).toHaveBeenCalledWith(DEFAULT_BATCH_TIMEOUT_MS);
  });

  it('honours RELEASE_PARSER_BATCH_TIMEOUT_MS', async () => {
    vi.stubEnv('RELEASE_PARSER_BATCH_TIMEOUT_MS', '55000');
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results: [] }) as never);

    await releaseParser.parseBatch(['Some.Show.S01E01.mkv']);

    expect(timeoutSpy).toHaveBeenCalledWith(55000);
  });

  it('uses the configured single-parse deadline', async () => {
    mockGenerateText.mockResolvedValueOnce(makeTextResult(makeParsed()) as never);

    await releaseParser.parse('Some.Show.S01E01.mkv');

    expect(timeoutSpy).toHaveBeenCalledWith(DEFAULT_PARSE_TIMEOUT_MS);
  });

  it('uses the configured files deadline', async () => {
    mockGenerateText.mockResolvedValueOnce(makeTextResult({ results: [] }) as never);

    await releaseParser.parseFiles(['Some/Show/S01E01.mkv']);

    expect(timeoutSpy).toHaveBeenCalledWith(DEFAULT_FILES_TIMEOUT_MS);
  });
});

describe('ParsedReleaseSchema — Zod validation', () => {
  it('parses a valid object', () => {
    const input = {
      title: 'Breaking Bad',
      type: 'series',
      matchType: 'episode',
      seasonNumber: 3,
      episodeNumbers: [5],
      year: null,
      quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' },
    };
    const result = ParsedReleaseSchema.parse(input);
    expect(result.title).toBe('Breaking Bad');
    expect(result.quality?.resolution).toBe('1080p');
  });

  it('catches invalid matchType with .catch fallback', () => {
    const input = {
      title: 'Show',
      type: 'series',
      matchType: 'INVALID',
      seasonNumber: null,
      episodeNumbers: [],
      year: null,
      quality: null,
    };
    const result = ParsedReleaseSchema.parse(input);
    expect(result.matchType).toBe('episode'); // .catch('episode')
  });

  it('catches invalid quality fields with null fallback', () => {
    const input = {
      title: 'Movie',
      type: 'movie',
      matchType: 'complete_series',
      seasonNumber: null,
      episodeNumbers: [],
      year: 2023,
      quality: { resolution: 'INVALID_RES', source: 'INVALID_SRC', codec: 'INVALID_CODEC' },
    };
    const result = ParsedReleaseSchema.parse(input);
    expect(result.quality?.resolution).toBeNull();
    expect(result.quality?.source).toBeNull();
    expect(result.quality?.codec).toBeNull();
  });

  it('ParsedReleaseWithScoreSchema catches out-of-range relevanceScore', () => {
    const input = {
      title: 'Show',
      type: 'series',
      matchType: 'episode',
      seasonNumber: 1,
      episodeNumbers: [1],
      year: null,
      quality: null,
      relevanceScore: 999,
    };
    const result = ParsedReleaseWithScoreSchema.parse(input);
    expect(result.relevanceScore).toBe(50); // .catch(50)
  });
});
