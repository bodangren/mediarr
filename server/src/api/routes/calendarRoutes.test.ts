import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerCalendarRoutes } from './calendarRoutes';

function createSettingsServiceMock() {
  return {
    get: vi.fn(),
    update: vi.fn(),
  };
}

function createPrismaMock() {
  return {
    movie: {
      findMany: vi.fn(),
    },
    series: {
      findMany: vi.fn(),
    },
    episode: {
      findMany: vi.fn(),
    },
  };
}

function createApp(
  settingsService: ReturnType<typeof createSettingsServiceMock>,
  prisma: ReturnType<typeof createPrismaMock>,
): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = { prisma, settingsService };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerCalendarRoutes(app, deps);
  return app;
}

describe('calendarRoutes — GET /api/calendar', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    prisma = createPrismaMock();
    app = createApp(settingsService, prisma);
  });

  it('returns calendar items for the specified date range', async () => {
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns episodes with correct status', async () => {
    const pastDate = new Date('2026-02-01T12:00:00.000Z');
    prisma.episode.findMany.mockResolvedValue([
      {
        id: 1,
        seriesId: 10,
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Test Episode',
        airDateUtc: pastDate,
        monitored: true,
        series: { id: 10, title: 'Test Series' },
        fileVariants: [],
      },
    ]);
    prisma.movie.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-01-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ id: number; type: string; status: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 1,
      type: 'episode',
      status: 'missing',
    });
  });

  it('returns movies with correct status', async () => {
    const releaseDate = new Date('2026-03-15T12:00:00.000Z');
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([
      {
        id: 100,
        title: 'Test Movie',
        physicalRelease: releaseDate,
        monitored: true,
        fileVariants: [{ id: 1 }],
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ id: number; type: string; status: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: 100,
      type: 'movie',
      status: 'downloaded',
    });
  });

  it('only returns monitored episodes', async () => {
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([]);

    await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(prisma.episode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          monitored: true,
        }),
      }),
    );
  });

  it('only returns monitored movies', async () => {
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([]);

    await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(prisma.movie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          monitored: true,
        }),
      }),
    );
  });

  it('requires start and end date parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
    });

    expect(response.statusCode).toBe(422);
  });

  it('validates date format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: 'invalid', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('sorts calendar items by date', async () => {
    prisma.episode.findMany.mockResolvedValue([
      {
        id: 2,
        seriesId: 10,
        seasonNumber: 1,
        episodeNumber: 2,
        title: 'Later Episode',
        airDateUtc: new Date('2026-03-15T12:00:00.000Z'),
        monitored: true,
        series: { id: 10, title: 'Test Series' },
        fileVariants: [],
      },
    ]);
    prisma.movie.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Earlier Movie',
        physicalRelease: new Date('2026-03-10T12:00:00.000Z'),
        monitored: true,
        fileVariants: [],
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ id: number; date: string }> };
    expect(body.data).toHaveLength(2);
    
    const dates = body.data.map(item => item.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('includes episode details in response', async () => {
    prisma.episode.findMany.mockResolvedValue([
      {
        id: 1,
        seriesId: 10,
        seasonNumber: 2,
        episodeNumber: 5,
        title: 'Episode Title',
        airDateUtc: new Date('2026-03-10T12:00:00.000Z'),
        monitored: true,
        series: { id: 10, title: 'Series Title' },
        fileVariants: [],
      },
    ]);
    prisma.movie.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ episodeTitle: string; seasonNumber: number; episodeNumber: number }> };
    expect(body.data[0]).toMatchObject({
      episodeTitle: 'Episode Title',
      seasonNumber: 2,
      episodeNumber: 5,
    });
  });

  it('picks most relevant movie release date in range', async () => {
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Test Movie',
        inCinemas: new Date('2026-03-05T12:00:00.000Z'),
        digitalRelease: new Date('2026-03-10T12:00:00.000Z'),
        physicalRelease: new Date('2026-03-15T12:00:00.000Z'),
        monitored: true,
        fileVariants: [],
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/api/calendar',
      query: { start: '2026-03-01', end: '2026-03-31' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ date: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].date).toBe('2026-03-10');
  });
});
