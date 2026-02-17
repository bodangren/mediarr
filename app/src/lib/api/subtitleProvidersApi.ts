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

// Exported types
export type SubtitleProvider = z.infer<typeof subtitleProviderSchema>;
export type ProviderSettings = z.infer<typeof providerSettingsSchema>;
export type ProviderTestResult = z.infer<typeof providerTestResultSchema>;

export function createSubtitleProvidersApi(client: ApiHttpClient) {
  return {
    /**
     * List all configured subtitle providers
     */
    listProviders(): Promise<SubtitleProvider[]> {
      return client.request(
        {
          path: routeMap.subtitleProviders,
        },
        z.array(subtitleProviderSchema),
      );
    },

    /**
     * Get a specific subtitle provider by ID
     */
    getProvider(id: string): Promise<SubtitleProvider> {
      return client.request(
        {
          path: routeMap.subtitleProvider(id),
        },
        subtitleProviderSchema,
      );
    },

    /**
     * Update a subtitle provider's settings
     */
    updateProvider(id: string, settings: ProviderSettings): Promise<SubtitleProvider> {
      return client.request(
        {
          path: routeMap.subtitleProvider(id),
          method: 'PUT',
          body: settings,
        },
        subtitleProviderSchema,
      );
    },

    /**
     * Test a subtitle provider connection
     */
    testProvider(id: string): Promise<ProviderTestResult> {
      return client.request(
        {
          path: routeMap.subtitleProviderTest(id),
          method: 'POST',
        },
        providerTestResultSchema,
      );
    },

    /**
     * Reset a subtitle provider to default settings
     */
    resetProvider(id: string): Promise<SubtitleProvider> {
      return client.request(
        {
          path: routeMap.subtitleProviderReset(id),
          method: 'POST',
        },
        subtitleProviderSchema,
      );
    },
  };
}
