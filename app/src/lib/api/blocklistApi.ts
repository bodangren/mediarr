import { z } from 'zod';
import { ApiHttpClient, type PaginatedResult } from './httpClient';
import { routeMap } from './routeMap';
import type { BlocklistItem, BlocklistQuery, RemoveBlocklistResult, ClearBlocklistResult } from '@/types/blocklist';

// Inline schema definitions for API responses
// These should be replaced with proper schemas from backend when implemented
const blocklistItemSchema = z.object({
  id: z.number(),
  // For TV
  seriesId: z.number().optional(),
  seriesTitle: z.string().optional(),
  episodeId: z.number().optional(),
  seasonNumber: z.number().optional(),
  episodeNumber: z.number().optional(),
  // For Movies
  movieId: z.number().optional(),
  movieTitle: z.string().optional(),
  moviePosterUrl: z.string().optional(),
  year: z.number().optional(),
  // Common
  releaseTitle: z.string(),
  quality: z.string().optional(),
  dateBlocked: z.string(),
  reason: z.string(),
  indexer: z.string().optional(),
  size: z.number().optional(),
});

const removeBlocklistResultSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

const clearBlocklistResultSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
});

/**
 * Blocklist API client
 *
 * Manages blocked releases for the Sonarr-style blocklist feature.
 *
 * NOTE: Backend endpoints may not be implemented yet. This client provides
 * the expected interface for when the backend is ready.
 */
export function createBlocklistApi(client: ApiHttpClient) {
  return {
    /**
     * List blocked releases with optional filtering
     */
    list(query: BlocklistQuery = {}): Promise<PaginatedResult<BlocklistItem>> {
      return client.requestPaginated(
        {
          path: routeMap.blocklist,
          query,
        },
        blocklistItemSchema,
      );
    },

    /**
     * Remove specific items from blocklist
     */
    remove(ids: number[]): Promise<RemoveBlocklistResult> {
      return client.request(
        {
          path: routeMap.blocklistRemove,
          method: 'DELETE',
          body: { ids },
        },
        removeBlocklistResultSchema,
      );
    },

    /**
     * Clear all items from blocklist
     */
    clear(): Promise<ClearBlocklistResult> {
      return client.request(
        {
          path: routeMap.blocklistClear,
          method: 'DELETE',
        },
        clearBlocklistResultSchema,
      );
    },
  };
}
