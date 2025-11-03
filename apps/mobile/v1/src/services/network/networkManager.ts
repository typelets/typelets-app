/**
 * Network Manager
 * Handles network status detection and monitoring
 */

import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (error) {
    console.error('[NetworkManager] Failed to check online status:', error);
    // Assume offline if we can't check
    return false;
  }
}

/**
 * Hook to get current network status
 */
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);

      if (__DEV__) {
        const online = state.isConnected && state.isInternetReachable;
        console.log(`[NetworkManager] Network status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOnline: isConnected && isInternetReachable,
  };
}

/**
 * Hook to listen for when device comes back online
 */
export function useOnlineListener(callback: () => void) {
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;

      if (!online) {
        setWasOffline(true);
      } else if (wasOffline && online) {
        // Device just came back online
        if (__DEV__) {
          console.log('[NetworkManager] Device came back online, triggering callback');
        }
        setWasOffline(false);
        callback();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [wasOffline, callback]);
}
