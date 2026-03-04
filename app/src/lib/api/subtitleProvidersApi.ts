import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { ContractViolationError } from './errors';
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

function parseLegacyProvidersPayload(payload: unknown): SubtitleProvider[] | null {
  const fromArray = z.array(subtitleProviderSchema).safeParse(payload);
  if (fromArray.success) {
    return fromArray.data;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const fromProviders = z.array(subtitleProviderSchema).safeParse(record.providers);
    if (fromProviders.success) {
      return fromProviders.data;
    }
    const fromData = z.array(subtitleProviderSchema).safeParse(record.data);
    if (fromData.success) {
      return fromData.data;
    }
  }

  return null;
}

export function createSubtitleProvidersApi(client: ApiHttpClient) {
  return {
    /**
     * List all configured subtitle providers
     */
    async listProviders(): Promise<SubtitleProvider[]> {
      try {
        return await client.request(
          {
            path: routeMap.subtitleProviders,
          },
          z.array(subtitleProviderSchema),
        );
      } catch (error) {
        if (error instanceof ContractViolationError) {
          const payload = (error.details as { payload?: unknown } | undefined)?.payload;
          const fallback = parseLegacyProvidersPayload(payload);
          if (fallback) {
            return fallback;
          }
        }
        throw error;
      }
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
