import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
// Provider types
export const providerTypeSchema = z.enum([
    'tmdb-popular',
    'tmdb-list',
]);
// TMDB Popular config schema
export const tmdbPopularConfigSchema = z.object({
    mediaType: z.enum(['movie', 'series', 'both']).optional().default('movie'),
    limit: z.number().min(1).max(100).optional().default(20),
});
// TMDB List config schema
export const tmdbListConfigSchema = z.object({
    listId: z.string().min(1),
});
// Import list schema
export const importListSchema = z.object({
    id: z.number(),
    name: z.string(),
    providerType: z.string(),
    config: z.record(z.unknown()),
    rootFolderPath: z.string(),
    qualityProfileId: z.number(),
    languageProfileId: z.number().nullable().optional(),
    monitorType: z.string(),
    enabled: z.boolean(),
    syncInterval: z.number(),
    lastSyncAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    qualityProfile: z.object({
        id: z.number(),
        name: z.string(),
    }),
});
// Import list exclusion schema
export const importListExclusionSchema = z.object({
    id: z.number(),
    importListId: z.number().nullable().optional(),
    tmdbId: z.number().nullable().optional(),
    imdbId: z.string().nullable().optional(),
    tvdbId: z.number().nullable().optional(),
    title: z.string(),
    createdAt: z.string(),
});
// Provider info schema
export const providerInfoSchema = z.object({
    type: z.string(),
    name: z.string(),
});
// Sync result schema
export const syncResultSchema = z.object({
    success: z.boolean(),
    addedCount: z.number(),
    skippedCount: z.number(),
    errorCount: z.number(),
    errors: z.array(z.string()).optional(),
});
// Create input
export const createImportListInputSchema = z.object({
    name: z.string().min(1),
    providerType: z.string(),
    config: z.record(z.unknown()),
    rootFolderPath: z.string().min(1),
    qualityProfileId: z.number(),
    languageProfileId: z.number().optional(),
    monitorType: z.string(),
    enabled: z.boolean().optional(),
    syncInterval: z.number().optional(),
});
// Update input
export const updateImportListInputSchema = z.object({
    name: z.string().min(1).optional(),
    providerType: z.string().optional(),
    config: z.record(z.unknown()).optional(),
    rootFolderPath: z.string().min(1).optional(),
    qualityProfileId: z.number().optional(),
    languageProfileId: z.number().nullable().optional(),
    monitorType: z.string().optional(),
    enabled: z.boolean().optional(),
    syncInterval: z.number().optional(),
});
// Create exclusion input
export const createExclusionInputSchema = z.object({
    importListId: z.number().optional(),
    tmdbId: z.number().optional(),
    imdbId: z.string().optional(),
    tvdbId: z.number().optional(),
    title: z.string().min(1),
});
export function createImportListsApi(client) {
    return {
        // List all import lists
        list() {
            return client.request({ path: '/api/import-lists' }, z.array(importListSchema));
        },
        // Get a single import list
        get(id) {
            return client.request({ path: `/api/import-lists/${id}` }, importListSchema);
        },
        // Create a new import list
        create(input) {
            return client.request({
                path: '/api/import-lists',
                method: 'POST',
                body: input,
            }, importListSchema);
        },
        // Update an import list
        update(id, input) {
            return client.request({
                path: `/api/import-lists/${id}`,
                method: 'PUT',
                body: input,
            }, importListSchema);
        },
        // Delete an import list
        delete(id) {
            return client.request({
                path: `/api/import-lists/${id}`,
                method: 'DELETE',
            }, z.object({ success: z.boolean() }));
        },
        // Manually sync an import list
        sync(id) {
            return client.request({
                path: `/api/import-lists/${id}/sync`,
                method: 'POST',
            }, syncResultSchema);
        },
        // Get available provider types
        getProviders() {
            return client.request({ path: '/api/import-lists/providers' }, z.array(providerInfoSchema));
        },
        // List all exclusions
        listExclusions() {
            return client.request({ path: '/api/import-lists/exclusions' }, z.array(importListExclusionSchema));
        },
        // Add an exclusion
        createExclusion(input) {
            return client.request({
                path: '/api/import-lists/exclusions',
                method: 'POST',
                body: input,
            }, importListExclusionSchema);
        },
        // Remove an exclusion
        deleteExclusion(id) {
            return client.request({
                path: `/api/import-lists/exclusions/${id}`,
                method: 'DELETE',
            }, z.object({ success: z.boolean() }));
        },
    };
}
//# sourceMappingURL=importListsApi.js.map