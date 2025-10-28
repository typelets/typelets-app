import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect,useState } from 'react';

import { APP_VERSION } from '../constants/version';

const VERSION_STORAGE_KEY = 'last_seen_version';

export function useVersionNotification() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const lastSeenVersion = await AsyncStorage.getItem(VERSION_STORAGE_KEY);

      // If no version was stored, or version is different, show notification
      if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
        setHasNewVersion(true);
      } else {
        setHasNewVersion(false);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to check version:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const markVersionAsSeen = async () => {
    try {
      await AsyncStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
      setHasNewVersion(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to mark version as seen:', error);
      }
    }
  };

  return { hasNewVersion, isLoading, markVersionAsSeen, checkVersion };
}
