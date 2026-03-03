import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const activityItemSchema = z.object({
    id: z.number(),
    eventType: z.string(),
    sourceModule: z.string().optional(),
    entityRef: z.string().nullable().optional(),
    summary: z.string(),
    success: z.boolean().optional(),
    details: z.unknown().optional(),
    occurredAt: z.string().optional(),
}).passthrough();
const clearActivitySchema = z.object({
    deletedCount: z.number().int().nonnegative(),
});
const exportActivitySchema = z.object({
    items: z.array(activityItemSchema),
    totalCount: z.number().int().nonnegative(),
    exportedAt: z.string(),
});
export function createActivityApi(client) {
    return {
        list(query = {}) {
            return client.requestPaginated({
                path: routeMap.activity,
                query,
            }, activityItemSchema);
        },
        clear(query = {}) {
            return client.request({
                path: routeMap.activityClear,
                method: 'DELETE',
                query,
            }, clearActivitySchema);
        },
        markFailed(id) {
            return client.request({
                path: routeMap.activityMarkFailed(id),
                method: 'PATCH',
            }, activityItemSchema);
        },
        export(query = {}) {
            return client.request({
                path: routeMap.activityExport,
                query,
            }, exportActivitySchema);
        },
    };
}
//# sourceMappingURL=activityApi.js.map