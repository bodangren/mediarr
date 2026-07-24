import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerLibraryRoutes } from './libraryRoutes';

function createApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerLibraryRoutes(app, deps);
  return app;
}

describe('POST /api/library/scan registered handler', () => {
  let app: FastifyInstance;
  let settingsGet: ReturnType<typeof vi.fn>;
  let scanAll: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    settingsGet = vi.fn();
    scanAll = vi.fn();
    app = createApp({
      prisma: {},
      settingsService: { get: settingsGet, update: vi.fn() },
      libraryScanService: { scanAll },
    } as ApiDependencies);
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes configured roots to the scanner and returns the exact summary envelope', async () => {
    settingsGet.mockResolvedValue({
      mediaManagement: {
        movieRootFolder: '/media/movies',
        tvRootFolder: '/media/tv',
      },
    });
    const summary = {
      moviesAdded: 2,
      moviesMissing: 1,
      tvEpisodesAdded: 4,
      tvEpisodesMissing: 3,
      subtitleFilesDetected: 5,
      durationMs: 17,
    };
    scanAll.mockResolvedValue(summary);

    const response = await app.inject({
      method: 'POST',
      url: '/api/library/scan',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, data: summary });
    expect(settingsGet).toHaveBeenCalledOnce();
    expect(scanAll).toHaveBeenCalledWith({
      movieRootFolder: '/media/movies',
      tvRootFolder: '/media/tv',
    });
  });

  it('uses explicit empty roots when settings are unavailable', async () => {
    const noSettingsApp = createApp({
      prisma: {},
      libraryScanService: { scanAll },
    } as ApiDependencies);
    scanAll.mockResolvedValue({
      moviesAdded: 0,
      moviesMissing: 0,
      tvEpisodesAdded: 0,
      tvEpisodesMissing: 0,
      subtitleFilesDetected: 0,
      durationMs: 0,
    });

    const response = await noSettingsApp.inject({
      method: 'POST',
      url: '/api/library/scan',
    });

    expect(response.statusCode).toBe(200);
    expect(scanAll).toHaveBeenCalledWith({
      movieRootFolder: '',
      tvRootFolder: '',
    });
    await noSettingsApp.close();
  });

  it('returns an explicit failure when the scan service is not configured', async () => {
    const noScannerApp = createApp({ prisma: {} } as ApiDependencies);

    const response = await noScannerApp.inject({
      method: 'POST',
      url: '/api/library/scan',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: 'Library scan service is not configured',
    });
    await noScannerApp.close();
  });

  it('propagates settings failures through the API error contract', async () => {
    settingsGet.mockRejectedValue(new Error('settings unavailable'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/library/scan',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'settings unavailable',
        retryable: false,
        path: '/api/library/scan',
      },
    });
    expect(scanAll).not.toHaveBeenCalled();
  });

  it('propagates scanner failures instead of fabricating a successful summary', async () => {
    settingsGet.mockResolvedValue({
      mediaManagement: {
        movieRootFolder: '/media/movies',
        tvRootFolder: '/media/tv',
      },
    });
    scanAll.mockRejectedValue(new Error('scan failed'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/library/scan',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'scan failed',
        retryable: false,
        path: '/api/library/scan',
      },
    });
  });
});
