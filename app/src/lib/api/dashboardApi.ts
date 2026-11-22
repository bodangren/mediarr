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

const nextUpItemSchema = z.object({
  seriesId: z.number(),
  title: z.string(),
  posterUrl: z.string().nullable().optional(),
  backdropUrl: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  watchedCount: z.number(),
  totalCount: z.number(),
  nextEpisode: z.object({
    episodeId: z.number(),
    seasonNumber: z.number(),
    episodeNumber: z.number(),
    title: z.string(),
  }),
  lastWatchedAt: z.number(),
});

const recentlyAddedLibraryItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  posterUrl: z.string().nullable().optional(),
  added: z.string(),
});

const recentlyAddedItemSchema = recentlyAddedLibraryItemSchema.extend({
  type: z.enum(['movie', 'series']),
});

export type DiskSpaceInfo = z.infer<typeof diskSpaceInfoSchema>;
export type RecentlyAddedItem = z.infer<typeof recentlyAddedItemSchema>;
export type UpcomingItem = z.infer<typeof upcomingItemSchema>;
export type ContinueWatchingItem = z.infer<typeof continueWatchingItemSchema>;
export type NextUpItem = z.infer<typeof nextUpItemSchema>;

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
    /**
     * Recently added media.
     *
     * The dashboard used to filter the activity feed for import events, which
     * showed "No recent activity" whenever recent events were subtitle/search
     * failures — true on this server, whose library has plenty of media
     * (verified 2026-11-08). This reads the library itself, like the TV home.
     */
    async getRecentlyAdded(limit = 8): Promise<RecentlyAddedItem[]> {
      // The library payload has no `type` field, so it is added after parsing
      // rather than required by the schema (which made every response fail the
      // paginated contract).
      const [moviePage, seriesPage] = await Promise.all([
        client.requestPaginated(
          { path: '/api/movies', query: { sortBy: 'added', sortDir: 'desc', pageSize: limit } },
          recentlyAddedLibraryItemSchema,
        ),
        client.requestPaginated(
          { path: '/api/series', query: { sortBy: 'added', sortDir: 'desc', pageSize: limit } },
          recentlyAddedLibraryItemSchema,
        ),
      ]);
      const movies: RecentlyAddedItem[] = moviePage.items.map(item => ({ ...item, type: 'movie' as const }));
      const series: RecentlyAddedItem[] = seriesPage.items.map(item => ({ ...item, type: 'series' as const }));
      return [...movies, ...series]
        .sort((a, b) => Date.parse(b.added) - Date.parse(a.added))
        .slice(0, limit);
    },
    getContinueWatching(limit = 20): Promise<ContinueWatchingItem[]> {
      return client.request(
        { path: '/api/playback/continue-watching', query: { limit } },
        z.array(continueWatchingItemSchema),
      );
    },

    /** Series-level "next up" row: partially watched series with their next episode, newest first. */
    getNextUp(limit = 20): Promise<NextUpItem[]> {
      return client.request(
        { path: '/api/playback/next-up', query: { limit } },
        z.array(nextUpItemSchema),
      );
    },
  };
}
