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

// Sentry Configuration
export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as
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
    title: 'Sign In',
    description: 'Sign in to Typelets - your secure, encrypted notes app with zero-knowledge privacy.',
    keywords: [
      'sign in',
      'login',
      'encrypted notes',
      'secure notes',
      'typelets',
    ],
  },
  signedIn: {
    title: 'Workspace',
    description: 'Secure encrypted workspace with documents, spreadsheets, diagrams, and code execution. Zero-knowledge privacy. Available on iOS, Android, and Web.',
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
