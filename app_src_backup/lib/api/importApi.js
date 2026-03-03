import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const detectedSeriesSchema = z.object({
    id: z.number(),
    folderName: z.string(),
    path: z.string(),
    fileCount: z.number(),
    matchedSeriesId: z.number().nullable(),
    matchedSeriesTitle: z.string().optional(),
    matchedSeriesYear: z.number().optional(),
    status: z.enum(['matched', 'unmatched', 'pending']),
});
const seriesSearchResultSchema = z.object({
    id: z.number(),
    title: z.string(),
    year: z.number().optional(),
    overview: z.string().optional(),
    network: z.string().optional(),
    status: z.string().optional(),
    tvdbId: z.number().optional(),
    tmdbId: z.number().optional(),
    imdbId: z.string().optional(),
    images: z.array(z.object({ coverType: z.string(), remoteUrl: z.string() })).optional(),
});
const importSeriesRequestSchema = z.object({
    seriesId: z.number(),
    folderName: z.string(),
    path: z.string(),
    qualityProfileId: z.number(),
    monitored: z.boolean(),
    monitorNewItems: z.enum(['all', 'none', 'future']),
    rootFolder: z.string(),
    seriesType: z.enum(['standard', 'anime', 'daily']),
    seasonFolder: z.boolean(),
    matchedSeriesId: z.number().optional(),
});
const scanFolderRequestSchema = z.object({
    path: z.string(),
});
export function createImportApi(client) {
    return {
        scanFolder(request) {
            return client.request({
                path: routeMap.importScan,
                method: 'POST',
                body: request,
            }, z.array(detectedSeriesSchema));
        },
        importSeries(request) {
            return client.request({
                path: routeMap.importSeries,
                method: 'POST',
                body: request,
            }, z.object({ id: z.number() }));
        },
        bulkImportSeries(requests) {
            return client.request({
                path: routeMap.importBulkSeries,
                method: 'POST',
                body: { items: requests },
            }, z.object({
                importedCount: z.number(),
                ids: z.array(z.number()),
            }));
        },
    };
}
//# sourceMappingURL=importApi.js.map