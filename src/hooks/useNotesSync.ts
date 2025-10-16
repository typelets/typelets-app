import { useCallback } from 'react';
import type {
  NoteSyncMessage,
  NoteCreatedSyncMessage,
  NoteDeletedSyncMessage,
  FolderCreatedSyncMessage,
  FolderUpdatedSyncMessage,
  FolderDeletedSyncMessage,
} from '@/types/websocket';
import type { Note, Folder } from '@/types/note';
import { getDescendantIds } from '@/utils/folderTree';

interface UseNotesSyncParams {
  folders: Folder[];
  selectedFolder: Folder | null;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  setSelectedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  safeConvertDates: (item: Note | Folder) => void;
  refetchFolders?: () => Promise<void>;
}

export function useNotesSync({
  folders,
  selectedFolder,
  setNotes,
  setFolders,
  setSelectedNote,
  safeConvertDates,
  refetchFolders,
}: UseNotesSyncParams) {
  // Helper function to create updated note with proper folder reference
  const createUpdatedNote = useCallback(
    (baseNote: Note, changes: Partial<Note>) => {
      // Apply the changes to the base note
      const updatedNote = { ...baseNote, ...changes };

      // Convert date strings to Date objects safely for any new date fields
      safeConvertDates(updatedNote);

      // Update folder reference if folderId changed
      if (changes.folderId !== undefined) {
        updatedNote.folder = updatedNote.folderId
          ? folders.find((f) => f.id === updatedNote.folderId)
          : undefined;
      }

      // Remove isNew badge if title was changed (cross-tab sync)
      if (changes.title !== undefined) {
        updatedNote.isNew = false;
      }

      return updatedNote;
    },
    [folders, safeConvertDates]
  );

  // Note sync handlers
  const onNoteSync = useCallback(
    (message: NoteSyncMessage) => {
      // Update the note in local state with the synced changes
      setNotes((prevNotes) => {
        // First check if the note exists to prevent sync issues with deleted notes
        const noteExists = prevNotes.some((note) => note.id === message.noteId);
        if (!noteExists) {
          console.warn(
            `Received sync for non-existent note: ${message.noteId}`
          );
          return prevNotes; // Return unchanged if note doesn't exist
        }

        return prevNotes.map((note) => {
          if (note.id === message.noteId) {
            return createUpdatedNote(note, message.changes);
          }
          return note;
        });
      });

      // Update selected note if it's the one being synced
      setSelectedNote((prevSelected) => {
        if (prevSelected?.id === message.noteId) {
          // Double-check that the note still exists (additional safety check)
          setNotes((currentNotes) => {
            const noteStillExists = currentNotes.some(
              (note) => note.id === message.noteId
            );
            if (!noteStillExists) {
              console.warn(
                `Selected note no longer exists during sync: ${message.noteId}`
              );
              setSelectedNote(null); // Clear selection if note was deleted
            }
            return currentNotes; // Return unchanged
          });

          const updatedNote = createUpdatedNote(prevSelected, message.changes);

          // Check if the updated note still belongs to the current view
          if (selectedFolder && message.changes.folderId !== undefined) {
            const folderIds = [
              selectedFolder.id,
              ...getDescendantIds(selectedFolder.id, folders),
            ];
            // If note was moved out of current folder view, deselect it
            if (!folderIds.includes(updatedNote.folderId ?? '')) {
              // Use queueMicrotask to avoid flushSync warning
              queueMicrotask(() => {
                setSelectedNote((prev) => {
                  if (prev?.id === message.noteId) {
                    return null;
                  }
                  return prev;
                });
              });
              return null;
            }
          }

          return updatedNote;
        }
        return prevSelected;
      });
    },
    [createUpdatedNote, selectedFolder, folders, setNotes, setSelectedNote]
  );

  const onNoteCreatedSync = useCallback(
    (message: NoteCreatedSyncMessage) => {
      // Add the new note to local state
      const newNote = { ...message.noteData };
      safeConvertDates(newNote);

      // Find and attach folder data if note has folderId
      if (newNote.folderId) {
        newNote.folder = folders.find((f) => f.id === newNote.folderId);
      }

      setNotes((prevNotes) => {
        // Check if note already exists (prevent duplicates)
        const exists = prevNotes.some((note) => note.id === newNote.id);
        if (exists) return prevNotes;

        return [newNote, ...prevNotes];
      });
    },
    [folders, setNotes, safeConvertDates]
  );

  const onNoteDeletedSync = useCallback(
    (message: NoteDeletedSyncMessage) => {
      // Remove the deleted note from local state
      setNotes((prevNotes) =>
        prevNotes.filter((note) => note.id !== message.noteId)
      );

      // Clear selected note if it was the deleted one
      setSelectedNote((prevSelected) => {
        if (prevSelected?.id === message.noteId) {
          return null;
        }
        return prevSelected;
      });
    },
    [setNotes, setSelectedNote]
  );

  // Folder sync handlers
  const onFolderCreatedSync = useCallback(
    (message: FolderCreatedSyncMessage) => {
      const newFolder = { ...message.folderData };
      safeConvertDates(newFolder);

      setFolders((prevFolders) => {
        // Check if folder already exists (prevent duplicates)
        const exists = prevFolders.some((folder) => folder.id === newFolder.id);
        if (exists) return prevFolders;

        return [...prevFolders, newFolder];
      });
    },
    [setFolders, safeConvertDates]
  );

  const onFolderUpdatedSync = useCallback(
    (message: FolderUpdatedSyncMessage) => {
      // If this is a reordering operation (indicated by 'order' in changes),
      // we need to refetch all folders to get the correct order
      if (message.changes.order !== undefined && refetchFolders) {
        // For folder reordering, we need to refetch the folder list to maintain proper order
        // since folder order is determined by the backend and array position matters
        refetchFolders();
        return;
      }

      setFolders((prevFolders) =>
        prevFolders.map((folder) => {
          if (folder.id === message.folderId) {
            const updatedFolder = { ...message.updatedFolder };
            safeConvertDates(updatedFolder);
            return updatedFolder;
          }
          return folder;
        })
      );
    },
    [setFolders, safeConvertDates, refetchFolders]
  );

  const onFolderDeletedSync = useCallback(
    (message: FolderDeletedSyncMessage) => {
      setFolders((prevFolders) =>
        prevFolders.filter((folder) => folder.id !== message.folderId)
      );
    },
    [setFolders]
  );

  return {
    onNoteSync,
    onNoteCreatedSync,
    onNoteDeletedSync,
    onFolderCreatedSync,
    onFolderUpdatedSync,
    onFolderDeletedSync,
  };
}
