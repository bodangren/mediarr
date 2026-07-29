import { describe, expect, it, vi } from 'vitest';
import { createJellyfinServer } from './createJellyfinServer';
import { encodeJellyfinId } from '../jellyfin/ids';

type PlaybackInput = {
  mediaType: 'MOVIE' | 'EPISODE';
  mediaId: number;
  userId?: string;
  position: number;
  duration: number;
};

function createPrismaFixture() {
  const noRows = vi.fn().mockResolvedValue([]);
  const noRow = vi.fn().mockResolvedValue(null);
  return {
    movie: { findMany: noRows, findUnique: noRow },
    series: { findMany: noRows, findUnique: noRow },
    season: { findMany: noRows, findUnique: noRow },
    episode: { findMany: noRows, findUnique: noRow },
    playbackProgress: { findFirst: noRow },
  };
}

function createSharedPlaybackFacade() {
  let stored: (PlaybackInput & { userId: string; lastWatched: Date }) | undefined;
  const recordHeartbeat = vi.fn(async (input: PlaybackInput) => {
    stored = {
      ...input,
      userId: input.userId?.trim() || 'lan-default',
      lastWatched: new Date('2026-07-29T12:00:00.000Z'),
    };
    return {
      ...stored,
      progress: stored.duration > 0 ? stored.position / stored.duration : 0,
      isWatched: false,
      lastWatched: stored.lastWatched.toISOString(),
    };
  });

  return {
    recordHeartbeat,
    playbackService: {
      recordHeartbeat,
      resolveStreamSource: vi.fn(),
      async getContinueWatching() {
        if (!stored) return [];
        return [{
          ...stored,
          progress: stored.duration > 0 ? stored.position / stored.duration : 0,
          isWatched: false,
          seriesId: stored.mediaType === 'EPISODE' ? 7 : null,
          title: stored.mediaType === 'EPISODE' ? 'Session Series' : 'Session Movie',
          episodeTitle: stored.mediaType === 'EPISODE' ? 'Stopped Episode' : null,
          seasonNumber: stored.mediaType === 'EPISODE' ? 1 : null,
          episodeNumber: stored.mediaType === 'EPISODE' ? 2 : null,
          posterUrl: null,
          backdropUrl: null,
        }];
      },
    },
  };
}

function createApp(playbackService: Record<string, unknown>) {
  return createJellyfinServer({
    prisma: createPrismaFixture(),
    playbackService,
  } as any, {
    serverId: 'session-integration',
    serverName: 'Mediarr',
  });
}

const EMBY_AUTHORIZATION = [
  'MediaBrowser Client="Jellyfin Android TV"',
  'Device="Living Room TV"',
  'DeviceId="living-room-tv"',
  'Version="0.18.4"',
].join(', ');

describe('Jellyfin session transport compatibility', () => {
  it('accepts bodyless query capabilities and returns a PascalCase SessionInfo DTO', async () => {
    const { playbackService } = createSharedPlaybackFacade();
    const app = createApp(playbackService);

    try {
      const headers = { 'x-emby-authorization': EMBY_AUTHORIZATION };
      const capabilities = await app.inject({
        method: 'POST',
        url: '/Sessions/Capabilities?PlayableMediaTypes=Video&SupportsMediaControl=true',
        headers,
      });
      const fullCapabilities = await app.inject({
        method: 'POST',
        url: '/Sessions/Capabilities/Full?SupportedCommands=Play,Pause&SupportsPersistentIdentifier=true',
        headers,
      });
      const sessions = await app.inject('/Sessions');

      expect([capabilities.statusCode, fullCapabilities.statusCode]).toEqual([204, 204]);
      expect(sessions.statusCode).toBe(200);
      expect(sessions.json()).toEqual([
        expect.objectContaining({
          Id: 'living-room-tv',
          UserId: '4d656469-6172-7200-0000-000000000001',
          UserName: 'Mediarr',
          Client: 'Jellyfin Android TV',
          DeviceName: 'Living Room TV',
          DeviceId: 'living-room-tv',
          ApplicationVersion: '0.18.4',
          IsActive: true,
          SupportsMediaControl: true,
          PlayableMediaTypes: ['Video'],
          Capabilities: expect.objectContaining({
            PlayableMediaTypes: ['Video'],
            SupportedCommands: ['Play', 'Pause'],
            SupportsMediaControl: true,
            SupportsPersistentIdentifier: true,
          }),
          PlayState: expect.objectContaining({
            PositionTicks: 0,
            CanSeek: true,
            IsPaused: true,
          }),
        }),
      ]);
      expect(sessions.json()[0]).not.toHaveProperty('id');
      expect(sessions.json()[0]).not.toHaveProperty('deviceId');
      expect(sessions.json()[0]).not.toHaveProperty('lastActivityAt');
    } finally {
      await app.close();
    }
  });

  it('persists a valid stopped event as the final shared resume heartbeat', async () => {
    const { playbackService, recordHeartbeat } = createSharedPlaybackFacade();
    const app = createApp(playbackService);
    const episodeId = encodeJellyfinId('episode', 91);

    try {
      const stopped = await app.inject({
        method: 'POST',
        url: '/Sessions/Playing/Stopped',
        headers: { 'x-emby-authorization': EMBY_AUTHORIZATION },
        payload: {
          ItemId: episodeId,
          PositionTicks: 370_000_000,
          RunTimeTicks: 1_000_000_000,
        },
      });
      const resume = await app.inject('/Users/compat-user/Items/Resume');
      const sessions = await app.inject('/Sessions');

      expect(stopped.statusCode).toBe(204);
      expect(recordHeartbeat).toHaveBeenCalledOnce();
      expect(recordHeartbeat).toHaveBeenCalledWith({
        mediaType: 'EPISODE',
        mediaId: 91,
        userId: 'lan-default',
        position: 37,
        duration: 100,
      });
      expect(resume.json()).toEqual({
        Items: [expect.objectContaining({
          Id: episodeId,
          RunTimeTicks: 1_000_000_000,
          UserData: expect.objectContaining({
            ItemId: episodeId,
            PlaybackPositionTicks: 370_000_000,
          }),
        })],
        TotalRecordCount: 1,
        StartIndex: 0,
      });
      expect(sessions.json()).toEqual([
        expect.objectContaining({
          Id: 'living-room-tv',
          PlayState: expect.objectContaining({
            PositionTicks: 370_000_000,
            IsPaused: true,
          }),
        }),
      ]);
    } finally {
      await app.close();
    }
  });
});
