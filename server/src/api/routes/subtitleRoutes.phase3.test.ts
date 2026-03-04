import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerSubtitleRoutes } from './subtitleRoutes';
import type { ApiDependencies } from '../types';

interface SubtitleRouteTestContext {
  app: FastifyInstance;
  deps: Record<string, any>;
}

function createApp(overrides: Partial<Record<string, any>> = {}): SubtitleRouteTestContext {
  const deps: Record<string, any> = {
    prisma: {
      variantMissingSubtitle: { findMany: vi.fn().mockResolvedValue([]) },
      episode: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      subtitleHistory: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    },
    settingsService: {
      get: vi.fn().mockResolvedValue({
        apiKeys: {
          openSubtitlesApiKey: 'os-key',
          assrtApiToken: null,
          subdlApiKey: 'subdl-key',
        },
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    subtitleProviderFactory: {
      getProviderNames: vi.fn().mockReturnValue(['embedded', 'opensubtitles', 'assrt', 'subdl']),
      resolveManualProvider: vi.fn().mockReturnValue({
        search: vi.fn().mockResolvedValue([]),
      }),
    },
    subtitleAutomationService: {
      runAutomationCycle: vi.fn().mockResolvedValue({
        variantsScanned: 3,
        missingSynced: 2,
        wantedQueued: 2,
        downloaded: 1,
        failed: 0,
      }),
      onMovieImported: vi.fn().mockResolvedValue({
        variantsScanned: 2,
        missingSynced: 1,
        wantedQueued: 1,
        downloaded: 1,
        failed: 0,
      }),
      onEpisodeImported: vi.fn().mockResolvedValue({
        variantsScanned: 1,
        missingSynced: 1,
        wantedQueued: 1,
        downloaded: 0,
        failed: 0,
      }),
    },
    subtitleInventoryApiService: {
      listEpisodeVariantInventory: vi.fn().mockResolvedValue([]),
      listMovieVariantInventory: vi.fn().mockResolvedValue([]),
      manualSearch: vi.fn().mockResolvedValue([]),
      manualDownload: vi.fn().mockResolvedValue({ storedPath: '/tmp/test.srt' }),
      uploadSubtitle: vi.fn(),
    },
  };

  Object.assign(deps, overrides);
  if (overrides.prisma) {
    deps.prisma = { ...deps.prisma, ...overrides.prisma };
  }
  if (overrides.settingsService) {
    deps.settingsService = { ...deps.settingsService, ...overrides.settingsService };
  }
  if (overrides.subtitleProviderFactory) {
    deps.subtitleProviderFactory = {
      ...deps.subtitleProviderFactory,
      ...overrides.subtitleProviderFactory,
    };
  }
  if (overrides.subtitleAutomationService) {
    deps.subtitleAutomationService = {
      ...deps.subtitleAutomationService,
      ...overrides.subtitleAutomationService,
    };
  }
  if (overrides.subtitleInventoryApiService) {
    deps.subtitleInventoryApiService = {
      ...deps.subtitleInventoryApiService,
      ...overrides.subtitleInventoryApiService,
    };
  }

  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerSubtitleRoutes(app, deps as ApiDependencies);

  return { app, deps };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('subtitleRoutes phase 3 contract', () => {
  it('lists provider status from settings + factory', async () => {
    const { app } = createApp();
    const response = await app.inject({ method: 'GET', url: '/api/subtitles/providers' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'opensubtitles',
          enabled: true,
          status: 'active',
        }),
        expect.objectContaining({
          id: 'assrt',
          enabled: false,
          status: 'disabled',
        }),
      ]),
    );

    await app.close();
  });

  it('updates provider credentials', async () => {
    const { app, deps } = createApp();

    const response = await app.inject({
      method: 'PUT',
      url: '/api/subtitles/providers/assrt',
      payload: { apiKey: 'assrt-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(deps.settingsService.update).toHaveBeenCalledWith({
      apiKeys: { assrtApiToken: 'assrt-token' },
    });

    await app.close();
  });

  it('validates provider reset target id', async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/providers/unknown/reset',
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('tests provider connectivity through factory provider', async () => {
    const search = vi.fn().mockResolvedValue([
      { languageCode: 'en', isForced: false, isHi: false, provider: 'assrt', score: 10 },
      { languageCode: 'zh', isForced: false, isHi: false, provider: 'assrt', score: 8 },
    ]);
    const { app } = createApp({
      subtitleProviderFactory: {
        resolveManualProvider: vi.fn().mockReturnValue({ search }),
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/providers/assrt/test',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      success: true,
      message: 'Provider test succeeded (2 candidates)',
    });
    expect(search).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('returns wanted count grouped by unique movie and episode ids', async () => {
    const { app } = createApp({
      prisma: {
        variantMissingSubtitle: {
          findMany: vi.fn().mockResolvedValue([
            { variant: { movieId: 1, episodeId: null } },
            { variant: { movieId: 1, episodeId: null } },
            { variant: { movieId: 2, episodeId: null } },
            { variant: { movieId: null, episodeId: 101 } },
            { variant: { movieId: null, episodeId: 102 } },
          ]),
        },
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/subtitles/wanted/count' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      seriesCount: 2,
      moviesCount: 2,
      totalCount: 4,
    });

    await app.close();
  });

  it('triggers single movie wanted search', async () => {
    const onMovieImported = vi.fn().mockResolvedValue({
      variantsScanned: 2,
      missingSynced: 1,
      wantedQueued: 1,
      downloaded: 1,
      failed: 0,
    });
    const { app } = createApp({
      subtitleAutomationService: { onMovieImported },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/subtitles/wanted/movies/42/search',
      payload: { languageCode: 'th' },
    });

    expect(response.statusCode).toBe(200);
    expect(onMovieImported).toHaveBeenCalledWith(42);
    expect(response.json().data).toEqual({
      triggered: true,
      movieId: 42,
      languageCode: 'th',
    });

    await app.close();
  });

  it('filters history rows by action/provider/language', async () => {
    const { app } = createApp({
      prisma: {
        subtitleHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 1,
              languageCode: 'en',
              provider: 'OpenSubtitles',
              score: 9.7,
              storedPath: '/subs/movie.en.srt',
              message: 'Manual subtitle download',
              createdAt: new Date('2026-03-01T01:00:00.000Z'),
              variant: { movie: { id: 5, title: 'Movie One' }, episode: null },
            },
            {
              id: 2,
              languageCode: 'th',
              provider: 'SubDL',
              score: 8.4,
              storedPath: '/subs/movie.th.srt',
              message: 'Downloaded automatically',
              createdAt: new Date('2026-03-01T02:00:00.000Z'),
              variant: { movie: { id: 6, title: 'Movie Two' }, episode: null },
            },
          ]),
        },
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/subtitles/history?action=manual&provider=opensubtitles&languageCode=en',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(expect.objectContaining({
      id: 1,
      action: 'manual',
      provider: 'OpenSubtitles',
      languageCode: 'en',
    }));

    await app.close();
  });

  it('filters history stats by provider/language/action', async () => {
    const { app } = createApp({
      prisma: {
        subtitleHistory: {
          findMany: vi.fn().mockResolvedValue([
            {
              languageCode: 'en',
              provider: 'OpenSubtitles',
              message: 'Downloaded automatically',
              createdAt: new Date('2026-03-01T01:00:00.000Z'),
              variant: { episodeId: null, movieId: 7 },
            },
            {
              languageCode: 'en',
              provider: 'OpenSubtitles',
              message: 'Manual subtitle download',
              createdAt: new Date('2026-03-01T03:00:00.000Z'),
              variant: { episodeId: 99, movieId: null },
            },
          ]),
        },
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/subtitles/history/stats?period=week&provider=opensubtitles&languageCode=en&action=download',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.period).toBe('week');
    expect(body.data.byProvider).toEqual([{ provider: 'OpenSubtitles', count: 1 }]);
    expect(body.data.byLanguage).toEqual([{ language: 'en', count: 1 }]);

    await app.close();
  });

  it('exposes series subtitle variants grouped by season', async () => {
    const listEpisodeVariantInventory = vi.fn().mockImplementation(async (episodeId: number) => {
      if (episodeId === 11) {
        return [
          {
            variantId: 501,
            path: '/tv/show/s01e01.mkv',
            fileSize: BigInt(1000),
            audioTracks: [],
            subtitleTracks: [
              {
                source: 'EXTERNAL',
                languageCode: 'en',
                isForced: false,
                isHi: false,
                filePath: '/tv/show/s01e01.en.srt',
              },
            ],
            missingSubtitles: [{ languageCode: 'th', isForced: false, isHi: false }],
          },
        ];
      }

      return [
        {
          variantId: 502,
          path: '/tv/show/s02e01.mkv',
          fileSize: BigInt(1200),
          audioTracks: [],
          subtitleTracks: [],
          missingSubtitles: [{ languageCode: 'en', isForced: false, isHi: false }],
        },
      ];
    });

    const { app } = createApp({
      prisma: {
        episode: {
          findMany: vi.fn().mockResolvedValue([
            { id: 11, seasonNumber: 1, episodeNumber: 1 },
            { id: 21, seasonNumber: 2, episodeNumber: 1 },
          ]),
        },
      },
      subtitleInventoryApiService: {
        listEpisodeVariantInventory,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/subtitles/series/7/variants',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual(expect.objectContaining({
      seriesId: 7,
      seasonNumber: 1,
    }));
    expect(body.data[1]).toEqual(expect.objectContaining({
      seriesId: 7,
      seasonNumber: 2,
    }));

    await app.close();
  });

  it('runs movie and series subtitle search convenience endpoints', async () => {
    const onMovieImported = vi.fn().mockResolvedValue({
      variantsScanned: 2,
      missingSynced: 2,
      wantedQueued: 1,
      downloaded: 1,
      failed: 0,
    });
    const onEpisodeImported = vi.fn().mockResolvedValue({
      variantsScanned: 1,
      missingSynced: 1,
      wantedQueued: 1,
      downloaded: 1,
      failed: 0,
    });
    const { app } = createApp({
      prisma: {
        episode: {
          findMany: vi.fn().mockResolvedValue([{ id: 301 }, { id: 302 }]),
        },
      },
      subtitleAutomationService: {
        onMovieImported,
        onEpisodeImported,
      },
    });

    const movieResponse = await app.inject({
      method: 'POST',
      url: '/api/subtitles/movie/17/search',
    });
    expect(movieResponse.statusCode).toBe(200);
    expect(onMovieImported).toHaveBeenCalledWith(17);
    expect(movieResponse.json().data).toEqual(expect.objectContaining({
      success: true,
      episodesSearched: 2,
      subtitlesDownloaded: 1,
    }));

    const seriesResponse = await app.inject({
      method: 'POST',
      url: '/api/subtitles/series/22/search',
    });
    expect(seriesResponse.statusCode).toBe(200);
    expect(onEpisodeImported).toHaveBeenCalledTimes(2);
    expect(seriesResponse.json().data).toEqual(expect.objectContaining({
      success: true,
      episodesSearched: 2,
      subtitlesDownloaded: 2,
    }));

    await app.close();
  });
});
