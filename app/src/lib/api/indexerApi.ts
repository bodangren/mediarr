import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import type { TestResult } from './shared-schemas';
import { routeMap } from './routeMap';

const indexerSchema = z.object({
  id: z.number(),
  name: z.string(),
  implementation: z.string(),
  configContract: z.string(),
  settings: z.string(),
  protocol: z.string(),
  supportedMediaTypes: z.string().default('[]'),
  enabled: z.boolean(),
  supportsRss: z.boolean(),
  supportsSearch: z.boolean(),
  priority: z.number(),
}).passthrough();

export type IndexerItem = z.infer<typeof indexerSchema>;

export interface CreateIndexerInput {
  name: string;
  implementation: string;
  configContract: string;
  settings: string;
  protocol: string;
  supportedMediaTypes?: string;
  enabled?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  priority?: number;
}

export type IndexerTestResult = TestResult;

const indexerSchemaField = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'password', 'number', 'boolean']),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const indexerConfigSchemaResponse = z.object({
  configContract: z.string(),
  definitionId: z.string().optional(),
  fields: z.array(indexerSchemaField),
  compatibility: z.unknown().nullable(),
});

export type IndexerSchemaField = z.infer<typeof indexerSchemaField>;
export type IndexerConfigSchemaResponse = z.infer<typeof indexerConfigSchemaResponse>;

const catalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  baseUrl: z.string(),
  categories: z.array(z.string()),
  requiresApiKey: z.boolean(),
  signupUrl: z.string(),
  implementation: z.string(),
  configContract: z.string(),
  supportedMediaTypes: z.array(z.string()),
  supportsSearch: z.boolean(),
  supportsRss: z.boolean(),
  isConfigured: z.boolean(),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export interface DiscoveredService {
  type: 'prowlarr' | 'jackett';
  url: string;
  host: string;
  port: number;
  name?: string;
  version?: string;
  indexerCount?: number;
}

export interface ImportFromResult {
  imported: number;
  indexers: IndexerItem[];
}

export function createIndexerApi(client: ApiHttpClient) {
  const crudApi = createCrudApi<IndexerItem, CreateIndexerInput>(client, {
    basePath: '/api/indexers',
    itemSchema: indexerSchema,
  });

  return {
    list: crudApi.list,
    create: crudApi.create,
    update: crudApi.update,
    remove: crudApi.remove,
    test: crudApi.test,
    testDraft: crudApi.testDraft,
    clone(id: number): Promise<IndexerItem> {
      return client.request(
        {
          path: routeMap.indexerClone(id),
          method: 'POST',
        },
        indexerSchema,
      );
    },
    getSchema(configContract: string, definitionId?: string): Promise<IndexerConfigSchemaResponse> {
      return client.request(
        {
          path: routeMap.indexerSchema(configContract, definitionId),
          method: 'GET',
        },
        indexerConfigSchemaResponse,
      );
    },
    getCatalog(): Promise<CatalogEntry[]> {
      return client.request(
        {
          path: routeMap.indexerCatalog,
          method: 'GET',
        },
        z.array(catalogEntrySchema),
      );
    },
    addFromCatalog(id: string, apiKey?: string): Promise<IndexerItem> {
      return client.request(
        {
          path: routeMap.indexerCatalogAdd(id),
          method: 'POST',
          body: apiKey ? { apiKey } : undefined,
        },
        indexerSchema,
      );
    },
    detect(): Promise<DiscoveredService[]> {
      return client.request(
        {
          path: routeMap.indexerDetect,
          method: 'GET',
        },
        z.array(z.object({
          type: z.enum(['prowlarr', 'jackett']),
          url: z.string(),
          host: z.string(),
          port: z.number(),
          name: z.string().optional(),
          version: z.string().optional(),
          indexerCount: z.number().optional(),
        })),
      );
    },
    importFrom(type: 'prowlarr' | 'jackett', url: string, apiKey?: string): Promise<ImportFromResult> {
      return client.request(
        {
          path: routeMap.indexerImportFrom(type),
          method: 'POST',
          body: { url, apiKey },
        },
        z.object({
          imported: z.number(),
          indexers: z.array(indexerSchema),
        }),
      );
    },
  };
}
