import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

describe('seriesRoutes search aggregation wiring', () => {
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
          title: 'Series.S01E01',
          size: 1200,
          seeders: 20,
          protocol: 'torrent',
        },
        {
          guid: 'release-2',
          indexer: 'Indexer Two',
          indexerId: 12,
          title: 'Series.S01E01.Alt',
          size: 1400,
          seeders: 10,
          protocol: 'torrent',
        },
      ],
      indexerResults: [],
      totalResults: 2,
      deduplicatedCount: 2,
    });

    deps = {
      prisma: {
        series: {
          findUnique: vi.fn().mockResolvedValue({
            id: 10,
            title: 'Series Name',
            tvdbId: 1234,
            qualityProfileId: 7,
          }),
        },
        episode: {
          findUnique: vi.fn(),
        },
      },
      searchAggregationService: {
        searchAllIndexers,
      },
    } as unknown as ApiDependencies;

    app = createApp(deps);
  });

  it('searches series releases with explicit season/episode parameters', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/series/10/search?page=1&pageSize=1',
      payload: {
        seasonNumber: 1,
        episodeNumber: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tvsearch',
      query: 'Series Name',
      tvdbId: 1234,
      season: 1,
      episode: 1,
      qualityProfileId: 7,
    }));

    const payload = response.json();
    expect(payload.meta.totalCount).toBe(2);
    expect(payload.data).toHaveLength(1);
  });

  it('derives season and episode from episodeId when not provided', async () => {
    (deps.prisma as any).episode.findUnique.mockResolvedValue({
      id: 99,
      seriesId: 10,
      seasonNumber: 3,
      episodeNumber: 4,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/series/10/search',
      payload: {
        episodeId: 99,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      season: 3,
      episode: 4,
      qualityProfileId: 7,
    }));
  });

  it('performs series-level search (no season/episode) with tvdbId only', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/series/10/search',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(searchAllIndexers).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tvsearch',
      tvdbId: 1234,
      qualityProfileId: 7,
    }));
    // season and episode must NOT be present for a series-level search
    const callArgs = searchAllIndexers.mock.calls[0][0];
    expect(callArgs.season).toBeUndefined();
    expect(callArgs.episode).toBeUndefined();
  });

  it('falls back to mediaSearchService when searchAggregationService is absent', async () => {
    const fallbackSearch = vi.fn().mockResolvedValue({
      releases: [],
      indexerResults: [],
      totalResults: 0,
      deduplicatedCount: 0,
    });

    const fallbackDeps = {
      ...deps,
      searchAggregationService: undefined,
      mediaSearchService: { searchAllIndexers: fallbackSearch },
    } as unknown as ApiDependencies;

    const fallbackApp = createApp(fallbackDeps);

    const response = await fallbackApp.inject({
      method: 'POST',
      url: '/api/series/10/search',
      payload: { seasonNumber: 2, episodeNumber: 5 },
    });

    expect(response.statusCode).toBe(200);
    expect(fallbackSearch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tvsearch',
      tvdbId: 1234,
      season: 2,
      episode: 5,
    }));
  });

  it('omits tvdbId from search params when series has no tvdbId', async () => {
    (deps.prisma as any).series.findUnique.mockResolvedValue({
      id: 10,
      title: 'No TVDB Series',
      tvdbId: null,
      qualityProfileId: 7,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/series/10/search',
      payload: { seasonNumber: 1 },
    });

    expect(response.statusCode).toBe(200);
    const callArgs = searchAllIndexers.mock.calls[0][0];
    expect(callArgs.tvdbId).toBeUndefined();
    expect(callArgs.season).toBe(1);
  });

  it('returns 400 when episodeId does not belong to the requested series', async () => {
    (deps.prisma as any).episode.findUnique.mockResolvedValue({
      id: 55,
      seriesId: 999, // different series
      seasonNumber: 1,
      episodeNumber: 1,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/series/10/search',
      payload: { episodeId: 55 },
    });

    expect(response.statusCode).toBe(422);
  });
});
