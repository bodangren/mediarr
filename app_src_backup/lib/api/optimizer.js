const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Request deduplication utility to prevent duplicate concurrent requests
 */
class RequestDeduplicator {
    pendingRequests = new Map();
    async deduplicate(key, requestFn) {
        const existing = this.pendingRequests.get(key);
        if (existing) {
            return existing.promise;
        }
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        this.pendingRequests.set(key, { promise, resolve: resolve, reject: reject });
        try {
            const result = await requestFn();
            resolve(result);
            return result;
        }
        catch (error) {
            reject(error);
            throw error;
        }
        finally {
            this.pendingRequests.delete(key);
        }
    }
    clear() {
        this.pendingRequests.clear();
    }
    getPendingCount() {
        return this.pendingRequests.size;
    }
}
/**
 * Simple in-memory cache for API responses
 */
class ApiCache {
    cache = new Map();
    isDevelopment = process.env.NODE_ENV === 'development';
    set(key, data, options = {}) {
        const ttl = options.ttl ?? DEFAULT_TTL;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
        if (this.isDevelopment) {
            console.log(`[Cache] Set cache for key: ${key}`);
        }
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        const now = Date.now();
        const isExpired = now - entry.timestamp > entry.ttl;
        if (isExpired) {
            this.cache.delete(key);
            if (this.isDevelopment) {
                console.log(`[Cache] Expired cache for key: ${key}`);
            }
            return undefined;
        }
        if (this.isDevelopment) {
            console.log(`[Cache] Hit cache for key: ${key}`);
        }
        return entry.data;
    }
    invalidate(key) {
        const existed = this.cache.delete(key);
        if (existed && this.isDevelopment) {
            console.log(`[Cache] Invalidated cache for key: ${key}`);
        }
    }
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        if (count > 0 && this.isDevelopment) {
            console.log(`[Cache] Invalidated ${count} entries matching pattern: ${pattern}`);
        }
    }
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        if (this.isDevelopment && size > 0) {
            console.log(`[Cache] Cleared ${size} cache entries`);
        }
    }
    getStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
        };
    }
}
/**
 * API optimizer that combines deduplication and caching
 */
export class ApiOptimizer {
    deduplicator = new RequestDeduplicator();
    cache = new ApiCache();
    async fetch(key, requestFn, options = {}) {
        // Check cache first
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        // Deduplicate concurrent requests
        return this.deduplicator.deduplicate(key, async () => {
            const result = await requestFn();
            // Cache the result
            this.cache.set(key, result, options);
            return result;
        });
    }
    /**
     * Fetch with stale-while-revalidate pattern
     * Returns stale data immediately and refreshes in the background
     */
    async fetchWithStaleRevalidate(key, requestFn, options = {}) {
        const cached = this.cache.get(key);
        if (cached !== undefined) {
            // Return cached data immediately
            // Then revalidate in the background
            this.deduplicator.deduplicate(key, async () => {
                const result = await requestFn();
                this.cache.set(key, result, options);
                return result;
            }).catch(error => {
                // Log error but don't throw since we already returned cached data
                console.error(`[ApiOptimizer] Background revalidation failed for ${key}:`, error);
            });
            return cached;
        }
        // No cached data, fetch normally
        return this.fetch(key, requestFn, options);
    }
    invalidate(key) {
        this.cache.invalidate(key);
    }
    invalidatePattern(pattern) {
        this.cache.invalidatePattern(pattern);
    }
    clearCache() {
        this.cache.clear();
    }
    clearPendingRequests() {
        this.deduplicator.clear();
    }
    getCacheStats() {
        return this.cache.getStats();
    }
    getPendingRequestCount() {
        return this.deduplicator.getPendingCount();
    }
}
// Singleton instance
export const apiOptimizer = new ApiOptimizer();
/**
 * Utility functions for easier use
 */
export async function optimizedFetch(key, requestFn, options) {
    return apiOptimizer.fetch(key, requestFn, options);
}
export async function optimizedFetchWithStaleRevalidate(key, requestFn, options) {
    return apiOptimizer.fetchWithStaleRevalidate(key, requestFn, options);
}
export function invalidateApiCache(key) {
    apiOptimizer.invalidate(key);
}
export function invalidateApiCachePattern(pattern) {
    apiOptimizer.invalidatePattern(pattern);
}
export function clearApiCache() {
    apiOptimizer.clearCache();
}
export function getApiCacheStats() {
    return apiOptimizer.getCacheStats();
}
//# sourceMappingURL=optimizer.js.map