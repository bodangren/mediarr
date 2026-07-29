import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createJellyfinServer, type JellyfinServerOptions } from './createJellyfinServer';
import { encodeJellyfinId, JELLYFIN_MOVIE_VIEW_ID } from '../jellyfin/ids';
import {
  buildJellyfinPublicSystemInfo, buildJellyfinSystemInfo, buildTrustedLanUserDto,
} from '../jellyfin/compatibilityDtos';

function createPrismaFixture(overrides: Record<string, any> = {}) {
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
  };
}

function createPlaybackService(overrides: Record<string, any> = {}) {
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
  server?: Partial<JellyfinServerOptions>;
} = {}) {
  return createJellyfinServer({
    prisma: options.prisma ?? createPrismaFixture(),
    playbackService: options.playbackService ?? createPlaybackService(),
  } as any, {
    serverId: 'abc', serverName: 'Mediarr',
    ...options.server,
  });
}

describe('createJellyfinServer handshake', () => {
  it('returns one stable identity across handshake, auth, and library views without storing credentials', async () => {
    const app = createApp();
    const info = await app.inject('/System/Info/Public');
    const auth = await app.inject({ method: 'POST', url: '/Users/AuthenticateByName', payload: { Username: 'anything', Pw: 'ignored' } });
    const library = await app.inject('/UserViews');
    expect(info.json().Id).toBe('abc');
    expect(auth.json()).toMatchObject({ ServerId: 'abc', User: { HasPassword: false } });
    expect(library.json()).toMatchObject({ TotalRecordCount: 2, Items: [{ CollectionType: 'movies' }, { CollectionType: 'tvshows' }] });
    await app.close();
  });

  it('serves full system information and the full trusted-LAN user DTO', async () => {
    const server = {
      serverName: 'Living Room',
      lanAddress: '192.168.50.12',
      port: 18096,
      version: '10.10.7',
    };
    const app = createApp({ server });
    const identity = {
      serverId: 'abc',
      ...server,
      operatingSystem: process.platform,
    };
    const expectedUser = buildTrustedLanUserDto({
      serverId: 'abc', userId: '4d656469-6172-7200-0000-000000000001', userName: 'Mediarr',
    });

    expect((await app.inject('/System/Info/Public')).json()).toEqual(buildJellyfinPublicSystemInfo(identity));
    expect((await app.inject('/System/Info')).json()).toEqual(buildJellyfinSystemInfo(identity));
    expect((await app.inject('/Users')).json()).toEqual([expectedUser]);
    expect((await app.inject('/Users/user-1')).json()).toEqual(expectedUser);
    expect(expectedUser).not.toHaveProperty('Password');
    expect(expectedUser).not.toHaveProperty('AccessToken');
    await app.close();
  });

  it('implements both Ping verbs as plain text', async () => {
    const app = createApp();
    expect((await app.inject('/System/Ping')).body).toBe('Jellyfin');
    expect((await app.inject({ method: 'POST', url: '/System/Ping' })).body).toBe('Jellyfin');
    await app.close();
  });
});

