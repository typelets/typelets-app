// Install crypto polyfills FIRST (before any other imports that might need Buffer)
// Try to install crypto polyfills if available (optional optimization)
// Falls back to node-forge in encryption modules if not available
try {
  const quickCrypto = require('react-native-quick-crypto');
  if (quickCrypto && quickCrypto.install) {
    quickCrypto.install();
    console.log('[Crypto] ✅ Native crypto polyfills installed (fast encryption enabled)');
  }
} catch (error) {
  console.log('[Crypto] ⚠️ Native crypto not available on iOS, using node-forge fallback (slower but works)');
}

import 'react-native-reanimated';

import { ClerkLoaded, ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppWrapper } from '@/src/components/AppWrapper';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import { APP_VERSION } from '@/src/constants/version';
import { useOrientationLock } from '@/src/hooks/useOrientationLock';
import { initializeDatabase } from '@/src/lib/database';
import { ThemeProvider, useTheme } from '@/src/theme';

// Initialize Sentry for error tracking and performance monitoring
const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Performance Monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
    // Environment
    environment: __DEV__ ? 'development' : 'production',
    // Release tracking
    release: `typelets-mobile@${APP_VERSION}`,
    dist: APP_VERSION,
    // Enable native crash handling
    enableNative: true,
    // Enable automatic session tracking
    enableAutoSessionTracking: true,
    // Session timeout (30 minutes = 1,800,000ms)
    sessionTrackingIntervalMillis: 1800000,
    // Enable native profiling (iOS)
    enableNativeProfiling: Platform.OS === 'ios',
    // Enable automatic performance tracing
    enableAutoPerformanceTracing: true,
    // Enable structured logs (required for Sentry.logger.* API)
    enableLogs: true,
  });

  if (__DEV__) {
    console.log('[Sentry] Agent started successfully');
    console.log('[Sentry] Platform:', Platform.OS);
    console.log('[Sentry] Version:', APP_VERSION);
  }
} else {
  console.warn('[Sentry] DSN not found - Sentry will not be initialized');
}

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';


function NavigationContent() {
  const theme = useTheme();

  // Sync iOS appearance with app theme (for native components like GlassView)
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (theme.themeMode === 'system') {
        Appearance.setColorScheme(null);
      } else {
        Appearance.setColorScheme(theme.isDark ? 'dark' : 'light');
      }
    }
  }, [theme.isDark, theme.themeMode]);

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

  // Lock orientation based on device type (phones: portrait only, tablets: all)
  useOrientationLock();

  // Initialize SQLite database on app start
  // Works in Expo Go and custom builds!
  useEffect(() => {
    initializeDatabase()
      .then(() => {
        console.log('[App] SQLite database initialized - offline caching enabled');
      })
      .catch((error) => {
        console.error('[App] Failed to initialize SQLite database:', error);
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
