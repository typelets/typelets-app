/**
 * API Error Handling Utilities
 */

import { logger } from '../../../lib/logger';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getUserFriendlyErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Authentication failed. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function handleApiError(error: unknown, context: string): never {
  // Log to NewRelic with context
  logger.error(`API error in ${context}`, error as Error, {
    attributes: {
      context,
      errorType: error instanceof Error ? error.name : 'Unknown',
      isApiError: error instanceof ApiError,
      statusCode: error instanceof ApiError ? error.statusCode : undefined,
    },
  });

  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ApiError(error.message, undefined, error);
  }

  throw new ApiError('An unexpected error occurred', undefined, error);
}
