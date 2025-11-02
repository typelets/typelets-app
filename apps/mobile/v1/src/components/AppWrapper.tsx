import { useAuth, useUser } from '@clerk/clerk-expo';
import React, { useEffect, useRef,useState } from 'react';
import { ActivityIndicator,View } from 'react-native';

import { useMasterPassword } from '../hooks/useMasterPassword';
import { logger } from '../lib/logger';
import AuthScreen from '../screens/AuthScreen';
import { MasterPasswordScreen } from '../screens/MasterPasswordScreen';
import { apiCache } from '../services/api/cache';
import { useSyncOnReconnect } from '../services/sync/useSyncOnReconnect';
import { useTheme } from '../theme';

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const theme = useTheme();
  const {
    needsUnlock,
    isNewSetup,
    isChecking,
    userId,
    loadingStage,
    cacheMode,
    onPasswordSuccess,
  } = useMasterPassword();

  const [showLoading, setShowLoading] = useState(false);
  const lastUserIdRef = useRef<string | undefined>(undefined);
  const [userChanging, setUserChanging] = useState(false);

  // Automatically sync pending mutations when device comes back online
  useSyncOnReconnect();

  // Clear API cache on app mount to prevent stale data from previous session
  useEffect(() => {
    apiCache.clearAll();
    if (__DEV__) {
      console.log('[AppWrapper] Cleared API cache on app startup');
    }
  }, []);

  // Detect userId change SYNCHRONOUSLY in render
  if (userId !== lastUserIdRef.current) {
    lastUserIdRef.current = userId;
    if (userId && !userChanging) {
      // User just signed in - block app from rendering
      setUserChanging(true);
    }
  }

  // Clear userChanging flag once master password state is determined
  useEffect(() => {
    if (userChanging && !isChecking) {
      setUserChanging(false);
    }
  }, [userChanging, isChecking]);

  // Simple logic: show loading only for initial Clerk loading, nothing else
  const isLoading = !isLoaded || (isSignedIn && !userLoaded) || (isSignedIn && userLoaded && !user);

  // Handle loading delay
  useEffect(() => {
    let timer: number;
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Track user authentication state in logger and Sentry
  useEffect(() => {
    if (isSignedIn && user?.id) {
      // User is signed in - set user ID and session attributes
      logger.setUserId(user.id);
      logger.setSessionAttributes({
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
        isSignedIn: true,
      });

      logger.info('[AUTH] User signed in', {
        attributes: {
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        },
      });
    } else if (!isSignedIn) {
      // User signed out - clear session
      logger.info('[AUTH] User signed out');
      logger.clearSessionAttributes();
    }
  }, [isSignedIn, user?.id, user?.primaryEmailAddress?.emailAddress, user?.username]);

  // Show loading while Clerk initializes, user loads, or checking master password
  if (showLoading || isChecking) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // If still loading but not showing spinner yet, return empty view
  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background
      }} />
    );
  }

  // Show auth screen if not signed in
  if (!isSignedIn) {
    return <AuthScreen />;
  }

  // User is signed in - check master password state
  // IMPORTANT: If we're checking OR need unlock OR user just changed, show master password screen
  // This prevents notes from loading prematurely
  if (needsUnlock || isChecking || userChanging) {
    return (
      <MasterPasswordScreen
        key={userId} // Force remount when userId changes to reset all state
        userId={userId || ''}
        isNewSetup={isNewSetup}
        loadingStage={loadingStage}
        cacheMode={cacheMode}
        onSuccess={onPasswordSuccess}
      />
    );
  }

  // Only render main app when explicitly unlocked and stable
  return <>{children}</>;
};
