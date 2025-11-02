/**
 * Notes API Module
 * Handles all note-related API operations
 */

import { getDatabase } from '../../lib/database';
import { logger } from '../../lib/logger';
import { getCacheDecryptedContentPreference } from '../../lib/preferences';
import { fileService, type PickedFile } from '../fileService';
import { isOnline } from '../network/networkManager';
import { queueMutation } from '../sync/syncManager';
import { apiCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { AuthTokenGetter, createHttpClient, NotModifiedError } from './client';
import {
  getCachedNotes,
  getCacheMetadata,
  invalidateCache,
  setCacheMetadata,
  storeCachedNotes,
} from './databaseCache';
import { clearEncryptionCache,decryptNote, decryptNotes, encryptNoteForApi } from './encryption';
import { EmptyTrashResponse, FileAttachment, Note, NoteCounts,NoteQueryParams, NotesResponse } from './types';
import { handleApiError } from './utils/errors';
import { createPaginationParams,fetchAllPages } from './utils/pagination';

export function createNotesApi(getToken: AuthTokenGetter, getUserId: () => string | undefined) {
  const { makeRequest, makeConditionalRequest } = createHttpClient(getToken);

  // Initialize fileService with token provider
  fileService.setTokenProvider(getToken);

  /**
   * Helper to invalidate all counts caches and database cache
   * Called whenever notes are created, updated, or deleted
   */
  const invalidateCountsCache = async () => {
    // Clear all counts caches (general and folder-specific)
    apiCache.clearAll(); // This clears all caches including counts

    // Invalidate database cache metadata so next fetch will get fresh data
    await invalidateCache('notes');

    // Also clear the actual cached notes from SQLite so we don't return stale data
    // This ensures the next fetch will show updated notes immediately
    try {
      const db = getDatabase();
      await db.runAsync('DELETE FROM notes');
      if (__DEV__) {
        console.log('[API] Cleared cached notes from database after mutation');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[API] Failed to clear cached notes:', error);
      }
    }
  };

  /**
   * Helper to filter notes locally based on query params
   * Used when we fetch all notes but need to return filtered subset
   */
  const filterNotesLocally = (notes: Note[], params?: NoteQueryParams): Note[] => {
    if (!params) return notes;

    return notes.filter(note => {
      // Filter by folderId
      if (params.folderId !== undefined) {
        if (note.folderId !== params.folderId) return false;
      }

      // Filter by starred
      if (params.starred !== undefined) {
        if (note.starred !== params.starred) return false;
      }

      // Filter by archived
      if (params.archived !== undefined) {
        if (note.archived !== params.archived) return false;
      }

      // Filter by deleted
      if (params.deleted !== undefined) {
        if (note.deleted !== params.deleted) return false;
      }

      return true;
    });
  };

  /**
   * Helper: Calculate counts from database with optimized single query
   * @private
   */
  const calculateCountsFromDatabase = async (
    db: any,
    folderId?: string
  ): Promise<NoteCounts> => {
    if (folderId) {
      // Return only folder counts for subfolder request
      return await calculateFolderCounts(db);
    }

    // Single optimized query for global counts
    const globalResult = await db.getFirstAsync<{
      all_count: number;
      starred_count: number;
      archived_count: number;
      trash_count: number;
    }>(`
      SELECT
        COUNT(CASE WHEN deleted = 0 AND archived = 0 THEN 1 END) as all_count,
        COUNT(CASE WHEN starred = 1 AND deleted = 0 AND archived = 0 THEN 1 END) as starred_count,
        COUNT(CASE WHEN archived = 1 AND deleted = 0 THEN 1 END) as archived_count,
        COUNT(CASE WHEN deleted = 1 THEN 1 END) as trash_count
      FROM notes
    `);

    // Get per-folder counts
    const folders = await calculateFolderCounts(db);

    return {
      all: globalResult?.all_count || 0,
      starred: globalResult?.starred_count || 0,
      archived: globalResult?.archived_count || 0,
      trash: globalResult?.trash_count || 0,
      folders: folders as Record<string, FolderCounts>,
    };
  };

  /**
   * Helper: Calculate per-folder counts
   * @private
   */
  const calculateFolderCounts = async (db: any): Promise<Record<string, FolderCounts> | NoteCounts> => {
    const folderCountsRows = await db.getAllAsync<{
      folder_id: string | null;
      all_count: number;
      starred_count: number;
      archived_count: number;
      trash_count: number;
    }>(`
      SELECT
        folder_id,
        SUM(CASE WHEN deleted = 0 AND archived = 0 THEN 1 ELSE 0 END) as all_count,
        SUM(CASE WHEN starred = 1 AND deleted = 0 AND archived = 0 THEN 1 ELSE 0 END) as starred_count,
        SUM(CASE WHEN archived = 1 AND deleted = 0 THEN 1 ELSE 0 END) as archived_count,
        SUM(CASE WHEN deleted = 1 THEN 1 ELSE 0 END) as trash_count
      FROM notes
      WHERE folder_id IS NOT NULL
      GROUP BY folder_id
    `);

    const result: Record<string, FolderCounts> = {};
    for (const row of folderCountsRows) {
      if (row.folder_id !== null && row.folder_id !== undefined) {
        result[row.folder_id] = {
          all: row.all_count || 0,
          starred: row.starred_count || 0,
          archived: row.archived_count || 0,
          trash: row.trash_count || 0,
        };
      }
    }

    return result;
  };

  return {
    /**
     * Get note counts by category
     *
     * @param folderId - Optional folder ID to get subfolder counts
     * @returns Promise<NoteCounts> - Global counts with folders property, or just folder counts
     *
     * Behavior:
     * - Offline: Calculates from SQLite with 10s cache to prevent recalculation
     * - Online: Fetches from API with 2min cache
     *
     * Note: When folderId is provided, returns dictionary of folder counts.
     *       When omitted, returns global counts plus folders property.
     */
    async getCounts(folderId?: string, forceRefresh?: boolean): Promise<NoteCounts> {
      try {
        // Check if online before fetching
        const online = await isOnline();

        // If offline, calculate from database with short-lived cache
        if (!online) {
          const cacheKey = CACHE_KEYS.COUNTS(folderId);

          // Check short-lived cache to avoid recalculation on rapid re-renders
          // Skip cache if forceRefresh is true (e.g., on app startup to avoid stale data)
          if (!forceRefresh) {
            const cached = apiCache.get<NoteCounts>(cacheKey);
            if (cached) {
              if (__DEV__) {
                console.log('[API] Returning cached offline counts');
              }
              return cached;
            }
          }

          // Calculate counts from local SQLite cache
          if (__DEV__) {
            console.log('[API] Device offline - calculating counts from local cache', { forceRefresh });
          }

          try {
            const db = getDatabase();
            const counts = await calculateCountsFromDatabase(db, folderId);

            // Cache for only 2 seconds - offline counts are "best effort" and may be stale
            // This prevents stale counts from persisting when network comes back online
            // Don't cache if forceRefresh is true to ensure next call gets fresh data
            if (!forceRefresh) {
              apiCache.set(cacheKey, counts, 2_000); // 2s TTL (reduced from 10s)
            }

            return counts;
          } catch (error) {
            console.error('[API] Failed to calculate counts from cache:', error);
            // Return complete error response with all properties
            return folderId
              ? {} as NoteCounts // Empty dictionary for subfolder request
              : { all: 0, starred: 0, archived: 0, trash: 0, folders: {} };
          }
        }

        // Online: Check in-memory cache first (stale-while-revalidate pattern)
        const cacheKey = CACHE_KEYS.COUNTS(folderId);
        const cached = !forceRefresh ? apiCache.get<NoteCounts>(cacheKey) : null;

        if (cached) {
          if (__DEV__) {
            console.log('[API] Returning cached counts, refreshing in background');
          }

          // Return cached data immediately, but refresh in background
          const refreshCounts = async () => {
            try {
              const params = folderId ? `?folder_id=${folderId}` : '';
              const counts = await makeRequest<NoteCounts | null>(`/notes/counts${params}`);
              const result = counts || { all: 0, starred: 0, archived: 0, trash: 0 };

              // Update cache with fresh data
              apiCache.set(cacheKey, result, CACHE_TTL.COUNTS);

              if (__DEV__) {
                console.log('[API] Counts refreshed in background');
              }
            } catch (error) {
              // Silently fail background refresh - user already has cached data
              if (__DEV__) {
                console.log('[API] Background counts refresh failed (cache still valid):', error);
              }
            }
          };

          // Start background refresh (don't await)
          refreshCounts();

          // Return cached data immediately
          return cached;
        }

        // No cache available - fetch from API
        const params = folderId ? `?folder_id=${folderId}` : '';
        const counts = await makeRequest<NoteCounts | null>(`/notes/counts${params}`);

        // Handle null response
        const result = counts || { all: 0, starred: 0, archived: 0, trash: 0 };

        // Cache the result
        apiCache.set(cacheKey, result, CACHE_TTL.COUNTS);

        return result;
      } catch (error) {
        logger.error('[API] Failed to get note counts', error as Error, {
          attributes: { operation: 'getCounts', folderId },
        });
        // Return complete error response with all properties
        return folderId
          ? {} as NoteCounts // Empty dictionary for subfolder request
          : { all: 0, starred: 0, archived: 0, trash: 0, folders: {} };
      }
    },

    /**
     * Get all notes with optional filters (offline-first with conditional requests)
     *
     * Strategy:
     * 1. Check local database cache first
     * 2. Make conditional request with ETag/Last-Modified
     * 3. If 304 Not Modified - return cached data (cheap!)
     * 4. If 200 OK - update database and cache metadata
     */
    async getNotes(params?: NoteQueryParams, options?: { skipBackgroundRefresh?: boolean }): Promise<Note[]> {
      try {
        const userId = getUserId();

        // Build cache key based on query params
        const resourceType = 'notes';
        const cacheFilters = {
          folderId: params?.folderId as string | undefined,
          starred: params?.starred as boolean | undefined,
          archived: params?.archived as boolean | undefined,
          deleted: params?.deleted as boolean | undefined,
        };

        // Step 1: Try to get from local database cache
        const cachedNotes = await getCachedNotes(cacheFilters);

        if (__DEV__) {
          console.log(`[API] Cache check: found ${cachedNotes.length} notes with filters:`, cacheFilters);
        }

        // Step 2: Get cache metadata for conditional request
        const cacheMetadata = await getCacheMetadata(resourceType);

        // Step 3: INSTANT RETURN - If we have cached data, return it immediately
        // Then refresh in background (stale-while-revalidate pattern)
        if (cachedNotes.length > 0) {
          if (__DEV__) {
            console.log(`[API] ⚡ Returning ${cachedNotes.length} cached notes instantly`);
          }

          // Skip background refresh if requested (e.g., during prefetch)
          if (options?.skipBackgroundRefresh) {
            if (__DEV__) {
              console.log(`[API] Skipping background refresh (skipBackgroundRefresh=true)`);
            }
            return cachedNotes;
          }

          // Refresh cache in background (non-blocking)
          const refreshCache = async () => {
            // Skip refresh if offline
            const online = await isOnline();
            if (!online) {
              if (__DEV__) {
                console.log('[API] Device offline - skipping notes background refresh');
              }
              return;
            }

            try {
              const allNotes = await fetchAllPages<NotesResponse, Note>(
                async (page) => {
                  const searchParams = createPaginationParams(page, params as Record<string, string | boolean | undefined>);
                  // Use makeConditionalRequest for first page only
                  if (page === 1 && cacheMetadata) {
                    const response = await makeConditionalRequest<NotesResponse>(
                      `/notes?${searchParams.toString()}`,
                      {},
                      { eTag: cacheMetadata.eTag, lastModified: cacheMetadata.lastModified }
                    );

                    // Store cache metadata from response
                    await setCacheMetadata(resourceType, response.eTag, response.lastModified, 5); // 5 min TTL

                    return response.data;
                  }

                  // For subsequent pages, use regular request
                  return await makeRequest<NotesResponse>(`/notes?${searchParams.toString()}`);
                },
                (response) => response.notes || []
              );

              // Check if user wants decrypted content cached for instant loading
              const cacheDecrypted = await getCacheDecryptedContentPreference();

              if (cacheDecrypted && userId) {
                // Decrypt notes before caching (for instant loading next time)
                const decryptedNotes = await decryptNotes(allNotes, userId);
                await storeCachedNotes(decryptedNotes, { storeDecrypted: true });

                if (__DEV__) {
                  console.log(`[API] 🔄 Background refresh completed - ${decryptedNotes.length} notes cached (DECRYPTED)`);
                }
              } else {
                // Store encrypted only
                await storeCachedNotes(allNotes, { storeDecrypted: false });

                if (__DEV__) {
                  console.log(`[API] 🔄 Background refresh completed - ${allNotes.length} notes cached (encrypted)`);
                }
              }
            } catch (error) {
              // Handle 304 Not Modified - cache is already up to date
              if (error instanceof NotModifiedError) {
                if (__DEV__) {
                  console.log(`[API] ✅ Cache is up to date (304 Not Modified)`);
                }
                return;
              }

              // Silently fail background refresh - user already has cached data
              if (__DEV__) {
                console.log('[API] Background refresh failed (cache still valid):', error);
              }
            }
          };

          // Start background refresh (don't await)
          refreshCache();

          // Return cached data immediately
          // Notes marked as [ENCRYPTED] will be decrypted by UI layer in batches
          return cachedNotes;
        }

        // Step 4: No cache available - check if online before fetching
        const online = await isOnline();
        if (!online) {
          if (__DEV__) {
            console.log('[API] Device offline and no cache available - returning empty array');
          }
          // Device is offline and no cache available - return empty array
          // This is a first-time user or cache was cleared
          return [];
        }

        if (__DEV__) {
          console.log('[API] No cache available - fetching ALL notes from server to populate cache');
        }

        // IMPORTANT: On first load, fetch ALL notes without filters to fully populate cache
        // This ensures cache has all notes regardless of which view user opens first
        const allNotes = await fetchAllPages<NotesResponse, Note>(
          async (page) => {
            // Fetch without filters to get ALL notes
            const searchParams = createPaginationParams(page, {} as Record<string, string | boolean | undefined>);
            return await makeRequest<NotesResponse>(`/notes?${searchParams.toString()}`);
          },
          (response) => response.notes || []
        );

        if (__DEV__) {
          console.log(`[API] Fetched ${allNotes.length} total notes from server (first load)`);
        }

        // Check if user wants decrypted content cached for instant loading
        const cacheDecrypted = await getCacheDecryptedContentPreference();

        if (cacheDecrypted && userId) {
          // Decrypt ALL notes before caching (for instant loading next time)
          const decryptedNotes = await decryptNotes(allNotes, userId);
          await storeCachedNotes(decryptedNotes, { storeDecrypted: true });

          if (__DEV__) {
            console.log(`[API] Stored ${decryptedNotes.length} notes to cache (DECRYPTED)`);
          }

          // Filter decrypted notes locally to match requested view
          const filteredNotes = filterNotesLocally(decryptedNotes, params);

          if (__DEV__) {
            console.log(`[API] Returning ${filteredNotes.length} filtered notes for current view (first load, cached DECRYPTED)`);
          }

          // Return decrypted and filtered notes
          return filteredNotes;
        } else {
          // Store encrypted only
          await storeCachedNotes(allNotes, { storeDecrypted: false });

          if (__DEV__) {
            console.log(`[API] Stored ${allNotes.length} notes to cache (encrypted only)`);
          }

          // Filter notes locally to match requested view
          const filteredNotes = filterNotesLocally(allNotes, params);

          if (__DEV__) {
            console.log(`[API] Returning ${filteredNotes.length} filtered notes for current view (first load, cached encrypted)`);
          }

          // Return filtered notes (still encrypted) - lazy decryption happens in UI layer
          return filteredNotes;
        }
      } catch (error) {
        // Handle 304 Not Modified - shouldn't happen on first load but just in case
        if (error instanceof NotModifiedError) {
          if (__DEV__) {
            console.log(`[API] Notes not modified (unexpected on first load)`);
          }
          return [];
        }

        return handleApiError(error, 'getNotes');
      }
    },

    /**
     * Get a single note by ID (with offline support)
     */
    async getNote(noteId: string): Promise<Note> {
      try {
        const userId = getUserId();

        // Check if device is online
        const online = await isOnline();

        if (!online) {
          // OFFLINE MODE - Get note from local database
          if (__DEV__) {
            console.log(`[API] Device offline - fetching note ${noteId} from local database`);
          }

          const db = getDatabase();
          const row = await db.getFirstAsync<any>(
            'SELECT * FROM notes WHERE id = ?',
            [noteId]
          );

          if (!row) {
            throw new Error('Note not found in local database');
          }

          // Convert database row to Note object
          const note: Note = {
            id: row.id,
            title: row.title,
            content: row.content,
            folderId: row.folder_id || undefined,
            userId: row.user_id,
            starred: Boolean(row.starred),
            archived: Boolean(row.archived),
            deleted: Boolean(row.deleted),
            hidden: Boolean(row.hidden),
            hiddenAt: row.hidden_at || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            encryptedTitle: row.encrypted_title || undefined,
            encryptedContent: row.encrypted_content || undefined,
            iv: row.iv || undefined,
            salt: row.salt || undefined,
          };

          // Decrypt if needed (note already has decrypted content from database)
          if (userId && !note.title && note.encryptedTitle) {
            return await decryptNote(note, userId);
          }

          return note;
        }

        // ONLINE MODE - Fetch from API
        const note = await makeRequest<Note>(`/notes/${noteId}`);

        // Decrypt note if we have a user ID
        if (userId) {
          return await decryptNote(note, userId);
        }

        return note;
      } catch (error) {
        return handleApiError(error, 'getNote');
      }
    },

    /**
     * Create a new note (with offline support)
     */
    async createNote(note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Note> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required for note creation');
        }

        const title = note.title || 'Untitled';
        const content = note.content || '';

        // Encrypt the note data
        const encryptedData = await encryptNoteForApi(userId, title, content);

        // Create the payload with encrypted data
        const notePayload = {
          ...note,
          ...encryptedData,
        };

        // Check if device is online
        const online = await isOnline();

        if (!online) {
          // OFFLINE MODE - Create optimistic note and queue for sync
          if (__DEV__) {
            console.log('[API] Device offline - creating note optimistically');
          }

          // Generate temporary ID for offline note
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const now = new Date().toISOString();

          // Create optimistic note object
          const optimisticNote: Note = {
            id: tempId,
            userId,
            title,
            content,
            folderId: note.folderId,
            starred: note.starred ?? false,
            archived: note.archived ?? false,
            deleted: note.deleted ?? false,
            hidden: note.hidden ?? false,
            hiddenAt: note.hiddenAt ?? null,
            createdAt: now,
            updatedAt: now,
            // Store encrypted data
            encryptedTitle: encryptedData.encryptedTitle,
            encryptedContent: encryptedData.encryptedContent,
            iv: encryptedData.iv,
            salt: encryptedData.salt,
          };

          // Store note in local database
          const db = getDatabase();
          await db.runAsync(
            `INSERT INTO notes (
              id, title, content, folder_id, user_id, starred, archived, deleted, hidden, hidden_at,
              created_at, updated_at, encrypted_title, encrypted_content, iv, salt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              optimisticNote.id,
              optimisticNote.title,
              optimisticNote.content,
              optimisticNote.folderId ?? null,
              optimisticNote.userId,
              optimisticNote.starred ? 1 : 0,
              optimisticNote.archived ? 1 : 0,
              optimisticNote.deleted ? 1 : 0,
              optimisticNote.hidden ? 1 : 0,
              optimisticNote.hiddenAt ?? null,
              optimisticNote.createdAt,
              optimisticNote.updatedAt,
              optimisticNote.encryptedTitle ?? null,
              optimisticNote.encryptedContent ?? null,
              optimisticNote.iv ?? null,
              optimisticNote.salt ?? null,
            ]
          );

          // Queue mutation for later sync
          await queueMutation('note', tempId, 'create', notePayload);

          if (__DEV__) {
            console.log(`[API] Offline note created: ${tempId}`);
          }

          // Invalidate counts cache to show updated counts immediately
          invalidateCountsCache();

          // Return optimistic note
          return optimisticNote;
        }

        // ONLINE MODE - Normal API call
        const createdNote = await makeRequest<Note>('/notes', {
          method: 'POST',
          body: JSON.stringify(notePayload),
        });

        // Clear encryption cache since we created a new note
        clearEncryptionCache(userId);

        // Decrypt and return the created note
        const decryptedNote = await decryptNote(createdNote, userId);

        // Invalidate counts cache
        invalidateCountsCache();

        // Log successful note creation
        logger.recordEvent('note_created', {
          noteId: createdNote.id,
          hasTitle: !!note.title,
          contentLength: content.length,
          encrypted: true,
        });

        return decryptedNote;
      } catch (error) {
        logger.error('[API] Failed to create note', error as Error, {
          attributes: {
            operation: 'createNote',
            hasTitle: !!note.title,
          },
        });
        throw error;
      }
    },

    /**
     * Update an existing note (with offline support)
     */
    async updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required for note update');
        }

        let updatePayload: Partial<Note> = { ...updates };

        // If updating title or content, encrypt them
        if (updates.title !== undefined || updates.content !== undefined) {
          const title = updates.title || '';
          const content = updates.content || '';

          const encryptedData = await encryptNoteForApi(userId, title, content);

          updatePayload = {
            ...updates,
            ...encryptedData,
          };
        }

        // Check if device is online
        const online = await isOnline();

        console.log(`[API] 🔌 Network check: ${online ? 'ONLINE' : '⚠️ OFFLINE'} - updateNote(${noteId})`);

        if (!online) {
          // OFFLINE MODE - Update locally and queue for sync
          console.log(`[API] ⚠️⚠️⚠️ OFFLINE MODE - Updating note locally: ${noteId}`);
          if (__DEV__) {
            console.log('[API] Device offline - updating note optimistically');
          }

          const db = getDatabase();

          // Get current note from database
          const existingNote = await db.getFirstAsync<any>(
            'SELECT * FROM notes WHERE id = ?',
            [noteId]
          );

          if (!existingNote) {
            throw new Error('Note not found in local database');
          }

          // Build update query dynamically based on what fields are being updated
          const updateFields: string[] = [];
          const updateValues: any[] = [];

          if (updates.title !== undefined) {
            updateFields.push('title = ?', 'encrypted_title = ?');
            updateValues.push(updates.title, updatePayload.encryptedTitle);
          }
          if (updates.content !== undefined) {
            updateFields.push('content = ?', 'encrypted_content = ?');
            updateValues.push(updates.content, updatePayload.encryptedContent);
          }
          if (updates.folderId !== undefined) {
            updateFields.push('folder_id = ?');
            updateValues.push(updates.folderId);
          }
          if (updates.starred !== undefined) {
            updateFields.push('starred = ?');
            updateValues.push(updates.starred ? 1 : 0);
          }
          if (updates.archived !== undefined) {
            updateFields.push('archived = ?');
            updateValues.push(updates.archived ? 1 : 0);
          }
          if (updates.deleted !== undefined) {
            updateFields.push('deleted = ?');
            updateValues.push(updates.deleted ? 1 : 0);
          }
          if (updates.hidden !== undefined) {
            updateFields.push('hidden = ?');
            updateValues.push(updates.hidden ? 1 : 0);
          }
          // Update iv and salt from encrypted payload (not updates)
          if (updatePayload.iv !== undefined) {
            updateFields.push('iv = ?');
            updateValues.push(updatePayload.iv);
          }
          if (updatePayload.salt !== undefined) {
            updateFields.push('salt = ?');
            updateValues.push(updatePayload.salt);
          }

          // Always update updatedAt timestamp
          updateFields.push('updated_at = ?');
          updateValues.push(new Date().toISOString());

          // Add noteId for WHERE clause
          updateValues.push(noteId);

          // Update note in local database
          await db.runAsync(
            `UPDATE notes SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
          );

          // Queue mutation for later sync
          await queueMutation('note', noteId, 'update', updatePayload);

          if (__DEV__) {
            console.log(`[API] Updated offline note ${noteId} and queued for sync`);
          }

          // Invalidate counts cache (in case starred/archived/folder status changed)
          invalidateCountsCache();

          // Get updated note from database
          const updatedLocalNote = await db.getFirstAsync<any>(
            'SELECT * FROM notes WHERE id = ?',
            [noteId]
          );

          // Convert database row to Note object and return
          return {
            id: updatedLocalNote.id,
            userId: updatedLocalNote.user_id,
            title: updatedLocalNote.title,
            content: updatedLocalNote.content,
            folderId: updatedLocalNote.folder_id,
            starred: updatedLocalNote.starred === 1,
            archived: updatedLocalNote.archived === 1,
            deleted: updatedLocalNote.deleted === 1,
            hidden: updatedLocalNote.hidden === 1,
            hiddenAt: updatedLocalNote.hidden_at,
            createdAt: updatedLocalNote.created_at,
            updatedAt: updatedLocalNote.updated_at,
            encryptedTitle: updatedLocalNote.encrypted_title,
            encryptedContent: updatedLocalNote.encrypted_content,
            iv: updatedLocalNote.iv,
            salt: updatedLocalNote.salt,
          };
        }

        // ONLINE MODE - Normal API call
        const updatedNote = await makeRequest<Note>(`/notes/${noteId}`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload),
        });

        // Clear encryption cache since we updated a note
        clearEncryptionCache(userId);

        // Decrypt and return the updated note
        const decryptedNote = await decryptNote(updatedNote, userId);

        // Invalidate counts cache (in case starred/archived status changed)
        invalidateCountsCache();

        // Log successful note update
        logger.recordEvent('note_updated', {
          noteId,
          updatedFields: Object.keys(updates),
        });

        return decryptedNote;
      } catch (error) {
        logger.error('[API] Failed to update note', error as Error, {
          attributes: {
            operation: 'updateNote',
            noteId,
            updatedFields: Object.keys(updates),
          },
        });
        throw error;
      }
    },

    /**
     * Delete a note (with offline support)
     */
    async deleteNote(noteId: string): Promise<void> {
      try {
        // Check if device is online
        const online = await isOnline();

        if (!online) {
          // OFFLINE MODE - Mark as deleted locally and queue for sync
          if (__DEV__) {
            console.log('[API] Device offline - deleting note optimistically');
          }

          const db = getDatabase();

          // Mark note as deleted in local database
          await db.runAsync(
            'UPDATE notes SET deleted = 1, updated_at = ? WHERE id = ?',
            [new Date().toISOString(), noteId]
          );

          // Queue mutation for later sync
          await queueMutation('note', noteId, 'delete', {});

          if (__DEV__) {
            console.log(`[API] Marked offline note ${noteId} as deleted and queued for sync`);
          }

          // Invalidate counts cache to show updated counts immediately
          invalidateCountsCache();

          return;
        }

        // ONLINE MODE - Normal API call
        await makeRequest<void>(`/notes/${noteId}`, {
          method: 'DELETE',
        });

        // Invalidate counts cache
        invalidateCountsCache();
      } catch (error) {
        return handleApiError(error, 'deleteNote');
      }
    },

    /**
     * Hide a note
     */
    async hideNote(noteId: string): Promise<Note> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required');
        }

        const note = await makeRequest<Note>(`/notes/${noteId}/hide`, {
          method: 'POST',
        });

        // Invalidate counts cache
        invalidateCountsCache();

        return await decryptNote(note, userId);
      } catch (error) {
        return handleApiError(error, 'hideNote');
      }
    },

    /**
     * Unhide a note
     */
    async unhideNote(noteId: string): Promise<Note> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required');
        }

        const note = await makeRequest<Note>(`/notes/${noteId}/unhide`, {
          method: 'POST',
        });

        // Invalidate counts cache
        invalidateCountsCache();

        return await decryptNote(note, userId);
      } catch (error) {
        return handleApiError(error, 'unhideNote');
      }
    },

    /**
     * Empty trash (permanently delete all trashed notes)
     */
    async emptyTrash(): Promise<EmptyTrashResponse> {
      try {
        const result = await makeRequest<EmptyTrashResponse>('/notes/empty-trash', {
          method: 'DELETE',
        });

        // Invalidate counts cache
        invalidateCountsCache();

        return result;
      } catch (error) {
        return handleApiError(error, 'emptyTrash');
      }
    },

    /**
     * Get note counts for home screen (optimized - no note data fetched)
     * Results are cached for 2 minutes to reduce redundant API calls
     */
    async getNoteCounts(): Promise<NoteCounts> {
      try {
        // Check cache first
        const cacheKey = CACHE_KEYS.COUNTS();
        const cached = apiCache.get<NoteCounts>(cacheKey);
        if (cached) {
          return cached;
        }

        // Fetch from API if not cached
        const counts = await makeRequest<NoteCounts>('/notes/counts');

        // Cache the result
        apiCache.set(cacheKey, counts, CACHE_TTL.COUNTS);

        return counts;
      } catch (error) {
        return handleApiError(error, 'getNoteCounts');
      }
    },

    /**
     * Pick files from device
     */
    async pickFiles(): Promise<PickedFile[]> {
      try {
        return await fileService.pickFiles();
      } catch (error) {
        logger.error('[API] Failed to pick files', error as Error, {
          attributes: { operation: 'pickFiles' },
        });
        throw error;
      }
    },

    /**
     * Upload files to a note
     */
    async uploadFiles(
      noteId: string,
      files: PickedFile[],
      onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
    ): Promise<FileAttachment[]> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required for file upload');
        }

        const uploadedFiles = await fileService.uploadFiles(noteId, files, userId, onProgress);

        logger.recordEvent('files_uploaded', {
          noteId,
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
        });

        return uploadedFiles;
      } catch (error) {
        logger.error('[API] Failed to upload files', error as Error, {
          attributes: {
            operation: 'uploadFiles',
            noteId,
            fileCount: files.length,
          },
        });
        throw error;
      }
    },

    /**
     * Get attachments for a note
     */
    async getAttachments(noteId: string): Promise<FileAttachment[]> {
      try {
        return await fileService.getAttachments(noteId);
      } catch (error) {
        logger.error('[API] Failed to get attachments', error as Error, {
          attributes: { operation: 'getAttachments', noteId },
        });
        throw error;
      }
    },

    /**
     * Download and decrypt a file attachment
     */
    async downloadFile(attachment: FileAttachment): Promise<string> {
      try {
        const userId = getUserId();
        if (!userId) {
          throw new Error('User ID required for file download');
        }

        const fileUri = await fileService.downloadFile(attachment, userId);

        logger.recordEvent('file_downloaded', {
          fileId: attachment.id,
          fileName: attachment.originalName,
          fileSize: attachment.size,
        });

        return fileUri;
      } catch (error) {
        logger.error('[API] Failed to download file', error as Error, {
          attributes: {
            operation: 'downloadFile',
            fileId: attachment.id,
          },
        });
        throw error;
      }
    },

    /**
     * Share a downloaded file
     */
    async shareFile(fileUri: string): Promise<void> {
      try {
        await fileService.shareFile(fileUri);
        logger.recordEvent('file_shared', { fileUri });
      } catch (error) {
        logger.error('[API] Failed to share file', error as Error, {
          attributes: { operation: 'shareFile' },
        });
        throw error;
      }
    },

    /**
     * Delete a file attachment
     */
    async deleteAttachment(attachmentId: string): Promise<void> {
      try {
        await fileService.deleteFile(attachmentId);

        logger.recordEvent('file_deleted', {
          fileId: attachmentId,
        });
      } catch (error) {
        logger.error('[API] Failed to delete attachment', error as Error, {
          attributes: {
            operation: 'deleteAttachment',
            fileId: attachmentId,
          },
        });
        throw error;
      }
    },

    /**
     * Format file size for display
     */
    formatFileSize: (bytes: number) => fileService.formatFileSize(bytes),

    /**
     * Get file icon emoji based on MIME type
     */
    getFileIcon: (mimeType: string) => fileService.getFileIcon(mimeType),
  };
}
