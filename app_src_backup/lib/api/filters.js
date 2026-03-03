import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
export const filterOperatorValues = [
    'equals',
    'notEquals',
    'contains',
    'notContains',
    'greaterThan',
    'lessThan',
];
export const filterFieldValues = [
    'monitored',
    'network',
    'genre',
    'tag',
    'rating',
    'status',
    'protocol',
    'enabled',
    'capability',
    'priority',
];
const filterConditionSchema = z.object({
    field: z.enum(filterFieldValues),
    operator: z.enum(filterOperatorValues),
    value: z.union([z.string(), z.number(), z.boolean()]),
});
const filterConditionsGroupSchema = z.object({
    operator: z.union([z.literal('and'), z.literal('or')]),
    conditions: z.array(filterConditionSchema),
});
const customFilterSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.union([z.literal('series'), z.literal('indexer')]),
    conditions: filterConditionsGroupSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
});
export function createFiltersApi(client) {
    return {
        list(type = 'series') {
            return client.request({
                path: routeMap.filtersCustom,
                query: { type },
            }, z.array(customFilterSchema));
        },
        create(input) {
            return client.request({
                path: routeMap.filtersCustom,
                method: 'POST',
                body: {
                    name: input.name,
                    type: input.type ?? 'series',
                    conditions: input.conditions,
                },
            }, customFilterSchema);
        },
        update(id, input) {
            return client.request({
                path: routeMap.filterCustomDetail(id),
                method: 'PUT',
                body: input,
            }, customFilterSchema);
        },
        delete(id) {
            return client.request({
                path: routeMap.filterCustomDetail(id),
                method: 'DELETE',
            }, z.object({
                id: z.number(),
                deleted: z.boolean(),
            }));
        },
    };
}
//# sourceMappingURL=filters.js.map