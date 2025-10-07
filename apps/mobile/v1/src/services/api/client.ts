/**
 * Base HTTP Client
 * Handles authentication and HTTP requests
 */

import { API_BASE_URL } from './utils/constants';
import { ApiError, getUserFriendlyErrorMessage } from './utils/errors';

export type AuthTokenGetter = () => Promise<string | null>;

/**
 * Creates an HTTP client with authentication
 */
export function createHttpClient(getToken: AuthTokenGetter) {
  /**
   * Makes an authenticated API request
   */
  async function makeRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await getToken();

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Log detailed error for development
        if (__DEV__) {
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            endpoint,
          });
        }

        const userMessage = getUserFriendlyErrorMessage(response.status);
        throw new ApiError(userMessage, response.status, errorText);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Log detailed error for development
      if (__DEV__) {
        console.error('API Request Failed:', {
          endpoint,
          error,
        });
      }

      // Re-throw if already an ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        undefined,
        error
      );
    }
  }

  return { makeRequest };
}
