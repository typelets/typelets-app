/**
 * In-Memory Cache Service
 * Simple TTL-based cache for API responses to reduce redundant network calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear all expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Export singleton instance
export const apiCache = new InMemoryCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  FOLDERS: 5 * 60 * 1000,      // 5 minutes
  COUNTS: 2 * 60 * 1000,       // 2 minutes
  NOTES: 1 * 60 * 1000,        // 1 minute (notes change frequently)
} as const;

// Cache key builders
export const CACHE_KEYS = {
  FOLDERS: 'folders:all',
  COUNTS: (folderId?: string) => folderId ? `counts:folder:${folderId}` : 'counts:all',
  NOTES: (params?: string) => params ? `notes:${params}` : 'notes:all',
} as const;
