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

describe('GET /api/media/library', () => {
  let app: FastifyInstance;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      movie: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      series: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    const deps: ApiDependencies = {
      prisma: prismaMock,
    };

    app = buildApp(deps);
  });

  it('returns empty paginated response when no media exists', async () => {
    prismaMock.movie.findMany.mockResolvedValue([]);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toEqual([]);
    expect(body.meta).toMatchObject({
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 0,
    });
  });

  it('returns movies and series with unified shape', async () => {
    prismaMock.movie.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Inception',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        added: new Date('2024-01-15'),
        status: 'released',
        monitored: true,
      },
    ]);
    prismaMock.series.findMany.mockResolvedValue([
      {
        id: 2,
        title: 'Breaking Bad',
        year: 2008,
        posterUrl: 'https://example.com/breaking-bad.jpg',
        added: new Date('2024-02-20'),
        status: 'ended',
        monitored: true,
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(2);
    // Alphabetically sorted: Breaking Bad before Inception
    expect(body.data[0]).toMatchObject({
      id: 2,
      title: 'Breaking Bad',
      year: 2008,
      type: 'series',
      posterUrl: 'https://example.com/breaking-bad.jpg',
    });
    expect(body.data[1]).toMatchObject({
      id: 1,
      title: 'Inception',
      year: 2010,
      type: 'movie',
      posterUrl: 'https://example.com/inception.jpg',
    });
  });

  it('filters by type=movie', async () => {
    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, title: 'Movie 1', year: 2020, posterUrl: null, added: new Date(), status: 'released', monitored: true },
    ]);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('movie');
  });

  it('filters by type=series', async () => {
    prismaMock.movie.findMany.mockResolvedValue([]);
    prismaMock.series.findMany.mockResolvedValue([
      { id: 2, title: 'Series 1', year: 2021, posterUrl: null, added: new Date(), status: 'continuing', monitored: true },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=series',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('series');
  });

  it('sorts by title ascending', async () => {
    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, title: 'Z Movie', year: 2020, posterUrl: null, added: new Date(), status: 'released', monitored: true },
      { id: 2, title: 'A Movie', year: 2021, posterUrl: null, added: new Date(), status: 'released', monitored: true },
    ]);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie&sortBy=title&sortDir=asc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0].title).toBe('A Movie');
    expect(body.data[1].title).toBe('Z Movie');
  });

  it('sorts by year descending', async () => {
    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, title: 'Old Movie', year: 1990, posterUrl: null, added: new Date(), status: 'released', monitored: true },
      { id: 2, title: 'New Movie', year: 2024, posterUrl: null, added: new Date(), status: 'released', monitored: true },
    ]);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie&sortBy=year&sortDir=desc',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0].year).toBe(2024);
    expect(body.data[1].year).toBe(1990);
  });

  it('paginates results', async () => {
    const movies = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Movie ${i + 1}`,
      year: 2020,
      posterUrl: null,
      added: new Date(),
      status: 'released',
      monitored: true,
    }));
    prismaMock.movie.findMany.mockResolvedValue(movies);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie&page=1&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(10);
    expect(body.meta.totalCount).toBe(25);
    expect(body.meta.page).toBe(1);
    expect(body.meta.pageSize).toBe(10);
    expect(body.meta.totalPages).toBe(3);
  });

  it('returns second page correctly', async () => {
    const movies = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Movie ${i + 1}`,
      year: 2020,
      posterUrl: null,
      added: new Date(),
      status: 'released',
      monitored: true,
    }));
    prismaMock.movie.findMany.mockResolvedValue(movies);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie&page=2&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveLength(10);
    // Alphabetically: Movie 1, Movie 10-18 (page 1), Movie 19, Movie 2, Movie 20-25, Movie 3-4 (page 2)
    expect(body.data[0].title).toBe('Movie 19');
    expect(body.meta.page).toBe(2);
  });

  it('defaults sort to title ascending when invalid sortBy provided', async () => {
    prismaMock.movie.findMany.mockResolvedValue([
      { id: 1, title: 'B Movie', year: 2020, posterUrl: null, added: new Date(), status: 'released', monitored: true },
      { id: 2, title: 'A Movie', year: 2021, posterUrl: null, added: new Date(), status: 'released', monitored: true },
    ]);
    prismaMock.series.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/library?type=movie&sortBy=invalidField',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data[0].title).toBe('A Movie');
  });
});
