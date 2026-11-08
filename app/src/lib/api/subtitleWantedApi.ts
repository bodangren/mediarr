import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

// Schema definitions
const viewingPrioritySchema = z.object({
  bucket: z.enum(['continue-watching', 'recently-watched', 'recently-added', 'backfill']),
  rank: z.number(),
});

const coverageBucketSchema = z.object({
  bucket: z.enum(['continue-watching', 'recently-watched', 'recently-added', 'backfill']),
  total: z.number(),
  withChinese: z.number(),
  withEnglish: z.number(),
  withBoth: z.number(),
  missingChinese: z.number(),
  missingBoth: z.number(),
});

const coverageReportSchema = z.object({
  buckets: z.array(coverageBucketSchema),
  totals: coverageBucketSchema.omit({ bucket: true }),
  highPriority: z.object({ total: z.number(), covered: z.number(), missing: z.number() }),
});

export type SubtitleViewingPriority = z.infer<typeof viewingPrioritySchema>;
export type SubtitleCoverageReport = z.infer<typeof coverageReportSchema>;

const wantedSeriesEntrySchema = z.object({
  seriesId: z.number(),
  seriesTitle: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  episodeId: z.number(),
  episodeTitle: z.string(),
  missingLanguages: z.array(z.string()),
  lastSearch: z.string().optional(),
  addedAt: z.string().optional(),
  priority: viewingPrioritySchema.optional(),
});

const wantedMovieEntrySchema = z.object({
  movieId: z.number(),
  movieTitle: z.string(),
  year: z.number().optional(),
  missingLanguages: z.array(z.string()),
  lastSearch: z.string().optional(),
  addedAt: z.string().optional(),
  priority: viewingPrioritySchema.optional(),
});

const wantedCountSchema = z.object({
  seriesCount: z.number(),
  moviesCount: z.number(),
  totalCount: z.number(),
});

const searchTriggerResultSchema = z.object({
  triggered: z.boolean(),
  count: z.number().optional(),
});

const seriesItemSearchResultSchema = z.object({
  triggered: z.boolean(),
  seriesId: z.number(),
  languageCode: z.string(),
});

const movieItemSearchResultSchema = z.object({
  triggered: z.boolean(),
  movieId: z.number(),
  languageCode: z.string(),
});

// Exported types
export type WantedSeriesEntry = z.infer<typeof wantedSeriesEntrySchema>;
export type WantedMovieEntry = z.infer<typeof wantedMovieEntrySchema>;
export type WantedCount = z.infer<typeof wantedCountSchema>;
export type SearchTriggerResult = z.infer<typeof searchTriggerResultSchema>;
export type SeriesItemSearchResult = z.infer<typeof seriesItemSearchResultSchema>;
export type MovieItemSearchResult = z.infer<typeof movieItemSearchResultSchema>;

export interface WantedQueryParams {
  page?: number;
  pageSize?: number;
  languageCode?: string;
  bucket?: SubtitleViewingPriority['bucket'];
}

export function createSubtitleWantedApi(client: ApiHttpClient) {
  return {
    listWantedSeries(params: WantedQueryParams = {}): Promise<PaginatedResult<WantedSeriesEntry>> {
      const { page, pageSize, languageCode } = params;
      const query: Record<string, unknown> = {};

      if (page !== undefined) query.page = page;
      if (pageSize !== undefined) query.pageSize = pageSize;
      if (languageCode !== undefined) query.languageCode = languageCode;
      if (params.bucket !== undefined) query.bucket = params.bucket;

      return client.requestPaginated(
        {
          path: routeMap.subtitleWantedSeries,
          query,
        },
        wantedSeriesEntrySchema,
      );
    },

    listWantedMovies(params: WantedQueryParams = {}): Promise<PaginatedResult<WantedMovieEntry>> {
      const { page, pageSize, languageCode } = params;
      const query: Record<string, unknown> = {};

      if (page !== undefined) query.page = page;
      if (pageSize !== undefined) query.pageSize = pageSize;
      if (languageCode !== undefined) query.languageCode = languageCode;
      if (params.bucket !== undefined) query.bucket = params.bucket;

      return client.requestPaginated(
        {
          path: routeMap.subtitleWantedMovies,
          query,
        },
        wantedMovieEntrySchema,
      );
    },

    searchAllSeries(): Promise<SearchTriggerResult> {
      return client.request(
        {
          path: routeMap.subtitleWantedSeriesSearch,
          method: 'POST',
        },
        searchTriggerResultSchema,
      );
    },

    searchAllMovies(): Promise<SearchTriggerResult> {
      return client.request(
        {
          path: routeMap.subtitleWantedMoviesSearch,
          method: 'POST',
        },
        searchTriggerResultSchema,
      );
    },

    searchSeriesItem(seriesId: number, languageCode: string): Promise<SeriesItemSearchResult> {
      return client.request(
        {
          path: routeMap.subtitleWantedSeriesItemSearch(seriesId),
          method: 'POST',
          body: { languageCode },
        },
        seriesItemSearchResultSchema,
      );
    },

    searchMovieItem(movieId: number, languageCode: string): Promise<MovieItemSearchResult> {
      return client.request(
        {
          path: routeMap.subtitleWantedMovieItemSearch(movieId),
          method: 'POST',
          body: { languageCode },
        },
        movieItemSearchResultSchema,
      );
    },

    getWantedCount(): Promise<WantedCount> {
      return client.request(
        {
          path: routeMap.subtitleWantedCount,
        },
        wantedCountSchema,
      );
    },

    /** Per-bucket subtitle coverage + the high-priority denominator (track feature_subtitle_coverage_priority_20261108). */
    getCoverage(): Promise<SubtitleCoverageReport> {
      return client.request(
        {
          path: routeMap.subtitleCoverage,
        },
        coverageReportSchema,
      );
    },
  };
}
