import { describe, expect, it, vi } from 'vitest';
import { SimilarTitlesService } from './SimilarTitlesService';

const settings = {
  get: async () => ({ apiKeys: { tmdbApiKey: 'token' } }),
} as never;

function httpReturning(bodies: Record<string, unknown>) {
  const calls: string[] = [];
  return {
    calls,
    http: {
      get: vi.fn(async (url: string) => {
        calls.push(url);
        const key = Object.keys(bodies).find((fragment) => url.includes(fragment));
        if (!key) return { ok: false, status: 404, body: '{}' };
        return { ok: true, status: 200, body: JSON.stringify(bodies[key]) };
      }),
    } as never,
  };
}

function prismaWith(params: {
  movie?: unknown;
  series?: unknown;
  moviesInLibrary?: Array<{ id: number; tmdbId: number }>;
  seriesInLibrary?: Array<{ id: number; tmdbId: number }>;
}) {
  return {
    movie: {
      findUnique: vi.fn(async () => params.movie),
      findMany: vi.fn(async () => params.moviesInLibrary ?? []),
    },
    series: {
      findUnique: vi.fn(async () => params.series),
      findMany: vi.fn(async () => params.seriesInLibrary ?? []),
    },
  } as never;
}

const tmdbSimilar = {
  results: [
    {
      id: 101,
      title: 'First Similar',
      release_date: '1999-05-01',
      poster_path: '/poster-101.jpg',
      overview: 'A similar film.',
      vote_average: 7.4,
    },
    { id: 102, name: 'Second Similar', first_air_date: '2004-01-02', poster_path: null },
    { id: 103, title: '', release_date: null },
  ],
};

describe('SimilarTitlesService', () => {
  it('maps TMDB similar movies and marks the ones already in the library', async () => {
    const { http } = httpReturning({
      '/movie/77/recommendations': { results: [tmdbSimilar.results[0]] },
      '/movie/77/similar': tmdbSimilar,
    });
    const prisma = prismaWith({
      movie: { tmdbId: 77 },
      moviesInLibrary: [{ id: 501, tmdbId: 101 }],
    });
    const service = new SimilarTitlesService(prisma, http, settings);

    const result = await service.similarMovies(9);

    // Recommendations come first and the duplicate similar row (101) is dropped.
    expect(result).toEqual([
      {
        mediaType: 'MOVIE',
        tmdbId: 101,
        title: 'First Similar',
        year: 1999,
        posterUrl: 'https://image.tmdb.org/t/p/w342/poster-101.jpg',
        overview: 'A similar film.',
        voteAverage: 7.4,
        inLibrary: true,
        libraryId: 501,
      },
      {
        mediaType: 'MOVIE',
        tmdbId: 102,
        title: 'Second Similar',
        year: 2004,
        posterUrl: null,
        overview: null,
        voteAverage: null,
        inLibrary: false,
        libraryId: null,
      },
    ]);
  });

  it('resolves a series TMDB id from TVDB when the row only carries tvdbId', async () => {
    const { http, calls } = httpReturning({
      '/find/81189': { tv_results: [{ id: 1396 }] },
      '/tv/1396/recommendations': { results: [{ id: 200, name: 'Related Show', first_air_date: '2010-02-01' }] },
      '/tv/1396/similar': { results: [] },
    });
    const prisma = prismaWith({
      series: { tvdbId: 81189, tmdbId: null },
      seriesInLibrary: [],
    });
    const service = new SimilarTitlesService(prisma, http, settings);

    const result = await service.similarSeries(4);

    expect(calls[0]).toContain('/find/81189');
    expect(calls[0]).toContain('external_source=tvdb_id');
    expect(calls.some((url) => url.includes('/tv/1396/recommendations'))).toBe(true);
    expect(calls.some((url) => url.includes('/tv/1396/similar'))).toBe(true);
    expect(result[0]).toMatchObject({ mediaType: 'SERIES', tmdbId: 200, title: 'Related Show', inLibrary: false });
  });

  it('requires a TMDB key and reports provider failures verbatim', async () => {
    const prisma = prismaWith({ movie: { tmdbId: 77 } });
    const noKey = new SimilarTitlesService(prisma, { get: vi.fn() } as never, { get: async () => ({ apiKeys: {} }) } as never);
    await expect(noKey.similarMovies(9)).rejects.toThrow('TMDB API Key is missing');

    const { http } = httpReturning({});
    const failing = new SimilarTitlesService(prisma, http, settings);
    await expect(failing.similarMovies(9)).rejects.toThrow('Failed to fetch similar titles from TMDB: 404');
  });
});
