import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const movieSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number(),
  monitored: z.boolean(),
  qualityProfileId: z.number(),
  added: z.string(),
  tmdbId: z.number().optional(),
  imdbId: z.string().optional(),
  path: z.string().optional(),
  sizeOnDisk: z.number().optional(),
  hasFile: z.boolean().optional(),
  status: z.string().optional(),
  overview: z.string().optional(),
  posterUrl: z.string().optional(),
  runtime: z.number().optional(),
  certification: z.string().optional(),
  genres: z.array(z.string()).optional(),
  titleSlug: z.string().optional(),
  sortTitle: z.string().optional(),
  studio: z.string().optional(),
  originalLanguage: z.object({
    id: z.number(),
    name: z.string(),
  }).optional(),
  collection: z.object({
    id: z.number(),
    title: z.string(),
    overview: z.string().optional(),
    posterUrl: z.string().optional(),
  }).optional(),
}).passthrough();

export type Movie = z.infer<typeof movieSchema>;

export interface UpdateMovieInput {
  monitored?: boolean;
  qualityProfileId?: number;
  title?: string;
  titleSlug?: string;
  overview?: string;
  studio?: string;
  certification?: string;
  genres?: string[];
  tags?: number[];
}

export function createMovieApi(client: ApiHttpClient) {
  return {
    getById(id: number): Promise<Movie> {
      return client.request(
        {
          path: routeMap.movieDetail(id),
        },
        movieSchema,
      );
    },

    refresh(id: number): Promise<{ id: number; refreshed: boolean }> {
      return client.request(
        {
          path: `/api/movies/${id}/refresh`,
          method: 'POST',
        },
        z.object({ id: z.number(), refreshed: z.boolean() }),
      );
    },

    update(id: number, input: UpdateMovieInput): Promise<Movie> {
      return client.request(
        {
          path: routeMap.movieDetail(id),
          method: 'PUT',
          body: input,
        },
        movieSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.movieDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    deleteFile(movieId: number, fileId: number): Promise<{ deleted: boolean }> {
      return client.request(
        {
          path: `/api/movies/${movieId}/files/${fileId}`,
          method: 'DELETE',
        },
        z.object({ deleted: z.boolean() }),
      );
    },
  };
}
