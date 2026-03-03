export interface CacheOptions {
    ttl?: number;
    staleWhileRevalidate?: boolean;
}
/**
 * API optimizer that combines deduplication and caching
 */
export declare class ApiOptimizer {
    private deduplicator;
    private cache;
    fetch<T>(key: string, requestFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Fetch with stale-while-revalidate pattern
     * Returns stale data immediately and refreshes in the background
     */
    fetchWithStaleRevalidate<T>(key: string, requestFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    invalidate(key: string): void;
    invalidatePattern(pattern: string): void;
    clearCache(): void;
    clearPendingRequests(): void;
    getCacheStats(): {
        size: number;
        entries: string[];
    };
    getPendingRequestCount(): number;
}
export declare const apiOptimizer: ApiOptimizer;
/**
 * Utility functions for easier use
 */
export declare function optimizedFetch<T>(key: string, requestFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
export declare function optimizedFetchWithStaleRevalidate<T>(key: string, requestFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
export declare function invalidateApiCache(key: string): void;
export declare function invalidateApiCachePattern(pattern: string): void;
export declare function clearApiCache(): void;
export declare function getApiCacheStats(): {
    size: number;
    entries: string[];
};
//# sourceMappingURL=optimizer.d.ts.map