describe('createJellyfinServer browse routes', () => {
  it('applies Jellyfin ParentId, sorting, and paging query parameters', async () => {
    const prisma = createPrismaFixture({
      movie: { findMany: vi.fn().mockResolvedValue([
        { id: 1, tmdbId: 101, title: 'Alpha', sortTitle: 'Alpha', year: 2020 },
        { id: 2, tmdbId: 102, title: 'Zulu', sortTitle: 'Zulu', year: 2022 },
        { id: 3, tmdbId: 103, title: 'Beta', sortTitle: 'Beta', year: 2021 },
      ]) },
      series: { findMany: vi.fn().mockResolvedValue([
        { id: 9, tvdbId: 909, title: 'Must Not Leak', sortTitle: 'Must Not Leak', year: 2020 },
      ]) },
    });
    const app = createApp({ prisma });

    const response = await app.inject(
      `/Items?ParentId=${JELLYFIN_MOVIE_VIEW_ID}&SortBy=SortName&SortOrder=Descending&StartIndex=1&Limit=1`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      TotalRecordCount: 3,
      StartIndex: 1,
      Items: [{ Name: 'Beta', Type: 'Movie', ParentId: JELLYFIN_MOVIE_VIEW_ID }],
    });
    expect(prisma.movie.findMany).toHaveBeenCalledOnce();
    expect(prisma.series.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('serves item details plus series seasons and episodes from database delegates', async () => {
    const seriesId = encodeJellyfinId('series', 7);
    const seasonId = encodeJellyfinId('season', 8);
    const episodeId = encodeJellyfinId('episode', 9);
    const prisma = createPrismaFixture({
      series: { findUnique: vi.fn().mockResolvedValue({
        id: 7, tvdbId: 700, title: 'Series', sortTitle: 'Series', year: 2022,
      }) },
      season: { findMany: vi.fn().mockResolvedValue([
        { id: 8, seriesId: 7, seasonNumber: 1 },
      ]) },
      episode: {
        findMany: vi.fn().mockResolvedValue([{
          id: 9,
          seriesId: 7,
          seasonId: 8,
          tvdbId: 900,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Episode',
        }]),
        findUnique: vi.fn().mockResolvedValue({
          id: 9,
          seriesId: 7,
          seasonId: 8,
          tvdbId: 900,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Episode',
        }),
      },
    });
    const app = createApp({ prisma });

    const detail = await app.inject(`/Items/${seriesId}`);
    const seasons = await app.inject(`/Shows/${seriesId}/Seasons`);
    const episodes = await app.inject(`/Shows/${seriesId}/Episodes`);
    const episode = await app.inject(`/Items/${episodeId}`);

    expect(detail.json()).toMatchObject({ Id: seriesId, Name: 'Series', Type: 'Series' });
    expect(seasons.json()).toMatchObject({
      Items: [{ Id: seasonId, ParentId: seriesId, IndexNumber: 1 }],
      TotalRecordCount: 1,
    });
    expect(episodes.json()).toMatchObject({
      Items: [{ Id: episodeId, SeasonId: seasonId, Name: 'Episode' }],
      TotalRecordCount: 1,
    });
    expect(episode.json()).toMatchObject({ Id: episodeId, Type: 'Episode' });
    expect(prisma.season.findMany).toHaveBeenCalledWith({ where: { seriesId: 7 } });
    expect(prisma.episode.findMany).toHaveBeenCalledWith({ where: { seriesId: 7 } });
    await app.close();
  });
  it('applies Jellyfin episode navigation parameters before paging', async () => {
    const seriesId = encodeJellyfinId('series', 7);
    const secondEpisodeId = encodeJellyfinId('episode', 102);
    const thirdEpisodeId = encodeJellyfinId('episode', 103);
    const prisma = createPrismaFixture({
      episode: {
        findMany: vi.fn().mockResolvedValue([
          { id: 201, seriesId: 7, seasonId: 20, tvdbId: 201, seasonNumber: 2, episodeNumber: 1, title: 'S2E1' },
          { id: 103, seriesId: 7, seasonId: 10, tvdbId: 103, seasonNumber: 1, episodeNumber: 3, title: 'S1E3' },
          { id: 101, seriesId: 7, seasonId: 10, tvdbId: 101, seasonNumber: 1, episodeNumber: 1, title: 'S1E1' },
          { id: 102, seriesId: 7, seasonId: 10, tvdbId: 102, seasonNumber: 1, episodeNumber: 2, title: 'S1E2' },
        ]),
      },
    });
    const app = createApp({ prisma });

    const response = await app.inject(
      `/Shows/${seriesId}/Episodes?Season=1&StartItemId=${secondEpisodeId}&AdjacentTo=${thirdEpisodeId}&StartIndex=1&Limit=1`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      Items: [{ Id: thirdEpisodeId, Name: 'S1E3' }],
      TotalRecordCount: 2,
      StartIndex: 1,
    });
    expect(prisma.episode.findMany).toHaveBeenCalledWith({ where: { seriesId: 7 } });
    await app.close();
  });
});

describe('createJellyfinServer playback routes', () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryDirectories.map(directory => (
      fs.rm(directory, { recursive: true, force: true })
    )));
    temporaryDirectories.length = 0;
  });

  it('serves GET and POST PlaybackInfo through the shared resolver', async () => {
    const movieId = encodeJellyfinId('movie', 5);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 5,
      title: 'Movie',
      filePath: '/data/media/movies/movie.mkv',
    });
    const app = createApp({
      playbackService: createPlaybackService({ resolveStreamSource }),
    });

    const getResponse = await app.inject(`/Items/${movieId}/PlaybackInfo`);
    const postResponse = await app.inject({
      method: 'POST', url: `/Items/${movieId}/PlaybackInfo`, payload: {},
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      PlaySessionId: movieId,
      MediaSources: [{
        Id: movieId,
        Container: 'mkv',
        SupportsDirectPlay: true,
        SupportsDirectStream: true,
        SupportsTranscoding: false,
        DirectStreamUrl: `/Videos/${movieId}/stream`,
      }],
    });
    expect(postResponse.json()).toEqual(getResponse.json());
    expect(resolveStreamSource).toHaveBeenCalledTimes(2);
    expect(resolveStreamSource).toHaveBeenCalledWith({ mediaType: 'MOVIE', mediaId: 5 });
    await app.close();
  });

  it('returns empty successful PlaybackInfo for unknown and non-playable ids', async () => {
    const resolveStreamSource = vi.fn();
    const app = createApp({
      playbackService: createPlaybackService({ resolveStreamSource }),
    });
    const unknownId = '00000000-0000-0000-0000-000000000000';

    const getResponse = await app.inject(`/Items/${unknownId}/PlaybackInfo`);
    const postResponse = await app.inject({
      method: 'POST', url: `/Items/${JELLYFIN_MOVIE_VIEW_ID}/PlaybackInfo`, payload: {},
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({ MediaSources: [], PlaySessionId: unknownId });
    expect(postResponse.statusCode).toBe(200);
    expect(postResponse.json()).toEqual({
      MediaSources: [], PlaySessionId: JELLYFIN_MOVIE_VIEW_ID,
    });
    expect(resolveStreamSource).not.toHaveBeenCalled();
    await app.close();
  });
  it('returns an exact Range 206 response from /Videos', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-jellyfin-stream-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'fixture.mp4');
    await fs.writeFile(filePath, 'abcdefghijklmnopqrstuvwxyz', 'utf8');
    const episodeId = encodeJellyfinId('episode', 6);
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'EPISODE', mediaId: 6, title: 'Episode', filePath,
    });
    const app = createApp({
      playbackService: createPlaybackService({ resolveStreamSource }),
    });

    const response = await app.inject({
      method: 'GET',
      url: `/Videos/${episodeId}/stream`,
      headers: { range: 'bytes=3-8' },
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-range']).toBe('bytes 3-8/26');
    expect(response.body).toBe('defghi');
    expect(resolveStreamSource).toHaveBeenCalledWith({ mediaType: 'EPISODE', mediaId: 6 });
    await app.close();
  });
});

