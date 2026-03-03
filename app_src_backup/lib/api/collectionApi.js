import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const collectionMovieSchema = z.object({
    id: z.number(),
    tmdbId: z.number(),
    title: z.string(),
    year: z.number(),
    posterUrl: z.string().optional().nullable(),
    inLibrary: z.boolean(),
    monitored: z.boolean().optional(),
    status: z.string().optional(),
    quality: z.string().optional().nullable(),
});
const collectionSchema = z.object({
    id: z.number(),
    tmdbId: z.number().optional().nullable(),
    tmdbCollectionId: z.number().optional(),
    name: z.string(),
    overview: z.string().optional().nullable(),
    posterUrl: z.string().optional().nullable(),
    backdropUrl: z.string().optional().nullable(),
    movieCount: z.number(),
    moviesInLibrary: z.number(),
    monitored: z.boolean(),
    movies: z.array(collectionMovieSchema).optional(),
    qualityProfileId: z.number().optional().nullable(),
    qualityProfile: z.object({
        id: z.number(),
        name: z.string(),
    }).optional().nullable(),
    minimumAvailability: z.string().optional(),
    rootFolderPath: z.string().optional().nullable(),
    addMoviesAutomatically: z.boolean().optional(),
    searchOnAdd: z.boolean().optional(),
});
const createCollectionResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    moviesAdded: z.number(),
});
const searchResponseSchema = z.object({
    id: z.number(),
    message: z.string(),
    searched: z.number(),
    missing: z.number(),
});
const syncResponseSchema = z.object({
    id: z.number(),
    message: z.string(),
    added: z.number(),
    updated: z.number(),
});
export function createCollectionApi(client) {
    return {
        list() {
            return client.request({
                path: routeMap.collections,
            }, z.array(collectionSchema));
        },
        getById(id) {
            return client.request({
                path: routeMap.collectionDetail(id),
            }, collectionSchema);
        },
        create(input) {
            return client.request({
                path: routeMap.collections,
                method: 'POST',
                body: input,
            }, createCollectionResponseSchema);
        },
        update(id, input) {
            return client.request({
                path: routeMap.collectionUpdate(id),
                method: 'PUT',
                body: input,
            }, collectionSchema);
        },
        delete(id) {
            return client.request({
                path: routeMap.collectionDelete(id),
                method: 'DELETE',
            }, z.object({ id: z.number(), deleted: z.boolean() }));
        },
        search(id) {
            return client.request({
                path: routeMap.collectionSearch(id),
                method: 'POST',
            }, searchResponseSchema);
        },
        sync(id) {
            return client.request({
                path: routeMap.collectionSync(id),
                method: 'POST',
            }, syncResponseSchema);
        },
    };
}
//# sourceMappingURL=collectionApi.js.map