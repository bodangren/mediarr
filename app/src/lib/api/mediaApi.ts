import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';
import type {
  MissingEpisode,
  CutoffUnmetEpisode,
  MissingEpisodesQuery,
  CutoffUnmetEpisodesQuery,
} from '../../types/wanted';

const seriesItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().nullish(),
  status: z.string().nullish(),
  monitored: z.boolean().nullish(),
  sizeOnDisk: z.number().nullish(),
}).passthrough();

const movieItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  tmdbId: z.number().nullish(),
  imdbId: z.string().nullish(),
  year: z.number().nullish(),
  status: z.string().nullish(),
  monitored: z.boolean().nullish(),
  sizeOnDisk: z.number().nullish(),
}).passthrough();

const wantedItemSchema = z.object({
  type: z.union([z.literal('movie'), z.literal('episode')]),
  id: z.number(),
  title: z.string().nullish(),
}).passthrough();

const missingEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  seriesTitle: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  episodeTitle: z.string(),
  airDate: z.string(),
  status: z.union([z.literal('missing'), z.literal('unaired')]),
  monitored: z.boolean(),
}).passthrough();

const cutoffUnmetEpisodeSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  seriesTitle: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  episodeTitle: z.string(),
  currentQuality: z.string(),
  cutoffQuality: z.string(),
  airDate: z.string(),
}).passthrough();

const metadataResultSchema = z.object({
  mediaType: z.union([z.literal('TV'), z.literal('MOVIE')]),
  title: z.string(),
  tmdbId: z.number().optional(),
  tvdbId: z.number().optional(),
  imdbId: z.string().optional(),
  year: z.number().optional(),
  status: z.string().optional(),
  overview: z.string().optional(),
  network: z.string().optional(),
  images: z.array(z.object({
    coverType: z.string(),
    url: z.string(),
  })).optional(),
}).passthrough();

const createdMediaSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
}).passthrough();

export type SeriesListItem = z.infer<typeof seriesItemSchema>;
export type MovieListItem = z.infer<typeof movieItemSchema>;
export type WantedListItem = z.infer<typeof wantedItemSchema>;
export type MissingEpisodeItem = z.infer<typeof missingEpisodeSchema>;
export type CutoffUnmetEpisodeItem = z.infer<typeof cutoffUnmetEpisodeSchema>;
export type MetadataSearchResult = z.infer<typeof metadataResultSchema>;
export type CreatedMedia = z.infer<typeof createdMediaSchema>;

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: string;
  monitored?: boolean;
  search?: string;
  filterId?: number;
  customFilter?: string;
  jump?: string;
}

export interface WantedQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  type?: 'movie' | 'episode';
}

export interface AddMediaInput {
  mediaType: 'TV' | 'MOVIE';
  qualityProfileId?: number;
  monitored?: boolean;
  searchNow?: boolean;
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  title?: string;
  year?: number;
  status?: string;
  overview?: string;
  network?: string;
  posterUrl?: string;
  rootFolder?: string;
  monitor?: 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none';
  seriesType?: 'standard' | 'anime' | 'daily';
  seasonFolder?: boolean;
}

export type MonitoringType =
  | 'all'
  | 'none'
  | 'firstSeason'
  | 'lastSeason'
  | 'latestSeason'
  | 'pilotOnly'
  | 'monitored'
  | 'existing';

export interface MonitoringResult {
  updatedEpisodes: number;
  totalEpisodes: number;
  seriesId: number;
}

export interface BulkMonitoringResult {
  results: MonitoringResult[];
}

