/**
 * Note CRUD Operations
 * Handles create, update, and delete operations for notes
 */

import { getDatabase } from '../../../lib/database';
import { logger } from '../../../lib/logger';
import { isOnline } from '../../network/networkManager';
import { queueMutation } from '../../sync/syncManager';
import type { AuthTokenGetter } from '../client';
import { clearEncryptionCache, decryptNote, encryptNoteForApi } from '../encryption';
import type { Note } from '../types';

import { syncAllCaches } from './cache-sync';
import { invalidateCountsCache } from './shared';

type MakeRequestFn = <T = unknown>(endpoint: string, options?: RequestInit) => Promise<T>;

export function createCrudOperations(
  makeRequest: MakeRequestFn,
  getUserId: () => string | undefined
) {
  /**
   * Create a new note (with offline support)
   */
  async function createNote(note: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Note> {
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
            created_at, updated_at, encrypted_title, encrypted_content, iv, salt,
            is_synced, is_dirty, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
            0, // is_synced = false (not synced yet)
            1, // is_dirty = true (has local changes)
            null, // synced_at = null (never synced)
          ]
        );

        // Queue mutation for later sync
        await queueMutation('note', tempId, 'create', notePayload);

        if (__DEV__) {
          console.log(`[API] Offline note created: ${tempId}`);
        }

        // Invalidate counts cache to show updated counts immediately
        await invalidateCountsCache();

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

      // Sync caches - SQLite gets updated, AsyncStorage refreshes naturally
      await syncAllCaches(decryptedNote, false);

      // Invalidate counts cache
      await invalidateCountsCache();

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
  }

  /**
   * Update an existing note (with offline support)
   */
  async function updateNote(noteId: string, updates: Partial<Note>): Promise<Note> {
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

        // Always update updatedAt timestamp and mark as dirty
        updateFields.push('updated_at = ?', 'is_dirty = ?');
        updateValues.push(new Date().toISOString(), 1);

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
        await invalidateCountsCache();

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

      // Sync caches - always update SQLite, clear AsyncStorage for location changes
      const shouldClearAsyncStorage = updates.deleted || updates.archived || updates.folderId !== undefined;
      await syncAllCaches(decryptedNote, shouldClearAsyncStorage);

      // Invalidate counts cache (in case starred/archived status changed)
      await invalidateCountsCache();

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
  }

  /**
   * Delete a note (with offline support)
   */
  async function deleteNote(noteId: string): Promise<void> {
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
        await invalidateCountsCache();

        return;
      }

      // ONLINE MODE - Normal API call
      await makeRequest<void>(`/notes/${noteId}`, {
        method: 'DELETE',
      });

      // Invalidate counts cache
      await invalidateCountsCache();
    } catch (error) {
      logger.error('[API] Failed to delete note', error as Error, {
        attributes: {
          operation: 'deleteNote',
          noteId,
        },
      });
      throw error;
    }
  }

  return {
    createNote,
    updateNote,
    deleteNote,
  };
}
