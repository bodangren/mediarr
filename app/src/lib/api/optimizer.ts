interface PendingRequest<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: boolean; // Return stale data while revalidating
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Request deduplication utility to prevent duplicate concurrent requests
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);

    if (existing) {
      return existing.promise as Promise<T>;
    }

    let resolve: ((value: unknown) => void) | undefined;
    let reject: ((error: unknown) => void) | undefined;

    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pendingRequests.set(key, { promise, resolve: resolve!, reject: reject! });

    try {
      const result = await requestFn();
      resolve!(result);
      return result;
    } catch (error) {
      reject!(error);
      throw error;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  clear(): void {
    this.pendingRequests.clear();
  }

  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Simple in-memory cache for API responses
 */
class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private isDevelopment = import.meta.env.DEV;

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
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

  get<T>(key: string): T | undefined {
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

    return entry.data as T;
  }

  invalidate(key: string): void {
    const existed = this.cache.delete(key);
    if (existed && this.isDevelopment) {
      console.log(`[Cache] Invalidated cache for key: ${key}`);
    }
  }

  invalidatePattern(pattern: string): void {
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

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (this.isDevelopment && size > 0) {
      console.log(`[Cache] Cleared ${size} cache entries`);
    }
  }

  getStats(): { size: number; entries: string[] } {
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
  private deduplicator = new RequestDeduplicator();
  private cache = new ApiCache();

  async fetch<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get<T>(key);

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
  async fetchWithStaleRevalidate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = this.cache.get<T>(key);

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

  invalidate(key: string): void {
    this.cache.invalidate(key);
  }

  invalidatePattern(pattern: string): void {
    this.cache.invalidatePattern(pattern);
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearPendingRequests(): void {
    this.deduplicator.clear();
  }

  getCacheStats(): { size: number; entries: string[] } {
    return this.cache.getStats();
  }

  getPendingRequestCount(): number {
    return this.deduplicator.getPendingCount();
  }
}

// Singleton instance
export const apiOptimizer = new ApiOptimizer();

/**
 * Utility functions for easier use
 */
export async function optimizedFetch<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  return apiOptimizer.fetch(key, requestFn, options);
}

export async function optimizedFetchWithStaleRevalidate<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  return apiOptimizer.fetchWithStaleRevalidate(key, requestFn, options);
}

export function invalidateApiCache(key: string): void {
  apiOptimizer.invalidate(key);
}

export function invalidateApiCachePattern(pattern: string): void {
  apiOptimizer.invalidatePattern(pattern);
}

export function clearApiCache(): void {
  apiOptimizer.clearCache();
}

export function getApiCacheStats(): { size: number; entries: string[] } {
  return apiOptimizer.getCacheStats();
}
