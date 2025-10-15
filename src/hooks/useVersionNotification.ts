import { useState, useEffect } from 'react';
import { APP_VERSION } from '@/constants/version';

const VERSION_STORAGE_KEY = 'last_seen_version';

export function useVersionNotification() {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = () => {
    try {
      const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY);

      // If no version was stored, or version is different, show notification
      if (!lastSeenVersion || lastSeenVersion !== APP_VERSION) {
        setHasNewVersion(true);
      } else {
        setHasNewVersion(false);
      }
    } catch (error) {
      console.error('Failed to check version:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markVersionAsSeen = () => {
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);
      setHasNewVersion(false);
    } catch (error) {
      console.error('Failed to mark version as seen:', error);
    }
  };

  return { hasNewVersion, isLoading, markVersionAsSeen, checkVersion };
}
