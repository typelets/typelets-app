/**
 * Notes API Module
 * Handles all note-related API operations
 */

import { createHttpClient, AuthTokenGetter } from './client';
import { Note, NoteQueryParams, NotesResponse, EmptyTrashResponse } from './types';
import { decryptNote, decryptNotes, encryptNoteForApi, clearEncryptionCache } from './encryption';
import { fetchAllPages, createPaginationParams } from './utils/pagination';
import { handleApiError } from './utils/errors';
import { logger } from '../../lib/logger';

export function createNotesApi(getToken: AuthTokenGetter, getUserId: () => string | undefined) {
  const { makeRequest } = createHttpClient(getToken);

  return {
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

        // Log successful note creation
        logger.recordEvent('note_created', {
          noteId: createdNote.id,
          hasTitle: !!note.title,
          contentLength: content.length,
          encrypted: true,
        });

        return decryptedNote;
      } catch (error) {
        logger.error('Failed to create note', error as Error, {
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

        // Log successful note update
        logger.recordEvent('note_updated', {
          noteId,
          updatedFields: Object.keys(updates),
        });

        return decryptedNote;
      } catch (error) {
        logger.error('Failed to update note', error as Error, {
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
        return await makeRequest<EmptyTrashResponse>('/notes/empty-trash', {
          method: 'DELETE',
        });
      } catch (error) {
        return handleApiError(error, 'emptyTrash');
      }
    },
  };
}
