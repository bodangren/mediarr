import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import { TestResult } from './shared-schemas';
import { routeMap } from './routeMap';

const indexerSchema = z.object({
  id: z.number(),
  name: z.string(),
  implementation: z.string(),
  configContract: z.string(),
  settings: z.string(),
  protocol: z.string(),
  supportedMediaTypes: z.string().optional().default('[]'),
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
  };
}
