import { StrictMode } from 'react';

import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { createRoot } from 'react-dom/client';

import { Index } from '@/components/common/ErrorBoundary';
import { ThemeProvider } from '@/components/ui/theme-provider';
import {
  CLERK_PUBLISHABLE_KEY,
  STORAGE_KEYS,
  ERROR_MESSAGES,
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
  </StrictMode>
);
