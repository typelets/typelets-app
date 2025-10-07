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

// Global function to force all hook instances to refresh
export function forceGlobalMasterPasswordRefresh() {
  if (__DEV__) {
    console.log('🌍 Emitting global master password refresh event');
  }
  DeviceEventEmitter.emit('masterPasswordForceRefresh');
}

export function useMasterPassword() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isNewSetup, setIsNewSetup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [, setLastCheckTime] = useState<number>(0);

  const userId = user?.id;

  const checkMasterPasswordStatus = useCallback(async () => {
    if (!userLoaded || !userId || !isSignedIn) {
      setIsChecking(true);
      return;
    }

    try {
      setIsChecking(true);

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
          if (__DEV__) {
            console.log('✅ Master password already unlocked');
          }
        }
      }

      setLastCheckTime(Date.now());
    } catch (error) {
      if (__DEV__) console.error('Error checking master password status:', error);
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
      if (__DEV__) {
        console.log('🔄 Checking master password status');
      }
      checkMasterPasswordStatus();
    }
  }, [isSignedIn, userLoaded, userId]);

  // Listen for global refresh events (for coordinating across hook instances)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('masterPasswordForceRefresh', () => {
      if (__DEV__) {
        console.log('🔄 Global master password refresh triggered');
      }
      checkMasterPasswordStatus();
    });

    return () => subscription.remove();
  }, [checkMasterPasswordStatus]);

  const onPasswordSuccess = async (password: string) => {
    if (__DEV__) {
      console.log('🔑 onPasswordSuccess called');
      console.log('🔑 userId:', userId);
      console.log('🔑 isNewSetup:', isNewSetup);
    }

    if (!userId) {
      throw new Error('No user ID available');
    }

    if (!password || password.trim().length === 0) {
      throw new Error('Password is required');
    }

    if (isNewSetup) {
      // Setting up new master password
      if (__DEV__) {
        console.log('🔑 Setting up new master password...');
      }
      await setupMasterPassword(password, userId);
      if (__DEV__) {
        console.log('🔑 Master password setup completed');
      }
    } else {
      // Unlocking with existing password
      if (__DEV__) {
        console.log('🔑 Unlocking with existing password...');
      }
      const success = await unlockWithMasterPassword(password, userId);
      if (!success) {
        throw new Error('Invalid password');
      }
      if (__DEV__) {
        console.log('🔑 Master password unlock completed');
      }
    }

    // Successfully authenticated
    if (__DEV__) {
      console.log('🔑 Setting needsUnlock=false, isNewSetup=false');
    }
    setNeedsUnlock(false);
    setIsNewSetup(false);
  };

  const signOut = async () => {
    if (userId) {
      try {
        await clearUserEncryptionData(userId);
      } catch (error) {
        if (__DEV__) console.error('Error clearing encryption data:', error);
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
