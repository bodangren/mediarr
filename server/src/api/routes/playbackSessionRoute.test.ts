import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';
import { PlaybackSessionRegistry } from '../../services/PlaybackSessionRegistry';
import { registerPlaybackRoutes } from './playbackRoutes';

/**
 * Owner request 2026-11-21: the client tells the server when playback is happening so the
 * engine can throttle downloads/transcoding. The registry is the engine-side truth.
 */
describe('POST /api/playback/session', () => {
  let app: FastifyInstance;
  let registry: PlaybackSessionRegistry;

  beforeEach(() => {
    registry = new PlaybackSessionRegistry();
    app = Fastify({ logger: false });
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerPlaybackRoutes(app, { prisma: {}, playbackSessionRegistry: registry } as unknown as ApiDependencies);
  });

  it('tracks a playing session and clears it on stop', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/api/playback/session',
      payload: { type: 'episode', mediaId: 42, state: 'playing', sessionId: 'living-room' },
    });
    expect(start.statusCode).toBe(200);
    expect((start.json() as { data: { active: boolean } }).data.active).toBe(true);
    expect(registry.isPlaying()).toBe(true);

    const stop = await app.inject({
      method: 'POST',
      url: '/api/playback/session',
      payload: { type: 'episode', mediaId: 42, state: 'playing', sessionId: 'living-room', action: 'stop' },
    });
    expect(stop.statusCode).toBe(200);
    expect(registry.isPlaying()).toBe(false);
  });

  it('a paused session does not hold the engine back', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/playback/session',
      payload: { type: 'movie', mediaId: 7, state: 'playing', sessionId: 'tv' },
    });
    expect(registry.isPlaying()).toBe(true);
    await app.inject({
      method: 'POST',
      url: '/api/playback/session',
      payload: { type: 'movie', mediaId: 7, state: 'paused', sessionId: 'tv' },
    });
    expect(registry.isPlaying(), 'paused means the disk is free again').toBe(false);
  });

  it('rejects an unknown state', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/playback/session',
      payload: { type: 'movie', mediaId: 7, state: 'buffering' },
    });
    expect(response.statusCode).toBe(422);
  });
});
