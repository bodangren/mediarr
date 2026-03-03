import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import { TestResult } from './shared-schemas';
const downloadClientSchema = z.object({
    id: z.number(),
    name: z.string(),
    implementation: z.string(),
    configContract: z.string(),
    settings: z.string(),
    protocol: z.string(),
    host: z.string(),
    port: z.number(),
    category: z.string().nullable(),
    priority: z.number(),
    enabled: z.boolean(),
});
export function createDownloadClientApi(client) {
    const crudApi = createCrudApi(client, {
        basePath: '/api/download-clients',
        itemSchema: downloadClientSchema,
    });
    return {
        list: crudApi.list,
        create: crudApi.create,
        update: crudApi.update,
        remove: crudApi.remove,
        test: crudApi.test,
        testDraft: crudApi.testDraft,
    };
}
//# sourceMappingURL=downloadClientsApi.js.map