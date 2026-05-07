import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMovieRoutes } from './movieRoutes';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMovieRoutes(app, deps);
  return app;
}

describe('GET /api/movies/missing', () => {
  let app: FastifyInstance;
  let prismaMovie: any;

  beforeEach(() => {
    prismaMovie = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 1,
          title: 'Missing Movie',
          year: 2024,
          posterUrl: 'https://example.com/poster.jpg',
          status: 'released',
          monitored: true,
          cinemaDate: null,
          physicalRelease: null,
          digitalRelease: null,
          qualityProfileId: 1,
          added: new Date('2024-01-01'),
          path: null,
          hasFile: false,
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
    };

    const deps: ApiDependencies = {
      prisma: { movie: prismaMovie } as any,
    };

    app = buildApp(deps);
  });

  it('returns paginated missing movies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/movies/missing',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 1,
      title: 'Missing Movie',
      year: 2024,
      status: 'missing',
      monitored: true,
    });
    expect(body.meta.totalCount).toBe(1);
  });

  it('respects pagination params', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/movies/missing?page=1&pageSize=25',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(25);
  });

  it('filters by monitored status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/movies/missing?monitored=true',
    });

    expect(response.statusCode).toBe(200);
    expect(prismaMovie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ monitored: true }),
      })
    );
  });

  it('returns empty array when no missing movies', async () => {
    prismaMovie.findMany.mockResolvedValue([]);
    prismaMovie.count.mockResolvedValue(0);

    const response = await app.inject({
      method: 'GET',
      url: '/api/movies/missing',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(0);
    expect(body.meta.totalCount).toBe(0);
  });

  it('sorts by title ascending by default', async () => {
    prismaMovie.findMany.mockResolvedValue([
      { id: 1, title: 'Alpha', year: 2024, monitored: true, path: null, qualityProfileId: 1 },
      { id: 2, title: 'Beta', year: 2023, monitored: true, path: null, qualityProfileId: 1 },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/movies/missing?sortBy=title&sortDir=asc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0].title).toBe('Alpha');
    expect(body.data[1].title).toBe('Beta');
  });
});
