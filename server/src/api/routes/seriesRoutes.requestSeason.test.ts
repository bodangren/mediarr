import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

/**
 * Owner request 2026-11-28: a season context menu that *requests* the missing parts. Requesting a
 * season means: monitor it (and its episodes), then hand the series to the search worker — the
 * wanted-search run does the grabbing and reports honestly.
 */
function createApp(seasons: Array<{ seasonNumber: number }>) {
  const seasonUpdates: number[][] = [];
  const episodeUpdates: number[][] = [];
  const prisma = {
    series: {
      findUnique: vi.fn(async () => ({ id: 5, title: 'Fargo', seasons })),
    },
    season: {
      updateMany: vi.fn(async (args: { where: { seasonNumber: { in: number[] } } }) => {
        seasonUpdates.push(args.where.seasonNumber.in);
        return { count: args.where.seasonNumber.in.length };
      }),
    },
    episode: {
      updateMany: vi.fn(async (args: { where: { seasonNumber: { in: number[] } } }) => {
        episodeUpdates.push(args.where.seasonNumber.in);
        return { count: 8 };
      }),
    },
  };
  const autoSearchSeries = vi.fn(async () => undefined);
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, {
    prisma,
    wantedSearchService: { autoSearchSeries },
  } as unknown as ApiDependencies);
  return { app, seasonUpdates, episodeUpdates, autoSearchSeries };
}

describe('POST /api/series/:id/seasons/:seasonNumber/request', () => {
  it('monitors the season and its episodes, then searches', async () => {
    const { app, seasonUpdates, episodeUpdates, autoSearchSeries } = createApp([
      { seasonNumber: 1 },
      { seasonNumber: 2 },
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/api/series/5/seasons/2/request',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      seriesId: 5,
      requested: [2],
      seasonsMonitored: 1,
      episodesMonitored: 8,
      searched: true,
    });
    expect(seasonUpdates).toEqual([[2]]);
    expect(episodeUpdates).toEqual([[2]]);
    expect(autoSearchSeries).toHaveBeenCalledWith(5);
    await app.close();
  });

  it('rejects a season the series does not have and a bad id', async () => {
    const { app } = createApp([{ seasonNumber: 1 }]);
    const missing = await app.inject({ method: 'POST', url: '/api/series/5/seasons/9/request' });
    expect(missing.statusCode).toBe(404);

    const badId = await app.inject({ method: 'POST', url: '/api/series/abc/seasons/1/request' });
    expect(badId.statusCode).toBe(422);
    await app.close();
  });
});

describe('POST /api/series/:id/request-missing-seasons', () => {
  it('defaults to every season of the series', async () => {
    const { app, seasonUpdates, autoSearchSeries } = createApp([{ seasonNumber: 1 }, { seasonNumber: 2 }]);

    const response = await app.inject({ method: 'POST', url: '/api/series/5/request-missing-seasons' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.requested).toEqual([1, 2]);
    expect(seasonUpdates).toEqual([[1, 2]]);
    expect(autoSearchSeries).toHaveBeenCalledWith(5);
    await app.close();
  });
});
