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
const discoverRecommendationsSchema = z.object({
    mode: z.enum(['popular', 'top-rated', 'new-releases', 'upcoming']),
    movies: z.array(discoverMovieSchema),
});
export function createDiscoverApi(client) {
    return {
        listRecommendations(params) {
            return client.request({
                path: routeMap.discover,
                query: { mode: params.mode },
            }, z.array(discoverMovieSchema));
        },
        searchMovies(params) {
            return client.request({
                path: '/api/discover/movies/search',
                query: { query: params.query },
            }, z.object({
                results: z.array(discoverMovieSchema),
            }));
        },
    };
}
//# sourceMappingURL=discoverApi.js.map