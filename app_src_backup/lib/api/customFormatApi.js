import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
const customFormatConditionSchema = z.object({
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]),
    negate: z.boolean().optional(),
    required: z.boolean().optional(),
});
const customFormatScoreSchema = z.object({
    id: z.number(),
    qualityProfileId: z.number(),
    score: z.number(),
});
const customFormatSchema = z.object({
    id: z.number(),
    name: z.string(),
    includeCustomFormatWhenRenaming: z.boolean(),
    conditions: z.array(customFormatConditionSchema),
    scores: z.array(customFormatScoreSchema),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});
const conditionTestResultSchema = z.object({
    index: z.number(),
    type: z.string(),
    field: z.string().optional(),
    operator: z.string().optional(),
    value: z.union([z.string(), z.number()]),
    negate: z.boolean().optional(),
    matches: z.boolean(),
});
const customFormatTestResultSchema = z.object({
    formatId: z.number(),
    formatName: z.string(),
    matches: z.boolean(),
    conditionResults: z.array(conditionTestResultSchema),
});
const customFormatSchemaInfoSchema = z.object({
    conditionTypes: z.array(z.string()),
    operators: z.array(z.string()),
    fields: z.array(z.string()),
    examples: z.record(z.unknown()).optional(),
});
export function createCustomFormatApi(client) {
    const basePath = '/api/custom-formats';
    return {
        /**
         * Get all custom formats
         */
        list() {
            return client.request({
                path: basePath,
            }, z.array(customFormatSchema));
        },
        /**
         * Get a single custom format by ID
         */
        get(id) {
            return client.request({
                path: `${basePath}/${id}`,
            }, customFormatSchema);
        },
        /**
         * Create a new custom format
         */
        create(input) {
            return client.request({
                path: basePath,
                method: 'POST',
                body: input,
            }, customFormatSchema);
        },
        /**
         * Update an existing custom format
         */
        update(id, input) {
            return client.request({
                path: `${basePath}/${id}`,
                method: 'PUT',
                body: input,
            }, customFormatSchema);
        },
        /**
         * Delete a custom format
         */
        delete(id) {
            return client.request({
                path: `${basePath}/${id}`,
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
        /**
         * Test a custom format against a sample release
         */
        test(id, release) {
            return client.request({
                path: `${basePath}/${id}/test`,
                method: 'POST',
                body: release,
            }, customFormatTestResultSchema);
        },
        /**
         * Get the custom format schema (valid condition types, operators, fields)
         */
        getSchema() {
            return client.request({
                path: `${basePath}/schema`,
            }, customFormatSchemaInfoSchema);
        },
    };
}
//# sourceMappingURL=customFormatApi.js.map