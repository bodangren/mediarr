import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSetupRoutes } from './setupRoutes';
import type { ApiDependencies } from '../types';

function createApp(deps: Partial<ApiDependencies>): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSetupRoutes(app, { prisma: {}, ...deps });
  return app;
}

function createSettingsState(overrides?: Partial<any>) {
  return {
    torrentLimits: {
      maxActiveDownloads: 3,
      maxActiveSeeds: 3,
      globalDownloadLimitKbps: null,
      globalUploadLimitKbps: null,
      incompleteDirectory: '',
      completeDirectory: '',
      seedRatioLimit: 0,
      seedTimeLimitMinutes: 0,
      seedLimitAction: 'pause',
    },
    schedulerIntervals: {
      rssSyncMinutes: 15,
      availabilityCheckMinutes: 30,
      torrentMonitoringSeconds: 5,
    },
    pathVisibility: {
      showDownloadPath: true,
      showMediaPath: true,
    },
    apiKeys: {
      tmdbApiKey: null,
      openSubtitlesApiKey: null,
      assrtApiToken: null,
      subdlApiKey: null,
    },
    wantedLanguages: [],
    host: {
      bindAddress: '*',
      port: 9696,
      urlBase: '',
      sslPort: 9697,
      enableSsl: false,
      sslCertPath: null,
      sslKeyPath: null,
    },
    security: {
      authenticationRequired: false,
      authenticationMethod: 'none',
      apiKey: null,
    },
    logging: {
      logLevel: 'info',
      logSizeLimit: 1048576,
      logRetentionDays: 30,
    },
    update: {
      branch: 'master',
      autoUpdateEnabled: false,
      mechanicsEnabled: false,
      updateScriptPath: null,
      setupCompleted: false,
    },
    mediaManagement: {
      movieRootFolder: '',
      tvRootFolder: '',
    },
    streaming: {
      discoveryEnabled: true,
      discoveryServiceName: 'Mediarr',
      defaultUserId: 'lan-default',
      watchedThreshold: 0.9,
      subtitleDirectory: null,
    },
    ...overrides,
  };
}

describe('setupRoutes', () => {
  let settingsState: any;

  beforeEach(() => {
    settingsState = createSettingsState();
  });

  it('GET /api/setup/status returns unconfigured for fresh install', async () => {
    const settingsService = {
      get: vi.fn().mockImplementation(async () => settingsState),
      update: vi.fn(),
    };

    const indexerRepository = {
      findAll: vi.fn().mockResolvedValue([]),
    };

    const app = createApp({ settingsService, indexerRepository });
    const response = await app.inject({ method: 'GET', url: '/api/setup/status' });
    await app.close();

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data).toEqual({
      isConfigured: false,
      completedSteps: [],
    });
  });

  it('GET /api/setup/status returns configured when root folders and indexer exist', async () => {
    settingsState = createSettingsState({
      mediaManagement: {
        movieRootFolder: '/data/media/movies',
        tvRootFolder: '/data/media/tv',
      },
    });

    const settingsService = {
      get: vi.fn().mockImplementation(async () => settingsState),
      update: vi.fn(),
    };

    const indexerRepository = {
      findAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    };

    const app = createApp({ settingsService, indexerRepository });
    const response = await app.inject({ method: 'GET', url: '/api/setup/status' });
    await app.close();

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.isConfigured).toBe(true);
    expect(payload.data.completedSteps).toContain('rootFolders');
    expect(payload.data.completedSteps).toContain('indexers');
  });

  it('POST /api/setup/complete marks setup as completed', async () => {
    const settingsService = {
      get: vi.fn().mockImplementation(async () => settingsState),
      update: vi.fn().mockImplementation(async (partial: any) => {
        settingsState = {
          ...settingsState,
          update: {
            ...settingsState.update,
            ...partial.update,
          },
        };
        return settingsState;
      }),
    };

    const indexerRepository = {
      findAll: vi.fn().mockResolvedValue([]),
    };

    const app = createApp({ settingsService, indexerRepository });
    const response = await app.inject({ method: 'POST', url: '/api/setup/complete' });
    await app.close();

    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.ok).toBe(true);
    expect(settingsService.update).toHaveBeenCalledWith({
      update: { setupCompleted: true },
    });
    expect(payload.data.isConfigured).toBe(true);
    expect(payload.data.completedSteps).toContain('complete');
  });

  it('GET /api/setup/status falls back to prisma indexer count when repository is missing', async () => {
    settingsState = createSettingsState({
      mediaManagement: {
        movieRootFolder: '/data/media/movies',
        tvRootFolder: '/data/media/tv',
      },
    });

    const settingsService = {
      get: vi.fn().mockImplementation(async () => settingsState),
      update: vi.fn(),
    };

    const app = createApp({
      settingsService,
      prisma: {
        indexer: {
          count: vi.fn().mockResolvedValue(2),
        },
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/setup/status' });
    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.json().data.isConfigured).toBe(true);
  });

  it('POST /api/setup/complete returns 422 when settings service is unavailable', async () => {
    const app = createApp({});
    const response = await app.inject({ method: 'POST', url: '/api/setup/complete' });
    await app.close();

    expect(response.statusCode).toBe(422);
    const payload = response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('VALIDATION_ERROR');
  });
});
