/**
 * Application constants
 */

// App Information
export const APP_NAME =
  (import.meta.env.VITE_APP_NAME as string | undefined) ?? 'Typelets';
export const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// WebSocket Configuration
export const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL as
  | string
  | undefined;

// Storage Keys
export const STORAGE_KEYS = {
  THEME: `${APP_NAME.toLowerCase()}-ui-theme`,
} as const;

// Clerk Config
export const CLERK_CONFIG = {
  publishableKey: CLERK_PUBLISHABLE_KEY,
  afterSignOutUrl: '/',
} as const;

// Index Config
export const SEO_CONFIG = {
  signedOut: {
    title: `Sign In - ${APP_NAME}`,
    description: `Sign in to ${APP_NAME} - your secure, encrypted notes app.`,
    keywords: [
      'sign in',
      'login',
      'encrypted notes',
      'secure notes',
      'typelets',
    ],
  },
  signedIn: {
    title: `${APP_NAME} - Secure Encrypted Notes`,
    description: `Access and manage your encrypted notes securely with ${APP_NAME}.`,
    keywords: [
      'dashboard',
      'encrypted notes',
      'secure writing',
      'typelets',
      'note-taking',
    ],
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  CLERK_KEY_MISSING:
    'Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.',
  ROOT_ELEMENT_MISSING:
    'Failed to find root element. Ensure index.html has a div with id="root".',
} as const;
