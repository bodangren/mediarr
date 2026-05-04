import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

const qualityBreakdownSchema = z.object({
  uhd4k: z.number(),
  hd1080p: z.number(),
  hd720p: z.number(),
  sd: z.number(),
  unknown: z.number(),
});

const libraryStatsSchema = z.object({
  library: z.object({
    totalMovies: z.number(),
    totalSeries: z.number(),
    totalEpisodes: z.number(),
    monitoredMovies: z.number(),
    monitoredSeries: z.number(),
    monitoredEpisodes: z.number(),
  }),
  files: z.object({
    totalFiles: z.number(),
    totalSizeBytes: z.number(),
    movieFiles: z.number(),
    movieSizeBytes: z.number(),
    episodeFiles: z.number(),
    episodeSizeBytes: z.number(),
  }),
  quality: z.object({
    movies: qualityBreakdownSchema,
    episodes: qualityBreakdownSchema,
  }),
  missing: z.object({
    movies: z.number(),
    episodes: z.number(),
  }),
  activity: z.object({
    downloadsThisWeek: z.number(),
    downloadsThisMonth: z.number(),
    searchesThisWeek: z.number(),
    subtitlesThisWeek: z.number(),
  }),
});

const downloadStatsSchema = z.object({
  totalTorrents: z.number(),
  activeDownloads: z.number(),
  completedDownloads: z.number(),
  failedDownloads: z.number(),
  totalDownloadedBytes: z.number(),
  totalUploadedBytes: z.number(),
  averageDownloadSpeed: z.number(),
});

const diskSpaceSchema = z.object({
  path: z.string(),
  freeBytes: z.number(),
  totalBytes: z.number(),
  usedPercent: z.number(),
});

const systemStatsSchema = z.object({
  dbSizeBytes: z.number(),
  uptimeSeconds: z.number(),
  diskSpace: z.array(diskSpaceSchema),
});

export type QualityBreakdown = z.infer<typeof qualityBreakdownSchema>;
export type LibraryStats = z.infer<typeof libraryStatsSchema>;
export type DownloadStats = z.infer<typeof downloadStatsSchema>;
export type SystemStats = z.infer<typeof systemStatsSchema>;
export type DiskSpaceInfo = z.infer<typeof diskSpaceSchema>;

export function createStatsApi(client: ApiHttpClient) {
  return {
    getStats(): Promise<LibraryStats> {
      return client.request({ path: '/api/system/stats' }, libraryStatsSchema);
    },
    getDownloadStats(): Promise<DownloadStats> {
      return client.request({ path: '/api/stats/downloads' }, downloadStatsSchema);
    },
    getSystemStats(): Promise<SystemStats> {
      return client.request({ path: '/api/stats/system' }, systemStatsSchema);
    },
  };
}
