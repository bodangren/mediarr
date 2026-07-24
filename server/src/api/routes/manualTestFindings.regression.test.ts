/**
 * Regression tests for manual test findings (April 17)
 * 
 * Issues to cover:
 * 1. Movie search returns zero results when TV search works
 * 2. TV add fails with FOREIGN KEY constraint failure
 * 3. SSE event name contract (torrent:progress vs torrent:stats)
 */

import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { MetadataProvider } from '../../services/MetadataProvider';
import { SettingsService } from '../../services/SettingsService';
import { HttpClient } from '../../indexers/HttpClient';
import { registerMediaRoutes } from './mediaRoutes';
import { ApiEventHub } from '../../api/eventHub';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { createApiServer } from '../createApiServer';

// Mocks
const mockFetch = vi.fn();

const mockSettingsService = {
  get: vi.fn(),
} as unknown as SettingsService;

const mockHttpClient = {
  get: vi.fn(),
} as unknown as HttpClient;

const apps: FastifyInstance[] = [];

function buildMediaApp(deps: ApiDependencies): FastifyInstance {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerMediaRoutes(app, deps);
  apps.push(app);
  return app;
}

describe('Manual Test Findings - Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(apps.splice(0).map(app => app.close()));
  });

  describe('Movie Search Empty Results Bug', () => {
    it('should return both TV and movie results in unified search', async () => {
      // Arrange: Mock TMDB API returning movie results
      mockSettingsService.get = vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: 'test-api-key' },
      });

      // Mock TMDB movie search response
      mockHttpClient.get = vi.fn().mockImplementation((url: string) => {
        if (url.includes('api.themoviedb.org')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            body: JSON.stringify({
              results: [
                {
                  id: 123,
                  title: 'Test Movie',
                  status: 'Released',
                  overview: 'A test movie',
                  release_date: '2024-01-15',
                  popularity: 100,
                  poster_path: '/test.jpg',
                },
              ],
            }),
          });
        }
        // SkyHook TV search
        return Promise.resolve({
          ok: true,
          status: 200,
          body: JSON.stringify([
            {
              tvdbId: 456,
              title: 'Test Series',
              status: 'continuing',
              overview: 'A test series',
              year: 2023,
              network: 'Test Network',
              images: [],
            },
          ]),
        });
      });

      const provider = new MetadataProvider(mockHttpClient, mockSettingsService);

      // Act: Unified search (no mediaType specified)
      const results = await provider.searchMedia({ term: 'test' }, mockFetch);

      // Assert: Should have both TV and movie results
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.mediaType === 'TV')).toBe(true);
      expect(results.some(r => r.mediaType === 'MOVIE')).toBe(true);
    });

    it('should handle TMDB API errors gracefully without breaking TV results', async () => {
      // Arrange: TMDB fails but SkyHook succeeds
      mockSettingsService.get = vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: 'test-api-key' },
      });

      mockHttpClient.get = vi.fn().mockImplementation((url: string) => {
        if (url.includes('api.themoviedb.org')) {
          // TMDB API fails
          return Promise.reject(new Error('TMDB API Error'));
        }
        // SkyHook TV search succeeds
        return Promise.resolve({
          ok: true,
          status: 200,
          body: JSON.stringify([
            {
              tvdbId: 456,
              title: 'Test Series',
              status: 'continuing',
              overview: 'A test series',
              year: 2023,
              network: 'Test Network',
              images: [],
            },
          ]),
        });
      });

      const provider = new MetadataProvider(mockHttpClient, mockSettingsService);

      // Act
      const results = await provider.searchMedia({ term: 'test' }, mockFetch);

      // Assert: Should still have TV results even if movies fail
      expect(results.some(r => r.mediaType === 'TV')).toBe(true);
    });

    it('should handle missing TMDB API key gracefully', async () => {
      // Arrange: No TMDB API key configured
      mockSettingsService.get = vi.fn().mockResolvedValue({
        apiKeys: { tmdbApiKey: undefined },
      });

      mockHttpClient.get = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: JSON.stringify([]),
      });

      const provider = new MetadataProvider(mockHttpClient, mockSettingsService);

      // Act & Assert: Should throw validation error for movie-only search
      await expect(
        provider.searchMedia({ term: 'test', mediaType: 'MOVIE' }, mockFetch)
      ).rejects.toThrow('TMDB API Key is missing');
    });
  });

  describe('Media quality-profile production contract', () => {
    function createRouteHarness(options?: {
      findById?: ReturnType<typeof vi.fn>;
      findByName?: ReturnType<typeof vi.fn>;
    }) {
      const findById = options?.findById ?? vi.fn().mockResolvedValue({ id: 7, name: 'HD-1080p' });
      const findByName = options?.findByName ?? vi.fn().mockResolvedValue({ id: 5, name: 'Any' });
      const findMovieByTmdbId = vi.fn().mockResolvedValue(null);
      const findSeriesByTvdbId = vi.fn().mockResolvedValue(null);
      const upsertMovie = vi.fn().mockResolvedValue({ id: 101, title: 'Arrival' });
      const upsertSeries = vi.fn().mockResolvedValue({ id: 202, title: 'Dark' });
      const app = buildMediaApp({
        prisma: {} as never,
        qualityProfileRepository: { findById, findByName } as never,
        mediaRepository: {
          findMovieByTmdbId,
          findSeriesByTvdbId,
          upsertMovie,
          upsertSeries,
        } as never,
      });
      return { app, findById, findByName, upsertMovie, upsertSeries };
    }

    it('uses an explicitly requested real profile for movie creation', async () => {
      const { app, findById, findByName, upsertMovie } = createRouteHarness();

      const response = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: {
          mediaType: 'MOVIE',
          tmdbId: 329865,
          title: 'Arrival',
          year: 2016,
          qualityProfileId: 7,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(findById).toHaveBeenCalledWith(7);
      expect(findByName).not.toHaveBeenCalled();
      expect(upsertMovie).toHaveBeenCalledWith(expect.objectContaining({ qualityProfileId: 7 }));
    });

    it('uses only the configured Any profile when series creation omits an ID', async () => {
      const { app, findById, findByName, upsertSeries } = createRouteHarness();

      const response = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { mediaType: 'TV', tvdbId: 334824, title: 'Dark', year: 2017 },
      });

      expect(response.statusCode).toBe(201);
      expect(findById).not.toHaveBeenCalled();
      expect(findByName).toHaveBeenCalledWith('Any');
      expect(upsertSeries).toHaveBeenCalledWith(expect.objectContaining({ qualityProfileId: 5 }));
    });

    it('returns an exact 422 for an unknown requested profile without substituting a default', async () => {
      const findById = vi.fn().mockResolvedValue(null);
      const findByName = vi.fn().mockResolvedValue({ id: 5, name: 'Any' });
      const { app, upsertMovie } = createRouteHarness({ findById, findByName });

      const response = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: {
          mediaType: 'MOVIE',
          tmdbId: 329865,
          title: 'Arrival',
          year: 2016,
          qualityProfileId: 999,
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quality profile 999 does not exist',
          retryable: false,
          path: '/api/media',
        },
      });
      expect(findByName).not.toHaveBeenCalled();
      expect(upsertMovie).not.toHaveBeenCalled();
    });

    it('returns an exact 422 when no configured default profile exists', async () => {
      const { app, upsertSeries } = createRouteHarness({
        findByName: vi.fn().mockResolvedValue(null),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: { mediaType: 'TV', tvdbId: 334824, title: 'Dark', year: 2017 },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Default quality profile "Any" is not configured',
          retryable: false,
          path: '/api/media',
        },
      });
      expect(upsertSeries).not.toHaveBeenCalled();
    });

    it.each([
      ['requested', { findById: vi.fn().mockRejectedValue(new Error('profile lookup failed')) }, 7],
      ['default', { findByName: vi.fn().mockRejectedValue(new Error('profile lookup failed')) }, undefined],
    ] as const)('surfaces %s profile repository errors without creating media', async (_kind, mocks, qualityProfileId) => {
      const { app, upsertMovie } = createRouteHarness(mocks);

      const response = await app.inject({
        method: 'POST',
        url: '/api/media',
        payload: {
          mediaType: 'MOVIE',
          tmdbId: 329865,
          title: 'Arrival',
          year: 2016,
          ...(qualityProfileId === undefined ? {} : { qualityProfileId }),
        },
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'profile lookup failed',
          retryable: false,
          path: '/api/media',
        },
      });
      expect(upsertMovie).not.toHaveBeenCalled();
    });
  });

  it('publishes torrent:stats through the production API polling boundary', async () => {
    const eventHub = new ApiEventHub(60_000);
    const publish = vi.spyOn(eventHub, 'publish');
    const stats = [{ infoHash: 'abc123', progress: 50 }];
    const app = createApiServer({
      prisma: {} as never,
      eventHub,
      torrentManager: { getTorrentsStatus: vi.fn().mockResolvedValue(stats) } as never,
    }, {
      torrentStatsIntervalMs: 5,
      activityPollIntervalMs: 60_000,
      healthPollIntervalMs: 60_000,
    });
    apps.push(app);

    await app.ready();
    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalledWith('torrent:stats', stats);
    }, { timeout: 500 });
    expect(publish).not.toHaveBeenCalledWith('torrent:progress', expect.anything());
  });
});
