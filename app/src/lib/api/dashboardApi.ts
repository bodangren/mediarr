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

export type DiskSpaceInfo = z.infer<typeof diskSpaceInfoSchema>;
export type UpcomingItem = z.infer<typeof upcomingItemSchema>;

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
  };
}
