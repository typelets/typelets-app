/**
 * Folders API Module
 * Handles all folder-related API operations
 */

import { createHttpClient, AuthTokenGetter } from './client';
import { Folder, FoldersResponse } from './types';
import { fetchAllPages, createPaginationParams } from './utils/pagination';
import { handleApiError } from './utils/errors';

export function createFoldersApi(getToken: AuthTokenGetter) {
  const { makeRequest } = createHttpClient(getToken);

  return {
    /**
     * Get all folders with pagination
     */
    async getFolders(): Promise<Folder[]> {
      try {
        const allFolders = await fetchAllPages<FoldersResponse, Folder>(
          async (page) => {
            const params = createPaginationParams(page);
            return await makeRequest<FoldersResponse>(`/folders?${params.toString()}`);
          },
          (response) => response.folders || []
        );

        return allFolders;
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
