import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerSystemRoutes } from './systemRoutes';

function createApp(deps: Partial<ApiDependencies> = {}) {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSystemRoutes(app, { prisma: {}, ...deps });
  return app;
}

function createSystemHealthService() {
  return {
    getDiskSpace: vi.fn().mockResolvedValue([
      { path: '/media/movies', label: 'Movies', free: 500, total: 1000 },
    ]),
    getProcessInfo: vi.fn().mockReturnValue({
      version: 'v24.0.0',
      os: 'linux',
      isLinux: true,
      isWindows: false,
      isDocker: false,
      startTime: '2026-07-24T08:00:00.000Z',
      uptime: 60,
    }),
    checkDatabase: vi.fn().mockResolvedValue({
      status: 'ok',
      message: 'Database is healthy',
      version: '3.49.0',
      migration: 'current',
      location: '/config/mediarr.db',
    }),
    checkRootFolders: vi.fn().mockResolvedValue([
      {
        type: 'rootFolder',
        source: 'Movies',
        message: 'Movies is accessible',
        status: 'ok',
        lastChecked: '2026-07-24T08:01:00.000Z',
      },
    ]),
    detectFFmpeg: vi.fn().mockResolvedValue({ version: '7.0', status: 'ok' }),
  };
}

describe('GET /api/system/status', () => {
  it('returns an explicit unknown fallback when runtime health dependencies are absent', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      data: {
        health: { overall: 'ok' },
        database: { type: 'SQLite', version: 'unknown', migration: 'unknown' },
        diskSpace: [],
      },
    });
    await app.close();
  });

  it('uses configured settings paths and the real health-service results', async () => {
    const systemHealthService = createSystemHealthService();
    const settingsService = {
      get: vi.fn().mockResolvedValue({
        mediaManagement: {
          movieRootFolder: '/media/movies',
          tvRootFolder: '/media/tv',
        },
        torrentLimits: {
          incompleteDirectory: '/downloads/incomplete',
          completeDirectory: '/downloads/complete',
        },
      }),
      update: vi.fn(),
    };
    const app = createApp({ systemHealthService, settingsService });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.statusCode).toBe(200);
    expect(systemHealthService.getDiskSpace).toHaveBeenCalledWith([
      { path: '/media/movies', label: 'Movies' },
      { path: '/media/tv', label: 'TV Shows' },
      { path: '/downloads/incomplete', label: 'Downloads (Incomplete)' },
      { path: '/downloads/complete', label: 'Downloads (Complete)' },
    ]);
    expect(systemHealthService.checkRootFolders).toHaveBeenCalledWith([
      { path: '/media/movies', label: 'Movies' },
      { path: '/media/tv', label: 'TV Shows' },
    ]);
    expect(response.json()).toMatchObject({
      data: {
        health: { overall: 'ok' },
        database: { version: '3.49.0', migration: 'current' },
        diskSpace: [{ path: '/media/movies', label: 'Movies' }],
      },
    });
    await app.close();
  });

  it('exposes the live scheduler health snapshot when Scheduler is configured', async () => {
    const scheduler = {
      getHealth: vi.fn().mockReturnValue({
        scheduledTaskCount: 3,
        missedTaskCount: 1,
        lastRecoveryAt: '2026-07-24T08:00:00.000Z',
      }),
    };
    const app = createApp({
      scheduler: scheduler as unknown as ApiDependencies['scheduler'],
    });

    const response = await app.inject({ method: 'GET', url: '/api/system/status' });

    expect(response.json()).toMatchObject({
      data: {
        scheduler: {
          scheduledTaskCount: 3,
          missedTaskCount: 1,
          lastRecoveryAt: '2026-07-24T08:00:00.000Z',
        },
      },
    });
    expect(scheduler.getHealth).toHaveBeenCalledOnce();
    await app.close();
  });
});
