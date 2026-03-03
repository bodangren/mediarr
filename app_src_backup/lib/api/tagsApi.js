import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const tagSchema = z.object({
    id: z.number(),
    label: z.string(),
    color: z.string(),
    indexerIds: z.array(z.number()),
    applicationIds: z.array(z.number()),
    downloadClientIds: z.array(z.number()),
});
const tagDetailsSchema = z.object({
    tag: z.object({
        id: z.number(),
        label: z.string(),
        color: z.string(),
    }),
    indexers: z.array(z.object({
        id: z.number(),
        name: z.string(),
    })),
    applications: z.array(z.object({
        id: z.number(),
        name: z.string(),
    })),
    downloadClients: z.array(z.object({
        id: z.number(),
        name: z.string(),
    })),
});
export function createTagsApi(client) {
    return {
        list() {
            return client.request({
                path: routeMap.tags,
            }, z.array(tagSchema));
        },
        create(input) {
            return client.request({
                path: routeMap.tags,
                method: 'POST',
                body: input,
            }, tagSchema);
        },
        update(id, input) {
            return client.request({
                path: routeMap.tagUpdate(id),
                method: 'PUT',
                body: input,
            }, tagSchema);
        },
        remove(id) {
            return client.request({
                path: routeMap.tagDelete(id),
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
        getDetails(id) {
            return client.request({
                path: routeMap.tagDetails(id),
            }, tagDetailsSchema);
        },
        updateAssignments(id, input) {
            return client.request({
                path: routeMap.tagAssignments(id),
                method: 'PUT',
                body: input,
            }, tagSchema);
        },
    };
}
//# sourceMappingURL=tagsApi.js.map