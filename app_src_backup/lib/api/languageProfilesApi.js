import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
/**
 * Schema for a single language setting within a profile
 */
export const languageSettingSchema = z.object({
    languageCode: z.string(),
    isForced: z.boolean(),
    isHi: z.boolean(),
    audioExclude: z.boolean(),
    score: z.number(),
});
/**
 * Schema for a language profile
 */
export const languageProfileSchema = z.object({
    id: z.number(),
    name: z.string(),
    languages: z.array(languageSettingSchema),
    cutoff: z.string(),
    upgradeAllowed: z.boolean(),
    mustContain: z.array(z.string()),
    mustNotContain: z.array(z.string()),
});
/**
 * Schema for creating/updating a language profile
 */
export const languageProfileInputSchema = z.object({
    name: z.string(),
    languages: z.array(languageSettingSchema),
    cutoff: z.string().optional(),
    upgradeAllowed: z.boolean().optional(),
});
/**
 * Schema for language setting input (subset of LanguageSetting for create/update)
 */
export const languageSettingInputSchema = z.object({
    languageCode: z.string(),
    isForced: z.boolean(),
    isHi: z.boolean(),
    audioExclude: z.boolean(),
    score: z.number(),
});
export function createLanguageProfilesApi(client) {
    return {
        /**
         * Get all language profiles
         */
        listProfiles() {
            return client.request({
                path: routeMap.languageProfiles,
            }, z.array(languageProfileSchema));
        },
        /**
         * Get a single language profile by ID
         */
        getProfile(id) {
            return client.request({
                path: routeMap.languageProfile(id),
            }, languageProfileSchema);
        },
        /**
         * Create a new language profile
         */
        createProfile(input) {
            return client.request({
                path: routeMap.languageProfiles,
                method: 'POST',
                body: input,
            }, languageProfileSchema);
        },
        /**
         * Update an existing language profile
         */
        updateProfile(id, input) {
            return client.request({
                path: routeMap.languageProfile(id),
                method: 'PUT',
                body: input,
            }, languageProfileSchema);
        },
        /**
         * Delete a language profile
         */
        deleteProfile(id) {
            return client.request({
                path: routeMap.languageProfile(id),
                method: 'DELETE',
            }, z.object({ id: z.number() }));
        },
    };
}
//# sourceMappingURL=languageProfilesApi.js.map