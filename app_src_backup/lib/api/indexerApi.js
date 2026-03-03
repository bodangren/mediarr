import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import { TestResult } from './shared-schemas';
import { routeMap } from './routeMap';
const indexerSchema = z.object({
    id: z.number(),
    name: z.string(),
    implementation: z.string(),
    configContract: z.string(),
    settings: z.string(),
    protocol: z.string(),
    appProfileId: z.number().nullable().optional(),
    enabled: z.boolean(),
    supportsRss: z.boolean(),
    supportsSearch: z.boolean(),
    priority: z.number(),
}).passthrough();
const indexerSchemaField = z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'password', 'number', 'boolean']),
    required: z.boolean().optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});
const indexerConfigSchemaResponse = z.object({
    configContract: z.string(),
    definitionId: z.string().optional(),
    fields: z.array(indexerSchemaField),
    compatibility: z.unknown().nullable(),
});
export function createIndexerApi(client) {
    const crudApi = createCrudApi(client, {
        basePath: '/api/indexers',
        itemSchema: indexerSchema,
    });
    return {
        list: crudApi.list,
        create: crudApi.create,
        update: crudApi.update,
        remove: crudApi.remove,
        test: crudApi.test,
        testDraft: crudApi.testDraft,
        clone(id) {
            return client.request({
                path: routeMap.indexerClone(id),
                method: 'POST',
            }, indexerSchema);
        },
        getSchema(configContract, definitionId) {
            return client.request({
                path: routeMap.indexerSchema(configContract, definitionId),
                method: 'GET',
            }, indexerConfigSchemaResponse);
        },
    };
}
//# sourceMappingURL=indexerApi.js.map