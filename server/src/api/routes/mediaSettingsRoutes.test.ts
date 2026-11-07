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
  adultRootFolder: '',
  movieNamingPattern: '',
  seriesNamingPattern: '',
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

  it('returns 422 when settingsService is not configured', async () => {
    const app2 = Fastify();
    const deps: ApiDependencies = { prisma: {} };
    app2.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerMediaSettingsRoutes(app2, deps);

    const response = await app2.inject({ method: 'GET', url: '/api/settings/media' });
    expect(response.statusCode).toBe(422);
  });
});

describe('mediaSettingsRoutes — PUT /api/settings/media', () => {
  let settingsService: ReturnType<typeof createSettingsServiceMock>;
  let app: FastifyInstance;

  beforeEach(() => {
    settingsService = createSettingsServiceMock();
    // The route merges onto the stored settings so a partial PUT cannot wipe unset fields.
    settingsService.get.mockResolvedValue(defaultAppSettings);
    app = createApp(settingsService);
  });

  it('saves mediaManagement via settingsService.update', async () => {
    const payload: MediaManagementSettings = {
      movieRootFolder: '/media/movies',
      tvRootFolder: '/media/tv',
      adultRootFolder: '/data/Porn',
      movieNamingPattern: '{Movie.Title}.{Release.Year}.{Quality.Full}.{MediaInfo.VideoCodec}',
      seriesNamingPattern: '{Series.Title}.S{season:00}E{episode:00}.{Episode.Title}.{Quality.Full}',
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
      adultRootFolder: '',
      movieNamingPattern: '',
      seriesNamingPattern: '',
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

  it('saves and returns adultRootFolder', async () => {
    const payload = {
      movieRootFolder: '/movies',
      tvRootFolder: '/tv',
      adultRootFolder: '/data/Porn',
      movieNamingPattern: '',
      seriesNamingPattern: '',
    };
    settingsService.update.mockResolvedValue({ ...defaultAppSettings, mediaManagement: payload });

    const response = await app.inject({ method: 'PUT', url: '/api/settings/media', payload });

    expect(response.statusCode).toBe(200);
    expect(settingsService.update).toHaveBeenCalledWith({ mediaManagement: payload });
    const body = JSON.parse(response.body) as { data: MediaManagementSettings };
    expect(body.data.adultRootFolder).toBe('/data/Porn');
  });

  it('keeps stored fields a partial update omits', async () => {
    const stored: MediaManagementSettings = {
      movieRootFolder: '/movies',
      tvRootFolder: '/tv',
      adultRootFolder: '/data/Porn',
      movieNamingPattern: '{Movie.Title}',
      seriesNamingPattern: '{Series.Title}',
    };
    settingsService.get.mockResolvedValue({ ...defaultAppSettings, mediaManagement: stored });
    settingsService.update.mockImplementation(async (patch: { mediaManagement: MediaManagementSettings }) => ({
      ...defaultAppSettings,
      mediaManagement: patch.mediaManagement,
    }));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: '/new-movies' },
    });

    expect(response.statusCode).toBe(200);
    expect(settingsService.update).toHaveBeenCalledWith({
      mediaManagement: { ...stored, movieRootFolder: '/new-movies' },
    });
  });

  it('returns 422 for non-string adultRootFolder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: '/movies', tvRootFolder: '/tv', adultRootFolder: 42 },
    });

    expect(response.statusCode).toBe(422);
  });

  it('returns 422 for non-string movieRootFolder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: 123, tvRootFolder: '/tv' },
    });

    expect(response.statusCode).toBe(422);
  });

  it('returns 422 for non-string tvRootFolder', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/settings/media',
      payload: { movieRootFolder: '/movies', tvRootFolder: 456 },
    });

    expect(response.statusCode).toBe(422);
  });
});
