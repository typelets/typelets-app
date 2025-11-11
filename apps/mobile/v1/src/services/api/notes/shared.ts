/**
 * Shared utilities used across note operations
 */

import { getDatabase } from '../../../lib/database';
import { apiCache } from '../cache';
import { invalidateCache } from '../databaseCache';

/**
 * Helper to invalidate all counts caches and database cache
 * Called whenever notes are created, updated, or deleted
 */
export async function invalidateCountsCache(): Promise<void> {
  // Clear all counts caches (general and folder-specific)
  apiCache.clearAll(); // This clears all caches including counts

  // Invalidate database cache metadata so next fetch will get fresh data
  await invalidateCache('notes');

  // Only clear cached notes when ONLINE - offline we need to keep them
  // because we can't refetch them
  if (navigator.onLine) {
    // Clear cached notes from SQLite, but preserve unsynced temp notes
    // This ensures next fetch shows updated notes while keeping offline edits
    try {
      const db = getDatabase();
      const result = await db.runAsync(
        'DELETE FROM notes WHERE is_synced = 1'
      );

      if (__DEV__) {
        console.log('[API] Cleared synced cached notes (preserving unsynced changes):', result.changes);
      }
    } catch (error) {
      if (__DEV__) {
        console.log('[API] Skipped clearing cached notes - offline mode');
      }
    }
  }
}
