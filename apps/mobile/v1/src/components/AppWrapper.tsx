import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useTheme } from '../theme';
import AuthScreen from '../screens/AuthScreen';
import { MasterPasswordScreen } from './MasterPasswordDialog';
import { useMasterPassword } from '../hooks/useMasterPassword';

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
    onPasswordSuccess,
  } = useMasterPassword();

  const [showLoading, setShowLoading] = useState(false);

  const isLoading = !isLoaded || (isSignedIn && !userLoaded) || (isSignedIn && userLoaded && !user) || (isSignedIn && user && isChecking);

  // Handle loading delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (__DEV__) {
    console.log('AppWrapper Auth status:', {
      isSignedIn,
      isLoaded,
      userLoaded,
      userId: user?.id,
      hasSession: !!user,
      needsUnlock,
      isNewSetup,
      isChecking,
    });
  }

  // Show loading while Clerk initializes, user loads, or checking master password
  if (showLoading) {
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

  // User is signed in - show master password screen or main app
  if (needsUnlock) {
    return (
      <MasterPasswordScreen
        userId={userId || ''}
        isNewSetup={isNewSetup}
        onSuccess={onPasswordSuccess}
      />
    );
  }

  // Show main app
  return <>{children}</>;
};