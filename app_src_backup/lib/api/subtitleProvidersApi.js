import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';
// Provider settings schema - varies by provider
const providerSettingsSchema = z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    timeout: z.number().optional(),
    maxResults: z.number().optional(),
    useSSL: z.boolean().optional(),
}).passthrough();
// Subtitle provider schema
const subtitleProviderSchema = z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    type: z.string(),
    settings: providerSettingsSchema,
    lastError: z.string().optional(),
    status: z.enum(['active', 'error', 'disabled']),
}).passthrough();
// Test result schema
const providerTestResultSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});
export function createSubtitleProvidersApi(client) {
    return {
        /**
         * List all configured subtitle providers
         */
        listProviders() {
            return client.request({
                path: routeMap.subtitleProviders,
            }, z.array(subtitleProviderSchema));
        },
        /**
         * Get a specific subtitle provider by ID
         */
        getProvider(id) {
            return client.request({
                path: routeMap.subtitleProvider(id),
            }, subtitleProviderSchema);
        },
        /**
         * Update a subtitle provider's settings
         */
        updateProvider(id, settings) {
            return client.request({
                path: routeMap.subtitleProvider(id),
                method: 'PUT',
                body: settings,
            }, subtitleProviderSchema);
        },
        /**
         * Test a subtitle provider connection
         */
        testProvider(id) {
            return client.request({
                path: routeMap.subtitleProviderTest(id),
                method: 'POST',
            }, providerTestResultSchema);
        },
        /**
         * Reset a subtitle provider to default settings
         */
        resetProvider(id) {
            return client.request({
                path: routeMap.subtitleProviderReset(id),
                method: 'POST',
            }, subtitleProviderSchema);
        },
    };
}
//# sourceMappingURL=subtitleProvidersApi.js.map