import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const releaseCandidateSchema = z.object({
    indexer: z.string(),
    indexerId: z.number(),
    title: z.string(),
    guid: z.string().optional(),
    size: z.number(),
    seeders: z.number(),
    leechers: z.number().optional(),
    indexerFlags: z.string().optional(),
    quality: z.string().optional(),
    age: z.number().optional(),
    publishDate: z.string().optional(),
    categories: z.array(z.number()).optional(),
    protocol: z.enum(['torrent', 'usenet']).optional(),
    magnetUrl: z.string().optional(),
    downloadUrl: z.string().optional(),
    infoHash: z.string().optional(),
    customFormatScore: z.number().optional(),
});
const grabResultSchema = z.object({
    success: z.boolean(),
    downloadId: z.string(),
    message: z.string(),
});
export function createReleaseApi(client) {
    return {
        searchCandidates(params) {
            const queryParams = {};
            if (params.page !== undefined)
                queryParams.page = params.page;
            if (params.pageSize !== undefined)
                queryParams.pageSize = params.pageSize;
            if (params.sortBy !== undefined)
                queryParams.sortBy = params.sortBy;
            if (params.sortDir !== undefined)
                queryParams.sortDir = params.sortDir;
            const bodyParams = {};
            if (params.query !== undefined)
                bodyParams.query = params.query;
            if (params.type !== undefined)
                bodyParams.type = params.type;
            if (params.season !== undefined)
                bodyParams.season = params.season;
            if (params.episode !== undefined)
                bodyParams.episode = params.episode;
            if (params.tvdbId !== undefined)
                bodyParams.tvdbId = params.tvdbId;
            if (params.imdbId !== undefined)
                bodyParams.imdbId = params.imdbId;
            if (params.tmdbId !== undefined)
                bodyParams.tmdbId = params.tmdbId;
            if (params.qualityProfileId !== undefined)
                bodyParams.qualityProfileId = params.qualityProfileId;
            if (params.year !== undefined)
                bodyParams.year = params.year;
            if (params.artist !== undefined)
                bodyParams.artist = params.artist;
            if (params.album !== undefined)
                bodyParams.album = params.album;
            if (params.author !== undefined)
                bodyParams.author = params.author;
            if (params.title !== undefined)
                bodyParams.title = params.title;
            if (params.categories !== undefined)
                bodyParams.categories = params.categories;
            return client.requestPaginated({
                path: routeMap.releaseSearch,
                method: 'POST',
                body: bodyParams,
                query: queryParams,
            }, releaseCandidateSchema);
        },
        grabRelease(guid, indexerId, downloadClientId) {
            return client.request({
                path: routeMap.releaseGrab,
                method: 'POST',
                body: { guid, indexerId, downloadClientId },
            }, grabResultSchema);
        },
        grabCandidate(candidate) {
            return client.request({
                path: '/api/releases/grab-candidate',
                method: 'POST',
                body: candidate,
            }, grabResultSchema);
        },
    };
}
//# sourceMappingURL=releaseApi.js.map