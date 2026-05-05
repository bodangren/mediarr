import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../contracts';
import type { ApiDependencies } from '../types';

export interface QualityBreakdown {
  uhd4k: number;
  hd1080p: number;
  hd720p: number;
  sd: number;
  unknown: number;
}

export interface LibraryStats {
  library: {
    totalMovies: number;
    totalSeries: number;
    totalEpisodes: number;
    monitoredMovies: number;
    monitoredSeries: number;
    monitoredEpisodes: number;
  };
  files: {
    totalFiles: number;
    totalSizeBytes: number;
    movieFiles: number;
    movieSizeBytes: number;
    episodeFiles: number;
    episodeSizeBytes: number;
  };
  quality: {
    movies: QualityBreakdown;
    episodes: QualityBreakdown;
  };
  missing: {
    movies: number;
    episodes: number;
  };
  activity: {
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    searchesThisWeek: number;
    subtitlesThisWeek: number;
  };
}

export function categorizeQuality(quality: string | null | undefined): keyof QualityBreakdown {
  if (!quality) return 'unknown';
  const q = quality.toLowerCase();
  if (q.includes('4k') || q.includes('2160p') || q.includes('uhd')) return 'uhd4k';
  if (q.includes('1080p') || q.includes('1080i') || q.includes('1080')) return 'hd1080p';
  if (q.includes('720p') || q.includes('720')) return 'hd720p';
  if (q.includes('480p') || q.includes('dvd') || q.includes('sd') || q.includes('480')) return 'sd';
  return 'unknown';
}

export function buildQualityBreakdown(
  variants: Array<{ quality: string | null }>,
): QualityBreakdown {
  const breakdown: QualityBreakdown = { uhd4k: 0, hd1080p: 0, hd720p: 0, sd: 0, unknown: 0 };
  for (const v of variants) {
    const bucket = categorizeQuality(v.quality);
    breakdown[bucket] += 1;
  }
  return breakdown;
}

