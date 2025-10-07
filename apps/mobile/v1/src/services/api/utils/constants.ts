/**
 * API Constants
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.typelets.com/api';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGES = 50; // Safety limit to prevent infinite loops
export const PAGINATION_DELAY_MS = 100; // Delay between paginated requests

export const ENCRYPTED_MARKER = '[ENCRYPTED]';

// Log API configuration in development
if (__DEV__) {
  console.log('=== API SERVICE CONFIG ===');
  console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
  console.log('Final API_BASE_URL:', API_BASE_URL);
  console.log('========================');
}
