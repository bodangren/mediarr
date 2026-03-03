import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const torrentSchema = z.object({
    infoHash: z.string(),
    name: z.string(),
    status: z.string().optional(),
    progress: z.number().optional(),
    downloadSpeed: z.number().optional(),
    uploadSpeed: z.number().optional(),
    size: z.string(),
    downloaded: z.string(),
    uploaded: z.string(),
    eta: z.number().nullable().optional(),
    path: z.string().optional(),
    completedAt: z.string().nullable().optional(),
}).passthrough();
const torrentMutationSchema = z.object({
    infoHash: z.string(),
    status: z.string().optional(),
    removed: z.boolean().optional(),
});
export function createTorrentApi(client) {
    return {
        list(query = {}) {
            return client.requestPaginated({
                path: routeMap.torrents,
                query,
            }, torrentSchema);
        },
        get(infoHash) {
            return client.request({
                path: routeMap.torrentDetail(infoHash),
            }, torrentSchema);
        },
        add(input) {
            return client.request({
                path: routeMap.torrents,
                method: 'POST',
                body: input,
            }, z.object({
                infoHash: z.string(),
                name: z.string().optional(),
            }));
        },
        pause(infoHash) {
            return client.request({
                path: routeMap.torrentPause(infoHash),
                method: 'PATCH',
            }, torrentMutationSchema);
        },
        resume(infoHash) {
            return client.request({
                path: routeMap.torrentResume(infoHash),
                method: 'PATCH',
            }, torrentMutationSchema);
        },
        remove(infoHash) {
            return client.request({
                path: routeMap.torrentDelete(infoHash),
                method: 'DELETE',
            }, torrentMutationSchema);
        },
        setSpeedLimits(input) {
            return client.request({
                path: routeMap.torrentSpeedLimits,
                method: 'PATCH',
                body: input,
            }, z.object({
                updated: z.boolean(),
                limits: z.object({
                    download: z.number().optional(),
                    upload: z.number().optional(),
                }),
            }));
        },
    };
}
//# sourceMappingURL=torrentApi.js.map