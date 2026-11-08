import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

/**
 * Adult library client (track feature_adult_library_20261107).
 *
 * Talks only to `/api/adult/*` and `/api/libraries`, so the section is visibly separate from
 * Movies/TV in the SPA and cannot be confused with them.
 */
const itemSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  fileName: z.string(),
  studio: z.string().nullable(),
  quality: z.string().nullable(),
  releaseDate: z.string().nullable(),
  needsReview: z.boolean(),
  path: z.string(),
  sizeBytes: z.number(),
});

const listSchema = z.object({
  items: z.array(itemSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  needsReview: z.number(),
});

export type AdultItem = z.infer<typeof itemSchema>;
export type AdultItemPage = z.infer<typeof listSchema>;

export interface AdultItemQuery {
  q?: string;
  page?: number;
  pageSize?: number;
}

export function createAdultLibraryApi(client: ApiHttpClient) {
  return {
    listItems(params: AdultItemQuery = {}): Promise<AdultItemPage> {
      const query: Record<string, unknown> = {};
      if (params.q) query.q = params.q;
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.pageSize = params.pageSize;
      return client.request({ path: '/api/adult/items', query }, listSchema);
    },
    streamUrl(id: number): string {
      return `/api/adult/items/${id}/stream`;
    },
    reportProgress(id: number, position: number, duration: number): Promise<unknown> {
      return client.request(
        { path: `/api/adult/items/${id}/progress`, method: 'POST', body: { position, duration } },
        z.unknown(),
      );
    },
  };
}
