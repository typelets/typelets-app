/**
 * Notes API Module
 * Handles all note-related API operations
 */

import { logger } from '../../lib/logger';
import { fileService, type PickedFile } from '../fileService';
import { apiCache, CACHE_KEYS, CACHE_TTL } from './cache';
import { AuthTokenGetter,createHttpClient } from './client';
import { clearEncryptionCache,decryptNote, decryptNotes, encryptNoteForApi } from './encryption';
import { EmptyTrashResponse, FileAttachment, Note, NoteCounts,NoteQueryParams, NotesResponse } from './types';
import { handleApiError } from './utils/errors';
import { createPaginationParams,fetchAllPages } from './utils/pagination';

export function createNotesApi(getToken: AuthTokenGetter, getUserId: () => string | undefined) {
  const { makeRequest } = createHttpClient(getToken);

  // Initialize fileService with token provider
  fileService.setTokenProvider(getToken);

  /**
   * Helper to invalidate all counts caches
   * Called whenever notes are created, updated, or deleted
   */
  const invalidateCountsCache = () => {
    // Clear all counts caches (general and folder-specific)
    apiCache.clearAll(); // This clears all caches including counts
  };

  return {
    /**
     * Get note counts by category
     * Optionally can get counts for a specific folder's children
     * Results are cached for 2 minutes to reduce redundant API calls
     */
    async getCounts(folderId?: string): Promise<NoteCounts> {
      try {
        // Check cache first
        const cacheKey = CACHE_KEYS.COUNTS(folderId);
        const cached = apiCache.get<NoteCounts>(cacheKey);
        if (cached) {
          return cached;
        }

        // Fetch from API if not cached
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
        return { all: 0, starred: 0, archived: 0, trash: 0 };
      }
    },

    /**
     * Get all notes with optional filters
     */
    async getNotes(params?: NoteQueryParams): Promise<Note[]> {
      try {
        const userId = getUserId();

        const allNotes = await fetchAllPages<NotesResponse, Note>(
          async (page) => {
            const searchParams = createPaginationParams(page, params as Record<string, string | boolean | undefined>);
            return await makeRequest<NotesResponse>(`/notes?${searchParams.toString()}`);
          },
          (response) => response.notes || []
        );

        // Decrypt notes if we have a user ID
        if (userId && allNotes.length > 0) {
          return await decryptNotes(allNotes, userId);
        }

        return allNotes;
      } catch (error) {
        return handleApiError(error, 'getNotes');
      }
    },

    /**
     * Get a single note by ID
     */
    async getNote(noteId: string): Promise<Note> {
      try {
        const userId = getUserId();
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
     * Create a new note
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
     * Update an existing note
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
     * Delete a note
     */
    async deleteNote(noteId: string): Promise<void> {
      try {
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
