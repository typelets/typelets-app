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
  const [lastCheckTime, setLastCheckTime] = useState(0);

  const userId = user?.id;

  const checkMasterPasswordStatus = useCallback(async () => {
    if (!userLoaded || !userId || !isSignedIn) {
      setIsChecking(true);
      return;
    }

    try {
      setIsChecking(true);

      if (__DEV__) {
        console.log('🔍 Checking master password status for user:', userId);
      }

      // Check if user has a master password set up
      const hasPassword = await hasMasterPassword(userId);

      if (__DEV__) {
        console.log('🔐 Has master password:', hasPassword);
      }

      if (!hasPassword) {
        // No master password set up yet
        setIsNewSetup(true);
        setNeedsUnlock(true);
        if (__DEV__) {
          console.log('🆕 Setting up new master password');
        }
      } else {
        // Has master password, check if it's unlocked
        const isUnlocked = await isMasterPasswordUnlocked(userId);

        if (__DEV__) {
          console.log('🔓 Is master password unlocked:', isUnlocked);
        }

        if (!isUnlocked) {
          // Has password but needs to unlock
          setIsNewSetup(false);
          setNeedsUnlock(true);
          if (__DEV__) {
            console.log('🔒 Need to unlock master password');
          }
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

  useEffect(() => {
    checkMasterPasswordStatus();
  }, [checkMasterPasswordStatus]);

  // Force recheck when user signs in (important for logout/login scenarios)
  useEffect(() => {
    if (isSignedIn && userId) {
      // Add a small delay to ensure Clerk auth is fully initialized
      const timer = setTimeout(() => {
        if (__DEV__) {
          console.log('🔄 User signed in, rechecking master password status');
        }
        checkMasterPasswordStatus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isSignedIn, userId, checkMasterPasswordStatus]);

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
      console.log('🔑 onPasswordSuccess called with password length:', password.length);
      console.log('🔑 userId:', userId);
      console.log('🔑 isNewSetup:', isNewSetup);
    }

    if (!userId) {
      throw new Error('No user ID available');
    }

    if (!password || password.trim().length === 0) {
      throw new Error('Password is required');
    }

    try {
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
    } catch (error) {
      if (__DEV__) {
        console.log('🔑 onPasswordSuccess error:', error);
      }
      throw error; // Re-throw to let the UI handle the error
    }
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