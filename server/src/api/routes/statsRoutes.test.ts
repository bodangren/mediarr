import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerStatsRoutes, categorizeQuality, buildQualityBreakdown } from './statsRoutes';
import { registerApiErrorHandler } from '../errors';
import type { ApiDependencies } from '../types';

function createPrismaMock() {
  return {
    movie: {
      count: vi.fn().mockResolvedValue(0),
    },
    series: {
      count: vi.fn().mockResolvedValue(0),
    },
    episode: {
      count: vi.fn().mockResolvedValue(0),
    },
    mediaFileVariant: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    activityEvent: {
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

function createApp(prisma: ReturnType<typeof createPrismaMock>): FastifyInstance {
  const app = Fastify();
  const deps = { prisma } as unknown as ApiDependencies;
  app.setErrorHandler((error, request, reply) => registerApiErrorHandler(request, reply, error));
  registerStatsRoutes(app, deps);
  return app;
}

describe('statsRoutes — GET /api/system/stats', () => {
  let app: FastifyInstance;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
    app = createApp(prisma);
  });

  it('returns 200 with expected shape on empty database', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toMatchObject({
      library: expect.objectContaining({ totalMovies: 0, totalSeries: 0, totalEpisodes: 0 }),
      files: expect.objectContaining({ totalFiles: 0, totalSizeBytes: 0 }),
      quality: expect.objectContaining({ movies: expect.any(Object), episodes: expect.any(Object) }),
      missing: expect.objectContaining({ movies: 0, episodes: 0 }),
      activity: expect.objectContaining({ downloadsThisWeek: 0 }),
    });
  });

  it('returns correct library counts from mock prisma', async () => {
    prisma.movie.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);
    prisma.series.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
    prisma.episode.count.mockResolvedValueOnce(500).mockResolvedValueOnce(480);

    const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.library.totalMovies).toBe(50);
    expect(body.data.library.monitoredMovies).toBe(45);
    expect(body.data.library.totalSeries).toBe(10);
    expect(body.data.library.totalEpisodes).toBe(500);
  });

  it('calculates file sizes correctly', async () => {
    prisma.mediaFileVariant.findMany
      .mockResolvedValueOnce([
        { quality: 'WEBDL-1080p', fileSize: BigInt(5_000_000_000) },
        { quality: 'Bluray-4K', fileSize: BigInt(20_000_000_000) },
      ])
      .mockResolvedValueOnce([
        { quality: 'HDTV-720p', fileSize: BigInt(1_000_000_000) },
      ]);

    const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.files.movieFiles).toBe(2);
    expect(body.data.files.episodeFiles).toBe(1);
    expect(body.data.files.totalFiles).toBe(3);
    expect(body.data.files.movieSizeBytes).toBe(25_000_000_000);
    expect(body.data.files.episodeSizeBytes).toBe(1_000_000_000);
    expect(body.data.files.totalSizeBytes).toBe(26_000_000_000);
  });

  it('returns quality breakdown with correct bucketing', async () => {
    prisma.mediaFileVariant.findMany
      .mockResolvedValueOnce([
        { quality: 'WEBDL-1080p', fileSize: BigInt(1) },
        { quality: 'Bluray-4K', fileSize: BigInt(1) },
        { quality: 'HDTV-720p', fileSize: BigInt(1) },
        { quality: null, fileSize: BigInt(1) },
      ])
      .mockResolvedValueOnce([]);

    const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.quality.movies.hd1080p).toBe(1);
    expect(body.data.quality.movies.uhd4k).toBe(1);
    expect(body.data.quality.movies.hd720p).toBe(1);
    expect(body.data.quality.movies.unknown).toBe(1);
  });

  it('returns activity counts correctly', async () => {
    prisma.activityEvent.count
      .mockResolvedValueOnce(5)   // downloadsThisWeek
      .mockResolvedValueOnce(15)  // downloadsThisMonth
      .mockResolvedValueOnce(30)  // searchesThisWeek
      .mockResolvedValueOnce(10); // subtitlesThisWeek

    const res = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.activity.downloadsThisWeek).toBe(5);
    expect(body.data.activity.downloadsThisMonth).toBe(15);
    expect(body.data.activity.searchesThisWeek).toBe(30);
    expect(body.data.activity.subtitlesThisWeek).toBe(10);
  });
});

describe('categorizeQuality', () => {
  it('categorizes 4K content correctly', () => {
    expect(categorizeQuality('Bluray-4K')).toBe('uhd4k');
    expect(categorizeQuality('WEBDL-2160p')).toBe('uhd4k');
    expect(categorizeQuality('UHD-Bluray')).toBe('uhd4k');
  });

  it('categorizes 1080p content correctly', () => {
    expect(categorizeQuality('WEBDL-1080p')).toBe('hd1080p');
    expect(categorizeQuality('Bluray-1080p')).toBe('hd1080p');
  });

  it('categorizes 720p content correctly', () => {
    expect(categorizeQuality('HDTV-720p')).toBe('hd720p');
    expect(categorizeQuality('WEBDL-720p')).toBe('hd720p');
  });

  it('categorizes SD content correctly', () => {
    expect(categorizeQuality('DVD')).toBe('sd');
    expect(categorizeQuality('HDTV-480p')).toBe('sd');
  });

  it('returns unknown for null or unrecognized values', () => {
    expect(categorizeQuality(null)).toBe('unknown');
    expect(categorizeQuality(undefined)).toBe('unknown');
    expect(categorizeQuality('REMUX')).toBe('unknown');
  });
});

describe('buildQualityBreakdown', () => {
  it('returns all-zero breakdown for empty array', () => {
    const result = buildQualityBreakdown([]);
    expect(result).toEqual({ uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 0 });
  });

  it('counts each quality bucket correctly', () => {
    const result = buildQualityBreakdown([
      { quality: 'Bluray-4K' },
      { quality: 'WEBDL-1080p' },
      { quality: 'WEBDL-1080p' },
      { quality: 'HDTV-720p' },
      { quality: null },
    ]);
    expect(result.uhd4k).toBe(1);
    expect(result.hd1080p).toBe(2);
    expect(result.hd720p).toBe(1);
    expect(result.unknown).toBe(1);
  });
});
