import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMediaRoutes } from './mediaRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMediaRoutes(app, deps);
  return app;
}

describe('POST /api/wanted — TV series episode population', () => {
  let getSeriesDetails: ReturnType<typeof vi.fn>;
  let upsertSeasonsAndEpisodes: ReturnType<typeof vi.fn>;
  let findSeriesByTvdbId: ReturnType<typeof vi.fn>;
  let upsertSeries: ReturnType<typeof vi.fn>;
  let app: FastifyInstance;

  beforeEach(() => {
    getSeriesDetails = vi.fn().mockResolvedValue({
      series: { tvdbId: 1234, title: 'Test Show', status: 'continuing', seasons: [], images: [] },
      episodes: [
        { id: 9001, seasonNumber: 1, episodeNumber: 1, episodeName: 'Pilot', firstAired: null, overview: null },
      ],
    });
    upsertSeasonsAndEpisodes = vi.fn().mockResolvedValue(undefined);
    // First call (duplicate check) returns null; subsequent calls return the created series.
    findSeriesByTvdbId = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 42, title: 'Test Show', tvdbId: 1234, media: {} });
    upsertSeries = vi.fn().mockResolvedValue({ id: 42, title: 'Test Show', tvdbId: 1234 });

    const deps: ApiDependencies = {
      prisma: {} as any,
      mediaRepository: {
        findMovieByTmdbId: vi.fn().mockResolvedValue(null),
        upsertMovie: vi.fn(),
        upsertSeries,
        findSeriesByTvdbId,
        upsertSeasonsAndEpisodes,
      } as any,
      metadataProvider: {
        searchMedia: vi.fn(),
        getSeriesDetails,
      } as any,
    };

    app = buildApp(deps);
  });

  it('returns 201 immediately without waiting for episode population', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'TV',
        tvdbId: 1234,
        title: 'Test Show',
        year: 2020,
        status: 'continuing',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.data).toMatchObject({ id: 42, title: 'Test Show' });
  });

  it('fires getSeriesDetails in the background after responding', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'TV',
        tvdbId: 1234,
        title: 'Test Show',
        year: 2020,
        status: 'continuing',
      },
    });

    // Flush microtasks so the background Promise.resolve().then() runs.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(getSeriesDetails).toHaveBeenCalledWith(1234);
    expect(upsertSeasonsAndEpisodes).toHaveBeenCalledWith(42, expect.objectContaining({
      series: expect.objectContaining({ tvdbId: 1234 }),
    }));
  });

  it('does not fire episode population for MOVIE type', async () => {
    const findMovieByTmdbId = vi.fn().mockResolvedValue(null);
    const upsertMovie = vi.fn().mockResolvedValue({ id: 99, title: 'Test Movie', tmdbId: 5000 });

    const deps: ApiDependencies = {
      prisma: {} as any,
      mediaRepository: {
        findMovieByTmdbId,
        upsertMovie,
        upsertSeries: vi.fn(),
        findSeriesByTvdbId: vi.fn(),
        upsertSeasonsAndEpisodes,
      } as any,
      metadataProvider: {
        searchMedia: vi.fn(),
        getSeriesDetails,
      } as any,
    };

    const movieApp = buildApp(deps);

    const response = await movieApp.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'MOVIE',
        tmdbId: 5000,
        title: 'Test Movie',
        year: 2020,
      },
    });

    expect(response.statusCode).toBe(201);

    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(getSeriesDetails).not.toHaveBeenCalled();
    expect(upsertSeasonsAndEpisodes).not.toHaveBeenCalled();
  });

  it('logs error when background episode population fails without affecting the response', async () => {
    getSeriesDetails.mockRejectedValue(new Error('SkyHook unavailable'));
    // Reset and re-configure the findSeriesByTvdbId mock for this test.
    findSeriesByTvdbId.mockReset();
    findSeriesByTvdbId
      .mockResolvedValueOnce(null) // duplicate check
      .mockResolvedValue({ id: 42, title: 'Test Show', tvdbId: 1234, media: {} }); // background job lookup

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await app.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: {
        mediaType: 'TV',
        tvdbId: 1234,
        title: 'Test Show',
        year: 2020,
      },
    });

    expect(response.statusCode).toBe(201);

    // Flush multiple microtask/macrotask rounds to ensure the background job completes.
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[wanted]'),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});

describe('POST /api/wanted/search-all', () => {
  it('triggers autoSearchAll in the background and returns 200 immediately', async () => {
    const autoSearchAll = vi.fn().mockResolvedValue(undefined);
    const deps: ApiDependencies = {
      prisma: {} as any,
      wantedSearchService: {
        autoSearchAll,
        autoSearchMovie: vi.fn(),
        autoSearchEpisode: vi.fn(),
        autoSearchSeries: vi.fn(),
      }
    };

    const app = buildApp(deps);

    const response = await app.inject({
      method: 'POST',
      url: '/api/wanted/search-all',
    });

    expect(response.statusCode).toBe(200);
    expect(autoSearchAll).toHaveBeenCalled();
  });
});

describe('POST /api/media/:id/auto-search', () => {
  it('calls autoSearchMovie for type=movie and returns the result', async () => {
    const autoSearchMovie = vi.fn().mockResolvedValue({ success: true, release: { title: 'Movie.Release' } });
    const deps: ApiDependencies = {
      prisma: {} as any,
      wantedSearchService: {
        autoSearchAll: vi.fn(),
        autoSearchMovie,
        autoSearchEpisode: vi.fn(),
        autoSearchSeries: vi.fn(),
      }
    };

    const app = buildApp(deps);

    const response = await app.inject({
      method: 'POST',
      url: '/api/media/123/auto-search',
      payload: { type: 'movie' },
    });

    expect(response.statusCode).toBe(200);
    expect(autoSearchMovie).toHaveBeenCalledWith(123);
    const body = JSON.parse(response.body);
    expect(body.data.release.title).toBe('Movie.Release');
  });

  it('calls autoSearchEpisode for type=episode and returns the result', async () => {
    const autoSearchEpisode = vi.fn().mockResolvedValue({ success: true, release: { title: 'Episode.Release' } });
    const deps: ApiDependencies = {
      prisma: {} as any,
      wantedSearchService: {
        autoSearchAll: vi.fn(),
        autoSearchMovie: vi.fn(),
        autoSearchEpisode,
        autoSearchSeries: vi.fn(),
      }
    };

    const app = buildApp(deps);

    const response = await app.inject({
      method: 'POST',
      url: '/api/media/456/auto-search',
      payload: { type: 'episode' },
    });

    expect(response.statusCode).toBe(200);
    expect(autoSearchEpisode).toHaveBeenCalledWith(456);
  });

  it('returns 404 when auto-search returns success=false', async () => {
    const autoSearchMovie = vi.fn().mockResolvedValue({ success: false, reason: 'No candidates' });
    const deps: ApiDependencies = {
      prisma: {} as any,
      wantedSearchService: {
        autoSearchAll: vi.fn(),
        autoSearchMovie,
        autoSearchEpisode: vi.fn(),
        autoSearchSeries: vi.fn(),
      }
    };

    const app = buildApp(deps);

    const response = await app.inject({
      method: 'POST',
      url: '/api/media/123/auto-search',
      payload: { type: 'movie' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('No candidates');
  });
});
