import * as Device from 'expo-device';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to lock screen orientation based on device type
 * - Phones: Portrait only
 * - Tablets: Allow all orientations
 */
export function useOrientationLock() {
  useEffect(() => {
    async function lockOrientation() {
      try {
        // Only run on native platforms
        if (Platform.OS === 'web') {
          return;
        }

        // Check if device is a tablet
        const deviceType = await Device.getDeviceTypeAsync();
        const isTablet = deviceType === Device.DeviceType.TABLET;

        if (isTablet) {
          // Tablets: Allow all orientations
          await ScreenOrientation.unlockAsync();
          if (__DEV__) {
            console.log('[Orientation] Tablet detected - allowing all orientations');
          }
        } else {
          // Phones: Lock to portrait
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
          if (__DEV__) {
            console.log('[Orientation] Phone detected - locked to portrait');
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[Orientation] Failed to set orientation lock:', error);
        }
      }
    }

    lockOrientation();
  }, []);
}
