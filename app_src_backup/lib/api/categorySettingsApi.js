import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const categorySettingsSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    minSize: z.number().nullable().optional(),
    maxSize: z.number().nullable().optional(),
}).transform(item => ({
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    minSize: item.minSize ?? undefined,
    maxSize: item.maxSize ?? undefined,
}));
export function createCategorySettingsApi(client) {
    return {
        list() {
            return client.request({
                path: routeMap.settingsCategories,
            }, z.array(categorySettingsSchema));
        },
        create(input) {
            return client.request({
                path: routeMap.settingsCategories,
                method: 'POST',
                body: input,
            }, categorySettingsSchema);
        },
        update(id, input) {
            return client.request({
                path: routeMap.settingsCategory(id),
                method: 'PUT',
                body: input,
            }, categorySettingsSchema);
        },
        remove(id) {
            return client.request({
                path: routeMap.settingsCategory(id),
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
    };
}
//# sourceMappingURL=categorySettingsApi.js.map