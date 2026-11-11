import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

/**
 * Movie / series management API for the detail-page manage panels.
 *
 * Kept in its own module (not `lib/api/index.ts`) so the SPA management
 * workstreams stay disjoint. Every method maps to a real server route.
 */

const rescanMovieSchema = z.object({
  rescanned: z.boolean(),
  id: z.number(),
  filesLinked: z.number().default(0),
});

const rescanSeriesSchema = z.object({
  rescanned: z.boolean(),
  id: z.number(),
  episodeCount: z.number().default(0),
  filesLinked: z.number().default(0),
});

const deleteSchema = z.object({
  deleted: z.boolean(),
  id: z.number(),
});

const subtitleScanSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  subtitlesFound: z.number().default(0),
  newSubtitles: z.number().default(0),
});

const sidecarMatchSchema = z.object({
  success: z.boolean(),
  dryRun: z.boolean(),
  matched: z.array(z.object({ from: z.string(), to: z.string() })),
  unmatched: z.array(z.string()),
});

const priorityCoverageSchema = z.object({
  days: z.number(),
  items: z.array(z.object({
    mediaType: z.enum(['MOVIE', 'EPISODE']),
    mediaId: z.number(),
    title: z.string().nullable(),
    status: z.enum(['dual', 'zho-only', 'en-only', 'none']),
    languages: z.array(z.string()),
  })),
  counts: z.object({
    dual: z.number(),
    'zho-only': z.number(),
    'en-only': z.number(),
    none: z.number(),
  }).passthrough(),
  total: z.number(),
});

const autoSearchSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  data: z.object({
    release: z.object({ title: z.string().optional() }).optional(),
  }).optional(),
});

const createdMediaSchema = z.object({
  id: z.number(),
}).passthrough();

export type SidecarMatch = z.infer<typeof sidecarMatchSchema>['matched'][number];
export type SidecarMatchResponse = z.infer<typeof sidecarMatchSchema>;
export type PriorityCoverage = z.infer<typeof priorityCoverageSchema>;
export type PriorityCoverageItem = PriorityCoverage['items'][number];

export type ManageAutoSearchType = 'movie' | 'episode' | 'series';

export interface AddWantedInput {
  mediaType: 'MOVIE' | 'TV';
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  title: string;
  year: number;
  qualityProfileId?: number;
  monitored?: boolean;
  searchNow?: boolean;
}

export function createMediaManageApi(client: ApiHttpClient) {
  return {
    rescanMovie(movieId: number): Promise<z.infer<typeof rescanMovieSchema>> {
      return client.request(
        { path: `/api/movies/${movieId}/rescan`, method: 'POST', body: {} },
        rescanMovieSchema,
      );
    },

    rescanSeries(seriesId: number, folderPath?: string): Promise<z.infer<typeof rescanSeriesSchema>> {
      return client.request(
        {
          path: `/api/series/${seriesId}/rescan`,
          method: 'POST',
          body: folderPath ? { folderPath } : {},
        },
        rescanSeriesSchema,
      );
    },

    deleteMovie(movieId: number, deleteFiles = false): Promise<{ deleted: boolean; id: number }> {
      return client.request(
        {
          path: `/api/movies/${movieId}`,
          method: 'DELETE',
          query: deleteFiles ? { deleteFiles: 'true' } : {},
        },
        deleteSchema,
      );
    },

    deleteSeries(seriesId: number, deleteFiles = false): Promise<{ deleted: boolean; id: number }> {
      return client.request(
        {
          path: `/api/series/${seriesId}`,
          method: 'DELETE',
          query: deleteFiles ? { deleteFiles: 'true' } : {},
        },
        deleteSchema,
      );
    },

    /** Trigger the existing wanted/auto search for a movie, episode, or series. */
    triggerAutoSearch(id: number, type: ManageAutoSearchType): Promise<z.infer<typeof autoSearchSchema>> {
      return client.request(
        { path: `/api/media/${id}/auto-search`, method: 'POST', body: { type } },
        autoSearchSchema,
      );
    },

    /** Add (or re-add) the item to the wanted list. Server returns 409 verbatim when it exists. */
    addToWanted(input: AddWantedInput): Promise<{ id: number }> {
      return client.request(
        { path: '/api/wanted', method: 'POST', body: input },
        createdMediaSchema,
      );
    },

    /** Recent EN+ZH playback coverage, keyed by mediaId/mediaType. */
    getPriorityCoverage(days = 14): Promise<PriorityCoverage> {
      return client.request(
        { path: '/api/subtitles/priority-coverage', query: { days } },
        priorityCoverageSchema,
      );
    },

    scanMovieSubtitles(movieId: number): Promise<z.infer<typeof subtitleScanSchema>> {
      return client.request(
        { path: `/api/subtitles/movie/${movieId}/scan`, method: 'POST', body: {} },
        subtitleScanSchema,
      );
    },

    scanSeriesSubtitles(seriesId: number): Promise<z.infer<typeof subtitleScanSchema>> {
      return client.request(
        { path: `/api/subtitles/series/${seriesId}/scan`, method: 'POST', body: {} },
        subtitleScanSchema,
      );
    },

    /**
     * Find Chinese sidecars named for an older release and copy them to the variant stem.
     * Default is a preview (`dryRun`); pass `{ apply: true }` to write the copies.
     */
    matchMovieSidecars(movieId: number, options: { apply?: boolean } = {}): Promise<SidecarMatchResponse> {
      return client.request(
        {
          path: `/api/subtitles/movie/${movieId}/match-sidecars`,
          method: 'POST',
          body: options.apply ? { apply: true } : { dryRun: true },
        },
        sidecarMatchSchema,
      );
    },

    matchSeriesSidecars(seriesId: number, options: { apply?: boolean } = {}): Promise<SidecarMatchResponse> {
      return client.request(
        {
          path: `/api/subtitles/series/${seriesId}/match-sidecars`,
          method: 'POST',
          body: options.apply ? { apply: true } : { dryRun: true },
        },
        sidecarMatchSchema,
      );
    },
  };
}

export type MediaManageApi = ReturnType<typeof createMediaManageApi>;
