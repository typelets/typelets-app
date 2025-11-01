/**
 * Sync on Reconnect Hook
 * Automatically syncs pending mutations when device comes back online
 */

import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useRef } from 'react';

import { useApiService } from '../api';
import { useOnlineListener } from '../network/networkManager';
import { processSyncQueue } from './syncProcessor';

/**
 * Hook to automatically sync when device comes back online
 * Call this in your app's root component
 */
export function useSyncOnReconnect() {
  const api = useApiService();
  const { getToken } = useAuth();
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef(0);

  const handleReconnect = useCallback(async () => {
    const now = Date.now();

    // Debounce: Skip if sync already in progress or ran within last 2 seconds
    if (syncInProgress.current || (now - lastSyncTime.current) < 2000) {
      if (__DEV__) {
        console.log('[SyncOnReconnect] Skipping - sync already running or too recent');
      }
      return;
    }

    syncInProgress.current = true;
    lastSyncTime.current = now;

    if (__DEV__) {
      console.log('[SyncOnReconnect] Device came back online - starting sync');
    }

    try {
      const result = await processSyncQueue(api, getToken);

      if (__DEV__) {
        console.log(`[SyncOnReconnect] Sync completed: ${result.success} succeeded, ${result.failed} failed`);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[SyncOnReconnect] Sync failed:', error);
      }
    } finally {
      syncInProgress.current = false;
    }
  }, [api, getToken]);

  // Listen for device coming back online
  useOnlineListener(handleReconnect);
}
