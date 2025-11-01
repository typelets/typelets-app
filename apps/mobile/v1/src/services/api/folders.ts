/**
 * Folders API Module
 * Handles all folder-related API operations with offline-first caching
 */

import { apiCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { AuthTokenGetter, createHttpClient, NotModifiedError } from './client';
import {
  getCachedFolders,
  getCacheMetadata,
  invalidateCache,
  setCacheMetadata,
  storeCachedFolders,
} from './databaseCache';
import { Folder, FoldersResponse } from './types';
import { handleApiError } from './utils/errors';
import { createPaginationParams, fetchAllPagesParallel } from './utils/pagination';

export function createFoldersApi(getToken: AuthTokenGetter) {
  const { makeRequest, makeConditionalRequest } = createHttpClient(getToken);

  return {
    /**
     * Get all folders (offline-first with conditional requests)
     *
     * Strategy:
     * 1. Check local database cache first
     * 2. Make conditional request with ETag/Last-Modified
     * 3. If 304 Not Modified - return cached data (cheap!)
     * 4. If 200 OK - update database and cache metadata
     */
    async getFolders(): Promise<Folder[]> {
      try {
        const resourceType = 'folders';

        // Step 1: Try to get from local database cache
        const cachedFolders = await getCachedFolders();

        // Step 2: Get cache metadata for conditional request
        const cacheMetadata = await getCacheMetadata(resourceType);

        // Step 3: INSTANT RETURN - If we have cached data, return it immediately
        // Then refresh in background (stale-while-revalidate pattern)
        if (cachedFolders.length > 0) {
          if (__DEV__) {
            console.log(`[API] ⚡ Returning ${cachedFolders.length} cached folders instantly`);
          }

          // Refresh cache in background (non-blocking)
          const refreshCache = async () => {
            try {
              const folders = await fetchAllPagesParallel<FoldersResponse, Folder>(
                async (page) => {
                  const params = createPaginationParams(page);
                  // Use makeConditionalRequest for first page only
                  if (page === 1 && cacheMetadata) {
                    const response = await makeConditionalRequest<FoldersResponse>(
                      `/folders?${params.toString()}`,
                      {},
                      { eTag: cacheMetadata.eTag, lastModified: cacheMetadata.lastModified }
                    );

                    // Store cache metadata from response
                    await setCacheMetadata(resourceType, response.eTag, response.lastModified, 10); // 10 min TTL

                    return response.data;
                  }

                  // For subsequent pages, use regular request
                  return await makeRequest<FoldersResponse>(
                    `/folders?${params.toString()}`
                  );
                },
                (response) => response.folders || []
              );

              // Update database cache for next time
              await storeCachedFolders(folders);

              // Also cache in memory for backward compatibility
              apiCache.set(CACHE_KEYS.FOLDERS, folders, CACHE_TTL.FOLDERS);

              if (__DEV__) {
                console.log(`[API] 🔄 Background refresh completed - ${folders.length} folders updated in cache`);
              }
            } catch (error) {
              // Handle 304 Not Modified - cache is already up to date
              if (error instanceof NotModifiedError) {
                if (__DEV__) {
                  console.log(`[API] ✅ Folders cache is up to date (304 Not Modified)`);
                }
                return;
              }

              // Silently fail background refresh - user already has cached data
              if (__DEV__) {
                console.log('[API] Folders background refresh failed (cache still valid):', error);
              }
            }
          };

          // Start background refresh (don't await)
          refreshCache();

          // Return cached data immediately
          return cachedFolders;
        }

        // Step 4: No cache available - wait for API (first load)
        if (__DEV__) {
          console.log('[API] No folders cache available - fetching from server');
        }

        try {
          const folders = await fetchAllPagesParallel<FoldersResponse, Folder>(
            async (page) => {
              const params = createPaginationParams(page);
              // Use makeConditionalRequest for first page only
              if (page === 1 && cacheMetadata) {
                const response = await makeConditionalRequest<FoldersResponse>(
                  `/folders?${params.toString()}`,
                  {},
                  { eTag: cacheMetadata.eTag, lastModified: cacheMetadata.lastModified }
                );

                // Store cache metadata from response
                await setCacheMetadata(resourceType, response.eTag, response.lastModified, 10); // 10 min TTL

                return response.data;
              }

              // For subsequent pages, use regular request
              return await makeRequest<FoldersResponse>(
                `/folders?${params.toString()}`
              );
            },
            (response) => response.folders || []
          );

          // Store folders to database cache
          await storeCachedFolders(folders);

          // Also cache in memory for backward compatibility
          apiCache.set(CACHE_KEYS.FOLDERS, folders, CACHE_TTL.FOLDERS);

          if (__DEV__) {
            console.log(`[API] Fetched ${folders.length} folders from server (first load)`);
          }

          return folders;
        } catch (error) {
          // Handle 304 Not Modified - shouldn't happen on first load
          if (error instanceof NotModifiedError) {
            if (__DEV__) {
              console.log(`[API] Folders not modified (unexpected on first load)`);
            }
            return [];
          }

          // No cache available and API failed
          throw error;
        }
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

        // Invalidate both memory and database caches
        apiCache.clear(CACHE_KEYS.FOLDERS);
        await invalidateCache('folders');

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

        // Invalidate both memory and database caches
        apiCache.clear(CACHE_KEYS.FOLDERS);
        await invalidateCache('folders');

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

        // Invalidate both memory and database caches
        apiCache.clear(CACHE_KEYS.FOLDERS);
        await invalidateCache('folders');
      } catch (error) {
        return handleApiError(error, 'deleteFolder');
      }
    },
  };
}
