import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
declare const discoverMovieSchema: z.ZodObject<{
    id: z.ZodNumber;
    tmdbId: z.ZodNumber;
    title: z.ZodString;
    year: z.ZodNumber;
    overview: z.ZodString;
    posterUrl: z.ZodOptional<z.ZodString>;
    backdropUrl: z.ZodOptional<z.ZodString>;
    genres: z.ZodArray<z.ZodString, "many">;
    certification: z.ZodOptional<z.ZodString>;
    ratings: z.ZodObject<{
        tmdb: z.ZodNumber;
        imdb: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        tmdb: number;
        imdb?: number | undefined;
    }, {
        tmdb: number;
        imdb?: number | undefined;
    }>;
    releaseDate: z.ZodString;
    inLibrary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    tmdbId: number;
    id: number;
    year: number;
    overview: string;
    genres: string[];
    ratings: {
        tmdb: number;
        imdb?: number | undefined;
    };
    releaseDate: string;
    posterUrl?: string | undefined;
    certification?: string | undefined;
    inLibrary?: boolean | undefined;
    backdropUrl?: string | undefined;
}, {
    title: string;
    tmdbId: number;
    id: number;
    year: number;
    overview: string;
    genres: string[];
    ratings: {
        tmdb: number;
        imdb?: number | undefined;
    };
    releaseDate: string;
    posterUrl?: string | undefined;
    certification?: string | undefined;
    inLibrary?: boolean | undefined;
    backdropUrl?: string | undefined;
}>;
export type DiscoverMovie = z.infer<typeof discoverMovieSchema>;
export interface DiscoverRecommendationsParams {
    mode: 'popular' | 'top-rated' | 'new-releases' | 'upcoming';
}
export interface SearchMoviesParams {
    query: string;
}
export declare function createDiscoverApi(client: ApiHttpClient): {
    listRecommendations(params: DiscoverRecommendationsParams): Promise<DiscoverMovie[]>;
    searchMovies(params: SearchMoviesParams): Promise<{
        results: DiscoverMovie[];
    }>;
};
export {};
//# sourceMappingURL=discoverApi.d.ts.map