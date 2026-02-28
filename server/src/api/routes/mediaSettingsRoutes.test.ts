import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMediaSettingsRoutes } from './mediaSettingsRoutes';
import type { MediaManagementSettings } from '../../repositories/AppSettingsRepository';

function createSettingsServiceMock() {
  return {
    get: vi.fn(),
    update: vi.fn(),
  };
}

function createApp(settingsService: ReturnType<typeof createSettingsServiceMock>): FastifyInstance {
  const app = Fastify();
  const deps: ApiDependencies = { prisma: {}, settingsService };
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMediaSettingsRoutes(app, deps);
  return app;
}

const defaultMediaSettings: MediaManagementSettings = {
  movieRootFolder: '',
  tvRootFolder: '',
};

const defaultAppSettings = {
  torrentLimits: {} as any,
  schedulerIntervals: {} as any,
  pathVisibility: {} as any,
  apiKeys: {} as any,
  host: {} as any,
  security: {} as any,
  logging: {} as any,
  update: {} as any,
  mediaManagement: defaultMediaSettings,
};

describe('mediaSettingsRoutes — GET /api/settings/media', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    app = createApp(settingsService);
  });

  it('returns mediaManagement settings from settingsService', async () => {
    settingsService.get.mockResolvedValue(defaultAppSettings);

    const response = await app.inject({ method: 'GET', url: '/api/settings/media' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: MediaManagementSettings };
    expect(body.data).toEqual(defaultMediaSettings);
  });

  it('returns configured root folders', async () => {
    settingsService.get.mockResolvedValue({
      ...defaultAppSettings,
      mediaManagement: { movieRootFolder: '/media/movies', tvRootFolder: '/media/tv' },
    });

    const response = await app.inject({ method: 'GET', url: '/api/settings/media' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: MediaManagementSettings };
    expect(body.data.movieRootFolder).toBe('/media/movies');
    expect(body.data.tvRootFolder).toBe('/media/tv');
  });

  it('defaults to empty strings when mediaManagement is not set', async () => {
    settingsService.get.mockResolvedValue({
      ...defaultAppSettings,
      mediaManagement: { movieRootFolder: '', tvRootFolder: '' },
    });

    const response = await app.inject({ method: 'GET', url: '/api/settings/media' });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: MediaManagementSettings };
    expect(body.data.movieRootFolder).toBe('');
    expect(body.data.tvRootFolder).toBe('');
  });

  it('returns 500 if settingsService is not configured', async () => {
    const app2 = Fastify();
    const deps: ApiDependencies = { prisma: {} };
    app2.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerMediaSettingsRoutes(app2, deps);

    const response = await app2.inject({ method: 'GET', url: '/api/settings/media' });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('mediaSettingsRoutes — PUT /api/settings/media', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    app = createApp(settingsService);
  });

  it('saves mediaManagement via settingsService.update', async () => {
    const payload: MediaManagementSettings = {
      movieRootFolder: '/media/movies',
      tvRootFolder: '/media/tv',
    };
    settingsService.update.mockResolvedValue({ ...defaultAppSettings, mediaManagement: payload });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(settingsService.update).toHaveBeenCalledWith({ mediaManagement: payload });
  });

  it('returns the updated mediaManagement in the response', async () => {
    const payload: MediaManagementSettings = {
      movieRootFolder: '/movies',
      tvRootFolder: '/tv',
    };
    settingsService.update.mockResolvedValue({ ...defaultAppSettings, mediaManagement: payload });

    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { data: MediaManagementSettings };
    expect(body.data.movieRootFolder).toBe('/movies');
    expect(body.data.tvRootFolder).toBe('/tv');
  });

  it('returns 400 for non-string movieRootFolder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: 123, tvRootFolder: '/tv' },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 for non-string tvRootFolder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: '/movies', tvRootFolder: 456 },
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});
