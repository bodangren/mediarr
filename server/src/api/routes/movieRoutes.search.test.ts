import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('movieRoutes search aggregation wiring', () => {
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let deps: ApiDependencies;
  let app: FastifyInstance;

  beforeEach(() => {
    searchAllIndexers = vi.fn().mockResolvedValue({
      releases: [
        {
          guid: 'release-1',
          indexer: 'Indexer One',
          indexerId: 11,
          title: 'Movie.2025.1080p',
          size: 2200,
          seeders: 30,
          protocol: 'torrent',
        },
      ],
      indexerResults: [],
      totalResults: 1,
      deduplicatedCount: 1,
    });

    deps = {
      prisma: {
        movie: {
          findUnique: vi.fn().mockResolvedValue({
            id: 8,
            title: 'Movie Name',
            year: 2025,
            tmdbId: 500,
            imdbId: 'tt0123456',
            qualityProfileId: 6,
          }),
        },
      },
      searchAggregationService: {
        searchAllIndexers,
      },
    } as unknown as ApiDependencies;

    app = createApp(deps);
  });

  it('searches movie releases from movie id context', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/movies/8/search',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      type: 'movie',
      title: 'Movie Name',
      year: 2025,
      tmdbId: 500,
      imdbId: 'tt0123456',
      qualityProfileId: 6,
    }));
  });

  it('allows override payload values', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/movies/8/search',
      payload: {
        title: 'Different Title',
        year: 2030,
        qualityProfileId: 9,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Different Title',
      year: 2030,
      qualityProfileId: 9,
    }));
  });
});
