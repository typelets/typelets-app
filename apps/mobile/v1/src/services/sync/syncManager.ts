/**
 * Sync Manager
 * Handles offline mutations and syncing with the server
 */

import { getDatabase } from '../../lib/database';

/**
 * Generate a unique ID for sync queue items
 * Uses timestamp + random string (no crypto.getRandomValues needed)
 */
function generateSyncId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncResourceType = 'note' | 'folder';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface SyncQueueItem {
  id: string;
  resourceType: SyncResourceType;
  resourceId: string;
  operation: SyncOperation;
  payload: string; // JSON stringified data
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: number;
  syncedAt?: number;
}

/**
 * Add a mutation to the sync queue
 * Prevents duplicate queue items for the same resource+operation
 */
export async function queueMutation(
  resourceType: SyncResourceType,
  resourceId: string,
  operation: SyncOperation,
  payload: any
): Promise<string> {
  try {
    const db = getDatabase();

    // Check if there's already a pending/syncing item for this resource+operation
    const existing = await db.getFirstAsync<{ id: string; status: string }>(
      `SELECT id, status FROM sync_queue
       WHERE resource_type = ? AND resource_id = ? AND operation = ?
       AND status IN ('pending', 'syncing')`,
      [resourceType, resourceId, operation]
    );

    if (existing) {
      if (__DEV__) {
        console.log(`[SyncManager] Duplicate prevented - ${operation} ${resourceType} ${resourceId}`);
      }
      return existing.id;
    }

    const id = generateSyncId();
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO sync_queue (id, resource_type, resource_id, operation, payload, status, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        resourceType,
        resourceId,
        operation,
        JSON.stringify(payload),
        'pending',
        0,
        now,
      ]
    );

    if (__DEV__) {
      console.log(`[SyncManager] Queued: ${operation} ${resourceType} ${resourceId}`);
    }

    return id;
  } catch (error) {
    console.error('[SyncManager] Failed to queue mutation:', error);
    throw error;
  }
}

/**
 * Get all pending sync items
 */
export async function getPendingSync(): Promise<SyncQueueItem[]> {
  try {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue WHERE status = 'pending' OR status = 'error' ORDER BY created_at ASC`
    );

    return rows.map(row => ({
      id: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      operation: row.operation,
      payload: row.payload,
      status: row.status,
      retryCount: row.retry_count,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at,
      syncedAt: row.synced_at || undefined,
    }));
  } catch (error) {
    console.error('[SyncManager] Failed to get pending sync items:', error);
    return [];
  }
}

/**
 * Mark a sync item as syncing
 */
export async function markSyncing(syncId: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'syncing' WHERE id = ?`,
      [syncId]
    );
  } catch (error) {
    console.error('[SyncManager] Failed to mark as syncing:', error);
  }
}

/**
 * Mark a sync item as synced
 */
export async function markSynced(syncId: string): Promise<void> {
  try {
    const db = getDatabase();
    const now = Date.now();

    await db.runAsync(
      `UPDATE sync_queue SET status = 'synced', synced_at = ? WHERE id = ?`,
      [now, syncId]
    );

    if (__DEV__) {
      console.log(`[SyncManager] Marked ${syncId} as synced`);
    }
  } catch (error) {
    console.error('[SyncManager] Failed to mark as synced:', error);
  }
}

/**
 * Mark a sync item as error
 */
export async function markError(syncId: string, errorMessage: string): Promise<void> {
  try {
    const db = getDatabase();

    await db.runAsync(
      `UPDATE sync_queue SET status = 'error', error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [errorMessage, syncId]
    );

    if (__DEV__) {
      console.error(`[SyncManager] Marked ${syncId} as error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('[SyncManager] Failed to mark as error:', error);
  }
}

/**
 * Clear synced items older than X days
 */
export async function clearOldSyncedItems(daysOld: number = 7): Promise<void> {
  try {
    const db = getDatabase();
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    await db.runAsync(
      `DELETE FROM sync_queue WHERE status = 'synced' AND synced_at < ?`,
      [cutoffTime]
    );

    if (__DEV__) {
      console.log(`[SyncManager] Cleared synced items older than ${daysOld} days`);
    }
  } catch (error) {
    console.error('[SyncManager] Failed to clear old synced items:', error);
  }
}

/**
 * Get sync queue count by status
 */
export async function getSyncQueueCount(): Promise<{
  pending: number;
  syncing: number;
  error: number;
}> {
  try {
    const db = getDatabase();

    const pending = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
    );

    const syncing = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'syncing'`
    );

    const error = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'error'`
    );

    return {
      pending: pending?.count || 0,
      syncing: syncing?.count || 0,
      error: error?.count || 0,
    };
  } catch (error) {
    console.error('[SyncManager] Failed to get sync queue count:', error);
    return { pending: 0, syncing: 0, error: 0 };
  }
}