describe('createJellyfinServer session and progress routes', () => {
  it('tracks capabilities, playing, progress, stopped, and shared-store heartbeat state', async () => {
    const episodeId = encodeJellyfinId('episode', 15);
    const recordHeartbeat = vi.fn().mockResolvedValue({});
    const app = createApp({
      playbackService: createPlaybackService({ recordHeartbeat }),
    });

    const responses = [
      await app.inject({ method: 'POST', url: '/Sessions/Capabilities', payload: { Id: 'tv-1', SupportsMediaControl: true } }),
      await app.inject({ method: 'POST', url: '/Sessions/Capabilities/Full', payload: { Id: 'tv-1', PlayableMediaTypes: ['Video'] } }),
      await app.inject({ method: 'POST', url: '/Sessions/Playing', payload: {
        DeviceId: 'tv-1', ItemId: episodeId, PlaySessionId: 'play-1', PositionTicks: 50_000_000,
      } }),
      await app.inject({ method: 'POST', url: '/Sessions/Playing/Progress', payload: {
        DeviceId: 'tv-1', ItemId: episodeId, PlaySessionId: 'play-1', PositionTicks: 120_000_000, RunTimeTicks: 600_000_000,
      } }),
    ];
    const duringPlayback = await app.inject('/Sessions');
    responses.push(await app.inject({ method: 'POST', url: '/Sessions/Playing/Stopped', payload: {
      DeviceId: 'tv-1', PositionTicks: 120_000_000,
    } }));
    const afterStop = await app.inject('/Sessions');

    expect(responses.map(response => response.statusCode)).toEqual([204, 204, 204, 204, 204]);
    expect(recordHeartbeat).toHaveBeenCalledOnce();
    expect(recordHeartbeat).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      mediaId: 15,
      userId: 'lan-default',
      position: 12,
      duration: 60,
    });
    expect(duringPlayback.json()[0]).toMatchObject({
      id: 'tv-1',
      nowPlayingItemId: episodeId,
      playSessionId: 'play-1',
      positionTicks: 120_000_000,
      isPlaying: true,
    });
    expect(afterStop.json()[0]).toMatchObject({
      id: 'tv-1', positionTicks: 120_000_000, isPlaying: false,
    });
    await app.close();
  });

  it('rejects non-playable progress without calling the shared PlaybackService', async () => {
    const recordHeartbeat = vi.fn();
    const app = createApp({
      playbackService: createPlaybackService({ recordHeartbeat }),
    });
    const response = await app.inject({
      method: 'POST',
      url: '/Sessions/Playing/Progress',
      payload: {
        DeviceId: 'tv-1',
        ItemId: encodeJellyfinId('series', 1),
        PositionTicks: 10_000_000,
        RunTimeTicks: 20_000_000,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(recordHeartbeat).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('createJellyfinServer known-good HTTP compatibility routes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it('shares UserData and watched state across item, played, and Latest routes', async () => {
    const movieId = encodeJellyfinId('movie', 31);
    const newestEpisodeId = encodeJellyfinId('episode', 42);
    const olderEpisodeId = encodeJellyfinId('episode', 41);
    const latestEpisodes = [
      {
        id: 42, seriesId: 7, seasonId: 8, tvdbId: 420,
        seasonNumber: 1, episodeNumber: 2, title: 'Newest',
        airDateUtc: '2026-07-28T00:00:00.000Z',
      },
      {
        id: 41, seriesId: 7, seasonId: 8, tvdbId: 410,
        seasonNumber: 1, episodeNumber: 1, title: 'Older',
        airDateUtc: '2026-07-27T00:00:00.000Z',
      },
    ];
    const prisma = createPrismaFixture({
      movie: {
        findUnique: vi.fn().mockResolvedValue({
          id: 31, tmdbId: 310, title: 'Shared Movie', sortTitle: 'Shared Movie',
        }),
      },
      episode: { findMany: vi.fn().mockResolvedValue(latestEpisodes) },
    });
    const progressById = new Map([
      [31, {
        position: 12, duration: 100, isWatched: false,
        lastWatched: '2026-07-25T12:00:00.000Z',
      }],
      [42, {
        position: 100, duration: 100, isWatched: true,
        lastWatched: '2026-07-28T12:00:00.000Z',
      }],
    ]);
    const getProgress = vi.fn().mockImplementation(
      ({ mediaId }: { mediaId: number }) => Promise.resolve(progressById.get(mediaId) ?? null),
    );
    const markWatched = vi.fn().mockResolvedValue({
      position: 100, duration: 100, isWatched: true,
      lastWatched: '2026-07-29T01:00:00.000Z',
    });
    const markUnwatched = vi.fn().mockResolvedValue({
      position: 0, duration: 100, isWatched: false,
      lastWatched: '2026-07-29T02:00:00.000Z',
    });
    const app = createApp({
      prisma,
      playbackService: createPlaybackService({
        getProgress, markWatched, markUnwatched,
      }),
    });

    const item = await app.inject('/Items/' + movieId);
    const watched = await app.inject({
      method: 'POST', url: '/UserPlayedItems/' + movieId,
    });
    const unplayed = await app.inject({
      method: 'DELETE', url: '/UserPlayedItems/' + movieId,
    });
    const userLatest = await app.inject('/Users/user-1/Items/Latest');
    const itemLatest = await app.inject('/Items/Latest');

    expect(item.json().UserData).toEqual({
      Played: false, PlayCount: 0, PlaybackPositionTicks: 120_000_000,
      LastPlayedDate: '2026-07-25T12:00:00.000Z', ItemId: movieId,
    });
    expect(getProgress).toHaveBeenCalledWith({
      mediaType: 'MOVIE', mediaId: 31, userId: 'lan-default',
    });
    expect(watched.statusCode).toBe(200);
    expect(watched.json()).toEqual({
      Played: true, PlayCount: 1, PlaybackPositionTicks: 1_000_000_000,
      LastPlayedDate: '2026-07-29T01:00:00.000Z', ItemId: movieId,
    });
    expect(markWatched).toHaveBeenCalledWith({
      mediaType: 'MOVIE', mediaId: 31, userId: 'lan-default',
    });
    expect(unplayed.statusCode).toBe(200);
    expect(unplayed.json()).toEqual({
      Played: false, PlayCount: 0, PlaybackPositionTicks: 0,
      LastPlayedDate: '2026-07-29T02:00:00.000Z', ItemId: movieId,
    });
    expect(markUnwatched).toHaveBeenCalledWith({
      mediaType: 'MOVIE', mediaId: 31, userId: 'lan-default',
    });
    expect(userLatest.json()).toEqual(itemLatest.json());
    expect(itemLatest.json()).toMatchObject([
      { Id: newestEpisodeId, Name: 'Newest', UserData: {
        Played: true, PlaybackPositionTicks: 1_000_000_000,
      } },
      { Id: olderEpisodeId, Name: 'Older', UserData: {
        Played: false, PlaybackPositionTicks: 0,
      } },
    ]);
    expect(prisma.episode.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.episode.findMany).toHaveBeenCalledWith({
      orderBy: { airDateUtc: 'desc' }, take: 16,
    });
    expect(getProgress).toHaveBeenCalledWith({
      mediaType: 'EPISODE', mediaId: 42, userId: 'lan-default',
    });
    expect(getProgress).toHaveBeenCalledWith({
      mediaType: 'EPISODE', mediaId: 41, userId: 'lan-default',
    });
    await app.close();
  });

  it('serves the low-risk system, user, library, item, and preference compatibility shapes', async () => {
    const movieId = encodeJellyfinId('movie', 23);
    const prisma = createPrismaFixture({
      movie: { findUnique: vi.fn().mockResolvedValue({
        id: 23,
        tmdbId: 230,
        title: 'Compatibility Movie',
        sortTitle: 'Compatibility Movie',
        year: 2024,
      }) },
    });
    const app = createApp({ prisma });

    const system = await app.inject('/System/Configuration');
    const users = await app.inject('/Users');
    const grouping = await app.inject('/Users/user-1/GroupingOptions');
    const virtualFolders = await app.inject('/Library/VirtualFolders');
    const refresh = await app.inject({ method: 'POST', url: '/Library/Refresh' });
    const userItem = await app.inject(`/Users/user-1/Items/${movieId}`);
    const specialFeatures = await app.inject(`/Items/${movieId}/SpecialFeatures`);
    const preferences = await app.inject('/DisplayPreferences/tv-home');
    const savedPreferences = await app.inject({
      method: 'POST',
      url: '/DisplayPreferences/tv-home',
      payload: { SortOrder: 'Descending' },
    });
    const clientLog = await app.inject({
      method: 'POST',
      url: '/ClientLog/Document',
      headers: { 'content-type': 'text/plain' },
      payload: 'client diagnostic',
    });

    expect(system.json()).toEqual({ EnableRemoteAccess: true, CastReceiverApplications: [] });
    expect(users.json()).toEqual([expect.objectContaining({ Id: expect.any(String), HasPassword: false })]);
    expect(grouping.json()).toEqual([]);
    expect(virtualFolders.json()).toEqual([]);
    expect(refresh.json()).toEqual({ ok: true });
    expect(userItem.json()).toMatchObject({ Id: movieId, Name: 'Compatibility Movie', Type: 'Movie' });
    expect(specialFeatures.json()).toEqual([]);
    expect(preferences.json()).toMatchObject({
      Id: 'tv-home', Client: 'emby', CustomPrefs: {}, SortOrder: 'Ascending', ShowBackdrop: true,
    });
    expect(savedPreferences.statusCode).toBe(204);
    expect(clientLog.statusCode).toBe(204);
    await app.close();
  });

  it('supports indexed artwork and container-suffixed direct streams', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-jellyfin-compat-'));
    const filePath = path.join(directory, 'fixture.mp4');
    await fs.writeFile(filePath, '0123456789', 'utf8');
    const movieId = encodeJellyfinId('movie', 24);
    const prisma = createPrismaFixture({
      movie: { findUnique: vi.fn().mockResolvedValue({
        id: 24,
        tmdbId: 240,
        title: 'Artwork Movie',
        sortTitle: 'Artwork Movie',
        year: 2024,
        posterUrl: 'https://image.tmdb.org/t/p/original/poster.jpg',
      }) },
    });
    const resolveStreamSource = vi.fn().mockResolvedValue({
      mediaType: 'MOVIE', mediaId: 24, title: 'Artwork Movie', filePath,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }));
    const app = createApp({
      prisma,
      playbackService: createPlaybackService({ resolveStreamSource }),
    });

    try {
      const image = await app.inject(`/Items/${movieId}/Images/Primary/0`);
      const backdrop = await app.inject(`/Items/${movieId}/Images/Backdrop/0`);
      const stream = await app.inject({
        method: 'GET',
        url: `/Videos/${movieId}/stream.mp4`,
        headers: { range: 'bytes=2-5' },
      });

      expect(image.statusCode).toBe(200);
      expect(image.headers['content-type']).toBe('image/jpeg');
      expect(image.rawPayload).toEqual(Buffer.from([1, 2, 3]));
      expect(backdrop.statusCode).toBe(200);
      expect(backdrop.headers['content-type']).toBe('image/jpeg');
      expect(backdrop.rawPayload).toEqual(Buffer.from([1, 2, 3]));
      expect(stream.statusCode).toBe(206);
      expect(stream.headers['content-range']).toBe('bytes 2-5/10');
      expect(stream.body).toBe('2345');
      expect(resolveStreamSource).toHaveBeenCalledWith({ mediaType: 'MOVIE', mediaId: 24 });
    } finally {
      await app.close();
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
