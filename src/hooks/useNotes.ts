import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, type ApiNote, type ApiFolder } from '@/lib/api/api.ts';
import { fileService } from '@/services/fileService';
import { clearEncryptionKeys, hasMasterPassword, isMasterPasswordUnlocked } from '@/lib/encryption';
import type { Note, Folder, ViewMode } from '@/types/note';
import { getDescendantIds } from '@/utils/folderTree';

const convertApiNote = (apiNote: ApiNote): Note => ({
  ...apiNote,
  createdAt: new Date(apiNote.createdAt),
  updatedAt: new Date(apiNote.updatedAt),
  hiddenAt: apiNote.hiddenAt ? new Date(apiNote.hiddenAt) : null,
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
  
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const initializeUser = useCallback(async () => {
    try {
      setError(null);
      api.setCurrentUser(clerkUser!.id);
      
      // Only call API if user has a master password set up and unlocked
      const hasPassword = hasMasterPassword(clerkUser!.id);
      const isUnlocked = isMasterPasswordUnlocked(clerkUser!.id);
      
      if (hasPassword && isUnlocked) {
        await api.getCurrentUser();
      }
      
      setEncryptionReady(true);
    } catch (error) {
      console.error('Failed to initialize user:', error);
      setError('Failed to initialize user account');
      setLoading(false);
    }
  }, [clerkUser]);

  const fetchAllFolders = useCallback(async (): Promise<Folder[]> => {
    let allFolders: Folder[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const foldersResponse = await api.getFolders({ page, limit: 100 });
      const convertedFolders = foldersResponse.folders.map(convertApiFolder);
      allFolders = [...allFolders, ...convertedFolders];

      // Check if we have more pages
      const totalPages = Math.ceil(foldersResponse.total / foldersResponse.limit);
      hasMorePages = page < totalPages;
      page++;
    }

    return allFolders;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allFolders, notesResponse] = await Promise.all([
        fetchAllFolders(),
        api.getNotes({ limit: 100 }),
      ]);

      setFolders(allFolders);
      const convertedNotes = notesResponse.notes.map(convertApiNote);
      
      // Create a folder map for quick lookup
      const folderMap = new Map(allFolders.map(f => [f.id, f]));
      
      const notesWithAttachmentsAndFolders = await Promise.all(
        convertedNotes.map(async (note) => {
          try {
            const attachments = await fileService.getAttachments(note.id);
            // Embed folder data if note has a folderId
            const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
            return { ...note, attachments, folder };
          } catch (error) {
            console.warn(`Failed to load attachments for note ${note.id}:`, error);
            const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
            return { ...note, attachments: [], folder };
          }
        })
      );
      
      setNotes(notesWithAttachmentsAndFolders);

      setSelectedNote(prev => {
        if (prev === null && notesWithAttachmentsAndFolders.length > 0) {
          return notesWithAttachmentsAndFolders[0];
        }
        return prev;
      });
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
  }, [fetchAllFolders]);

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
      const hasPassword = hasMasterPassword(clerkUser.id);
      const isUnlocked = isMasterPasswordUnlocked(clerkUser.id);
      
      // Only load data if user has master password set up and unlocked
      if (hasPassword && isUnlocked) {
        void loadData();
      }
    }
  }, [encryptionReady, clerkUser, loadData]);

  useEffect(() => {
    const timeouts = saveTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => {
        clearTimeout(timeout);
      });
      timeouts.clear();
    };
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (searchQuery) {
        // For hidden notes, search in title and tags but not in content
        const searchableContent = note.hidden ? '[HIDDEN]' : note.content;
        
        const matchesSearch =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          searchableContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        case 'hidden':
          return note.hidden && !note.deleted;
        default:
          return !note.deleted && !note.archived;
      }
    });
  }, [notes, searchQuery, currentView, selectedFolder, folders]);

  const createNote = async (folderId?: string, templateContent?: { title: string; content: string }) => {
    try {
      if (!encryptionReady) {
        throw new Error(
          'Encryption not ready. Please wait a moment and try again.'
        );
      }

      const noteFolderId = folderId ?? selectedFolder?.id ?? null;
      const apiNote = await api.createNote({
        title: templateContent?.title || 'Untitled Note',
        content: templateContent?.content || '',
        folderId: noteFolderId,
        starred: false,
        tags: [],
      });

      const newNote = convertApiNote(apiNote);
      // Embed folder data if note has a folderId
      const folder = noteFolderId ? folders.find(f => f.id === noteFolderId) : undefined;
      const noteWithFolder = { ...newNote, folder };
      
      setNotes((prev) => [noteWithFolder, ...prev]);
      setSelectedNote(noteWithFolder);
      return noteWithFolder;
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

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const isAttachmentsOnlyUpdate = Object.keys(updates).length === 1 && updates.attachments !== undefined;
    
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

    const immediateUpdates = ['starred', 'archived', 'deleted', 'folderId'];
    const needsImmediateSave = Object.keys(updates).some(key => immediateUpdates.includes(key));

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
            
            // Preserve attachments and update folder data if folderId changed
            const newFolder = updatedNote.folderId ? folders.find(f => f.id === updatedNote.folderId) : undefined;
            return { 
              ...updatedNote, 
              attachments: note.attachments, 
              folder: newFolder 
            };
          })
        );

        if (selectedNote?.id === noteId) {
          const newFolder = updatedNote.folderId ? folders.find(f => f.id === updatedNote.folderId) : undefined;
          setSelectedNote({ 
            ...updatedNote, 
            attachments: selectedNote.attachments, 
            folder: newFolder 
          });
        }
      } catch (error) {
        console.error('Failed to update note:', error);
        setError('Failed to update note');
        void loadData();
      }
    } else {
      const timeout = setTimeout(async () => {
        try {
          if (!encryptionReady && (updates.title !== undefined || updates.content !== undefined)) {
            throw new Error('Encryption not ready. Please wait a moment and try again.');
          }

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
          console.error('Failed to update note:', error);
          if (error instanceof Error && error.message.includes('encrypt')) {
            setError('Failed to encrypt note changes. Please try again.');
          } else {
            setError('Failed to update note');
          }
          void loadData();
        }
      }, 1500);

      saveTimeoutsRef.current.set(noteId, timeout);
    }
  }, [encryptionReady, selectedNote?.id, selectedNote?.attachments, folders, loadData]);

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
        prev.map((note) => (note.id === noteId ? { ...updatedNote, attachments: note.attachments, folder: note.folder } : note))
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...updatedNote, attachments: selectedNote.attachments, folder: selectedNote.folder });
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

  const hideNote = async (noteId: string) => {
    try {
      const apiNote = await api.hideNote(noteId);
      const hiddenNote = convertApiNote(apiNote);

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? { ...hiddenNote, attachments: note.attachments, folder: note.folder } : note))
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...hiddenNote, attachments: selectedNote.attachments, folder: selectedNote.folder });
      }
    } catch (error) {
      console.error('Failed to hide note:', error);
      setError('Failed to hide note');
    }
  };

  const unhideNote = async (noteId: string) => {
    try {
      const apiNote = await api.unhideNote(noteId);
      const unhiddenNote = convertApiNote(apiNote);

      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? { ...unhiddenNote, attachments: note.attachments, folder: note.folder } : note))
      );

      if (selectedNote?.id === noteId) {
        setSelectedNote({ ...unhiddenNote, attachments: selectedNote.attachments, folder: selectedNote.folder });
      }
    } catch (error) {
      console.error('Failed to unhide note:', error);
      setError('Failed to unhide note');
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

      // Update notes that belong to this folder with the new folder data
      setNotes((prev) =>
        prev.map((note) => {
          if (note.folderId === folderId) {
            return {
              ...note,
              folder: updatedFolder,
            };
          }
          return note;
        })
      );

      // Update selected note if it belongs to this folder
      if (selectedNote?.folderId === folderId) {
        setSelectedNote((prev) =>
          prev ? { ...prev, folder: updatedFolder } : null
        );
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

      const newFolders = await fetchAllFolders();
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
    // Find the folder data to embed
    const folder = folderId ? folders.find(f => f.id === folderId) : undefined;
    await updateNote(noteId, { folderId, folder });
  };

  const notesCount = notes.filter((n) => !n.deleted && !n.archived).length;
  const starredCount = notes.filter(
    (n) => n.starred && !n.deleted && !n.archived
  ).length;
  const archivedCount = notes.filter((n) => n.archived && !n.deleted).length;
  const trashedCount = notes.filter((n) => n.deleted).length;
  const hiddenCount = notes.filter((n) => n.hidden && !n.deleted).length;

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
    hiddenCount,
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
    hideNote,
    unhideNote,
    permanentlyDeleteNote,
    moveNoteToFolder,
    toggleFolderExpansion,
    setSelectedNote,
    setSelectedFolder,
    setCurrentView,
    setSearchQuery,
    setFolders,
    refetch: loadData,
    reinitialize: async () => {
      if (clerkUser) {
        await initializeUser();
        await loadData();
      }
    },
  };
}
