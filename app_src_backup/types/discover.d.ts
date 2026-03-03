export type DiscoverMode = 'popular' | 'top-rated' | 'new-releases' | 'upcoming';
export interface DiscoverFilters {
    minYear?: number;
    maxYear?: number;
    genres: string[];
    certification?: string;
    language?: string;
}
export interface DiscoverMovie {
    id: number;
    tmdbId: number;
    title: string;
    year: number;
    overview: string;
    posterUrl?: string;
    backdropUrl?: string;
    genres: string[];
    certification?: string;
    ratings: {
        tmdb: number;
        imdb?: number;
    };
    releaseDate: string;
    inLibrary?: boolean;
}
//# sourceMappingURL=discover.d.ts.map