/**
 * Base HTTP Client
 * Handles authentication and HTTP requests with cache validation support
 */

import { logger } from '../../lib/logger';
import { API_BASE_URL } from './utils/constants';
import { ApiError, getUserFriendlyErrorMessage } from './utils/errors';

export type AuthTokenGetter = () => Promise<string | null>;

/**
 * Response with cache headers for conditional requests
 */
export interface CachedResponse<T> {
  data: T;
  eTag: string | null;
  lastModified: string | null;
}

/**
 * Custom error for 304 Not Modified responses
 */
export class NotModifiedError extends Error {
  constructor(endpoint: string) {
    super(`Resource not modified: ${endpoint}`);
    this.name = 'NotModifiedError';
  }
}

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

  /**
   * Makes an authenticated API request with cache validation support
   *
   * Supports conditional requests using ETag and Last-Modified headers.
   * Throws NotModifiedError if server returns 304 Not Modified.
   *
   * @param endpoint - API endpoint path
   * @param options - Fetch options
   * @param cacheMetadata - Optional cache metadata for conditional requests
   * @returns Response with cache headers
   */
  async function makeConditionalRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    cacheMetadata?: { eTag?: string | null; lastModified?: string | null }
  ): Promise<CachedResponse<T>> {
    try {
      const token = await getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      // Add conditional request headers if cache metadata provided
      if (cacheMetadata?.eTag) {
        headers['If-None-Match'] = cacheMetadata.eTag;
      }
      if (cacheMetadata?.lastModified) {
        headers['If-Modified-Since'] = cacheMetadata.lastModified;
      }

      // Merge with provided headers
      Object.assign(headers, options.headers);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 304 Not Modified - resource hasn't changed
      if (response.status === 304) {
        throw new NotModifiedError(endpoint);
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Log API error to Sentry with context
        logger.error('[API] Conditional request failed', new Error(`HTTP ${response.status}: ${response.statusText}`), {
          attributes: {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText.substring(0, 500),
            method: options.method || 'GET',
            hadCacheMetadata: !!cacheMetadata,
          },
        });

        const userMessage = getUserFriendlyErrorMessage(response.status);
        throw new ApiError(userMessage, response.status, errorText);
      }

      // Extract cache headers from response
      const eTag = response.headers.get('ETag');
      const lastModified = response.headers.get('Last-Modified');

      const data = await response.json();

      return {
        data: data as T,
        eTag,
        lastModified,
      };
    } catch (error) {
      // Re-throw NotModifiedError as-is
      if (error instanceof NotModifiedError) {
        throw error;
      }

      // Re-throw if already an ApiError (already logged above)
      if (error instanceof ApiError) {
        throw error;
      }

      // Log network/parsing errors to Sentry
      logger.error('[API] Conditional network request failed', error as Error, {
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

  return { makeRequest, makeConditionalRequest };
}
