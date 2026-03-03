import type { MovieListItem as ApiMovieListItem } from '@/lib/api/mediaApi';
/**
 * View mode options for movie library.
 */
export type MovieViewMode = 'table' | 'poster' | 'overview';
/**
 * Movie options state for localStorage persistence.
 */
export interface MovieOptionsState {
    viewMode: MovieViewMode;
    sortBy: string;
    sortDir: 'asc' | 'desc';
}
/**
 * Extended movie item with computed properties for UI views.
 */
export interface MovieListItem extends ApiMovieListItem {
    posterUrl?: string;
    overview?: string;
    runtime?: number;
    certification?: string;
    fileVariants?: Array<{
        id?: number;
        path?: string;
    }>;
    ratings?: {
        tmdb?: number;
        imdb?: number;
        rottenTomatoes?: number;
    };
}
/**
 * Determine file status for a movie.
 */
export declare function getFileStatus(item: MovieListItem): 'missing' | 'wanted' | 'completed' | 'downloading';
/**
 * Get rating display value (prefers TMDB, falls back to IMDb, then RT).
 */
export declare function getRatingDisplay(item: MovieListItem): number | undefined;
/**
 * Get formatted runtime string.
 */
export declare function getRuntimeDisplay(runtime?: number): string;
/**
 * Detailed movie information for the movie detail page.
 */
export interface MovieDetail {
    id: number;
    title: string;
    year?: number;
    overview?: string;
    runtime?: number;
    certification?: string;
    posterUrl?: string;
    backdropUrl?: string;
    status: string;
    monitored: boolean;
    qualityProfileId: number;
    qualityProfileName?: string;
    sizeOnDisk?: number;
    path?: string;
    genres?: string[];
    studio?: string;
    collection?: string;
    ratings: MovieRatings;
    files: MovieFile[];
    cast: CastMember[];
    crew: CrewMember[];
    alternateTitles: AlternateTitle[];
}
/**
 * Movie ratings from various sources.
 */
export interface MovieRatings {
    tmdb?: number;
    imdb?: number;
    rottenTomatoes?: number;
}
/**
 * Movie file information.
 */
export interface MovieFile {
    id: number;
    path: string;
    quality: string;
    size: number;
    language: string;
}
/**
 * Cast member information.
 */
export interface CastMember {
    id: number;
    name: string;
    character: string;
    profileUrl?: string;
}
/**
 * Crew member information.
 */
export interface CrewMember {
    id: number;
    name: string;
    role: string;
    profileUrl?: string;
}
/**
 * Alternate title information.
 */
export interface AlternateTitle {
    title: string;
    source: string;
}
/**
 * Format file size in human readable format.
 */
export declare function formatFileSize(bytes?: number): string;
//# sourceMappingURL=movie.d.ts.map