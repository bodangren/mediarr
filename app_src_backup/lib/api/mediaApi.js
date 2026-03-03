import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const seriesItemSchema = z.object({
    id: z.number(),
    title: z.string(),
    year: z.number().optional(),
    status: z.string().optional(),
    monitored: z.boolean().optional(),
}).passthrough();
const movieItemSchema = z.object({
    id: z.number(),
    title: z.string(),
    tmdbId: z.number().optional(),
    year: z.number().optional(),
    status: z.string().optional(),
    monitored: z.boolean().optional(),
}).passthrough();
const wantedItemSchema = z.object({
    type: z.union([z.literal('movie'), z.literal('episode')]),
    id: z.number(),
    title: z.string().optional(),
}).passthrough();
const missingEpisodeSchema = z.object({
    id: z.number(),
    seriesId: z.number(),
    seriesTitle: z.string(),
    seasonNumber: z.number(),
    episodeNumber: z.number(),
    episodeTitle: z.string(),
    airDate: z.string(),
    status: z.union([z.literal('missing'), z.literal('unaired')]),
    monitored: z.boolean(),
}).passthrough();
const cutoffUnmetEpisodeSchema = z.object({
    id: z.number(),
    seriesId: z.number(),
    seriesTitle: z.string(),
    seasonNumber: z.number(),
    episodeNumber: z.number(),
    episodeTitle: z.string(),
    currentQuality: z.string(),
    cutoffQuality: z.string(),
    airDate: z.string(),
}).passthrough();
const metadataResultSchema = z.object({
    mediaType: z.union([z.literal('TV'), z.literal('MOVIE')]),
    title: z.string(),
}).passthrough();
const createdMediaSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
}).passthrough();
export function createMediaApi(client) {
    return {
        listSeries(query = {}) {
            return client.requestPaginated({
                path: routeMap.series,
                query,
            }, seriesItemSchema);
        },
        getSeries(id) {
            return client.request({
                path: routeMap.seriesDetail(id),
            }, seriesItemSchema);
        },
        setSeriesMonitored(id, monitored) {
            return client.request({
                path: routeMap.seriesMonitored(id),
                method: 'PATCH',
                body: { monitored },
            }, seriesItemSchema);
        },
        setEpisodeMonitored(id, monitored) {
            return client.request({
                path: routeMap.episodeMonitored(id),
                method: 'PATCH',
                body: { monitored },
            }, z.object({ id: z.number(), monitored: z.boolean() }));
        },
        deleteSeries(id, deleteFiles = false) {
            return client.request({
                path: routeMap.seriesDelete(id),
                method: 'DELETE',
                body: { deleteFiles },
            }, z.object({ deleted: z.boolean(), id: z.number() }));
        },
        listMovies(query = {}) {
            return client.requestPaginated({
                path: routeMap.movies,
                query,
            }, movieItemSchema);
        },
        getMovie(id) {
            return client.request({
                path: routeMap.movieDetail(id),
            }, movieItemSchema);
        },
        setMovieMonitored(id, monitored) {
            return client.request({
                path: routeMap.movieMonitored(id),
                method: 'PATCH',
                body: { monitored },
            }, movieItemSchema);
        },
        deleteMovie(id, deleteFiles = false) {
            return client.request({
                path: routeMap.movieDelete(id),
                method: 'DELETE',
                body: { deleteFiles },
            }, z.object({ deleted: z.boolean(), id: z.number() }));
        },
        listWanted(query = {}) {
            return client.requestPaginated({
                path: routeMap.wanted,
                query,
            }, wantedItemSchema);
        },
        listMissingEpisodes(query = {}) {
            return client.requestPaginated({
                path: routeMap.missingEpisodes,
                query,
            }, missingEpisodeSchema);
        },
        listCutoffUnmetEpisodes(query = {}) {
            return client.requestPaginated({
                path: routeMap.cutoffUnmetEpisodes,
                query,
            }, cutoffUnmetEpisodeSchema);
        },
        searchMetadata(input) {
            return client.request({
                path: routeMap.mediaSearch,
                method: 'POST',
                body: input,
            }, z.array(metadataResultSchema));
        },
        addMedia(input) {
            return client.request({
                path: routeMap.mediaCreate,
                method: 'POST',
                body: input,
            }, createdMediaSchema);
        },
        // Monitoring API (Season Pass)
        applySeriesMonitoring(seriesId, monitoringType) {
            return client.request({
                path: routeMap.seriesMonitoring(seriesId),
                method: 'PUT',
                body: { monitoringType },
            }, z.object({
                updatedEpisodes: z.number(),
                totalEpisodes: z.number(),
                seriesId: z.number(),
            }));
        },
        applyBulkSeriesMonitoring(seriesIds, monitoringType) {
            return client.request({
                path: routeMap.seriesBulkMonitoring,
                method: 'PUT',
                body: { seriesIds, monitoringType },
            }, z.object({
                results: z.array(z.object({
                    updatedEpisodes: z.number(),
                    totalEpisodes: z.number(),
                    seriesId: z.number(),
                })),
            }));
        },
        setSeasonMonitoring(seriesId, seasonNumber, monitored) {
            return client.request({
                path: routeMap.seriesSeasonMonitoring(seriesId, seasonNumber),
                method: 'PATCH',
                body: { monitored },
            }, z.object({ updatedEpisodes: z.number() }));
        },
    };
}
//# sourceMappingURL=mediaApi.js.map