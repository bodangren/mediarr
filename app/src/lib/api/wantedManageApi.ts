import { z } from 'zod';
import type { ApiHttpClient, PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';
import {
  createSubtitleWantedApi,
  type SubtitleCoverageReport,
  type WantedMovieEntry,
  type WantedQueryParams,
  type WantedSeriesEntry,
} from './subtitleWantedApi';

/**
 * Wanted management API (track feature_spa_management_surfaces_20261111, Phase 4).
 *
 * The SPA's manage console needs the combined media-wanted list (the per-type endpoints return
 * different shapes), the media per-item search route, and the viewing-priority coverage report.
 * Subtitle wanted/search already live in `subtitleWantedApi`, so this module composes it instead of
 * duplicating the contracts. Nothing here is added to the shared `index.ts`.
 */

const wantedPriorityBucketSchema = z.enum([
  'continue-watching',
  'recently-watched',
  'recently-added',
  'backfill',
]);

const wantedPrioritySchema = z.object({
  bucket: wantedPriorityBucketSchema,
  rank: z.number(),
});

export type WantedPriorityBucket = z.infer<typeof wantedPriorityBucketSchema>;
export type WantedPriority = z.infer<typeof wantedPrioritySchema>;

export const mediaWantedMovieItemSchema = z.object({
  type: z.literal('movie'),
  id: z.number(),
  tmdbId: z.number().optional(),
  title: z.string(),
  year: z.number().optional(),
  // Movies carry the release status ("Released", "Announced", …); episodes do not.
  status: z.string().optional(),
  monitored: z.boolean(),
  addedAt: z.string().nullable().optional(),
  priority: wantedPrioritySchema.optional(),
});

export const mediaWantedEpisodeItemSchema = z.object({
  type: z.literal('episode'),
  id: z.number(),
  seriesId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  title: z.string(),
  monitored: z.boolean(),
  airDateUtc: z.string().nullable().optional(),
  seriesTitle: z.string().optional(),
  addedAt: z.string().nullable().optional(),
  priority: wantedPrioritySchema.optional(),
});

export const mediaWantedItemSchema = z.discriminatedUnion('type', [
  mediaWantedMovieItemSchema,
  mediaWantedEpisodeItemSchema,
]);

export type MediaWantedMovieItem = z.infer<typeof mediaWantedMovieItemSchema>;
export type MediaWantedEpisodeItem = z.infer<typeof mediaWantedEpisodeItemSchema>;
export type MediaWantedItem = z.infer<typeof mediaWantedItemSchema>;

export type MediaSearchType = 'movie' | 'episode';

const mediaItemSearchResultSchema = z
  .object({
    success: z.boolean().optional(),
    reason: z.string().optional(),
    message: z.string().optional(),
    release: z
      .object({ title: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type MediaItemSearchResult = z.infer<typeof mediaItemSearchResultSchema>;

const bulkMediaSearchResultSchema = z.object({ message: z.string() }).passthrough();

export type BulkMediaSearchResult = z.infer<typeof bulkMediaSearchResultSchema>;

const priorityCoverageStatusSchema = z.enum(['dual', 'zho-only', 'en-only', 'none']);

const priorityCoverageItemSchema = z.object({
  mediaType: z.enum(['MOVIE', 'EPISODE']),
  mediaId: z.number(),
  title: z.string().nullable(),
  status: priorityCoverageStatusSchema,
  languages: z.array(z.string()),
});

const priorityCoverageReportSchema = z.object({
  days: z.number(),
  items: z.array(priorityCoverageItemSchema),
  counts: z.object({
    dual: z.number(),
    'zho-only': z.number(),
    'en-only': z.number(),
    none: z.number(),
  }),
  total: z.number(),
});

export type PriorityCoverageStatus = z.infer<typeof priorityCoverageStatusSchema>;
export type PriorityCoverageItem = z.infer<typeof priorityCoverageItemSchema>;
export type PriorityCoverageReport = z.infer<typeof priorityCoverageReportSchema>;

export interface MediaWantedQuery {
  page?: number;
  pageSize?: number;
}

/** Server caps pageSize at 10 000; the manage console filters/sorts client-side, so it asks once. */
export const WANTED_FETCH_LIMIT = 10_000;

export function createWantedManageApi(client: ApiHttpClient) {
  const subtitleWanted = createSubtitleWantedApi(client);

  return {
    /** Combined missing movies + missing episodes, already in server viewing-priority order. */
    listMediaWanted(query: MediaWantedQuery = {}): Promise<PaginatedResult<MediaWantedItem>> {
      return client.requestPaginated(
        {
          path: routeMap.wanted,
          query: { page: 1, pageSize: WANTED_FETCH_LIMIT, ...query },
        },
        mediaWantedItemSchema,
      );
    },

    /** Per-item search (`POST /api/media/:id/auto-search`). Failures arrive as ApiClientError. */
    searchMediaItem(id: number, type: MediaSearchType): Promise<MediaItemSearchResult> {
      return client.request(
        {
          path: `/api/media/${id}/auto-search`,
          method: 'POST',
          body: { type },
        },
        mediaItemSearchResultSchema,
      );
    },

    /** Fire-and-forget bulk search for all wanted media. */
    searchAllMedia(): Promise<BulkMediaSearchResult> {
      return client.request(
        {
          path: '/api/wanted/search-all',
          method: 'POST',
        },
        bulkMediaSearchResultSchema,
      );
    },

    listSubtitleWantedMovies(params: WantedQueryParams = {}): Promise<PaginatedResult<WantedMovieEntry>> {
      return subtitleWanted.listWantedMovies(params);
    },

    listSubtitleWantedSeries(params: WantedQueryParams = {}): Promise<PaginatedResult<WantedSeriesEntry>> {
      return subtitleWanted.listWantedSeries(params);
    },

    searchSubtitleMovieItem(movieId: number, languageCode: string): Promise<{ triggered: boolean }> {
      return subtitleWanted.searchMovieItem(movieId, languageCode);
    },

    /** The server route takes a series id and re-runs every episode of that series. */
    searchSubtitleSeriesItem(seriesId: number, languageCode: string): Promise<{ triggered: boolean }> {
      return subtitleWanted.searchSeriesItem(seriesId, languageCode);
    },

    searchAllSubtitleMovies(): Promise<{ triggered: boolean; count?: number }> {
      return subtitleWanted.searchAllMovies();
    },

    searchAllSubtitleSeries(): Promise<{ triggered: boolean; count?: number }> {
      return subtitleWanted.searchAllSeries();
    },

    getSubtitleCoverage(): Promise<SubtitleCoverageReport> {
      return subtitleWanted.getCoverage();
    },

    /** Coverage of what has actually been watched in the last `days` days, in priority order. */
    getPriorityCoverage(days = 14): Promise<PriorityCoverageReport> {
      return client.request(
        {
          path: '/api/subtitles/priority-coverage',
          query: { days },
        },
        priorityCoverageReportSchema,
      );
    },
  };
}

export type WantedManageApi = ReturnType<typeof createWantedManageApi>;
