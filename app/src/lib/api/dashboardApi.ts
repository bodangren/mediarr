import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

const diskSpaceInfoSchema = z.object({
  path: z.string(),
  label: z.string(),
  free: z.number(),
  total: z.number(),
  usedPercent: z.number(),
});

const upcomingItemSchema = z.object({
  id: z.number(),
  type: z.enum(['episode', 'movie']),
  title: z.string(),
  episodeTitle: z.string().optional(),
  seasonNumber: z.number().optional(),
  episodeNumber: z.number().optional(),
  date: z.string(),
  status: z.enum(['downloaded', 'missing', 'airing', 'unaired']),
  hasFile: z.boolean(),
});

const continueWatchingItemSchema = z.object({
  mediaType: z.enum(['MOVIE', 'EPISODE']),
  mediaId: z.number(),
  seriesId: z.number().nullable().optional(),
  title: z.string(),
  episodeTitle: z.string().nullable().optional(),
  seasonNumber: z.number().nullable().optional(),
  episodeNumber: z.number().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  backdropUrl: z.string().nullable().optional(),
  position: z.number(),
  duration: z.number(),
  progress: z.number(),
  isWatched: z.boolean(),
  lastWatched: z.string(),
});

export type DiskSpaceInfo = z.infer<typeof diskSpaceInfoSchema>;
export type UpcomingItem = z.infer<typeof upcomingItemSchema>;
export type ContinueWatchingItem = z.infer<typeof continueWatchingItemSchema>;

export function createDashboardApi(client: ApiHttpClient) {
  return {
    getDiskSpace(): Promise<DiskSpaceInfo[]> {
      return client.request(
        { path: '/api/dashboard/disk-space' },
        z.array(diskSpaceInfoSchema),
      );
    },
    getUpcoming(): Promise<UpcomingItem[]> {
      return client.request(
        { path: '/api/dashboard/upcoming' },
        z.array(upcomingItemSchema),
      );
    },
    getContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
      return client.request(
        { path: '/api/playback/continue-watching', query: { limit } },
        z.array(continueWatchingItemSchema),
      );
    },
  };
}
