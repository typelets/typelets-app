import { StrictMode } from 'react';

import { ClerkProvider } from '@clerk/clerk-react';
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

createRoot(rootElement).render(
  <StrictMode>
    <Index>
      <UnheadProvider head={head}>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
          <ThemeProvider defaultTheme="system" storageKey={STORAGE_KEYS.THEME}>
            <App />
          </ThemeProvider>
        </ClerkProvider>
      </UnheadProvider>
    </Index>
  </StrictMode>
);
