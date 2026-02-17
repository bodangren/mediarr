import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { createCrudApi } from './createCrudApi';
import { TestResult } from './shared-schemas';

const indexerSchema = z.object({
  id: z.number(),
  name: z.string(),
  implementation: z.string(),
  configContract: z.string(),
  settings: z.string(),
  protocol: z.string(),
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
  enabled?: boolean;
  supportsRss?: boolean;
  supportsSearch?: boolean;
  priority?: number;
}

export type IndexerTestResult = TestResult;

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
  };
}
