import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const seriesItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  status: z.string().optional(),
  monitored: z.boolean().optional(),
}).passthrough();

const movieItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  tmdbId: z.number().optional(),
  year: z.number().optional(),
  status: z.string().optional(),
  monitored: z.boolean().optional(),
}).passthrough();

const wantedItemSchema = z.object({
  type: z.union([z.literal('movie'), z.literal('episode')]),
  id: z.number(),
  title: z.string().optional(),
}).passthrough();

const metadataResultSchema = z.object({
  mediaType: z.union([z.literal('TV'), z.literal('MOVIE')]),
  title: z.string(),
}).passthrough();

const createdMediaSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
}).passthrough();

export type SeriesListItem = z.infer<typeof seriesItemSchema>;
export type MovieListItem = z.infer<typeof movieItemSchema>;
export type WantedListItem = z.infer<typeof wantedItemSchema>;
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

    deleteSeries(id: number, deleteFiles = false): Promise<{ deleted: boolean; id: number }> {
      return client.request(
        {
          path: routeMap.seriesDelete(id),
          method: 'DELETE',
          body: { deleteFiles },
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
          body: { deleteFiles },
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

    searchMetadata(input: {
      term: string;
      mediaType: 'TV' | 'MOVIE';
    }): Promise<MetadataSearchResult[]> {
      return client.request(
        {
          path: routeMap.mediaSearch,
          method: 'POST',
          body: input,
        },
        z.array(metadataResultSchema),
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
  };
}
