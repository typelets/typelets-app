/**
 * Base HTTP Client
 * Handles authentication and HTTP requests
 */

import { logger } from '../../lib/logger';
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

        // Log API error to Sentry with context
        logger.error('[API] Request failed', new Error(`HTTP ${response.status}: ${response.statusText}`), {
          attributes: {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText.substring(0, 500), // Limit error body length
            method: options.method || 'GET',
          },
        });

        const userMessage = getUserFriendlyErrorMessage(response.status);
        throw new ApiError(userMessage, response.status, errorText);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // Re-throw if already an ApiError (already logged above)
      if (error instanceof ApiError) {
        throw error;
      }

      // Log network/parsing errors to Sentry
      logger.error('[API] Network request failed', error as Error, {
        attributes: {
          endpoint,
          errorType: error instanceof Error ? error.name : 'Unknown',
          method: options.method || 'GET',
        },
      });

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
