import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSeriesRoutes } from './seriesRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSeriesRoutes(app, deps);
  return app;
}

describe('GET /api/episodes/missing', () => {
  let app: FastifyInstance;
  let prismaEpisode: any;

  beforeEach(() => {
    prismaEpisode = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          seriesId: 10,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'Pilot',
          airDateUtc: new Date('2024-01-01'),
          monitored: true,
          path: null,
          series: {
            id: 10,
            title: 'Test Series',
            posterUrl: 'https://example.com/series-poster.jpg',
          },
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
    };

    const deps: ApiDependencies = {
      prisma: { episode: prismaEpisode } as any,
    };

    app = buildApp(deps);
  });

  it('returns paginated missing episodes', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/episodes/missing',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 1,
      seriesId: 10,
      seasonNumber: 1,
      episodeNumber: 1,
      episodeTitle: 'Pilot',
      seriesTitle: 'Test Series',
      status: 'missing',
      monitored: true,
    });
    expect(body.meta.totalCount).toBe(1);
  });

  it('respects pagination params', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/episodes/missing?page=1&pageSize=25',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(25);
  });

  it('filters by seriesId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/episodes/missing?seriesId=10',
    });

    expect(response.statusCode).toBe(200);
    expect(prismaEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ seriesId: 10 }),
      })
    );
  });

  it('returns empty array when no missing episodes', async () => {
    prismaEpisode.findMany.mockResolvedValue([]);
    prismaEpisode.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/api/episodes/missing',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(0);
    expect(body.meta.totalCount).toBe(0);
  });

  it('sorts by airDate by default', async () => {
    prismaEpisode.findMany.mockResolvedValue([
      {
        id: 1,
        seriesId: 10,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Episode 1',
        airDateUtc: new Date('2024-01-01'),
        monitored: true,
        path: null,
        series: { id: 10, title: 'Series A', posterUrl: null },
      },
      {
        id: 2,
        seriesId: 11,
        seasonNumber: 1,
        episodeNumber: 2,
        title: 'Episode 2',
        airDateUtc: new Date('2024-01-15'),
        monitored: true,
        path: null,
        series: { id: 11, title: 'Series B', posterUrl: null },
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/episodes/missing?sortBy=airDate&sortDir=desc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(new Date(body.data[0].airDate)).toBeInstanceOf(Date);
  });
});
