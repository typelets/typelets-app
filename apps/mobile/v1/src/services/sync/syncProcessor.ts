/**
 * Sync Processor
 * Processes queued mutations and syncs them with the server
 */

import { getDatabase } from '../../lib/database';
import { isOnline } from '../network/networkManager';
import {
  getPendingSync,
  markError,
  markSynced,
  markSyncing,
  type SyncQueueItem,
} from './syncManager';

// Re-export these so other files can use them
export { useNetworkStatus, useOnlineListener } from '../network/networkManager';

// Track if sync is currently running to prevent concurrent syncs
let isSyncing = false;
let syncPromise: Promise<{ success: number; failed: number }> | null = null;
let lastSyncTime = 0;

/**
 * Process all pending sync items
 * Uses singleton pattern to prevent concurrent syncs
 */
export async function processSyncQueue(
  apiService: any,
  getToken: () => Promise<string | null>
): Promise<{ success: number; failed: number }> {
  const now = Date.now();

  // If sync is already running, return the existing promise
  if (isSyncing && syncPromise) {
    if (__DEV__) {
      console.log('[SyncProcessor] Sync already in progress');
    }
    return syncPromise;
  }

  // Debounce: Don't sync if we just synced within the last 2 seconds
  if (now - lastSyncTime < 2000) {
    if (__DEV__) {
      console.log('[SyncProcessor] Skipping - synced recently');
    }
    return { success: 0, failed: 0 };
  }

  // CRITICAL: Set flags IMMEDIATELY (synchronously) before ANY async work
  // This prevents race conditions where two calls check isSyncing before either sets it
  isSyncing = true;
  lastSyncTime = now;

  // Create the sync promise
  syncPromise = (async () => {
  // Check if online (moved inside the promise, after setting flags)
  const online = await isOnline();
  if (!online) {
    if (__DEV__) {
      console.log('[SyncProcessor] Device is offline, skipping sync');
    }
    return { success: 0, failed: 0 };
  }
  let successCount = 0;
  let failedCount = 0;

  try {
    const pendingItems = await getPendingSync();

    if (pendingItems.length === 0) {
      return { success: 0, failed: 0 };
    }

    if (__DEV__) {
      console.log(`[SyncProcessor] Processing ${pendingItems.length} pending items`);
    }

    // Process each item sequentially to maintain order
    for (const item of pendingItems) {
      // Skip items already being synced (race condition protection)
      if (item.status === 'syncing') {
        if (__DEV__) {
          console.log(`[SyncProcessor] Skipping item ${item.id} - already syncing`);
        }
        continue;
      }

      // Skip update/delete operations for temp notes - they don't exist on server yet
      // The create operation will include the latest state
      if (item.resourceId.startsWith('temp_') && (item.operation === 'update' || item.operation === 'delete')) {
        if (__DEV__) {
          console.log(`[SyncProcessor] Skipping ${item.operation} for temp note ${item.resourceId} - will be handled by create`);
        }
        // Remove from queue since it's not needed
        const db = getDatabase();
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
        continue;
      }

      // Skip items that have failed too many times
      if (item.retryCount >= 3) {
        if (__DEV__) {
          console.log(`[SyncProcessor] Skipping item ${item.id} - too many retries (${item.retryCount})`);
        }
        failedCount++;
        continue;
      }

      try {
        await markSyncing(item.id);
        const result = await syncItem(item, apiService, getToken);

        // If this was a create operation with a temp ID, delete it
        // (real note will come from server on next fetch)
        if (item.operation === 'create' && item.resourceId.startsWith('temp_') && result?.id) {
          await replaceTempId(item.resourceType, item.resourceId, result.id);
        }

        await markSynced(item.id);

        // Immediately delete synced item from queue to prevent reprocessing
        const db = getDatabase();
        await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);

        successCount++;

        if (__DEV__) {
          console.log(`[SyncProcessor] Synced: ${item.operation} ${item.resourceType} ${item.resourceId}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await markError(item.id, errorMessage);
        failedCount++;

        if (__DEV__) {
          console.error(`[SyncProcessor] Failed to sync ${item.operation} ${item.resourceType}:`, errorMessage);
        }
      }
    }

    if (__DEV__) {
      console.log(`[SyncProcessor] Sync complete: ${successCount} succeeded, ${failedCount} failed`);
    }

    // If any items were successfully synced, invalidate cache to trigger UI refresh
    if (successCount > 0) {
      try {
        const db = getDatabase();
        // Clear all cached notes to force fresh fetch with updated IDs
        await db.runAsync('DELETE FROM notes');
        if (__DEV__) {
          console.log('[SyncProcessor] Cleared notes cache to trigger UI refresh with updated IDs');
        }
      } catch (error) {
        console.error('[SyncProcessor] Failed to clear cache after sync:', error);
      }
    }

    return { success: successCount, failed: failedCount };
  } finally {
    isSyncing = false;
    syncPromise = null;
  }
  })();

  return syncPromise;
}

/**
 * Sync a single item with the server
 * Returns the server response (contains real ID for create operations)
 */
async function syncItem(
  item: SyncQueueItem,
  apiService: any,
  getToken: () => Promise<string | null>
): Promise<any> {
  const payload = JSON.parse(item.payload);

  switch (item.resourceType) {
    case 'note':
      return await syncNote(item, payload, getToken);
    case 'folder':
      return await syncFolder(item, payload, apiService);
    default:
      throw new Error(`Unknown resource type: ${item.resourceType}`);
  }
}

/**
 * Sync a note mutation
 * Returns the created/updated note for create/update operations
 *
 * IMPORTANT: Payload is already encrypted, so we bypass the normal API methods
 * and make direct HTTP calls to avoid double encryption
 */
async function syncNote(
  item: SyncQueueItem,
  payload: any,
  getToken: () => Promise<string | null>
): Promise<any> {
  // Get API URL and auth token
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.typelets.com/api';
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token available');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  switch (item.operation) {
    case 'create': {
      // For temp notes, fetch the latest content from local database
      // (in case it was edited while offline)
      let finalPayload = payload;
      if (item.resourceId.startsWith('temp_')) {
        const db = getDatabase();
        const localNote = await db.getFirstAsync<any>(
          'SELECT * FROM notes WHERE id = ?',
          [item.resourceId]
        );

        if (localNote) {
          // Update payload with latest encrypted content from local DB
          finalPayload = {
            ...payload,
            encryptedTitle: localNote.encrypted_title,
            encryptedContent: localNote.encrypted_content,
            iv: localNote.iv,
            salt: localNote.salt,
          };

          if (__DEV__) {
            console.log(`[SyncProcessor] Using latest content from local DB for temp note ${item.resourceId}`);
          }
        }
      }

      // Direct POST to /notes - payload is already encrypted
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    }

    case 'update': {
      // Direct PUT to /notes/:id - payload is already encrypted
      const response = await fetch(`${API_BASE_URL}/notes/${item.resourceId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    }

    case 'delete': {
      // Direct DELETE to /notes/:id
      const response = await fetch(`${API_BASE_URL}/notes/${item.resourceId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return null;
    }

    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}

/**
 * Sync a folder mutation
 * Returns the created/updated folder for create/update operations
 */
async function syncFolder(item: SyncQueueItem, payload: any, apiService: any): Promise<any> {
  switch (item.operation) {
    case 'create':
      return await apiService.createFolder(payload);
    case 'update':
      return await apiService.updateFolder(item.resourceId, payload);
    case 'delete':
      await apiService.deleteFolder(item.resourceId);
      return null;
    default:
      throw new Error(`Unknown operation: ${item.operation}`);
  }
}

/**
 * Replace temporary ID with real server ID in local database
 *
 * Strategy: Just delete the temp ID item since the real one will come from server
 * This avoids race conditions where the real ID might already exist from background refresh
 */
async function replaceTempId(
  resourceType: string,
  tempId: string,
  realId: string
): Promise<void> {
  if (__DEV__) {
    console.log(`[SyncProcessor] Replacing temp ID ${tempId} with real ID ${realId}`);
  }

  const db = getDatabase();

  try {
    if (resourceType === 'note') {
      // Simply delete the temp note
      // The real note will come from the server on the next fetch
      await db.runAsync(
        'DELETE FROM notes WHERE id = ?',
        [tempId]
      );

      if (__DEV__) {
        console.log(`[SyncProcessor] Deleted temp note ${tempId} - real note ${realId} will come from server`);
      }
    } else if (resourceType === 'folder') {
      // Delete the temp folder
      await db.runAsync(
        'DELETE FROM folders WHERE id = ?',
        [tempId]
      );

      // Also update any notes that reference this folder
      await db.runAsync(
        'UPDATE notes SET folder_id = ? WHERE folder_id = ?',
        [realId, tempId]
      );

      if (__DEV__) {
        console.log(`[SyncProcessor] Deleted temp folder ${tempId} - real folder ${realId} will come from server`);
      }
    }
  } catch (error) {
    console.error(`[SyncProcessor] Failed to replace temp ID ${tempId}:`, error);
    throw error;
  }
}
