import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerApiErrorHandler } from '../errors';
import { registerPlaybackRoutes } from './playbackRoutes';
import type { ApiDependencies } from '../types';

interface TestContext {
  app: FastifyInstance;
  deps: Omit<ApiDependencies, 'playbackService'> & { playbackService: Record<string, any> };
}

function createApp(overrides: Partial<Record<string, any>> = {}): TestContext {
  const playbackService: Record<string, any> = {
    resolveStreamSource: vi.fn(),
    buildManifest: vi.fn(),
    recordHeartbeat: vi.fn(),
    resolveSubtitleTrack: vi.fn(),
    ...overrides.playbackService,
  };

  const deps = {
    prisma: {},
    playbackService,
    ...overrides,
  } as Omit<ApiDependencies, 'playbackService'> & { playbackService: Record<string, any> };

  const app = Fastify();
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerPlaybackRoutes(app, deps as unknown as ApiDependencies);

  return { app, deps };
}

describe('playbackRoutes', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediarr-playback-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('streams full media file with Accept-Ranges headers', async () => {
    const movieFile = path.join(tempDir, 'sample.mp4');
    await fs.writeFile(movieFile, '0123456789');

    const { app, deps } = createApp();
    deps.playbackService.resolveStreamSource.mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 1,
      title: 'Sample Movie',
      filePath: movieFile,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/stream/1?type=movie',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-length']).toBe('10');
    expect(response.body).toBe('0123456789');
    expect(deps.playbackService.resolveStreamSource).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      mediaId: 1,
    });

    await app.close();
  });

  it('supports partial content requests via Range header', async () => {
    const movieFile = path.join(tempDir, 'sample.mkv');
    await fs.writeFile(movieFile, '0123456789');

    const { app, deps } = createApp();
    deps.playbackService.resolveStreamSource.mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 1,
      title: 'Sample Movie',
      filePath: movieFile,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/stream/1?type=movie',
      headers: {
        range: 'bytes=2-5',
      },
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['content-range']).toBe('bytes 2-5/10');
    expect(response.headers['content-length']).toBe('4');
    expect(response.body).toBe('2345');

    await app.close();
  });

  it('returns 416 for invalid ranges', async () => {
    const movieFile = path.join(tempDir, 'sample.mp4');
    await fs.writeFile(movieFile, '0123456789');

    const { app, deps } = createApp();
    deps.playbackService.resolveStreamSource.mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 1,
      title: 'Sample Movie',
      filePath: movieFile,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/stream/1?type=movie',
      headers: {
        range: 'bytes=200-300',
      },
    });

    expect(response.statusCode).toBe(416);
    expect(response.headers['content-range']).toBe('bytes */10');

    await app.close();
  });

  it('returns playback manifest with stream and subtitle URLs', async () => {
    const { app, deps } = createApp();
    deps.playbackService.buildManifest.mockResolvedValue({
      streamUrl: '/api/stream/2?type=episode',
      metadata: {
        mediaType: 'EPISODE',
        mediaId: 2,
        title: 'Show S01E01 - Pilot',
        overview: 'Episode overview',
        posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
        backdropUrl: null,
      },
      subtitles: [
        {
          id: 44,
          languageCode: 'en',
          isForced: false,
          isHi: false,
          format: 'srt',
          url: '/api/playback/subtitles/44',
        },
      ],
      resume: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/playback/2?type=episode&userId=living-room',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.streamUrl).toBe('/api/stream/2?type=episode');
    expect(deps.playbackService.buildManifest).toHaveBeenCalledWith({
      mediaType: 'EPISODE',
      mediaId: 2,
      userId: 'living-room',
    });

    await app.close();
  });

  it('persists playback progress heartbeats', async () => {
    const { app, deps } = createApp();
    deps.playbackService.recordHeartbeat.mockResolvedValue({
      mediaType: 'MOVIE',
      mediaId: 1,
      userId: 'lan-default',
      position: 120,
      duration: 600,
      progress: 0.2,
      isWatched: false,
      lastWatched: '2026-03-05T00:00:00.000Z',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/playback/progress',
      payload: {
        type: 'movie',
        mediaId: 1,
        position: 120,
        duration: 600,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.progress).toBe(0.2);
    expect(deps.playbackService.recordHeartbeat).toHaveBeenCalledWith({
      mediaType: 'MOVIE',
      mediaId: 1,
      userId: undefined,
      position: 120,
      duration: 600,
    });

    await app.close();
  });

  it('serves subtitle sidecar files', async () => {
    const subtitleFile = path.join(tempDir, 'movie.en.srt');
    await fs.writeFile(subtitleFile, '1\n00:00:01,000 --> 00:00:03,000\nHello\n');

    const { app, deps } = createApp();
    deps.playbackService.resolveSubtitleTrack.mockResolvedValue({
      id: 99,
      filePath: subtitleFile,
      format: 'srt',
      languageCode: 'en',
      isForced: false,
      isHi: false,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/playback/subtitles/99',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-subrip');
    expect(response.body).toContain('Hello');
    expect(deps.playbackService.resolveSubtitleTrack).toHaveBeenCalledWith(99);

    await app.close();
  });

  it('returns validation error when playback service is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = Fastify();
    app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
    registerPlaybackRoutes(app, { prisma: {} as any });

    const response = await app.inject({
      method: 'GET',
      url: '/api/playback/1?type=movie',
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
    consoleSpy.mockRestore();
  });
});
