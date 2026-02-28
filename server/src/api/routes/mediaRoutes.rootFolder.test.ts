import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { registerMediaRoutes } from './mediaRoutes';
import { DEFAULT_APP_SETTINGS } from '../../repositories/AppSettingsRepository';

function buildApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMediaRoutes(app, deps);
  return app;
}

function makeSettingsService(movieRootFolder = '', tvRootFolder = '') {
  return {
    get: vi.fn().mockResolvedValue({
      ...DEFAULT_APP_SETTINGS,
      mediaManagement: { movieRootFolder, tvRootFolder },
    }),
    update: vi.fn(),
  };
}

describe('POST /api/media — default path from root folder', () => {
  let upsertMovie: ReturnType<typeof vi.fn>;
  let upsertSeries: ReturnType<typeof vi.fn>;
  let findMovieByTmdbId: ReturnType<typeof vi.fn>;
  let findSeriesByTvdbId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsertMovie = vi.fn().mockResolvedValue({ id: 1, title: 'Iron Man', tmdbId: 1726, path: null });
    upsertSeries = vi.fn().mockResolvedValue({ id: 2, title: 'Breaking Bad', tvdbId: 81189 });
    findMovieByTmdbId = vi.fn().mockResolvedValue(null);
    findSeriesByTvdbId = vi.fn().mockResolvedValue(null);
  });

  it('sets movie.path to movieRootFolder/Title (Year) when movieRootFolder is configured', async () => {
    const app = buildApp({
      prisma: {} as any,
      settingsService: makeSettingsService('/media/movies'),
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { mediaType: 'MOVIE', tmdbId: 1726, title: 'Iron Man', year: 2008 },
    });

    expect(upsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/media/movies/Iron Man (2008)' }),
    );
  });

  it('sets series.path to tvRootFolder/Title (Year) when tvRootFolder is configured', async () => {
    const app = buildApp({
      prisma: {} as any,
      settingsService: makeSettingsService('', '/media/tv'),
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { mediaType: 'TV', tvdbId: 81189, title: 'Breaking Bad', year: 2008 },
    });

    expect(upsertSeries).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/media/tv/Breaking Bad (2008)' }),
    );
  });

  it('leaves movie.path null when movieRootFolder is empty', async () => {
    const app = buildApp({
      prisma: {} as any,
      settingsService: makeSettingsService(''),
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { mediaType: 'MOVIE', tmdbId: 1726, title: 'Iron Man', year: 2008 },
    });

    expect(upsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ path: null }),
    );
  });

  it('leaves series.path null when tvRootFolder is empty', async () => {
    const app = buildApp({
      prisma: {} as any,
      settingsService: makeSettingsService('', ''),
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { mediaType: 'TV', tvdbId: 81189, title: 'Breaking Bad', year: 2008 },
    });

    expect(upsertSeries).toHaveBeenCalledWith(
      expect.objectContaining({ path: null }),
    );
  });

  it('leaves movie.path null when settingsService is not configured', async () => {
    const app = buildApp({
      prisma: {} as any,
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/media',
      payload: { mediaType: 'MOVIE', tmdbId: 1726, title: 'Iron Man', year: 2008 },
    });

    expect(upsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ path: null }),
    );
  });
});

describe('POST /api/wanted — default path from root folder', () => {
  let upsertMovie: ReturnType<typeof vi.fn>;
  let upsertSeries: ReturnType<typeof vi.fn>;
  let findMovieByTmdbId: ReturnType<typeof vi.fn>;
  let findSeriesByTvdbId: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsertMovie = vi.fn().mockResolvedValue({ id: 1, title: 'Iron Man', tmdbId: 1726 });
    upsertSeries = vi.fn().mockResolvedValue({ id: 2, title: 'Breaking Bad', tvdbId: 81189 });
    findMovieByTmdbId = vi.fn().mockResolvedValue(null);
    findSeriesByTvdbId = vi.fn().mockResolvedValue(null);
  });

  it('sets movie.path to movieRootFolder/Title (Year) via /api/wanted', async () => {
    const app = buildApp({
      prisma: {} as any,
      settingsService: makeSettingsService('/movies'),
      mediaRepository: { findMovieByTmdbId, upsertMovie, upsertSeries, findSeriesByTvdbId } as any,
    });

    await app.inject({
      method: 'POST',
      url: '/api/wanted',
      payload: { mediaType: 'MOVIE', tmdbId: 1726, title: 'Iron Man', year: 2008 },
    });

    expect(upsertMovie).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/movies/Iron Man (2008)' }),
    );
  });
});
