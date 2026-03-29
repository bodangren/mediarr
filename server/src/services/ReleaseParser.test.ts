import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { releaseParser, ParsedReleaseSchema, ParsedReleaseWithScoreSchema } from './ReleaseParser';
import type { ParsedRelease, ParsedReleaseWithScore, SearchContext } from './ReleaseParser';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-openrouter-model')),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    json: vi.fn(() => 'mock-json-output'),
  },
}));

import { generateText } from 'ai';
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
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
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
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    mockGenerateText.mockReset();
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

  it('returns [] when OPENROUTER_API_KEY is absent', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('OPENROUTER_API_KEY', '');

    const output = await releaseParser.parseBatch(['Some.Show.S01.mkv']);
    expect(output).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns [] when titles array is empty', async () => {
    const output = await releaseParser.parseBatch([]);
    expect(output).toEqual([]);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns [] when generateText throws', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('timeout'));

    const output = await releaseParser.parseBatch(['Some.Show.S01E01.mkv']);
    expect(output).toEqual([]);
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
