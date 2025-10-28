/**
 * Folders API Module
 * Handles all folder-related API operations
 */

import { apiCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { AuthTokenGetter, createHttpClient } from './client';
import { Folder, FoldersResponse } from './types';
import { handleApiError } from './utils/errors';
import { createPaginationParams, fetchAllPagesParallel } from './utils/pagination';

export function createFoldersApi(getToken: AuthTokenGetter) {
  const { makeRequest } = createHttpClient(getToken);

  return {
    /**
     * Get all folders with parallel pagination (optimized for performance)
     * Fetches pages in parallel instead of sequentially, eliminating delays
     * Results are cached for 5 minutes to reduce redundant API calls
     */
    async getFolders(): Promise<Folder[]> {
      try {
        // Check cache first
        const cached = apiCache.get<Folder[]>(CACHE_KEYS.FOLDERS);
        if (cached) {
          return cached;
        }

        // Fetch from API if not cached
        const folders = await fetchAllPagesParallel<FoldersResponse, Folder>(
          async (page) => {
            const params = createPaginationParams(page);
            return await makeRequest<FoldersResponse>(
              `/folders?${params.toString()}`
            );
          },
          (response) => response.folders || []
        );

        // Cache the result
        apiCache.set(CACHE_KEYS.FOLDERS, folders, CACHE_TTL.FOLDERS);

        return folders;
      } catch (error) {
        return handleApiError(error, 'getFolders');
      }
    },

    /**
     * Create a new folder
     */
    async createFolder(name: string, color: string, parentId?: string): Promise<Folder> {
      try {
        const folder = await makeRequest<Folder>('/folders', {
          method: 'POST',
          body: JSON.stringify({ name, color, parentId }),
        });

        // Invalidate folders cache
        apiCache.clear(CACHE_KEYS.FOLDERS);

        return folder;
      } catch (error) {
        return handleApiError(error, 'createFolder');
      }
    },

    /**
     * Update a folder
     */
    async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder> {
      try {
        const folder = await makeRequest<Folder>(`/folders/${folderId}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });

        // Invalidate folders cache
        apiCache.clear(CACHE_KEYS.FOLDERS);

        return folder;
      } catch (error) {
        return handleApiError(error, 'updateFolder');
      }
    },

    /**
     * Delete a folder
     */
    async deleteFolder(folderId: string): Promise<void> {
      try {
        await makeRequest<void>(`/folders/${folderId}`, {
          method: 'DELETE',
        });

        // Invalidate folders cache
        apiCache.clear(CACHE_KEYS.FOLDERS);
      } catch (error) {
        return handleApiError(error, 'deleteFolder');
      }
    },
  };
}
