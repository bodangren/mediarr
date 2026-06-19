import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

const healthSnapshotSchema = z
  .object({
    indexerId: z.number(),
    failureCount: z.number().int().nonnegative(),
    lastSuccessAt: z.string().nullable(),
    lastFailureAt: z.string().nullable(),
    lastErrorMessage: z.string().nullable(),
  })
  .nullable();

const indexerHealthResponseSchema = z.object({
  indexerId: z.number(),
  snapshot: healthSnapshotSchema,
});

export type IndexerHealthSnapshot = z.infer<typeof healthSnapshotSchema>;
export type IndexerHealthResponse = z.infer<typeof indexerHealthResponseSchema>;

const reenableResponseSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
  failureCount: z.number().int().nonnegative(),
});

export type IndexerReenableResponse = z.infer<typeof reenableResponseSchema>;

export function createIndexerHealthApi(client: ApiHttpClient) {
  return {
    getHealth(indexerId: number): Promise<IndexerHealthResponse> {
      return client.request(
        {
          path: routeMap.indexerHealth(indexerId),
          method: 'GET',
        },
        indexerHealthResponseSchema,
      );
    },
    reenable(indexerId: number): Promise<IndexerReenableResponse> {
      return client.request(
        {
          path: routeMap.indexerReenable(indexerId),
          method: 'PUT',
        },
        reenableResponseSchema,
      );
    },
  };
}