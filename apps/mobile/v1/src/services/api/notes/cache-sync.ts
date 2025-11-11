/**
 * Cache synchronization utilities
 * Handles keeping SQLite and AsyncStorage caches in sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Note } from '../types';
import { storeCachedNotes } from '../databaseCache';

/**
 * Update SQLite cache with a note after create/update
 * This ensures the local database cache stays in sync with the server
 */
export async function updateSQLiteCache(note: Note): Promise<void> {
  try {
    await storeCachedNotes([note], { storeDecrypted: true });
    if (__DEV__) {
      console.log(`[CacheSync] ✅ Updated SQLite cache for note ${note.id}`);
    }
  } catch (error) {
    console.warn('[CacheSync] Failed to update SQLite cache:', error);
  }
}

/**
 * Clear AsyncStorage preview caches
 * Called when notes change location/status (delete, archive, move folder)
 */
export async function clearAsyncStorageCaches(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const noteCacheKeys = allKeys.filter(key => key.startsWith('notes-cache-v2-'));
    if (noteCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(noteCacheKeys);
      if (__DEV__) {
        console.log(`[CacheSync] ✅ Cleared ${noteCacheKeys.length} AsyncStorage cache(s)`);
      }
    }
  } catch (error) {
    console.warn('[CacheSync] Failed to clear AsyncStorage caches:', error);
  }
}

/**
 * Sync all cache layers after a note operation
 * @param note - The note to sync
 * @param clearPreviewCaches - Whether to clear AsyncStorage caches (for delete/archive/move)
 */
export async function syncAllCaches(note: Note, clearPreviewCaches: boolean = false): Promise<void> {
  // Always update SQLite cache
  await updateSQLiteCache(note);

  // Optionally clear AsyncStorage preview caches
  if (clearPreviewCaches) {
    await clearAsyncStorageCaches();
  }
}
