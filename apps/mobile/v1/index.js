import 'expo-router/entry';

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { APP_VERSION } from './src/constants/version';

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
  });

  if (__DEV__) {
    console.log('[Sentry] Agent started successfully');
    console.log('[Sentry] Platform:', Platform.OS);
    console.log('[Sentry] Version:', APP_VERSION);
  }
} else {
  console.warn('[Sentry] DSN not found - Sentry will not be initialized');
}
