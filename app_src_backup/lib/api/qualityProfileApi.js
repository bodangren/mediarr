import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
const qualitySchema = z.object({
    id: z.number(),
    name: z.string(),
    resolution: z.string(),
    source: z.string(),
});
const qualityProfileSchema = z.object({
    id: z.number(),
    name: z.string(),
    cutoffId: z.number(),
    qualities: z.array(qualitySchema),
    languageProfileId: z.number().optional(),
});
/**
 * Language profile (simplified for now)
 */
const languageProfileSchema = z.object({
    id: z.number(),
    name: z.string(),
});
export function createQualityProfileApi(client) {
    return {
        /**
         * Get all quality profiles
         */
        list() {
            return client.request({
                path: routeMap.qualityProfiles,
            }, z.array(qualityProfileSchema));
        },
        /**
         * Get a single quality profile by ID
         */
        get(id) {
            return client.request({
                path: routeMap.qualityProfile(id),
            }, qualityProfileSchema);
        },
        /**
         * Create a new quality profile
         */
        create(input) {
            return client.request({
                path: routeMap.qualityProfiles,
                method: 'POST',
                body: input,
            }, qualityProfileSchema);
        },
        /**
         * Update an existing quality profile
         */
        update(id, input) {
            return client.request({
                path: routeMap.qualityProfile(id),
                method: 'PUT',
                body: input,
            }, qualityProfileSchema);
        },
        /**
         * Delete a quality profile
         */
        delete(id) {
            return client.request({
                path: routeMap.qualityProfile(id),
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
        /**
         * Get all available language profiles
         */
        listLanguageProfiles() {
            return client.request({
                path: routeMap.languageProfiles,
            }, z.array(languageProfileSchema));
        },
    };
}
//# sourceMappingURL=qualityProfileApi.js.map