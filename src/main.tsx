import { StrictMode } from 'react';

import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';

import { Index } from '@/components/common/ErrorBoundary';
import { ThemeProvider } from '@/components/ui/theme-provider';
import {
  CLERK_PUBLISHABLE_KEY,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SENTRY_DSN,
} from '@/constants';

import App from './App';

import './index.css';

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(ERROR_MESSAGES.CLERK_KEY_MISSING);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error(ERROR_MESSAGES.ROOT_ELEMENT_MISSING);
}

// Initialize Sentry for error tracking
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask sensitive text by default for privacy
        maskAllText: true,
        // Block media to reduce replay size
        blockAllMedia: true,
        // Unmask specific elements if needed using data-sentry-unmask attribute
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: 0.1, // Sample 10% of sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
    // Environment
    environment: import.meta.env.MODE,
    // Release tracking
    release: `typelets@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
    // Send default PII (user IP, etc.)
    sendDefaultPii: true,
    // Ignore common non-critical errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  });
  // Expose Sentry to window for testing (development only)
  if (import.meta.env.DEV) {
    (window as typeof window & { Sentry: typeof Sentry }).Sentry = Sentry;
  }
}

const head = createHead();

// Configure React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Cache kept for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
      retry: 1, // Retry failed requests once
    },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="mb-2 text-xl font-semibold text-red-900">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-red-700">
              {(error as Error)?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={resetError}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      showDialog={import.meta.env.DEV}
    >
      <Index>
        <QueryClientProvider client={queryClient}>
          <UnheadProvider head={head}>
            <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
              <ThemeProvider defaultTheme="system" storageKey={STORAGE_KEYS.THEME}>
                <App />
              </ThemeProvider>
            </ClerkProvider>
          </UnheadProvider>
        </QueryClientProvider>
      </Index>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
