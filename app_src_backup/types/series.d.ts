import type { SeriesListItem as ApiSeriesListItem } from '@/lib/api/mediaApi';
/**
 * View mode options for series library.
 */
export type SeriesViewMode = 'table' | 'posters' | 'overview';
/**
 * Series options state for localStorage persistence.
 */
export interface SeriesOptionsState {
    viewMode: SeriesViewMode;
    sortBy: string;
    sortDir: 'asc' | 'desc';
}
/**
 * Extended series item with computed properties for UI views.
 */
export interface SeriesListItem extends ApiSeriesListItem {
    seasons?: Array<{
        episodes?: Array<{
            path?: string | null;
            seasonNumber?: number;
            episodeNumber?: number;
            airDate?: string | null;
            monitored?: boolean;
        }>;
    }>;
    overview?: string;
    network?: string;
    posterUrl?: string;
    tmdbId?: number;
    tvdbId?: number;
    imdbId?: string;
}
/**
 * Calculate episode progress percentage.
 */
export declare function calculateEpisodeProgress(item: SeriesListItem): number;
/**
 * Get episode counts for a series.
 */
export declare function getEpisodeCounts(item: SeriesListItem): {
    total: number;
    completed: number;
};
/**
 * Determine file status for a series.
 */
export declare function getFileStatus(item: SeriesListItem): 'missing' | 'wanted' | 'completed';
/**
 * Get next airing episode information.
 */
export declare function getNextAiring(item: SeriesListItem): {
    episodeNumber: number;
    seasonNumber: number;
    airDate: string;
} | null;
/**
 * Get last aired episode information.
 */
export declare function getLastAired(item: SeriesListItem): {
    episodeNumber: number;
    seasonNumber: number;
    airDate: string;
} | null;
//# sourceMappingURL=series.d.ts.map