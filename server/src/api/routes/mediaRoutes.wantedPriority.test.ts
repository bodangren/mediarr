import { describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMediaRoutes } from './mediaRoutes';

const NOW = new Date();
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

function buildApp(progress: Array<Record<string, unknown>>): FastifyInstance {
  const drizzle = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve(progress)) })),
    })),
  };
  const deps = {
    prisma: { drizzle },
    wantedService: {
      getMissingEpisodes: vi.fn().mockResolvedValue([
        {
          id: 501,
          seriesId: 25,
          seasonNumber: 1,
          episodeNumber: 4,
          title: 'Backfill episode',
          monitored: true,
          airDateUtc: null,
          series: { id: 25, title: 'The 100', added: daysAgo(400) },
        },
        {
          id: 502,
          seriesId: 29,
          seasonNumber: 2,
          episodeNumber: 3,
          title: 'In-progress episode',
          monitored: true,
          airDateUtc: null,
          series: { id: 29, title: 'The Sopranos', added: daysAgo(400) },
        },
      ]),
    },
    mediaService: {
      getMovieCandidatesForSearch: vi.fn().mockResolvedValue([
        { id: 77, tmdbId: 1, title: 'Backfill movie', year: 1999, monitored: true, status: 'released', added: daysAgo(400) },
      ]),
    },
  } as unknown as ApiDependencies;
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMediaRoutes(app, deps);
  return app;
}

describe('GET /api/media/wanted — viewing priority', () => {
  it('puts the in-progress item first when no explicit sort is requested', async () => {
    const app = buildApp([
      { mediaId: 502, progress: 0.4, isWatched: 0, lastWatched: daysAgo(1) },
    ]);

    const response = await app.inject({ method: 'GET', url: '/api/media/wanted?pageSize=10' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ type: string; id: number; title: string }> };

    // 502 is in progress; the rest tie on backfill, where the model breaks ties movie-before-episode.
    expect(body.data.map((item) => item.id)).toEqual([502, 77, 501]);
    expect(body.data[0]?.title).toBe('In-progress episode');
  });

  it('honours an explicit sortBy instead of the priority order', async () => {
    const app = buildApp([
      { mediaId: 502, progress: 0.4, isWatched: 0, lastWatched: daysAgo(1) },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/wanted?pageSize=10&sortBy=title&sortDir=asc',
    });
    const body = JSON.parse(response.body) as { data: Array<{ title: string }> };
    expect(body.data.map((item) => item.title)).toEqual([
      'Backfill episode',
      'Backfill movie',
      'In-progress episode',
    ]);
  });
});
