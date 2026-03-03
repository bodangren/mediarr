import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
/**
 * Schema for a blacklisted subtitle item
 */
export const blacklistedSubtitleSchema = z.object({
    id: z.number(),
    type: z.enum(['series', 'movie']),
    // Series fields
    seriesId: z.number().optional(),
    seriesTitle: z.string().optional(),
    episodeId: z.number().optional(),
    seasonNumber: z.number().optional(),
    episodeNumber: z.number().optional(),
    episodeTitle: z.string().optional(),
    // Movie fields
    movieId: z.number().optional(),
    movieTitle: z.string().optional(),
    // Common fields
    languageCode: z.string(),
    provider: z.string(),
    reason: z.string(),
    timestamp: z.string(),
    subtitlePath: z.string().optional(),
});
/**
 * Schema for remove/clear operation result
 */
export const blacklistOperationResultSchema = z.object({
    deletedCount: z.number().int().nonnegative(),
});
/**
 * Subtitle Blacklist API client
 *
 * Manages blacklisted subtitles for the Bazarr-style subtitle blacklist feature.
 * Allows viewing and managing subtitles that were rejected or blacklisted.
 */
export function createSubtitleBlacklistApi(client) {
    return {
        /**
         * List blacklisted subtitles for series
         */
        listBlacklistSeries(params = {}) {
            return client.requestPaginated({
                path: routeMap.subtitleBlacklistSeries,
                query: params,
            }, blacklistedSubtitleSchema);
        },
        /**
         * List blacklisted subtitles for movies
         */
        listBlacklistMovies(params = {}) {
            return client.requestPaginated({
                path: routeMap.subtitleBlacklistMovies,
                query: params,
            }, blacklistedSubtitleSchema);
        },
        /**
         * Remove a specific subtitle from the blacklist
         */
        removeFromBlacklist(id) {
            return client.request({
                path: routeMap.subtitleBlacklistItem(id),
                method: 'DELETE',
            }, blacklistOperationResultSchema);
        },
        /**
         * Clear all blacklisted subtitles for series
         */
        clearBlacklistSeries() {
            return client.request({
                path: routeMap.subtitleBlacklistSeriesClear,
                method: 'DELETE',
            }, blacklistOperationResultSchema);
        },
        /**
         * Clear all blacklisted subtitles for movies
         */
        clearBlacklistMovies() {
            return client.request({
                path: routeMap.subtitleBlacklistMoviesClear,
                method: 'DELETE',
            }, blacklistOperationResultSchema);
        },
    };
}
//# sourceMappingURL=subtitleBlacklistApi.js.map