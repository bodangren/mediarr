import { z } from 'zod';
import { ApiHttpClient } from './httpClient';

/**
 * Adult library client (track feature_adult_library_20261107 +
 * feature_adult_retention_keep_delete_20261111).
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
  isWatched: z.boolean(),
  keep: z.boolean(),
  decidedAt: z.string().nullable(),
  thumbUrl: z.string().nullable().optional(),
  seriesKey: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const listSchema = z.object({
  items: z.array(itemSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
  needsReview: z.number(),
});

const retentionDecisionSchema = z.enum(['keep', 'delete']);

const decisionItemSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  fileName: z.string(),
  studio: z.string().nullable(),
  quality: z.string().nullable(),
  isWatched: z.boolean(),
  lastPlayedAt: z.string().nullable(),
  sizeBytes: z.number(),
  keep: z.boolean(),
  decidedAt: z.string().nullable(),
});

const decisionListSchema = z.object({
  items: z.array(decisionItemSchema),
  total: z.number(),
});

const seriesSchema = z.object({
  seriesKey: z.string(),
  count: z.number(),
});
const seriesPageSchema = z.object({
  series: z.array(seriesSchema),
  unshelved: z.number(),
});
const tagCountSchema = z.object({
  tag: z.string(),
  count: z.number(),
});

const decisionResultSchema = z.object({
  id: z.number(),
  decision: retentionDecisionSchema,
  kept: z.boolean().optional(),
  deleted: z.boolean().optional(),
  alreadyDecided: z.boolean().optional(),
});

export type AdultItem = z.infer<typeof itemSchema>;
export type AdultSeriesShelf = z.infer<typeof seriesSchema>;
export type AdultSeriesPage = z.infer<typeof seriesPageSchema>;
export type AdultTagCount = z.infer<typeof tagCountSchema>;
export type AdultItemPage = z.infer<typeof listSchema>;
export type AdultRetentionDecision = z.infer<typeof retentionDecisionSchema>;
export type AdultDecisionItem = z.infer<typeof decisionItemSchema>;
export type AdultDecisionList = z.infer<typeof decisionListSchema>;
export type AdultDecisionResult = z.infer<typeof decisionResultSchema>;

export interface AdultItemQuery {
  q?: string;
  page?: number;
  pageSize?: number;
  /** Derived filter tags; the server requires all of them (AND). */
  tags?: string[];
}

export function createAdultLibraryApi(client: ApiHttpClient) {
  return {
    listItems(params: AdultItemQuery = {}): Promise<AdultItemPage> {
      const query: Record<string, unknown> = {};
      if (params.q) query.q = params.q;
      if (params.page !== undefined) query.page = params.page;
      if (params.pageSize !== undefined) query.pageSize = params.pageSize;
      if (params.tags && params.tags.length > 0) query.tags = params.tags.join(',');
      return client.request({ path: '/api/adult/items', query }, listSchema);
    },
    /** Series shelves with counts (most populated first) and how many items have none. */
    listSeries(): Promise<AdultSeriesPage> {
      return client.request({ path: '/api/adult/series' }, seriesPageSchema);
    },
    /** Derived tag counts for the filter chips. */
    listTags(): Promise<AdultTagCount[]> {
      return client.request({ path: '/api/adult/tags' }, z.array(tagCountSchema));
    },
    /** Watched items with no keep/delete answer yet, newest watched first. */
    listDecisions(): Promise<AdultDecisionList> {
      return client.request({ path: '/api/adult/decisions' }, decisionListSchema);
    },
    /** Records the owner's one durable answer; the server quarantines on `delete`. */
    decide(id: number, decision: AdultRetentionDecision): Promise<AdultDecisionResult> {
      return client.request(
        { path: `/api/adult/items/${id}/decision`, method: 'POST', body: { decision } },
        decisionResultSchema,
      );
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
