import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
// SubtitleHistoryEntry schema
const subtitleHistoryEntrySchema = z.object({
    id: z.number(),
    type: z.union([z.literal('series'), z.literal('movie')]),
    seriesId: z.number().optional(),
    movieId: z.number().optional(),
    episodeId: z.number().optional(),
    seriesTitle: z.string().optional(),
    movieTitle: z.string().optional(),
    seasonNumber: z.number().optional(),
    episodeNumber: z.number().optional(),
    episodeTitle: z.string().optional(),
    languageCode: z.string(),
    provider: z.string(),
    score: z.number(),
    action: z.union([
        z.literal('download'),
        z.literal('upgrade'),
        z.literal('manual'),
        z.literal('upload'),
    ]),
    timestamp: z.string(),
    filePath: z.string().optional(),
}).passthrough();
// History stats schema
const historyDownloadSchema = z.object({
    date: z.string(),
    series: z.number(),
    movies: z.number(),
});
const historyByProviderSchema = z.object({
    provider: z.string(),
    count: z.number(),
});
const historyByLanguageSchema = z.object({
    language: z.string(),
    count: z.number(),
});
const historyStatsSchema = z.object({
    period: z.string(),
    downloads: z.array(historyDownloadSchema),
    byProvider: z.array(historyByProviderSchema),
    byLanguage: z.array(historyByLanguageSchema),
}).passthrough();
// Clear history result schema
const clearHistoryResultSchema = z.object({
    deletedCount: z.number().int().nonnegative(),
});
export function createSubtitleHistoryApi(client) {
    return {
        /**
         * List subtitle download history with optional filtering
         */
        listHistory(params = {}) {
            return client.requestPaginated({
                path: routeMap.subtitleHistory,
                query: params,
            }, subtitleHistoryEntrySchema);
        },
        /**
         * Get aggregated statistics for subtitle downloads
         */
        getHistoryStats(params) {
            return client.request({
                path: routeMap.subtitleHistoryStats,
                query: params,
            }, historyStatsSchema);
        },
        /**
         * Clear subtitle history, optionally filtered by type
         */
        clearHistory(type) {
            return client.request({
                path: routeMap.subtitleHistory,
                method: 'DELETE',
                query: type ? { type } : {},
            }, clearHistoryResultSchema);
        },
    };
}
//# sourceMappingURL=subtitleHistoryApi.js.map