import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import {
  hasMasterPassword,
  isMasterPasswordUnlocked,
  setupMasterPassword,
  unlockWithMasterPassword,
  clearUserEncryptionData,
} from '../lib/encryption';
import { logger } from '../lib/logger';

// Global function to force all hook instances to refresh
export function forceGlobalMasterPasswordRefresh() {
  DeviceEventEmitter.emit('masterPasswordForceRefresh');
}

export function useMasterPassword() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [needsUnlock, setNeedsUnlock] = useState(true); // Default to true to prevent premature loading
  const [isNewSetup, setIsNewSetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [, setLastCheckTime] = useState<number>(0);

  const userId = user?.id;

  // Reset state when user changes (sign out/sign in)
  useEffect(() => {
    if (userId) {
      // New user signed in - reset to locked state
      setNeedsUnlock(true);
      setIsChecking(true);
      setIsNewSetup(false);
    }
  }, [userId]);

  const checkMasterPasswordStatus = useCallback(async () => {
    if (!userLoaded || !userId || !isSignedIn) {
      setIsChecking(true);
      setNeedsUnlock(true); // Assume locked when no user
      return;
    }

    try {
      setIsChecking(true);
      setNeedsUnlock(true); // Assume locked while checking

      // Check if user has a master password set up
      const hasPassword = await hasMasterPassword(userId);

      if (!hasPassword) {
        // No master password set up yet
        setIsNewSetup(true);
        setNeedsUnlock(true);
      } else {
        // Has master password, check if it's unlocked
        const isUnlocked = await isMasterPasswordUnlocked(userId);

        if (!isUnlocked) {
          // Has password but needs to unlock
          setIsNewSetup(false);
          setNeedsUnlock(true);
        } else {
          // Already unlocked
          setIsNewSetup(false);
          setNeedsUnlock(false);
        }
      }

      setLastCheckTime(Date.now());
    } catch (error) {
      logger.error('Error checking master password status', error as Error, {
        attributes: {
          userId,
        },
      });
      // On error, assume needs setup
      setIsNewSetup(true);
      setNeedsUnlock(true);
    } finally {
      setIsChecking(false);
    }
  }, [userLoaded, userId, isSignedIn]);

  // Check master password status when user is loaded and signed in
  useEffect(() => {
    if (isSignedIn && userLoaded && userId) {
      checkMasterPasswordStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userLoaded, userId]);

  // Listen for global refresh events (for coordinating across hook instances)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('masterPasswordForceRefresh', () => {
      checkMasterPasswordStatus();
    });

    return () => subscription.remove();
  }, [checkMasterPasswordStatus]);

  const onPasswordSuccess = async (password: string) => {
    if (!userId) {
      throw new Error('No user ID available');
    }

    if (!password || password.trim().length === 0) {
      throw new Error('Password is required');
    }

    try {
      if (isNewSetup) {
        // Setting up new master password
        await setupMasterPassword(password, userId);
        logger.recordEvent('master_password_setup', {
          userId,
        });
      } else {
        // Unlocking with existing password
        const success = await unlockWithMasterPassword(password, userId);
        if (!success) {
          logger.warn('Invalid master password attempt', {
            attributes: {
              userId,
            },
          });
          throw new Error('Invalid password');
        }
        logger.recordEvent('master_password_unlocked', {
          userId,
        });
      }

      // Successfully authenticated - update state
      setNeedsUnlock(false);
      setIsNewSetup(false);
      setIsChecking(false);
    } catch (error) {
      // Re-throw to let the UI handle the error
      throw error;
    }
  };

  const signOut = async () => {
    if (userId) {
      try {
        await clearUserEncryptionData(userId);
      } catch (error) {
        logger.error('Error clearing encryption data on sign out', error as Error, {
          attributes: {
            userId,
          },
        });
      }
    }
  };

  return {
    needsUnlock,
    isNewSetup,
    isChecking,
    userId,
    onPasswordSuccess,
    signOut,
    refreshStatus: checkMasterPasswordStatus,
  };
}
