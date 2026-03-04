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

const legacySubtitleProviderSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  type: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  lastError: z.string().nullable().optional(),
  status: z.string().optional(),
}).passthrough();

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStatus(
  value: unknown,
  enabledFallback: boolean,
): 'active' | 'error' | 'disabled' {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'error' || normalized === 'failed' || normalized === 'failure') {
    return 'error';
  }
  if (normalized === 'disabled' || normalized === 'inactive' || normalized === 'off') {
    return 'disabled';
  }
  if (
    normalized === 'active'
    || normalized === 'ok'
    || normalized === 'online'
    || normalized === 'enabled'
    || normalized === 'healthy'
  ) {
    return 'active';
  }

  return enabledFallback ? 'active' : 'disabled';
}

function normalizeLegacyProvider(
  provider: z.infer<typeof legacySubtitleProviderSchema>,
  index: number,
): SubtitleProvider {
  const idFromName = provider.name ? toSlug(provider.name) : '';
  const id = provider.id?.trim() || (idFromName.length > 0 ? idFromName : `provider-${index + 1}`);
  const name = provider.name?.trim() || id;
  const enabled = typeof provider.enabled === 'boolean'
    ? provider.enabled
    : normalizeStatus(provider.status, false) !== 'disabled';
  const status = normalizeStatus(provider.status, enabled);

  return {
    id,
    name,
    enabled,
    type: provider.type?.trim() || 'api',
    settings: (provider.settings ?? {}) as ProviderSettings,
    lastError: provider.lastError ?? undefined,
    status,
  };
}

function extractProviderCollections(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return [payload];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates: unknown[] = [record.providers, record.data];
  const data = record.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    candidates.push(nested.providers, nested.data);
  }

  return candidates.filter(candidate => candidate !== undefined);
}

function parseLegacyProvidersPayload(payload: unknown): SubtitleProvider[] | null {
  const fromArray = z.array(subtitleProviderSchema).safeParse(payload);
  if (fromArray.success) {
    return fromArray.data;
  }

  for (const candidate of extractProviderCollections(payload)) {
    const strict = z.array(subtitleProviderSchema).safeParse(candidate);
    if (strict.success) {
      return strict.data;
    }

    const legacy = z.array(legacySubtitleProviderSchema).safeParse(candidate);
    if (legacy.success) {
      return legacy.data.map((provider, index) => normalizeLegacyProvider(provider, index));
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
