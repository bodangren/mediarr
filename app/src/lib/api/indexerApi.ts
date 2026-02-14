import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

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

const testResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  diagnostics: z.object({
    remediationHints: z.array(z.string()),
  }).optional(),
  healthSnapshot: z.unknown().nullable().optional(),
});

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

export type IndexerTestResult = z.infer<typeof testResultSchema>;

export function createIndexerApi(client: ApiHttpClient) {
  return {
    list(): Promise<IndexerItem[]> {
      return client.request(
        {
          path: routeMap.indexers,
        },
        z.array(indexerSchema),
      );
    },

    create(input: CreateIndexerInput): Promise<IndexerItem> {
      return client.request(
        {
          path: routeMap.indexers,
          method: 'POST',
          body: input,
        },
        indexerSchema,
      );
    },

    update(id: number, input: Partial<CreateIndexerInput>): Promise<IndexerItem> {
      return client.request(
        {
          path: routeMap.indexerUpdate(id),
          method: 'PUT',
          body: input,
        },
        indexerSchema,
      );
    },

    remove(id: number): Promise<{ id: number }> {
      return client.request(
        {
          path: routeMap.indexerDelete(id),
          method: 'DELETE',
        },
        z.object({ id: z.number() }),
      );
    },

    test(id: number): Promise<IndexerTestResult> {
      return client.request(
        {
          path: routeMap.indexerTest(id),
          method: 'POST',
        },
        testResultSchema,
      );
    },

    testDraft(input: CreateIndexerInput): Promise<IndexerTestResult> {
      return client.request(
        {
          path: routeMap.indexerTestDraft,
          method: 'POST',
          body: input,
        },
        testResultSchema,
      );
    },
  };
}
