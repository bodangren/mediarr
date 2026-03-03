import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const appProfileSchema = z.object({
    id: z.number(),
    name: z.string(),
    enableRss: z.boolean(),
    enableInteractiveSearch: z.boolean(),
    enableAutomaticSearch: z.boolean(),
    minimumSeeders: z.number(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
});
export function createAppProfilesApi(client) {
    return {
        list() {
            return client.request({ path: routeMap.appProfiles }, z.array(appProfileSchema));
        },
        create(input) {
            return client.request({
                path: routeMap.appProfiles,
                method: 'POST',
                body: input,
            }, appProfileSchema);
        },
        update(id, input) {
            return client.request({
                path: routeMap.appProfile(id),
                method: 'PUT',
                body: input,
            }, appProfileSchema);
        },
        remove(id) {
            return client.request({
                path: routeMap.appProfile(id),
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
        clone(id) {
            return client.request({
                path: routeMap.appProfileClone(id),
                method: 'POST',
            }, appProfileSchema);
        },
    };
}
//# sourceMappingURL=appProfilesApi.js.map