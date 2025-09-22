import { useCallback, useRef } from 'react';
import { api } from '@/lib/api/api';
import type { Note, Folder } from '@/types/note';
import type { UseWebSocketReturn } from './useWebSocket';
import { secureLogger } from '@/lib/utils/secureLogger';
import { SecureError, logSecureError, sanitizeError } from '@/lib/errors/SecureError';

interface UseNotesOperationsParams {
  folders: Folder[];
  selectedNote: Note | null;
  selectedFolder: Folder | null;
  encryptionReady: boolean;
  webSocket: UseWebSocketReturn;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  convertApiNote: (apiNote: unknown) => Note;
  safeConvertDates: (item: Note | Folder) => void;
  getDescendantIds: (folderId: string, folders: Folder[]) => string[];
}

export function useNotesOperations({
  folders,
  selectedNote,
  selectedFolder,
  encryptionReady,
  webSocket,
  setNotes,
  setFolders,
  setSelectedNote,
  setError,
  loadData,
  convertApiNote,
  safeConvertDates,
  getDescendantIds,
}: UseNotesOperationsParams) {
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Note CRUD Operations
  const createNote = useCallback(
    async (
      folderId?: string,
      templateContent?: { title: string; content: string }
    ) => {
      try {
        if (!encryptionReady) {
          throw new SecureError(
            'Note creation attempted without encryption ready',
            'Encryption not ready. Please wait a moment and try again.',
            'CRYPTO_001',
            'medium'
          );
        }

        const noteFolderId = folderId ?? selectedFolder?.id ?? null;
        const folder = noteFolderId
          ? folders.find((f) => f.id === noteFolderId)
          : undefined;

        const newNote = await api.createNote({
          title: templateContent?.title ?? 'Untitled Note',
          content: templateContent?.content ?? '',
          folderId: noteFolderId,
          starred: false,
          tags: [],
        });

        const noteWithFolder = convertApiNote(newNote);
        noteWithFolder.folder = folder;

        setNotes((prev) => [noteWithFolder, ...prev]);
        setSelectedNote(noteWithFolder);

        // Send WebSocket notification about note creation
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteCreated(noteWithFolder);
        }

        return noteWithFolder;
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to create note');
        logSecureError(secureError, 'useNotesOperations.createNote');
        secureLogger.error('Note creation failed', error);
        setError(secureError.userMessage);
        throw secureError;
      }
    },
    [
      encryptionReady,
      selectedFolder?.id,
      folders,
      convertApiNote,
      setNotes,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      // Handle attachments-only updates (no API call needed)
      const isAttachmentsOnlyUpdate =
        Object.keys(updates).length === 1 && updates.attachments !== undefined;

      if (isAttachmentsOnlyUpdate) {
        const optimisticUpdate = {
          ...updates,
          id: noteId,
          updatedAt: new Date(),
        };
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, ...optimisticUpdate } : note
          )
        );

        if (selectedNote?.id === noteId) {
          setSelectedNote((prev) =>
            prev ? { ...prev, ...optimisticUpdate } : null
          );
        }
        return;
      }

      // Regular updates - optimistic update first
      const optimisticUpdate = {
        ...updates,
        updatedAt: new Date(),
      };

      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, ...optimisticUpdate } : note
        )
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote((prev) =>
          prev ? { ...prev, ...optimisticUpdate } : null
        );
      }

      const existingTimeout = saveTimeoutsRef.current.get(noteId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const immediateUpdates = ['starred', 'archived', 'deleted', 'folderId', 'title'];
      const needsImmediateSave = Object.keys(updates).some((key) =>
        immediateUpdates.includes(key)
      );

      if (needsImmediateSave) {
        try {
          const apiNote = await api.updateNote(noteId, {
            title: updates.title,
            content: updates.content,
            folderId: updates.folderId,
            starred: updates.starred,
            archived: updates.archived,
            deleted: updates.deleted,
            tags: updates.tags,
          });

          const updatedNote = convertApiNote(apiNote);
          setNotes((prev) =>
            prev.map((note) => {
              if (note.id !== noteId) return note;

              const newFolder = updatedNote.folderId
                ? folders.find((f) => f.id === updatedNote.folderId)
                : undefined;
              return {
                ...updatedNote,
                attachments: note.attachments,
                folder: newFolder,
              };
            })
          );

          if (selectedNote?.id === noteId) {
            const newFolder = updatedNote.folderId
              ? folders.find((f) => f.id === updatedNote.folderId)
              : undefined;
            setSelectedNote({
              ...updatedNote,
              attachments: selectedNote.attachments,
              folder: newFolder,
            });
          }

          // Send WebSocket notification about note update (immediate updates only)
          if (webSocket.isAuthenticated) {
            webSocket.sendNoteUpdate(noteId, updates);
          }
        } catch (error) {
          const secureError = sanitizeError(error, 'Failed to update note');
          logSecureError(secureError, 'useNotesOperations.updateNote.immediate');
          secureLogger.error('Failed to update note:', error);
          setError(secureError.userMessage);
          void loadData();
        }
      } else {
        // Send WebSocket update immediately for instant cross-tab sync
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteUpdate(noteId, updates);
        }

        const timeout = setTimeout(async () => {
          try {
            if (
              !encryptionReady &&
              (updates.title !== undefined || updates.content !== undefined)
            ) {
              throw new SecureError(
                'Note update attempted without encryption ready',
                'Encryption not ready. Please wait a moment and try again.',
                'CRYPTO_001',
                'medium'
              );
            }

            // API call for server persistence (follows WebSocket update)
            await api.updateNote(noteId, {
              title: updates.title,
              content: updates.content,
              folderId: updates.folderId,
              starred: updates.starred,
              archived: updates.archived,
              deleted: updates.deleted,
              tags: updates.tags,
            });

            saveTimeoutsRef.current.delete(noteId);
          } catch (error) {
            const secureError = sanitizeError(error, 'Failed to update note');
            logSecureError(secureError, 'useNotesOperations.updateNote.delayed');
            secureLogger.error('Failed to update note (delayed):', error);
            if (error instanceof SecureError && error.code === 'CRYPTO_001') {
              setError('Failed to encrypt note changes. Please try again.');
            } else {
              setError(secureError.userMessage);
            }
            void loadData();
          }
        }, 500); // Reduced from 1500ms to 500ms for faster sync

        saveTimeoutsRef.current.set(noteId, timeout);
      }
    },
    [
      encryptionReady,
      selectedNote?.id,
      selectedNote?.attachments,
      folders,
      loadData,
      convertApiNote,
      setNotes,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        await updateNote(noteId, { deleted: true });

        // Send WebSocket notification about note deletion
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteDeleted(noteId);
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to delete note');
        logSecureError(secureError, 'useNotesOperations.deleteNote');
        secureLogger.error('Failed to delete note:', error);
        setError(secureError.userMessage);
      }
    },
    [updateNote, webSocket, setError]
  );

  // Note action operations
  const toggleStar = useCallback(
    async (noteId: string) => {
      try {
        const apiNote = await api.toggleStarNote(noteId);
        const updatedNote = convertApiNote(apiNote);

        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...updatedNote,
                  attachments: note.attachments,
                  folder: note.folder,
                }
              : note
          )
        );

        if (selectedNote?.id === noteId) {
          setSelectedNote({
            ...updatedNote,
            attachments: selectedNote.attachments,
            folder: selectedNote.folder,
          });
        }

        // Send WebSocket update for real-time sync
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteUpdate(noteId, { starred: updatedNote.starred });
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to toggle star');
        logSecureError(secureError, 'useNotesOperations.toggleStar');
        secureLogger.error('Failed to toggle star:', error);
        setError(secureError.userMessage);
      }
    },
    [
      convertApiNote,
      selectedNote,
      setNotes,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  const archiveNote = useCallback(
    async (noteId: string) => {
      try {
        await updateNote(noteId, { archived: true });
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to archive note');
        logSecureError(secureError, 'useNotesOperations.archiveNote');
        secureLogger.error('Failed to archive note:', error);
      }
    },
    [updateNote]
  );

  const restoreNote = useCallback(
    async (noteId: string) => {
      try {
        const apiNote = await api.restoreNote(noteId);
        const restoredNote = convertApiNote(apiNote);

        setNotes((prev) =>
          prev.map((note) => (note.id === noteId ? restoredNote : note))
        );

        // Send WebSocket update for real-time sync
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteUpdate(noteId, { deleted: restoredNote.deleted });
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to restore note');
        logSecureError(secureError, 'useNotesOperations.restoreNote');
        secureLogger.error('Failed to restore note:', error);
        setError(secureError.userMessage);
      }
    },
    [convertApiNote, setNotes, webSocket, setError]
  );

  const hideNote = useCallback(
    async (noteId: string) => {
      try {
        const apiNote = await api.hideNote(noteId);
        const hiddenNote = convertApiNote(apiNote);

        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...hiddenNote,
                  attachments: note.attachments,
                  folder: note.folder,
                }
              : note
          )
        );

        if (selectedNote?.id === noteId) {
          setSelectedNote({
            ...hiddenNote,
            attachments: selectedNote.attachments,
            folder: selectedNote.folder,
          });
        }

        // Send WebSocket update for real-time sync
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteUpdate(noteId, {
            hidden: hiddenNote.hidden,
            hiddenAt: hiddenNote.hiddenAt,
          });
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to hide note');
        logSecureError(secureError, 'useNotesOperations.hideNote');
        secureLogger.error('Failed to hide note:', error);
        setError(secureError.userMessage);
      }
    },
    [
      convertApiNote,
      selectedNote,
      setNotes,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  const unhideNote = useCallback(
    async (noteId: string) => {
      try {
        const apiNote = await api.unhideNote(noteId);
        const unhiddenNote = convertApiNote(apiNote);

        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? {
                  ...unhiddenNote,
                  attachments: note.attachments,
                  folder: note.folder,
                }
              : note
          )
        );

        if (selectedNote?.id === noteId) {
          setSelectedNote({
            ...unhiddenNote,
            attachments: selectedNote.attachments,
            folder: selectedNote.folder,
          });
        }

        // Send WebSocket update for real-time sync
        if (webSocket.isAuthenticated) {
          webSocket.sendNoteUpdate(noteId, {
            hidden: unhiddenNote.hidden,
            hiddenAt: unhiddenNote.hiddenAt,
          });
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to unhide note');
        logSecureError(secureError, 'useNotesOperations.unhideNote');
        secureLogger.error('Failed to unhide note:', error);
        setError(secureError.userMessage);
      }
    },
    [
      convertApiNote,
      selectedNote,
      setNotes,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  const moveNoteToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      // Only update the folderId in the API call
      await updateNote(noteId, { folderId });
    },
    [updateNote]
  );

  const permanentlyDeleteNote = useCallback(
    (noteId: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== noteId));

      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    },
    [selectedNote?.id, setNotes, setSelectedNote]
  );

  // Folder operations
  const createFolder = useCallback(
    async (name: string, color: string = '#3b82f6', parentId?: string) => {
      try {
        const folderData: {
          name: string;
          color: string;
          isDefault: boolean;
          parentId?: string;
        } = {
          name,
          color,
          isDefault: false,
        };

        // Only include parentId if it's provided
        if (parentId) {
          folderData.parentId = parentId;
        }

        const apiFolder = await api.createFolder(folderData);

        const newFolder = {
          ...apiFolder,
          createdAt: new Date(apiFolder.createdAt),
        };

        setFolders((prev) => [...prev, newFolder]);

        // Send WebSocket notification about folder creation
        if (webSocket.isAuthenticated) {
          webSocket.sendFolderCreated(newFolder);
        }

        return newFolder;
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to create folder');
        logSecureError(secureError, 'useNotesOperations.createFolder');
        secureLogger.error('Failed to create folder:', error);
        setError(secureError.userMessage);
        throw secureError;
      }
    },
    [setFolders, webSocket, setError]
  );

  const updateFolder = useCallback(
    async (folderId: string, updates: Partial<Folder>) => {
      try {
        const apiFolder = await api.updateFolder(folderId, updates);
        const updatedFolder = {
          ...apiFolder,
          createdAt: new Date(apiFolder.createdAt),
        };
        safeConvertDates(updatedFolder);

        setFolders((prevFolders) =>
          prevFolders.map((folder) =>
            folder.id === folderId ? updatedFolder : folder
          )
        );

        // Send WebSocket notification about folder update
        if (webSocket.isAuthenticated) {
          webSocket.sendFolderUpdated(folderId, updates, updatedFolder);
        }

        return updatedFolder;
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to update folder');
        logSecureError(secureError, 'useNotesOperations.updateFolder');
        secureLogger.error('Failed to update folder:', error);
        setError(secureError.userMessage);
        throw secureError;
      }
    },
    [safeConvertDates, setFolders, webSocket, setError]
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await api.deleteFolder(folderId);

        const descendantIds = getDescendantIds(folderId, folders);
        const allFolderIds = [folderId, ...descendantIds];

        // Update folders state
        setFolders((prevFolders) =>
          prevFolders.filter((folder) => !allFolderIds.includes(folder.id))
        );

        // Clear selected folder if it was deleted
        if (selectedFolder && allFolderIds.includes(selectedFolder.id)) {
          setSelectedNote(null);
        }

        // Send WebSocket notification about folder deletion
        if (webSocket.isAuthenticated) {
          webSocket.sendFolderDeleted(folderId);
        }
      } catch (error) {
        const secureError = sanitizeError(error, 'Failed to delete folder');
        logSecureError(secureError, 'useNotesOperations.deleteFolder');
        secureLogger.error('Failed to delete folder:', error);
        setError(secureError.userMessage);
      }
    },
    [
      folders,
      selectedFolder,
      getDescendantIds,
      setFolders,
      setSelectedNote,
      webSocket,
      setError,
    ]
  );

  return {
    createNote,
    updateNote,
    deleteNote,
    toggleStar,
    archiveNote,
    restoreNote,
    hideNote,
    unhideNote,
    moveNoteToFolder,
    permanentlyDeleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
