import { ApiHttpClient, type PaginatedResult } from './httpClient';
import type { BlocklistItem, BlocklistQuery, RemoveBlocklistResult, ClearBlocklistResult } from '@/types/blocklist';
/**
 * Blocklist API client
 *
 * Manages blocked releases for the Sonarr-style blocklist feature.
 *
 * NOTE: Backend endpoints may not be implemented yet. This client provides
 * the expected interface for when the backend is ready.
 */
export declare function createBlocklistApi(client: ApiHttpClient): {
    /**
     * List blocked releases with optional filtering
     */
    list(query?: BlocklistQuery): Promise<PaginatedResult<BlocklistItem>>;
    /**
     * Remove specific items from blocklist
     */
    remove(ids: number[]): Promise<RemoveBlocklistResult>;
    /**
     * Clear all items from blocklist
     */
    clear(): Promise<ClearBlocklistResult>;
};
//# sourceMappingURL=blocklistApi.d.ts.map