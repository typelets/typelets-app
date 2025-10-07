/**
 * Decryption Cache Management
 * LRU-like cache for decrypted notes
 */

import { CacheEntry } from '../types';
import { CACHE_CONFIG } from '../config';

export class DecryptionCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean expired cache every 5 minutes
    this.cleanupInterval = setInterval(
      () => this.cleanExpired(),
      CACHE_CONFIG.CLEANUP_INTERVAL_MS
    );
  }

  /**
   * Generate cache key for a note
   */
  private getCacheKey(userId: string, encryptedTitle: string, iv: string): string {
    return `${userId}-${encryptedTitle}-${iv}`;
  }

  /**
   * Get cached decrypted data
   */
  get(userId: string, encryptedTitle: string, iv: string): CacheEntry | undefined {
    const key = this.getCacheKey(userId, encryptedTitle, iv);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.TTL_MS) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Set cached decrypted data
   */
  set(
    userId: string,
    encryptedTitle: string,
    iv: string,
    data: { title: string; content: string }
  ): void {
    const key = this.getCacheKey(userId, encryptedTitle, iv);

    // Evict oldest entry if cache is full
    if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (typeof firstKey === 'string') {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache entries for a specific user
   */
  clearUser(userId: string, encryptedTitle?: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (encryptedTitle) {
        // Clear specific note
        if (key.startsWith(userId) && key.includes(encryptedTitle)) {
          keysToDelete.push(key);
        }
      } else {
        // Clear all for user
        if (key.startsWith(userId)) {
          keysToDelete.push(key);
        }
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (__DEV__ && keysToDelete.length > 0) {
      console.log(`🧹 Cleared ${keysToDelete.length} cache entries for user ${userId}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_CONFIG.TTL_MS) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (__DEV__ && expiredKeys.length > 0) {
      console.log(`🧹 Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}
