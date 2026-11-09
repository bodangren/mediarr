import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerLibrarySearchRoutes } from './librarySearchRoutes';

function chain(rows: unknown[]) {
  const q: any = {};
  q.select = () => q;
  q.from = () => q;
  q.where = () => q;
  q.leftJoin = () => q;
  q.orderBy = () => q;
  q.limit = () => Promise.resolve(rows);
  return q;
}

function appWith(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerLibrarySearchRoutes(app, deps);
  return app;
}

describe('GET /api/library/search', () => {
  it('returns movies, series and episodes with metadata and respects the type filter', async () => {
    const rows = [
      chain([{ id: 1, title: 'Alien', year: 1979, posterUrl: '/p1' }]),
      chain([{ id: 2, title: 'Alien Nation', year: 1989, posterUrl: '/p2' }]),
      chain([{ id: 3, title: 'Alien Ship', seasonNumber: 1, episodeNumber: 2, seriesId: 2, seriesTitle: 'Alien Nation', seriesPosterUrl: '/p2' }]),
    ];
    const select = vi.fn(() => rows.shift() ?? chain([]));
    const deps = { prisma: { drizzle: { select } } } as unknown as ApiDependencies;

    const all = await appWith(deps).inject({ method: 'GET', url: '/api/library/search?q=alien' });
    expect(all.statusCode).toBe(200);
    const allItems = all.json().data.items;
    expect(allItems).toHaveLength(3);
    expect(allItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'movie', id: 1, title: 'Alien', year: 1979 }),
      expect.objectContaining({ type: 'series', id: 2, title: 'Alien Nation' }),
      expect.objectContaining({ type: 'episode', id: 3, title: 'Alien Ship', seriesId: 2, seasonNumber: 1, episodeNumber: 2 }),
    ]));

    const seriesRows = [chain([{ id: 2, title: 'Alien Nation', year: 1989, posterUrl: '/p2' }])];
    const seriesDeps = {
      prisma: { drizzle: { select: vi.fn(() => seriesRows.shift() ?? chain([])) } },
    } as unknown as ApiDependencies;
    const series = await appWith(seriesDeps).inject({ method: 'GET', url: '/api/library/search?q=alien&type=series' });
    expect(series.json().data.items).toHaveLength(1);
    expect(series.json().data.items[0].type).toBe('series');
  });

  it('rejects an empty query', async () => {
    const response = await appWith({ prisma: { drizzle: {} } } as unknown as ApiDependencies)
      .inject({ method: 'GET', url: '/api/library/search?q=' });
    expect(response.statusCode).toBe(422);
  });
});