export function registerStatsRoutes(app: FastifyInstance, deps: ApiDependencies): void {
  app.get('/api/system/stats', async (_request, reply) => {
    const prisma = deps.prisma as any;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Library counts
    const [totalMovies, totalSeries, totalEpisodes, monitoredMovies, monitoredSeries, monitoredEpisodes] =
      await Promise.all([
        prisma.movie?.count?.() ?? 0,
        prisma.series?.count?.() ?? 0,
        prisma.episode?.count?.() ?? 0,
        prisma.movie?.count?.({ where: { monitored: true } }) ?? 0,
        prisma.series?.count?.({ where: { monitored: true } }) ?? 0,
        prisma.episode?.count?.({ where: { monitored: true } }) ?? 0,
      ]);

    // File variants
    const movieVariants: Array<{ quality: string | null; fileSize: bigint }> =
      prisma.mediaFileVariant?.findMany
        ? await prisma.mediaFileVariant.findMany({
            where: { mediaType: 'MOVIE' },
            select: { quality: true, fileSize: true },
          })
        : [];

    const episodeVariants: Array<{ quality: string | null; fileSize: bigint }> =
      prisma.mediaFileVariant?.findMany
        ? await prisma.mediaFileVariant.findMany({
            where: { mediaType: 'EPISODE' },
            select: { quality: true, fileSize: true },
          })
        : [];

    const movieFiles = movieVariants.length;
    const episodeFiles = episodeVariants.length;
    const movieSizeBytes = movieVariants.reduce((sum, v) => sum + Number(v.fileSize), 0);
    const episodeSizeBytes = episodeVariants.reduce((sum, v) => sum + Number(v.fileSize), 0);

    // Missing items
    const missingMovies: number = prisma.movie?.count
      ? await prisma.movie.count({
          where: {
            monitored: true,
            fileVariants: { none: {} },
          },
        })
      : 0;

    const missingEpisodes: number = prisma.episode?.count
      ? await prisma.episode.count({
          where: {
            monitored: true,
            airDateUtc: { lte: now },
            fileVariants: { none: {} },
          },
        })
      : 0;

    // Activity counts
    const downloadEventTypes = ['RELEASE_GRABBED', 'IMPORT_COMPLETED'];
    const [downloadsThisWeek, downloadsThisMonth, searchesThisWeek, subtitlesThisWeek] =
      await Promise.all([
        prisma.activityEvent?.count?.({
          where: { eventType: { in: downloadEventTypes }, occurredAt: { gte: weekAgo } },
        }) ?? 0,
        prisma.activityEvent?.count?.({
          where: { eventType: { in: downloadEventTypes }, occurredAt: { gte: monthAgo } },
        }) ?? 0,
        prisma.activityEvent?.count?.({
          where: { eventType: 'SEARCH_EXECUTED', occurredAt: { gte: weekAgo } },
        }) ?? 0,
        prisma.activityEvent?.count?.({
          where: { eventType: 'SUBTITLE_DOWNLOADED', occurredAt: { gte: weekAgo } },
        }) ?? 0,
      ]);

    const stats: LibraryStats = {
      library: {
        totalMovies,
        totalSeries,
        totalEpisodes,
        monitoredMovies,
        monitoredSeries,
        monitoredEpisodes,
      },
      files: {
        totalFiles: movieFiles + episodeFiles,
        totalSizeBytes: movieSizeBytes + episodeSizeBytes,
        movieFiles,
        movieSizeBytes,
        episodeFiles,
        episodeSizeBytes,
      },
      quality: {
        movies: buildQualityBreakdown(movieVariants),
        episodes: buildQualityBreakdown(episodeVariants),
      },
      missing: {
        movies: missingMovies,
        episodes: missingEpisodes,
      },
      activity: {
        downloadsThisWeek,
        downloadsThisMonth,
        searchesThisWeek,
        subtitlesThisWeek,
      },
    };

    return sendSuccess(reply, stats);
  });

  app.get('/api/stats/downloads', async (_request, reply) => {
    const prisma = deps.prisma as any;

    const [
      totalTorrents,
      activeTorrents,
      completedTorrents,
      failedTorrents,
    ] = await Promise.all([
      prisma.torrent?.count?.() ?? 0,
      prisma.torrent?.count?.({
        where: { status: { in: ['downloading', 'metaDL', 'checking'] } },
      }) ?? 0,
      prisma.torrent?.count?.({ where: { status: 'completed' } }) ?? 0,
      prisma.torrent?.count?.({ where: { status: 'error' } }) ?? 0,
    ]);

    const [totalDownloaded, totalUploaded, avgSpeed] = await Promise.all([
      getAggregateSum(prisma, 'Torrent', 'downloaded'),
      getAggregateSum(prisma, 'Torrent', 'uploaded'),
      getAverageDownloadSpeed(prisma),
    ]);

    return sendSuccess(reply, {
      totalTorrents,
      activeDownloads: activeTorrents,
      completedDownloads: completedTorrents,
      failedDownloads: failedTorrents,
      totalDownloadedBytes: totalDownloaded,
      totalUploadedBytes: totalUploaded,
      averageDownloadSpeed: avgSpeed,
    });
  });

  app.get('/api/stats/system', async (_request, reply) => {
    const prisma = deps.prisma as any;

    const dbSize = await getDatabaseSize(prisma);
    const uptime = process.uptime();

    const diskSpace: Array<{
      path: string;
      freeBytes: number;
      totalBytes: number;
      usedPercent: number;
    }> = [];

    if (deps.systemHealthService) {
      try {
        const settings = await deps.settingsService?.get?.() ?? {} as import('../../repositories/AppSettingsRepository').AppSettingsPayload;
        const paths = [
          {
            path: settings.mediaManagement?.movieRootFolder ?? '/',
            label: 'Movies',
          },
          {
            path: settings.mediaManagement?.tvRootFolder ?? '/',
            label: 'TV Shows',
          },
        ];
        const diskInfo = await deps.systemHealthService.getDiskSpace(paths);
        diskSpace.push(
          ...diskInfo
            .filter((d) => d.total > 0)
            .map((d) => ({
              path: d.path,
              freeBytes: d.free,
              totalBytes: d.total,
              usedPercent: Math.round(((d.total - d.free) / d.total) * 100),
            })),
        );
      } catch {
        // Disk space check is best-effort
      }
    }

    return sendSuccess(reply, {
      dbSizeBytes: dbSize,
      uptimeSeconds: Math.round(uptime),
      diskSpace,
    });
  });
}

async function getAggregateSum(
  prisma: any,
  table: string,
  field: string,
): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe?.(
      `SELECT SUM(${field}) as total FROM ${table}`,
    );
    const total = Array.isArray(result) ? result[0]?.total : 0;
    return Number(total) || 0;
  } catch {
    return 0;
  }
}

async function getAverageDownloadSpeed(prisma: any): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe?.(
      `SELECT AVG(downloadSpeed) as avg FROM Torrent WHERE status IN ('downloading', 'metaDL')`,
    );
    const avg = Array.isArray(result) ? result[0]?.avg : 0;
    return Number(avg) || 0;
  } catch {
    return 0;
  }
}

async function getDatabaseSize(prisma: any): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe?.(
      `SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`,
    );
    const size = Array.isArray(result) ? result[0]?.size : 0;
    return Number(size) || 0;
  } catch {
    return 0;
  }
}
