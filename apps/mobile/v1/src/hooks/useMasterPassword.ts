import { useAuth,useUser } from '@clerk/clerk-expo';
import { useCallback,useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import {
  clearUserEncryptionData,
  hasMasterPassword,
  isMasterPasswordUnlocked,
  setupMasterPassword,
  unlockWithMasterPassword,
} from '../lib/encryption';
import { logger } from '../lib/logger';
import { getCacheDecryptedContentPreference } from '../lib/preferences';
import { useApiService } from '../services/api';

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
  const [loadingStage, setLoadingStage] = useState<'securing' | 'caching'>('securing');
  const [cacheMode, setCacheMode] = useState<'encrypted' | 'decrypted'>('encrypted');
  const api = useApiService();

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
      logger.error('[ENCRYPTION] Error checking master password status', error as Error, {
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
      // Stage 1: Securing (PBKDF2 key derivation)
      setLoadingStage('securing');

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
          logger.warn('[ENCRYPTION] Invalid master password attempt', {
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

      // Stage 2: Caching (prefetch notes and folders)
      setLoadingStage('caching');

      // Check cache mode preference
      const cacheDecrypted = await getCacheDecryptedContentPreference();
      setCacheMode(cacheDecrypted ? 'decrypted' : 'encrypted');

      if (__DEV__) {
        console.log(`[PREFETCH] Starting prefetch with ${cacheDecrypted ? 'DECRYPTED' : 'ENCRYPTED'} cache mode`);
      }

      try {
        const prefetchStart = performance.now();

        // Prefetch folders first (faster)
        if (__DEV__) console.log('[PREFETCH] Step 1: Fetching folders...');
        await api.getFolders();
        if (__DEV__) console.log('[PREFETCH] Step 1 complete: Folders fetched');

        // Then prefetch notes (slower)
        if (__DEV__) console.log('[PREFETCH] Step 2: Fetching notes...');

        // Add 15 second timeout for notes fetch
        // IMPORTANT: Skip background refresh during prefetch to prevent hanging
        const notesFetchPromise = api.getNotes({}, { skipBackgroundRefresh: true });
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Notes fetch timeout after 15 seconds')), 15000);
        });

        await Promise.race([notesFetchPromise, timeoutPromise]);
        if (__DEV__) console.log('[PREFETCH] Step 2 complete: Notes fetched');

        const prefetchEnd = performance.now();
        if (__DEV__) {
          console.log(`[PREFETCH] ✅ Completed in ${(prefetchEnd - prefetchStart).toFixed(2)}ms - cache ready!`);
        }

        logger.recordEvent('notes_prefetch_completed', {
          durationMs: prefetchEnd - prefetchStart,
          cacheMode: cacheDecrypted ? 'decrypted' : 'encrypted',
        });
      } catch (error) {
        // Log error but continue - user can still use app, they'll just fetch on demand
        if (__DEV__) {
          console.error('[PREFETCH] Failed to prefetch notes (non-critical):', error);
        }
        logger.warn('[PREFETCH] Failed to prefetch notes', {
          attributes: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      // Successfully authenticated and cached - update state
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
        logger.error('[ENCRYPTION] Error clearing encryption data on sign out', error as Error, {
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
    loadingStage,
    cacheMode,
    onPasswordSuccess,
    signOut,
    refreshStatus: checkMasterPasswordStatus,
  };
}
