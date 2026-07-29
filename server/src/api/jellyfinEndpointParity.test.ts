import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJellyfinServer } from './createJellyfinServer';
import {
  encodeJellyfinId,
  JELLYFIN_MOVIE_VIEW_ID,
  JELLYFIN_TV_VIEW_ID,
} from '../jellyfin/ids';

function createPrismaFixture(overrides: Record<string, Record<string, unknown>> = {}) {
  return {
    movie: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      ...overrides.movie,
    },
    series: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      ...overrides.series,
    },
    season: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      ...overrides.season,
    },
    episode: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      ...overrides.episode,
    },
    playbackProgress: {
      findFirst: vi.fn().mockResolvedValue(null),
      ...overrides.playbackProgress,
    },
  };
}

function createPlaybackService(overrides: Record<string, unknown> = {}) {
  return {
    resolveStreamSource: vi.fn(),
    recordHeartbeat: vi.fn(),
    getContinueWatching: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createApp(options: {
  prisma?: ReturnType<typeof createPrismaFixture>;
  playbackService?: ReturnType<typeof createPlaybackService>;
} = {}) {
  return createJellyfinServer({
    prisma: options.prisma ?? createPrismaFixture(),
    playbackService: options.playbackService ?? createPlaybackService(),
  } as any, {
    serverId: 'jellyfin-parity-test',
    serverName: 'Mediarr',
    lanAddress: '192.168.1.42',
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Jellyfin endpoint parity contracts', () => {
  it('keeps both resume endpoints on the same shared continue-watching response', async () => {
    const episodeId = encodeJellyfinId('episode', 42);
    const getContinueWatching = vi.fn().mockResolvedValue([{
      mediaType: 'EPISODE',
      mediaId: 42,
      seriesId: 7,
      title: 'Parity Series',
      episodeTitle: 'Parity Episode',
      seasonNumber: 1,
      episodeNumber: 2,
      posterUrl: null,
      backdropUrl: null,
      position: 12,
      duration: 60,
      progress: 0.2,
      isWatched: false,
      lastWatched: new Date('2026-07-29T00:00:00.000Z'),
    }]);
    const app = createApp({
      playbackService: createPlaybackService({ getContinueWatching }),
    });

    try {
      const userScoped = await app.inject('/Users/any-client/Items/Resume');
      const userItems = await app.inject('/UserItems/Resume');

      expect(userScoped.statusCode).toBe(200);
      expect(userItems.statusCode).toBe(200);
      expect(userItems.json()).toEqual(userScoped.json());
      expect(userScoped.json()).toEqual({
        Items: [expect.objectContaining({
          Id: episodeId,
          RunTimeTicks: 600_000_000,
          UserData: expect.objectContaining({
            ItemId: episodeId,
            PlaybackPositionTicks: 120_000_000,
          }),
        })],
        TotalRecordCount: 1,
        StartIndex: 0,
      });
      expect(getContinueWatching).toHaveBeenNthCalledWith(1, 20);
      expect(getContinueWatching).toHaveBeenNthCalledWith(2, 20);
    } finally {
      await app.close();
    }
  });

  it('filters and limits NextUp while excluding watched episodes', async () => {
    const seriesId = encodeJellyfinId('series', 1);
    const firstEpisodeId = encodeJellyfinId('episode', 101);
    const nextEpisodeId = encodeJellyfinId('episode', 102);
    const episodeFindMany = vi.fn().mockResolvedValue([
      { id: 103, seriesId: 1, seasonId: 11, tvdbId: 103, seasonNumber: 1, episodeNumber: 3, title: 'Third' },
      { id: 101, seriesId: 1, seasonId: 11, tvdbId: 101, seasonNumber: 1, episodeNumber: 1, title: 'Watched first' },
      { id: 102, seriesId: 1, seasonId: 11, tvdbId: 102, seasonNumber: 1, episodeNumber: 2, title: 'Next' },
    ]);
    const playbackProgressFindFirst = vi.fn(async ({ where }: { where: { mediaId: number } }) => (
      where.mediaId === 101 ? { isWatched: true } : null
    ));
    const app = createApp({
      prisma: createPrismaFixture({
        episode: { findMany: episodeFindMany },
        playbackProgress: { findFirst: playbackProgressFindFirst },
      }),
    });

    try {
      const response = await app.inject('/Shows/NextUp?SeriesId=' + seriesId + '&Limit=1');

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        Items: [expect.objectContaining({
          Id: nextEpisodeId,
          Name: 'Next',
          Type: 'Episode',
        })],
        TotalRecordCount: 1,
        StartIndex: 0,
      });
      expect(response.json().Items).not.toContainEqual(expect.objectContaining({ Id: firstEpisodeId }));
      expect(episodeFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { seriesId: 1 },
      }));
      expect(playbackProgressFindFirst).toHaveBeenCalledWith({
        where: { mediaType: 'EPISODE', mediaId: 101, userId: 'lan-default' },
      });
    } finally {
      await app.close();
    }
  });

  it('treats a missing Playing ItemId as a successful no-op', async () => {
    const app = createApp();

    try {
      const playing = await app.inject({
        method: 'POST',
        url: '/Sessions/Playing',
        payload: {},
      });
      const sessions = await app.inject('/Sessions');

      expect(playing.statusCode).toBe(204);
      expect(sessions.statusCode).toBe(200);
      expect(sessions.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('serves direct Primary and Backdrop artwork without forwarding resize queries and preserves upstream 404s', async () => {
    const movieId = encodeJellyfinId('movie', 24);
    const posterUrl = 'https://image.tmdb.org/t/p/original/poster.jpg';
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }))
      .mockResolvedValueOnce(new Response(Uint8Array.from([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }))
      .mockResolvedValueOnce(new Response('missing', {
        status: 404,
        statusText: 'Not Found',
      }));
    vi.stubGlobal('fetch', fetch);
    const app = createApp({
      prisma: createPrismaFixture({
        movie: {
          findUnique: vi.fn().mockResolvedValue({
            id: 24,
            tmdbId: 240,
            title: 'Artwork Movie',
            sortTitle: 'Artwork Movie',
            year: 2024,
            posterUrl,
          }),
        },
      }),
    });

    try {
      const primary = await app.inject(
        '/Items/' + movieId + '/Images/Primary?fillWidth=400&fillHeight=300&maxWidth=800&maxHeight=600',
      );
      const backdrop = await app.inject('/Items/' + movieId + '/Images/Backdrop?fillWidth=1920');
      const missing = await app.inject('/Items/' + movieId + '/Images/Primary');

      expect(primary.statusCode).toBe(200);
      expect(primary.headers['content-type']).toBe('image/jpeg');
      expect(primary.headers['cache-control']).toBe('public, max-age=31536000');
      expect(primary.rawPayload).toEqual(Buffer.from([1, 2, 3]));
      expect(backdrop.statusCode).toBe(200);
      expect(backdrop.rawPayload).toEqual(Buffer.from([1, 2, 3]));
      expect(missing.statusCode).toBe(404);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch.mock.calls.map(([url]) => url)).toEqual([posterUrl, posterUrl, posterUrl]);
    } finally {
      await app.close();
    }
  });

  it('serves the remaining trusted-LAN handshake, view, and per-user browse endpoints', async () => {
    const movieId = encodeJellyfinId('movie', 31);
    const app = createApp({
      prisma: createPrismaFixture({
        movie: {
          findMany: vi.fn().mockResolvedValue([{
            id: 31,
            tmdbId: 310,
            title: 'Per-user Movie',
            sortTitle: 'Per-user Movie',
            year: 2024,
          }]),
        },
      }),
    });

    try {
      const branding = await app.inject('/Branding/Configuration');
      const publicUsers = await app.inject('/Users/Public');
      const userViews = await app.inject('/Users/any-client/Views');
      const mediaFolders = await app.inject('/Library/MediaFolders');
      const userItems = await app.inject(
        '/Users/any-client/Items?ParentId=' + JELLYFIN_MOVIE_VIEW_ID + '&IncludeItemTypes=Movie',
      );

      expect(branding.json()).toEqual({
        LoginDisclaimer: '',
        CustomCss: '',
        SplashscreenEnabled: false,
      });
      expect(publicUsers.json()).toEqual([
        expect.objectContaining({
          Id: expect.any(String),
          Name: 'Mediarr',
          HasPassword: false,
        }),
      ]);
      expect(userViews.json()).toEqual({
        Items: expect.arrayContaining([
          expect.objectContaining({ Id: JELLYFIN_MOVIE_VIEW_ID, CollectionType: 'movies' }),
          expect.objectContaining({ Id: JELLYFIN_TV_VIEW_ID, CollectionType: 'tvshows' }),
        ]),
        TotalRecordCount: 2,
        StartIndex: 0,
      });
      expect(mediaFolders.json()).toEqual(userViews.json());
      expect(userItems.json()).toEqual({
        Items: [expect.objectContaining({
          Id: movieId,
          Name: 'Per-user Movie',
          ParentId: JELLYFIN_MOVIE_VIEW_ID,
          Type: 'Movie',
        })],
        TotalRecordCount: 1,
        StartIndex: 0,
      });
    } finally {
      await app.close();
    }
  });
});
