import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, type ApiNote, type ApiFolder } from '@/lib/api/api.ts';
import { clearEncryptionKeys } from '@/lib/encryption';
import type { Note, Folder, ViewMode } from '@/types/note';
import { getDescendantIds } from '@/utils/folderTree';

const convertApiNote = (apiNote: ApiNote): Note => ({
  ...apiNote,
  createdAt: new Date(apiNote.createdAt),
  updatedAt: new Date(apiNote.updatedAt),
});

const convertApiFolder = (apiFolder: ApiFolder): Folder => ({
  ...apiFolder,
  createdAt: new Date(apiFolder.createdAt),
});

export function useNotes() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const initializeUser = useCallback(async () => {
    try {
      setError(null);
      api.setCurrentUser(clerkUser!.id);
      await api.getCurrentUser();
      setEncryptionReady(true);
    } catch (error) {
      console.error('Failed to initialize user:', error);
      setError('Failed to initialize user account');
      setLoading(false);
    }
  }, [clerkUser]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [foldersResponse, notesResponse] = await Promise.all([
        api.getFolders(),
        api.getNotes({ limit: 100 }),
      ]);

      setFolders(foldersResponse.folders.map(convertApiFolder));
      const convertedNotes = notesResponse.notes.map(convertApiNote);
      setNotes(convertedNotes);

      if (!selectedNote && convertedNotes.length > 0) {
        setSelectedNote(convertedNotes[0]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      if (error instanceof Error && error.message.includes('decrypt')) {
        setError(
          'Failed to decrypt some notes. They may be corrupted or from an old version.'
        );
      } else {
        setError('Failed to load notes and folders');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedNote]);

  useEffect(() => {
    if (!isLoaded) return;

    if (clerkUser && isSignedIn) {
      void initializeUser();
    } else {
      clearEncryptionKeys();
      api.clearEncryptionData();
      setEncryptionReady(false);
      setLoading(false);
    }
  }, [clerkUser, isSignedIn, isLoaded, initializeUser]);

  useEffect(() => {
    if (encryptionReady && clerkUser) {
      void loadData();
    }
  }, [encryptionReady, clerkUser, loadData]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (searchQuery) {
        const matchesSearch =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          );

        if (!matchesSearch) return false;
      }

      if (selectedFolder) {
        const folderIds = [
          selectedFolder.id,
          ...getDescendantIds(selectedFolder.id, folders),
        ];
        if (!folderIds.includes(note.folderId ?? '')) return false;
        return !note.deleted && !note.archived;
      }

      switch (currentView) {
        case 'starred':
          return note.starred && !note.deleted && !note.archived;
        case 'archived':
          return note.archived && !note.deleted;
        case 'trash':
          return note.deleted;
        default:
          return !note.deleted && !note.archived;
      }
    });
  }, [notes, searchQuery, currentView, selectedFolder, folders]);

  const createNote = async (folderId?: string) => {
    try {
      if (!encryptionReady) {
        throw new Error(
          'Encryption not ready. Please wait a moment and try again.'
        );
      }

      const apiNote = await api.createNote({
        title: 'Untitled Note',
        content: '',
        folderId: folderId ?? selectedFolder?.id ?? null,
        starred: false,
        tags: [],
      });

      const newNote = convertApiNote(apiNote);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      return newNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      if (error instanceof Error && error.message.includes('encrypt')) {
        setError('Failed to encrypt note. Please try again.');
      } else {
        setError('Failed to create note');
      }
      throw error;
    }
  };

  const createFolder = async (
    name: string,
    color?: string,
    parentId?: string
  ) => {
    try {
      const apiFolder = await api.createFolder({
        name,
        color: color ?? '#6b7280',
        isDefault: false,
        parentId: parentId ?? undefined,
      });

      const newFolder = convertApiFolder(apiFolder);
      setFolders((prev) => [...prev, newFolder]);

      if (parentId) {
        setExpandedFolders((prev) => new Set([...prev, parentId]));
      }

      return newFolder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      setError('Failed to create folder');
      throw error;
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      if (
        !encryptionReady &&
        (updates.title !== undefined || updates.content !== undefined)
      ) {
        throw new Error(
          'Encryption not ready. Please wait a moment and try again.'
        );
      }

      const shouldOptimisticUpdate = updates.content === undefined;

      if (shouldOptimisticUpdate) {
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
      }

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
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      if (error instanceof Error && error.message.includes('encrypt')) {
        setError('Failed to encrypt note changes. Please try again.');
      } else {
        setError('Failed to update note');
      }
      void loadData();
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      await api.deleteNote(noteId);

      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? { ...note, deleted: true, updatedAt: new Date() }
            : note
        )
      );

      if (selectedNote?.id === noteId) {
        const remainingNotes = filteredNotes.filter(
          (note) => note.id !== noteId
        );
        setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      setError('Failed to delete note');
    }
  };

  const toggleStar = async (noteId: string) => {
    try {
      const apiNote = await api.toggleStarNote(noteId);
      const updatedNote = convertApiNote(apiNote);

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
      setError('Failed to toggle star');
    }
  };

  const archiveNote = async (noteId: string) => {
    try {
      await updateNote(noteId, { archived: true });

      if (selectedNote?.id === noteId) {
        const remainingNotes = filteredNotes.filter(
          (note) => note.id !== noteId
        );
        setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
      }
    } catch (error) {
      console.error('Failed to archive note:', error);
    }
  };

  const restoreNote = async (noteId: string) => {
    try {
      const apiNote = await api.restoreNote(noteId);
      const restoredNote = convertApiNote(apiNote);

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? restoredNote : note))
      );
    } catch (error) {
      console.error('Failed to restore note:', error);
      setError('Failed to restore note');
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId);

      const descendantIds = getDescendantIds(folderId, folders);
      const allFolderIds = [folderId, ...descendantIds];

      setNotes((prev) =>
        prev.map((note) =>
          allFolderIds.includes(note.folderId ?? '')
            ? { ...note, folderId: null, updatedAt: new Date() }
            : note
        )
      );

      setFolders((prev) =>
        prev.filter((folder) => !allFolderIds.includes(folder.id))
      );

      if (selectedFolder && allFolderIds.includes(selectedFolder.id)) {
        setSelectedFolder(null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      setError('Failed to delete folder');
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>) => {
    try {
      const apiPayload: {
        name?: string;
        color?: string;
        parentId?: string | null;
      } = {};

      if (updates.name !== undefined) {
        apiPayload.name = updates.name;
      }

      if (updates.color !== undefined) {
        apiPayload.color = updates.color;
      }

      if ('parentId' in updates) {
        apiPayload.parentId =
          updates.parentId === undefined ? null : updates.parentId;
      }

      const apiFolder = await api.updateFolder(folderId, apiPayload);
      const updatedFolder = convertApiFolder(apiFolder);

      setFolders((prev) =>
        prev.map((folder) => (folder.id === folderId ? updatedFolder : folder))
      );

      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolder);
      }
    } catch (error) {
      console.error('Failed to update folder:', error);
      setError('Failed to update folder');
      throw error;
    }
  };

  const reorderFolders = async (folderId: string, newIndex: number) => {
    try {
      await api.reorderFolder(folderId, newIndex);

      const foldersResponse = await api.getFolders();
      const newFolders = foldersResponse.folders.map(convertApiFolder);

      setFolders(newFolders);
    } catch (error) {
      console.error('Failed to reorder folders:', error);
      setError('Failed to reorder folders');
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const permanentlyDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));

    if (selectedNote?.id === noteId) {
      const remainingNotes = filteredNotes.filter((note) => note.id !== noteId);
      setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    await updateNote(noteId, { folderId });
  };

  const notesCount = notes.filter((n) => !n.deleted && !n.archived).length;
  const starredCount = notes.filter(
    (n) => n.starred && !n.deleted && !n.archived
  ).length;
  const archivedCount = notes.filter((n) => n.archived && !n.deleted).length;
  const trashedCount = notes.filter((n) => n.deleted).length;

  return {
    notes: filteredNotes,
    folders,
    selectedNote,
    selectedFolder,
    currentView,
    searchQuery,
    loading: loading || !encryptionReady || !isLoaded,
    error,
    encryptionReady,
    expandedFolders,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    createNote,
    createFolder,
    updateNote,
    updateFolder,
    deleteNote,
    deleteFolder,
    reorderFolders,
    toggleStar,
    archiveNote,
    restoreNote,
    permanentlyDeleteNote,
    moveNoteToFolder,
    toggleFolderExpansion,
    setSelectedNote,
    setSelectedFolder,
    setCurrentView,
    setSearchQuery,
    setFolders,
    refetch: loadData,
  };
}
