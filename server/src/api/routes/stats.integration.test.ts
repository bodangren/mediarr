import { describe, it, expect, vi } from 'vitest';
import { createApiServer } from '../createApiServer';
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
    torrent: {
      count: vi.fn().mockResolvedValue(0),
    },
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ total: 0, avg: 0, size: 0 }]),
  };
}

describe('Statistics Full Flow Integration', () => {
  it('returns complete statistics across all endpoints with seeded data', async () => {
    const prisma = createPrismaMock();

    prisma.movie.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(90);
    prisma.series.count
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(20);
    prisma.episode.count
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(480);

    prisma.mediaFileVariant.findMany
      .mockResolvedValueOnce([
        { quality: 'WEBDL-1080p', fileSize: BigInt(5_000_000_000) },
        { quality: 'Bluray-4K', fileSize: BigInt(20_000_000_000) },
        { quality: 'HDTV-720p', fileSize: BigInt(1_000_000_000) },
      ])
      .mockResolvedValueOnce([
        { quality: 'WEBDL-1080p', fileSize: BigInt(2_000_000_000) },
        { quality: null, fileSize: BigInt(500_000_000) },
      ]);

    prisma.activityEvent.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(45)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(8);

    prisma.torrent.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(5);

    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ total: 50000000000 }])
      .mockResolvedValueOnce([{ total: 25000000000 }])
      .mockResolvedValueOnce([{ avg: 2048000 }])
      .mockResolvedValueOnce([{ size: 104857600 }]);

    const app = createApiServer({ prisma } as unknown as ApiDependencies);

    const libraryRes = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(libraryRes.statusCode).toBe(200);
    const libraryBody = JSON.parse(libraryRes.body);
    expect(libraryBody.data).toMatchObject({
      library: {
        totalMovies: 100,
        monitoredMovies: 90,
        totalSeries: 25,
        totalEpisodes: 500,
        monitoredEpisodes: 480,
      },
      files: {
        totalFiles: 5,
        totalSizeBytes: 28_500_000_000,
        movieFiles: 3,
        movieSizeBytes: 26_000_000_000,
        episodeFiles: 2,
        episodeSizeBytes: 2_500_000_000,
      },
      quality: {
        movies: { uhd4k: 1, hd1080p: 1, hd720p: 1, sd: 0, unknown: 0 },
        episodes: { uhd4k: 0, hd1080p: 1, hd720p: 0, sd: 0, unknown: 1 },
      },
      missing: { movies: 0, episodes: 0 },
      activity: {
        downloadsThisWeek: 12,
        downloadsThisMonth: 45,
        searchesThisWeek: 120,
        subtitlesThisWeek: 8,
      },
    });

    const downloadRes = await app.inject({ method: 'GET', url: '/api/stats/downloads' });
    expect(downloadRes.statusCode).toBe(200);
    const downloadBody = JSON.parse(downloadRes.body);
    expect(downloadBody.data).toMatchObject({
      totalTorrents: 50,
      activeDownloads: 5,
      completedDownloads: 40,
      failedDownloads: 5,
      totalDownloadedBytes: 50000000000,
      totalUploadedBytes: 25000000000,
      averageDownloadSpeed: 2048000,
    });

    const systemRes = await app.inject({ method: 'GET', url: '/api/stats/system' });
    expect(systemRes.statusCode).toBe(200);
    const systemBody = JSON.parse(systemRes.body);
    expect(systemBody.data).toMatchObject({
      dbSizeBytes: 104857600,
      uptimeSeconds: expect.any(Number),
      diskSpace: [],
    });
    expect(systemBody.data.uptimeSeconds).toBeGreaterThanOrEqual(0);

    await app.close();
  });

  it('handles empty database gracefully across all endpoints', async () => {
    const prisma = createPrismaMock();

    const app = createApiServer({ prisma } as unknown as ApiDependencies);

    const libraryRes = await app.inject({ method: 'GET', url: '/api/system/stats' });
    expect(libraryRes.statusCode).toBe(200);
    const libraryBody = JSON.parse(libraryRes.body);
    expect(libraryBody.data.library.totalMovies).toBe(0);

    const downloadRes = await app.inject({ method: 'GET', url: '/api/stats/downloads' });
    expect(downloadRes.statusCode).toBe(200);
    const downloadBody = JSON.parse(downloadRes.body);
    expect(downloadBody.data.totalTorrents).toBe(0);

    const systemRes = await app.inject({ method: 'GET', url: '/api/stats/system' });
    expect(systemRes.statusCode).toBe(200);
    const systemBody = JSON.parse(systemRes.body);
    expect(systemBody.data.dbSizeBytes).toBe(0);

    await app.close();
  });
});
