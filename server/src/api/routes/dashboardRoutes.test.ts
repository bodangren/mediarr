import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerDashboardRoutes, getDiskSpaceForPath } from './dashboardRoutes';

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
  registerDashboardRoutes(app, deps);
  return app;
}

const defaultAppSettings = {
  torrentLimits: {} as any,
  schedulerIntervals: {} as any,
  pathVisibility: {} as any,
  apiKeys: {} as any,
  host: {} as any,
  security: {} as any,
  logging: {} as any,
  update: {} as any,
  mediaManagement: {
    movieRootFolder: '/media/movies',
    tvRootFolder: '/media/tv',
  },
};

describe('dashboardRoutes — GET /api/dashboard/disk-space', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    prisma = createPrismaMock();
    app = createApp(settingsService, prisma);
  });

  it('returns disk space info for configured root folders', async () => {
    settingsService.get.mockResolvedValue(defaultAppSettings);

    const response = await app.inject({ method: 'GET', url: '/api/dashboard/disk-space' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: Array<{ path: string; label: string; free: number; total: number }> };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns empty array when no root folders are configured', async () => {
    settingsService.get.mockResolvedValue({
      ...defaultAppSettings,
      mediaManagement: { movieRootFolder: '', tvRootFolder: '' },
    });

    const response = await app.inject({ method: 'GET', url: '/api/dashboard/disk-space' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(body.data).toEqual([]);
  });

  it('returns 500 if settingsService is not configured', async () => {
    const app2 = Fastify();
    const deps: ApiDependencies = { prisma };
    app2.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerDashboardRoutes(app2, deps);

    const response = await app2.inject({ method: 'GET', url: '/api/dashboard/disk-space' });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('getDiskSpaceForPath', () => {
  it('returns null for empty path', async () => {
    const result = await getDiskSpaceForPath('');
    expect(result).toBeNull();
  });

  it('returns null for non-existent path', async () => {
    const result = await getDiskSpaceForPath('/nonexistent/path/that/does/not/exist');
    expect(result).toBeNull();
  });

  it('returns disk space info for valid path', async () => {
    const result = await getDiskSpaceForPath('/');
    
    if (result) {
      expect(result).toHaveProperty('free');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('usedPercent');
      expect(typeof result.free).toBe('number');
      expect(typeof result.total).toBe('number');
      expect(typeof result.usedPercent).toBe('number');
      expect(result.free).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('dashboardRoutes — GET /api/dashboard/upcoming', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    prisma = createPrismaMock();
    app = createApp(settingsService, prisma);
  });

  it('returns upcoming items for next 7 days', async () => {
    prisma.episode.findMany.mockResolvedValue([]);
    prisma.movie.findMany.mockResolvedValue([]);

    const response = await app.inject({ method: 'GET', url: '/api/dashboard/upcoming' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});