export function createMediaApi(client: ApiHttpClient) {
  return {
    listSeries(query: ListQuery = {}): Promise<PaginatedResult<SeriesListItem>> {
      return client.requestPaginated(
        {
          path: routeMap.series,
          query,
        },
        seriesItemSchema,
      );
    },

    getSeries(id: number): Promise<SeriesListItem> {
      return client.request(
        {
          path: routeMap.seriesDetail(id),
        },
        seriesItemSchema,
      );
    },

    setSeriesMonitored(id: number, monitored: boolean): Promise<SeriesListItem> {
      return client.request(
        {
          path: routeMap.seriesMonitored(id),
          method: 'PATCH',
          body: { monitored },
        },
        seriesItemSchema,
      );
    },

    setEpisodeMonitored(id: number, monitored: boolean): Promise<{ id: number; monitored: boolean }> {
      return client.request(
        {
          path: routeMap.episodeMonitored(id),
          method: 'PATCH',
          body: { monitored },
        },
        z.object({ id: z.number(), monitored: z.boolean() }),
      );
    },

    setSeasonMonitored(seriesId: number, seasonNumber: number, monitored: boolean): Promise<{ monitored: boolean }> {
      return client.request(
        {
          path: routeMap.seriesSeasonMonitoring(seriesId, seasonNumber),
          method: 'PATCH',
          body: { monitored },
        },
        z.object({ monitored: z.boolean() }).passthrough(),
      );
    },

    deleteSeries(id: number, deleteFiles = false): Promise<{ deleted: boolean; id: number }> {
      return client.request(
        {
          path: routeMap.seriesDelete(id),
          method: 'DELETE',
          query: deleteFiles ? { deleteFiles: 'true' } : {},
        },
        z.object({ deleted: z.boolean(), id: z.number() }),
      );
    },

    listMovies(query: ListQuery = {}): Promise<PaginatedResult<MovieListItem>> {
      return client.requestPaginated(
        {
          path: routeMap.movies,
          query,
        },
        movieItemSchema,
      );
    },

    getMovie(id: number): Promise<MovieListItem> {
      return client.request(
        {
          path: routeMap.movieDetail(id),
        },
        movieItemSchema,
      );
    },

    setMovieMonitored(id: number, monitored: boolean): Promise<MovieListItem> {
      return client.request(
        {
          path: routeMap.movieMonitored(id),
          method: 'PATCH',
          body: { monitored },
        },
        movieItemSchema,
      );
    },

    deleteMovie(id: number, deleteFiles = false): Promise<{ deleted: boolean; id: number }> {
      return client.request(
        {
          path: routeMap.movieDelete(id),
          method: 'DELETE',
          query: deleteFiles ? { deleteFiles: 'true' } : {},
        },
        z.object({ deleted: z.boolean(), id: z.number() }),
      );
    },

    listWanted(query: WantedQuery = {}): Promise<PaginatedResult<WantedListItem>> {
      return client.requestPaginated(
        {
          path: routeMap.wanted,
          query,
        },
        wantedItemSchema,
      );
    },

    listMissingEpisodes(query: MissingEpisodesQuery = {}): Promise<PaginatedResult<MissingEpisodeItem>> {
      return client.requestPaginated(
        {
          path: routeMap.missingEpisodes,
          query,
        },
        missingEpisodeSchema,
      );
    },

    listCutoffUnmetEpisodes(query: CutoffUnmetEpisodesQuery = {}): Promise<PaginatedResult<CutoffUnmetEpisodeItem>> {
      return client.requestPaginated(
        {
          path: routeMap.cutoffUnmetEpisodes,
          query,
        },
        cutoffUnmetEpisodeSchema,
      );
    },

    searchMetadata(input: {
      term: string;
      mediaType?: 'TV' | 'MOVIE';
    }): Promise<MetadataSearchResult[]> {
      return client.request(
        {
          path: routeMap.search,
          method: 'GET',
          query: input,
        },
        z.array(metadataResultSchema),
      );
    },

    addToWanted(input: AddMediaInput): Promise<CreatedMedia> {
      return client.request(
        {
          path: routeMap.wantedCreate,
          method: 'POST',
          body: input,
        },
        createdMediaSchema,
      );
    },

    addMedia(input: AddMediaInput): Promise<CreatedMedia> {
      return client.request(
        {
          path: routeMap.mediaCreate,
          method: 'POST',
          body: input,
        },
        createdMediaSchema,
      );
    },

    // Monitoring API (Season Pass)
    applySeriesMonitoring(
      seriesId: number,
      monitoringType: MonitoringType,
    ): Promise<MonitoringResult> {
      return client.request(
        {
          path: routeMap.seriesMonitoring(seriesId),
          method: 'PUT',
          body: { monitoringType },
        },
        z.object({
          updatedEpisodes: z.number(),
          totalEpisodes: z.number(),
          seriesId: z.number(),
        }),
      );
    },

    applyBulkSeriesMonitoring(
      seriesIds: number[],
      monitoringType: MonitoringType,
    ): Promise<BulkMonitoringResult> {
      return client.request(
        {
          path: routeMap.seriesBulkMonitoring,
          method: 'PUT',
          body: { seriesIds, monitoringType },
        },
        z.object({
          results: z.array(
            z.object({
              updatedEpisodes: z.number(),
              totalEpisodes: z.number(),
              seriesId: z.number(),
            }),
          ),
        }),
      );
    },

    setSeasonMonitoring(
      seriesId: number,
      seasonNumber: number,
      monitored: boolean,
    ): Promise<{ updatedEpisodes: number }> {
      return client.request(
        {
          path: routeMap.seriesSeasonMonitoring(seriesId, seasonNumber),
          method: 'PATCH',
          body: { monitored },
        },
        z.object({ updatedEpisodes: z.number() }),
      );
    },
  };
}
