import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';

const activityItemSchema = z.object({
  id: z.number(),
  eventType: z.string(),
  sourceModule: z.string().optional(),
  entityRef: z.string().nullable().optional(),
  summary: z.string(),
  success: z.boolean().optional(),
  details: z.unknown().optional(),
  occurredAt: z.string().optional(),
}).passthrough();

export type ActivityItem = z.infer<typeof activityItemSchema>;

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
  eventType?: string;
  sourceModule?: string;
  entityRef?: string;
  success?: boolean;
  from?: string;
  to?: string;
}

export function createActivityApi(client: ApiHttpClient) {
  return {
    list(query: ActivityQuery = {}): Promise<PaginatedResult<ActivityItem>> {
      return client.requestPaginated(
        {
          path: routeMap.activity,
          query,
        },
        activityItemSchema,
      );
    },
  };
}
