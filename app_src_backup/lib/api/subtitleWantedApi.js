import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
// Schema definitions
const wantedSeriesEntrySchema = z.object({
    seriesId: z.number(),
    seriesTitle: z.string(),
    seasonNumber: z.number(),
    episodeNumber: z.number(),
    episodeId: z.number(),
    episodeTitle: z.string(),
    missingLanguages: z.array(z.string()),
    lastSearch: z.string().optional(),
});
const wantedMovieEntrySchema = z.object({
    movieId: z.number(),
    movieTitle: z.string(),
    year: z.number().optional(),
    missingLanguages: z.array(z.string()),
    lastSearch: z.string().optional(),
});
const wantedCountSchema = z.object({
    seriesCount: z.number(),
    moviesCount: z.number(),
    totalCount: z.number(),
});
const searchTriggerResultSchema = z.object({
    triggered: z.boolean(),
    count: z.number().optional(),
});
const seriesItemSearchResultSchema = z.object({
    triggered: z.boolean(),
    seriesId: z.number(),
    languageCode: z.string(),
});
const movieItemSearchResultSchema = z.object({
    triggered: z.boolean(),
    movieId: z.number(),
    languageCode: z.string(),
});
export function createSubtitleWantedApi(client) {
    return {
        listWantedSeries(params = {}) {
            const { page, pageSize, languageCode } = params;
            const query = {};
            if (page !== undefined)
                query.page = page;
            if (pageSize !== undefined)
                query.pageSize = pageSize;
            if (languageCode !== undefined)
                query.languageCode = languageCode;
            return client.requestPaginated({
                path: routeMap.subtitleWantedSeries,
                query,
            }, wantedSeriesEntrySchema);
        },
        listWantedMovies(params = {}) {
            const { page, pageSize, languageCode } = params;
            const query = {};
            if (page !== undefined)
                query.page = page;
            if (pageSize !== undefined)
                query.pageSize = pageSize;
            if (languageCode !== undefined)
                query.languageCode = languageCode;
            return client.requestPaginated({
                path: routeMap.subtitleWantedMovies,
                query,
            }, wantedMovieEntrySchema);
        },
        searchAllSeries() {
            return client.request({
                path: routeMap.subtitleWantedSeriesSearch,
                method: 'POST',
            }, searchTriggerResultSchema);
        },
        searchAllMovies() {
            return client.request({
                path: routeMap.subtitleWantedMoviesSearch,
                method: 'POST',
            }, searchTriggerResultSchema);
        },
        searchSeriesItem(seriesId, languageCode) {
            return client.request({
                path: routeMap.subtitleWantedSeriesItemSearch(seriesId),
                method: 'POST',
                body: { languageCode },
            }, seriesItemSearchResultSchema);
        },
        searchMovieItem(movieId, languageCode) {
            return client.request({
                path: routeMap.subtitleWantedMovieItemSearch(movieId),
                method: 'POST',
                body: { languageCode },
            }, movieItemSearchResultSchema);
        },
        getWantedCount() {
            return client.request({
                path: routeMap.subtitleWantedCount,
            }, wantedCountSchema);
        },
    };
}
//# sourceMappingURL=subtitleWantedApi.js.map