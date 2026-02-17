import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const discoverMovieSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string(),
  year: z.number(),
  overview: z.string(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  genres: z.array(z.string()),
  certification: z.string().optional(),
  ratings: z.object({
    tmdb: z.number(),
    imdb: z.number().optional(),
  }),
  releaseDate: z.string(),
  inLibrary: z.boolean().optional(),
});

export type DiscoverMovie = z.infer<typeof discoverMovieSchema>;

const discoverRecommendationsSchema = z.object({
  mode: z.enum(['popular', 'top-rated', 'new-releases', 'upcoming']),
  movies: z.array(discoverMovieSchema),
});

export interface DiscoverRecommendationsParams {
  mode: 'popular' | 'top-rated' | 'new-releases' | 'upcoming';
}

export function createDiscoverApi(client: ApiHttpClient) {
  return {
    listRecommendations(params: DiscoverRecommendationsParams): Promise<DiscoverMovie[]> {
      return client.request(
        {
          path: routeMap.discover,
          query: { mode: params.mode },
        },
        z.array(discoverMovieSchema),
      );
    },
  };
}
