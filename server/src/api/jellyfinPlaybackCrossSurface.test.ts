import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { createJellyfinServer } from './createJellyfinServer';
import { registerApiErrorHandler } from './errors';
import { registerPlaybackRoutes } from './routes/playbackRoutes';
import { encodeJellyfinId } from '../jellyfin/ids';

type MediaType = 'MOVIE' | 'EPISODE';

interface StoredProgress {
  mediaType: MediaType;
  mediaId: number;
  userId: string;
  position: number;
  duration: number;
  progress: number;
  isWatched: boolean;
  lastWatched: Date;
}

function createSharedPlaybackFacade() {
  const progress = new Map<string, StoredProgress>();
  const keyFor = (mediaType: MediaType, mediaId: number, userId: string) => (
    `${mediaType}:${mediaId}:${userId}`
  );

  return {
    async recordHeartbeat(input: {
      mediaType: MediaType;
      mediaId: number;
      userId?: string;
      position: number;
      duration: number;
    }) {
      const userId = input.userId?.trim() || 'lan-default';
      const position = Math.max(0, Math.trunc(input.position));
      const duration = Math.max(0, Math.trunc(input.duration));
      const saved: StoredProgress = {
        mediaType: input.mediaType,
        mediaId: input.mediaId,
        userId,
        position,
        duration,
        progress: duration > 0 ? position / duration : 0,
        isWatched: false,
        lastWatched: new Date(),
      };
      progress.set(keyFor(saved.mediaType, saved.mediaId, saved.userId), saved);
      return {
        ...saved,
        lastWatched: saved.lastWatched.toISOString(),
      };
    },
    async getContinueWatching(limit = 20) {
      return Array.from(progress.values())
        .filter(item => !item.isWatched && item.position > 0)
        .sort((left, right) => right.lastWatched.getTime() - left.lastWatched.getTime())
        .slice(0, limit)
        .map(item => ({
          ...item,
          seriesId: item.mediaType === 'EPISODE' ? 7 : null,
          title: item.mediaType === 'EPISODE' ? 'Shared Series' : 'Shared Movie',
          episodeTitle: item.mediaType === 'EPISODE' ? 'Shared Episode' : null,
          seasonNumber: item.mediaType === 'EPISODE' ? 1 : null,
          episodeNumber: item.mediaType === 'EPISODE' ? 1 : null,
          posterUrl: null,
          backdropUrl: null,
        }));
    },
  };
}

function createCatalogDelegates() {
  const noRows = async () => [];
  const noRow = async () => null;
  return {
    movie: { findMany: noRows, findUnique: noRow },
    series: { findMany: noRows, findUnique: noRow },
    season: { findMany: noRows, findUnique: noRow },
    episode: { findMany: noRows, findUnique: noRow },
    playbackProgress: { findFirst: noRow },
  };
}

describe('Jellyfin and SPA playback share one store', () => {
  let spa: FastifyInstance | undefined;
  let jellyfin: FastifyInstance | undefined;

  afterEach(async () => {
    await Promise.all([spa?.close(), jellyfin?.close()]);
    spa = undefined;
    jellyfin = undefined;
  });

  it('makes Jellyfin progress visible to the SPA and SPA heartbeats visible to Jellyfin resume', async () => {
    const playbackService = createSharedPlaybackFacade();
    const episodeId = encodeJellyfinId('episode', 15);

    spa = Fastify();
    spa.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerPlaybackRoutes(spa, {
      prisma: {},
      playbackService,
    } as any);
    jellyfin = createJellyfinServer({
      prisma: createCatalogDelegates(),
      playbackService,
    } as any, {
      serverId: 'mediarr-test',
      serverName: 'Mediarr Test',
    });

    const jellyfinProgress = await jellyfin.inject({
      method: 'POST',
      url: '/Sessions/Playing/Progress',
      payload: {
        DeviceId: 'living-room-tv',
        ItemId: episodeId,
        PositionTicks: 120_000_000,
        RunTimeTicks: 600_000_000,
      },
    });
    expect(jellyfinProgress.statusCode).toBe(204);

    const spaContinueWatching = await spa.inject('/api/playback/continue-watching');
    expect(spaContinueWatching.statusCode).toBe(200);
    expect(spaContinueWatching.json().data).toEqual([
      expect.objectContaining({
        mediaType: 'EPISODE',
        mediaId: 15,
        userId: 'lan-default',
        position: 12,
        duration: 60,
      }),
    ]);

    const spaHeartbeat = await spa.inject({
      method: 'POST',
      url: '/api/playback/progress',
      payload: {
        type: 'episode',
        mediaId: 15,
        position: 24,
        duration: 60,
      },
    });
    expect(spaHeartbeat.statusCode).toBe(200);

    const jellyfinResume = await jellyfin.inject('/Users/any-client/Items/Resume');
    expect(jellyfinResume.statusCode).toBe(200);
    expect(jellyfinResume.json()).toEqual({
      Items: [expect.objectContaining({
        Id: episodeId,
        Type: 'Episode',
        RunTimeTicks: 600_000_000,
        UserData: expect.objectContaining({
          ItemId: episodeId,
          PlaybackPositionTicks: 240_000_000,
        }),
      })],
      TotalRecordCount: 1,
      StartIndex: 0,
    });
  });
});
