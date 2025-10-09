/**
 * User API Module
 * Handles user-related API operations
 */

import { createHttpClient, type AuthTokenGetter } from './client';
import type { ApiUser } from './types';

export function createUserApi(getToken: AuthTokenGetter) {
  const { makeRequest } = createHttpClient(getToken);

  return {
    /**
     * Get current user with optional usage data
     */
    async getCurrentUser(includeUsage = false): Promise<ApiUser> {
      const endpoint = includeUsage
        ? '/users/me?include_usage=true'
        : '/users/me';
      return makeRequest<ApiUser>(endpoint);
    },
  };
}
