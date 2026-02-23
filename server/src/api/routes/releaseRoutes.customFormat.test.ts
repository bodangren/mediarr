import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerReleaseRoutes } from './releaseRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerReleaseRoutes(app, deps);
  return app;
}

describe('releaseRoutes custom format scoring wiring', () => {
  let searchAllIndexers: ReturnType<typeof vi.fn>;
  let deps: ApiDependencies;
  let app: FastifyInstance;

  beforeEach(() => {
    searchAllIndexers = vi.fn().mockResolvedValue({
      releases: [],
      totalResults: 0,
      deduplicatedCount: 0,
      indexerResults: [],
    });

    deps = {
      prisma: {
        series: {
          findFirst: vi.fn(),
        },
        movie: {
          findFirst: vi.fn(),
        },
      },
      mediaSearchService: {
        searchAllIndexers,
      },
    } as unknown as ApiDependencies;

    app = createApp(deps);
  });

  it('resolves quality profile from series by tvdbId and passes it to search', async () => {
    (deps.prisma as any).series.findFirst.mockResolvedValue({ qualityProfileId: 4 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/releases/search',
      payload: {
        type: 'tvsearch',
        tvdbId: 121361,
        season: 1,
        episode: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect((deps.prisma as any).series.findFirst).toHaveBeenCalledWith({
      where: { tvdbId: 121361 },
      select: { qualityProfileId: true },
    });
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tvsearch',
      tvdbId: 121361,
      season: 1,
      episode: 1,
      qualityProfileId: 4,
    }));
  });

  it('uses explicit qualityProfileId from request body without metadata lookup', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/releases/search',
      payload: {
        type: 'movie',
        tmdbId: 603,
        qualityProfileId: 10,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      type: 'movie',
      tmdbId: 603,
      qualityProfileId: 10,
    }));
    expect((deps.prisma as any).movie.findFirst).not.toHaveBeenCalled();
  });
});
