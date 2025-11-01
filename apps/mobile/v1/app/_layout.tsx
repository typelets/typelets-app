import 'react-native-reanimated';

import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppWrapper } from '@/src/components/AppWrapper';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { initializeDatabase } from '@/src/lib/database';
import { ThemeProvider, useTheme } from '@/src/theme';


const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';


function NavigationContent() {
  const theme = useTheme();

  // Create custom navigation theme with app colors
  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      card: theme.colors.card,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.background,
      card: theme.colors.card,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <NavigationThemeProvider value={theme.isDark ? customDarkTheme : customLightTheme}>
            <ErrorBoundary>
              <AppWrapper>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background },
                    animation: 'slide_from_right',
                  }}
                >
              <Stack.Screen
                name="index"
                options={{ contentStyle: { backgroundColor: theme.colors.background } }}
              />
              <Stack.Screen
                name="folder-notes"
                options={{ contentStyle: { backgroundColor: theme.colors.background } }}
              />
              <Stack.Screen
                name="view-note"
                options={{ contentStyle: { backgroundColor: theme.colors.background } }}
              />
              <Stack.Screen
                name="edit-note"
                options={{
                  contentStyle: { backgroundColor: theme.colors.background },
                  animation: 'fade',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{ contentStyle: { backgroundColor: theme.colors.background } }}
              />
                </Stack>
              </AppWrapper>
            </ErrorBoundary>
            <StatusBar style={theme.isDark ? 'light' : 'dark'} />
          </NavigationThemeProvider>
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  return (
    <ThemeProvider>
      <NavigationContent />
    </ThemeProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  if (__DEV__) {
    console.log('=== MOBILE V1 APP WITH CLERK ===');
    console.log('Clerk key loaded:', clerkPublishableKey ? 'YES' : 'NO');
  }

  // Initialize SQLite database on app start
  // Works in Expo Go and custom builds!
  useEffect(() => {
    initializeDatabase()
      .then(() => {
        console.log('[App] ✅ SQLite database initialized - offline caching enabled');
      })
      .catch((error) => {
        console.error('[App] ❌ Failed to initialize SQLite database:', error);
      });
  }, []);

  // If no Clerk key, show error
  if (!clerkPublishableKey) {
    if (__DEV__) {
      console.warn('No Clerk key - please add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env');
    }
    return <AppContent />; // Still run the app but without auth
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AppContent />
      </ClerkLoaded>
    </ClerkProvider>
  );
});