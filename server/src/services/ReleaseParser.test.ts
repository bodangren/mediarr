import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ai and @ai-sdk/openai before importing ReleaseParser
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(),
  })),
}));

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { releaseParser, ReleaseParser } from './ReleaseParser';
import type { ParsedRelease, ParsedReleaseWithScore, SearchContext } from './ReleaseParser';

const mockGenerateObject = vi.mocked(generateObject);
const mockCreateOpenAI = vi.mocked(createOpenAI);

// A minimal model stub
const fakeModel = {} as ReturnType<ReturnType<typeof createOpenAI>>;

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateOpenAI.mockReturnValue((() => fakeModel) as unknown as ReturnType<typeof createOpenAI>);
  process.env.DEEPSEEK_API_KEY = 'test-key';
});

// ────────────────────────────────────────────────────────────────────────────
// parse() — single-item
// ────────────────────────────────────────────────────────────────────────────

describe('ReleaseParser.parse()', () => {
  it('returns ParsedRelease on success', async () => {
    const result: ParsedRelease = {
      title: 'The Big Bang Theory',
      type: 'series',
      matchType: 'episode',
      seasonNumber: 2,
      episodeNumbers: [1],
      quality: { resolution: '1080p', source: 'BluRay', codec: 'x264' },
    };
    mockGenerateObject.mockResolvedValueOnce({ object: result } as ReturnType<typeof generateObject> extends Promise<infer T> ? T : never);

    const parsed = await releaseParser.parse('The.Big.Bang.Theory.S02E01.1080p.BluRay.x264');
    expect(parsed).toMatchObject(result);
  });

  it('returns null on schema failure (generateObject throws)', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('Schema validation failed'));
    const parsed = await releaseParser.parse('garbage title');
    expect(parsed).toBeNull();
  });

  it('returns null on network error for non-parseable title', async () => {
    mockGenerateObject.mockRejectedValue(new Error('Network error'));
    // No SxxExx pattern → regex fallback also returns null
    const parsed = await releaseParser.parse('Some.Random.Release.Without.Episode.Info');
    expect(parsed).toBeNull();
  });

  it('falls back to regex for SxxExx filenames when AI returns null (no API key)', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const parsed = await releaseParser.parse('Breaking.Bad.S03E05.720p.HDTV');
    expect(parsed).not.toBeNull();
    expect(parsed?.seasonNumber).toBe(3);
    expect(parsed?.episodeNumbers).toContain(5);
    expect(parsed?.matchType).toBe('episode');
  });

  it('returns null for non-parseable input when AI is disabled', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const parsed = await releaseParser.parse('random-file-no-season-info');
    expect(parsed).toBeNull();
  });

  it('serial queue — second call waits for first', async () => {
    const order: number[] = [];
    mockGenerateObject
      .mockImplementationOnce(async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
        return { object: { title: 'A', type: 'series', matchType: 'episode', episodeNumbers: [1] } } as never;
      })
      .mockImplementationOnce(async () => {
        order.push(2);
        return { object: { title: 'B', type: 'series', matchType: 'episode', episodeNumbers: [2] } } as never;
      });

    const [r1, r2] = await Promise.all([
      releaseParser.parse('Show.S01E01'),
      releaseParser.parse('Show.S01E02'),
    ]);

    expect(order).toEqual([1, 2]);
    expect(r1?.episodeNumbers).toContain(1);
    expect(r2?.episodeNumbers).toContain(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// parseBatch() — batch
// ────────────────────────────────────────────────────────────────────────────

describe('ReleaseParser.parseBatch()', () => {
  it('returns scored array aligned with input order', async () => {
    const results: ParsedReleaseWithScore[] = [
      { title: 'TBBT', type: 'series', matchType: 'season_pack', seasonNumber: 2, episodeNumbers: [], relevanceScore: 90 },
      { title: 'TBBT', type: 'series', matchType: 'complete_series', episodeNumbers: [], relevanceScore: 40 },
      { title: 'TBBT', type: 'series', matchType: 'episode', seasonNumber: 2, episodeNumbers: [1], relevanceScore: 10 },
    ];
    mockGenerateObject.mockResolvedValueOnce({ object: results } as ReturnType<typeof generateObject> extends Promise<infer T> ? T : never);

    const titles = [
      'The Big Bang Theory S02 1080p BluRay',
      'TBBT Complete Series',
      'TBBT S02E01',
    ];
    const context: SearchContext = { seriesTitle: 'The Big Bang Theory', seasonNumber: 2 };
    const parsed = await releaseParser.parseBatch(titles, context);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.matchType).toBe('season_pack');
    expect(parsed[1]?.matchType).toBe('complete_series');
    expect(parsed[2]?.matchType).toBe('episode');
  });

  it('returns [] on network failure', async () => {
    mockGenerateObject.mockRejectedValueOnce(new Error('timeout'));
    const parsed = await releaseParser.parseBatch(['title1', 'title2']);
    expect(parsed).toEqual([]);
  });

  it('season_pack scores higher than complete_series for season-specific context', async () => {
    const results: ParsedReleaseWithScore[] = [
      { title: 'TBBT', type: 'series', matchType: 'season_pack', seasonNumber: 2, episodeNumbers: [], relevanceScore: 92 },
      { title: 'TBBT', type: 'series', matchType: 'complete_series', episodeNumbers: [], relevanceScore: 38 },
    ];
    mockGenerateObject.mockResolvedValueOnce({ object: results } as ReturnType<typeof generateObject> extends Promise<infer T> ? T : never);

    const parsed = await releaseParser.parseBatch(
      ['TBBT S02 1080p BluRay', 'TBBT Complete Series'],
      { seriesTitle: 'The Big Bang Theory', seasonNumber: 2 }
    );

    const seasonPackScore = parsed.find((r) => r.matchType === 'season_pack')?.relevanceScore ?? 0;
    const completeSeriesScore = parsed.find((r) => r.matchType === 'complete_series')?.relevanceScore ?? 0;
    expect(seasonPackScore).toBeGreaterThan(completeSeriesScore);
  });

  it('returns [] when no API key is set', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const parsed = await releaseParser.parseBatch(['title1']);
    expect(parsed).toEqual([]);
  });
});
