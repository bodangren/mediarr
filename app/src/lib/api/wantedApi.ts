import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';
import type { CutoffUnmetMoviesQuery, MissingMoviesQuery } from '../../types/wanted';

const missingMovieSchema = z.object({
  id: z.number(),
  movieId: z.number(),
  title: z.string(),
  year: z.number(),
  posterUrl: z.string().optional(),
  status: z.enum(['missing', 'announced', 'incinemas', 'released']),
  monitored: z.boolean(),
  cinemaDate: z.string().optional(),
  physicalRelease: z.string().optional(),
  digitalRelease: z.string().optional(),
  qualityProfileId: z.number(),
  qualityProfileName: z.string().optional(),
  runtime: z.number().optional(),
  certification: z.string().optional(),
  genres: z.array(z.string()).optional(),
});

const cutoffUnmetMovieSchema = z.object({
  id: z.number(),
  movieId: z.number(),
  title: z.string(),
  year: z.number(),
  posterUrl: z.string().optional(),
  monitored: z.boolean(),
  currentQuality: z.string(),
  cutoffQuality: z.string(),
  qualityProfileId: z.number(),
  qualityProfileName: z.string().optional(),
  fileId: z.number(),
  filePath: z.string(),
  fileSize: z.number(),
});

export type MissingMovie = z.infer<typeof missingMovieSchema>;
export type CutoffUnmetMovie = z.infer<typeof cutoffUnmetMovieSchema>;

export function createWantedApi(client: ApiHttpClient) {
  return {
    listMissingMovies(query: MissingMoviesQuery = {}): Promise<PaginatedResult<MissingMovie>> {
      return client.requestPaginated(
        {
          path: routeMap.moviesMissing,
          query,
        },
        missingMovieSchema,
      );
    },

    listCutoffUnmetMovies(query: CutoffUnmetMoviesQuery = {}): Promise<PaginatedResult<CutoffUnmetMovie>> {
      return client.requestPaginated(
        {
          path: routeMap.moviesCutoffUnmet,
          query,
        },
        cutoffUnmetMovieSchema,
      );
    },
  };
}
