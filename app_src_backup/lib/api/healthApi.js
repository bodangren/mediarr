import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const healthSchema = z.object({
    status: z.union([z.literal('critical'), z.literal('warning'), z.literal('ok')]),
    indexers: z.array(z.object({
        indexerId: z.number(),
        indexerName: z.string(),
        severity: z.union([z.literal('critical'), z.literal('warning'), z.literal('ok')]),
        snapshot: z.unknown().nullable().optional(),
    })),
});
export function createHealthApi(client) {
    return {
        get() {
            return client.request({
                path: routeMap.health,
            }, healthSchema);
        },
    };
}
//# sourceMappingURL=healthApi.js.map