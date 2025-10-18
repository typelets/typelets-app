/**
 * Folders API Module
 * Handles all folder-related API operations
 */

import { AuthTokenGetter, createHttpClient } from './client';
import { Folder, FoldersResponse } from './types';
import { createPaginationParams, fetchAllPagesParallel } from './utils/pagination';
import { handleApiError } from './utils/errors';

export function createFoldersApi(getToken: AuthTokenGetter) {
  const { makeRequest } = createHttpClient(getToken);

  return {
    /**
     * Get all folders with parallel pagination (optimized for performance)
     * Fetches pages in parallel instead of sequentially, eliminating delays
     */
    async getFolders(): Promise<Folder[]> {
      try {
        return await fetchAllPagesParallel<FoldersResponse, Folder>(
          async (page) => {
            const params = createPaginationParams(page);
            return await makeRequest<FoldersResponse>(
              `/folders?${params.toString()}`
            );
          },
          (response) => response.folders || []
        );
      } catch (error) {
        return handleApiError(error, 'getFolders');
      }
    },

    /**
     * Create a new folder
     */
    async createFolder(name: string, color: string, parentId?: string): Promise<Folder> {
      try {
        return await makeRequest<Folder>('/folders', {
          method: 'POST',
          body: JSON.stringify({ name, color, parentId }),
        });
      } catch (error) {
        return handleApiError(error, 'createFolder');
      }
    },

    /**
     * Update a folder
     */
    async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder> {
      try {
        return await makeRequest<Folder>(`/folders/${folderId}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
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
      } catch (error) {
        return handleApiError(error, 'deleteFolder');
      }
    },
  };
}
