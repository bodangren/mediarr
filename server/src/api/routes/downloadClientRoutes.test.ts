import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerDownloadClientRoutes } from './downloadClientRoutes';
import { DEFAULT_APP_SETTINGS, type TorrentLimitsSettings } from '../../repositories/AppSettingsRepository';

function createSettingsServiceMock() {
  return {
    get: vi.fn(),
    update: vi.fn(),
  };
}

function createTorrentManagerMock() {
  return {
    addTorrent: vi.fn(),
    pauseTorrent: vi.fn(),
    resumeTorrent: vi.fn(),
    removeTorrent: vi.fn(),
    setSpeedLimits: vi.fn(),
    setDownloadPaths: vi.fn(),
    getTorrentsStatus: vi.fn(),
    getTorrentStatus: vi.fn(),
    getActiveTorrents: vi.fn(),
  };
}

function createApp(
  settingsService: ReturnType<typeof createSettingsServiceMock>,
  torrentManager?: ReturnType<typeof createTorrentManagerMock>,
): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = {
    prisma: {},
    settingsService,
    ...(torrentManager ? { torrentManager } : {}),
  };

  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerDownloadClientRoutes(app, deps);
  return app;
}

const defaultTorrentLimits: TorrentLimitsSettings = {
  maxActiveDownloads: 3,
  maxActiveSeeds: 3,
  globalDownloadLimitKbps: null,
  globalUploadLimitKbps: null,
  incompleteDirectory: '/downloads/incomplete',
  completeDirectory: '/downloads/complete',
  seedRatioLimit: 0,
  seedTimeLimitMinutes: 0,
  seedLimitAction: 'pause',
};

describe('downloadClientRoutes — GET /api/download-client', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    app = createApp(settingsService);
  });

  it('returns torrentLimits from settingsService', async () => {
    settingsService.get.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: defaultTorrentLimits,
    });

    const response = await app.inject({ method: 'GET', url: '/api/download-client' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: TorrentLimitsSettings };
    expect(body.data).toEqual(defaultTorrentLimits);
    expect(settingsService.get).toHaveBeenCalledTimes(1);
  });

  it('returns custom torrentLimits values', async () => {
    const custom: TorrentLimitsSettings = {
      maxActiveDownloads: 5,
      maxActiveSeeds: 10,
      globalDownloadLimitKbps: 1024,
      globalUploadLimitKbps: 512,
      incompleteDirectory: '/tmp/incomplete',
      completeDirectory: '/media/complete',
      seedRatioLimit: 1.5,
      seedTimeLimitMinutes: 60,
      seedLimitAction: 'remove',
    };

    settingsService.get.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: custom,
    });

    const response = await app.inject({ method: 'GET', url: '/api/download-client' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: TorrentLimitsSettings };
    expect(body.data.incompleteDirectory).toBe('/tmp/incomplete');
    expect(body.data.completeDirectory).toBe('/media/complete');
    expect(body.data.seedRatioLimit).toBe(1.5);
    expect(body.data.seedTimeLimitMinutes).toBe(60);
    expect(body.data.seedLimitAction).toBe('remove');
  });

  it('returns 500 if settingsService is not configured', async () => {
    const appNoSettings = Fastify();
    const deps: ApiDependencies = { prisma: {} };
    appNoSettings.setErrorHandler((error, request, reply) =>
      registerApiErrorHandler(request, reply, error),
    );
    registerDownloadClientRoutes(appNoSettings, deps);

    const response = await appNoSettings.inject({ method: 'GET', url: '/api/download-client' });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('downloadClientRoutes — PUT /api/download-client', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let torrentManager: ReturnType<typeof createTorrentManagerMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    torrentManager = createTorrentManagerMock();
    app = createApp(settingsService, torrentManager);
  });

  it('saves torrentLimits via settingsService.update', async () => {
    settingsService.update.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: defaultTorrentLimits,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload: defaultTorrentLimits,
    });

    expect(response.statusCode).toBe(200);
    expect(settingsService.update).toHaveBeenCalledWith({
      torrentLimits: defaultTorrentLimits,
    });
  });

  it('calls torrentManager.setSpeedLimits with download and upload values', async () => {
    const payload: TorrentLimitsSettings = {
      ...defaultTorrentLimits,
      globalDownloadLimitKbps: 500,
      globalUploadLimitKbps: 100,
    };

    settingsService.update.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: payload,
    });
    torrentManager.setSpeedLimits.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(torrentManager.setSpeedLimits).toHaveBeenCalledWith({
      download: 500,
      upload: 100,
    });
    expect(torrentManager.setDownloadPaths).toHaveBeenCalledWith({
      incomplete: payload.incompleteDirectory,
      complete: payload.completeDirectory,
      seedRatioLimit: payload.seedRatioLimit,
      seedTimeLimitMinutes: payload.seedTimeLimitMinutes,
      seedLimitAction: payload.seedLimitAction,
      maxActiveDownloads: payload.maxActiveDownloads,
    });
  });

  it('does not fail if torrentManager is not configured', async () => {
    const appNoManager = createApp(settingsService, undefined);
    settingsService.update.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: defaultTorrentLimits,
    });

    const response = await appNoManager.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload: defaultTorrentLimits,
    });

    expect(response.statusCode).toBe(200);
  });

  it('returns 400 for invalid seedLimitAction', async () => {
    const payload = {
      ...defaultTorrentLimits,
      seedLimitAction: 'delete', // invalid
    };

    const response = await app.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload,
    });

    expect(response.statusCode).toBe(422);
  });

  it('returns 400 for empty download directories', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload: {
        ...defaultTorrentLimits,
        incompleteDirectory: '   ',
      },
    });

    expect(response.statusCode).toBe(422);
  });

  it('returns the updated torrentLimits in the response', async () => {
    const updated: TorrentLimitsSettings = {
      ...defaultTorrentLimits,
      incompleteDirectory: '/dl/in',
      completeDirectory: '/dl/done',
      seedRatioLimit: 2.0,
      seedTimeLimitMinutes: 90,
      seedLimitAction: 'remove',
    };

    settingsService.update.mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      torrentLimits: updated,
    });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/download-client',
      payload: updated,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: TorrentLimitsSettings };
    expect(body.data.incompleteDirectory).toBe('/dl/in');
    expect(body.data.completeDirectory).toBe('/dl/done');
    expect(body.data.seedRatioLimit).toBe(2.0);
    expect(body.data.seedLimitAction).toBe('remove');
  });
});
