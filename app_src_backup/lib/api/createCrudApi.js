import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { testResultSchema, TestResult } from './shared-schemas';
export function createCrudApi(client, config) {
    const { basePath, itemSchema, listSchema } = config;
    return {
        list() {
            return client.request({
                path: basePath,
            }, listSchema ?? z.array(itemSchema));
        },
        create(input) {
            return client.request({
                path: basePath,
                method: 'POST',
                body: input,
            }, itemSchema);
        },
        update(id, input) {
            return client.request({
                path: `${basePath}/${id}`,
                method: 'PUT',
                body: input,
            }, itemSchema);
        },
        remove(id) {
            return client.request({
                path: `${basePath}/${id}`,
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
        test(id) {
            return client.request({
                path: `${basePath}/${id}/test`,
                method: 'POST',
            }, testResultSchema);
        },
        testDraft(input) {
            return client.request({
                path: `${basePath}/test`,
                method: 'POST',
                body: input,
            }, testResultSchema);
        },
    };
}
//# sourceMappingURL=createCrudApi.js.map