import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { ThemeProvider, useTheme } from '@/src/theme';
import { AppWrapper } from '@/src/components/AppWrapper';
import ErrorBoundary from '@/src/components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Environment and release tracking
  environment: __DEV__ ? 'development' : 'production',

  // Performance Monitoring
  tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production

  // Enable automatic profiling
  profilesSampleRate: __DEV__ ? 1.0 : 0.2,

  // Session Replay - disabled for Android compatibility
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,

  // Enable user interaction and native frame tracking
  enableUserInteractionTracing: true,
  enableNativeFramesTracking: true,

  integrations: [
    // Mobile replay disabled temporarily for Android compatibility
    // Sentry.mobileReplayIntegration(),
    Sentry.reactNativeTracingIntegration(),
  ],

  // Enable Logs forwarding to Sentry
  enableLogs: true,

  // Adds more context data to events (IP address, device info, etc.)
  sendDefaultPii: true,

  // Maximum breadcrumbs to keep (default: 100)
  maxBreadcrumbs: 100,

  // Filter and enrich events before sending
  beforeSend(event, hint) {
    // Filter out development errors in production
    if (!__DEV__ && event.exception) {
      const error = hint.originalException;
      // Example: Filter specific errors
      if (error instanceof Error && error.message?.includes('Network request failed')) {
        // Add custom tags for network errors
        event.tags = { ...event.tags, error_type: 'network' };
      }
    }
    return event;
  },

  // Enable debug mode in development
  debug: __DEV__,

  // Enable Spotlight for local debugging (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export const unstable_settings = {
  anchor: '(tabs)',
};

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