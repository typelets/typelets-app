import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * Network status information
 */
export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Hook to monitor network connectivity status
 *
 * Uses @react-native-community/netinfo to track:
 * - Connection status (online/offline)
 * - Internet reachability
 * - Connection type (wifi, cellular, etc.)
 *
 * @returns NetworkStatus object with current connectivity state
 *
 * @example
 * function MyComponent() {
 *   const { isConnected, isInternetReachable } = useNetworkStatus();
 *
 *   if (!isConnected) {
 *     return <Text>You are offline. Changes will sync when online.</Text>;
 *   }
 *
 *   return <Text>Connected</Text>;
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const newStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      };

      setNetworkStatus(newStatus);

      // Log network changes in dev mode
      if (__DEV__) {
        console.log('[NetworkStatus] Connection changed:', {
          isConnected: newStatus.isConnected,
          isInternetReachable: newStatus.isInternetReachable,
          type: newStatus.type,
        });
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}
