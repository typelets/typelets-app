import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, type ApiNote, type ApiFolder } from '@/lib/api/api.ts';
import { fileService } from '@/services/fileService';
import {
  clearEncryptionKeys,
  hasMasterPassword,
  isMasterPasswordUnlocked,
} from '@/lib/encryption';
import { useWebSocket } from './useWebSocket';
import { useNotesSync } from './useNotesSync';
import { useNotesFiltering } from './useNotesFiltering';
import { useNotesOperations } from './useNotesOperations';
import type { Note, Folder, ViewMode } from '@/types/note';
import { getDescendantIds } from '@/utils/folderTree';
import { secureLogger } from '@/lib/utils/secureLogger';

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

// Helper function for safe date conversion
const safeConvertDates = (item: Note | Folder): void => {
  if (item.createdAt && typeof item.createdAt === 'string') {
    item.createdAt = new Date(item.createdAt);
  }

  // Note-specific properties
  if (
    'updatedAt' in item &&
    item.updatedAt &&
    typeof item.updatedAt === 'string'
  ) {
    item.updatedAt = new Date(item.updatedAt);
  }
  if (
    'hiddenAt' in item &&
    item.hiddenAt &&
    typeof item.hiddenAt === 'string'
  ) {
    item.hiddenAt = new Date(item.hiddenAt);
  }
};

// Retry utility with exponential backoff for rate limiting
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a rate limit error
      const isRateLimitError =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('Too Many Requests'));

      if (isRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt);
        secureLogger.warn(
          `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // If not a rate limit error or max retries reached, throw the error
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
};

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

  // Define helper functions early for the sync handlers
  const fetchAllFolders = useCallback(async (): Promise<Folder[]> => {
    let allFolders: Folder[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const foldersResponse = await retryWithBackoff(() =>
        api.getFolders({ page, limit: 50 })
      );
      const convertedFolders = foldersResponse.folders.map(convertApiFolder);
      allFolders = [...allFolders, ...convertedFolders];

      // Check if we have more pages
      const totalPages = Math.ceil(
        foldersResponse.total / foldersResponse.limit
      );
      hasMorePages = page < totalPages;
      page++;

      // Add small delay between requests to avoid rate limiting
      if (hasMorePages) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allFolders;
  }, []);

  const refetchFolders = useCallback(async () => {
    try {
      const allFolders = await fetchAllFolders();
      setFolders(allFolders);
    } catch (error) {
      secureLogger.error('Failed to refetch folders:', error);
    }
  }, [fetchAllFolders, setFolders]);

  // WebSocket sync handlers
  const syncHandlers = useNotesSync({
    folders,
    selectedFolder,
    setNotes,
    setFolders,
    setSelectedNote,
    safeConvertDates,
    refetchFolders,
  });

  // WebSocket integration for real-time sync
  const webSocket = useWebSocket({
    autoConnect: true,
    ...syncHandlers,
    onError: useCallback((error: Error | { message?: string }) => {
      // Only show connection errors to users if they persist
      secureLogger.error('WebSocket connection error', error);

      // Don't show transient connection errors during startup
      const isStartupError = Date.now() - window.performance.timeOrigin < 10000;
      const isConnectionClosed =
        error?.message?.includes?.('Connection closed');

      if (!isStartupError && !isConnectionClosed) {
        setError(`Connection error: ${error.message || 'Unknown error'}`);
      }
    }, []),
    onAuthenticated: useCallback((userId: string) => {
      secureLogger.authEvent('login', userId);
      setError(null); // Clear any previous connection errors
    }, []),
  });

  const initializeUser = useCallback(async () => {
    try {
      setError(null);
      api.setCurrentUser(clerkUser!.id);

      // Only call API if user has a master password set up and unlocked
      const hasPassword = hasMasterPassword(clerkUser!.id);
      const isUnlocked = isMasterPasswordUnlocked(clerkUser!.id);

      if (hasPassword && isUnlocked) {
        // Ensure token provider is ready before making API call
        try {
          await retryWithBackoff(() => api.getCurrentUser());
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('Token provider not set')
          ) {
            // Don't throw error, just continue without API call
          } else {
            throw error;
          }
        }
      }

      setEncryptionReady(true);
    } catch (error) {
      secureLogger.error('User initialization failed', error);
      setError('Failed to initialize user account');
      setLoading(false);
    }
  }, [clerkUser]);

  const fetchAllNotes = useCallback(async (): Promise<Note[]> => {
    let allNotes: Note[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const notesResponse = await retryWithBackoff(() =>
        api.getNotes({ page, limit: 50 })
      );
      const convertedNotes = notesResponse.notes.map(convertApiNote);
      allNotes = [...allNotes, ...convertedNotes];

      // Check if we have more pages
      const totalPages = Math.ceil(notesResponse.total / notesResponse.limit);
      hasMorePages = page < totalPages;
      page++;

      // Add small delay between requests to avoid rate limiting
      if (hasMorePages) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allNotes;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allFolders, allNotes] = await Promise.all([
        fetchAllFolders(),
        fetchAllNotes(),
      ]);

      setFolders(allFolders);

      // Create a folder map for quick lookup
      const folderMap = new Map(allFolders.map((f) => [f.id, f]));

      const notesWithAttachmentsAndFolders = await Promise.all(
        allNotes.map(async (note) => {
          try {
            const attachments = await fileService.getAttachments(note.id);
            // Embed folder data if note has a folderId
            const folder = note.folderId
              ? folderMap.get(note.folderId)
              : undefined;
            return { ...note, attachments, folder };
          } catch (error) {
            secureLogger.warn('Failed to load attachments for note', {
              noteId: '[REDACTED]',
              error,
            });
            const folder = note.folderId
              ? folderMap.get(note.folderId)
              : undefined;
            return { ...note, attachments: [], folder };
          }
        })
      );

      setNotes(notesWithAttachmentsAndFolders);

      setSelectedNote((prev) => {
        if (prev === null && notesWithAttachmentsAndFolders.length > 0) {
          return notesWithAttachmentsAndFolders[0];
        }
        return prev;
      });
    } catch (error) {
      secureLogger.error('Data loading failed', error);
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
  }, [fetchAllFolders, fetchAllNotes]);

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

  // Notes filtering
  const {
    filteredNotes,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    hiddenCount,
  } = useNotesFiltering({
    notes,
    folders,
    selectedFolder,
    currentView,
    searchQuery,
  });

  // Notes operations
  const notesOperations = useNotesOperations({
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
    convertApiNote: convertApiNote as (apiNote: unknown) => Note,
    safeConvertDates,
    getDescendantIds,
  });

  // Auto-join selected note for real-time sync
  useEffect(() => {
    if (selectedNote?.id && webSocket.isAuthenticated) {
      // Leave previous note if any
      const joinedNotes = webSocket.joinedNotes;
      joinedNotes.forEach((noteId) => {
        if (noteId !== selectedNote.id) {
          webSocket.leaveNote(noteId);
        }
      });

      // Join current note for real-time sync
      if (!joinedNotes.includes(selectedNote.id)) {
        webSocket.joinNote(selectedNote.id);
      }
    }
  }, [selectedNote?.id, webSocket.isAuthenticated, webSocket]);

  // Auto-select a note when selectedNote becomes null and there are available notes
  useEffect(() => {
    if (!selectedNote && filteredNotes.length > 0) {
      setSelectedNote(filteredNotes[0]);
    }
  }, [selectedNote, filteredNotes]);

  const createFolder = async (
    name: string,
    color?: string,
    parentId?: string
  ) => {
    const newFolder = await notesOperations.createFolder(name, color, parentId);

    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]));
    }

    return newFolder;
  };

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      await notesOperations.updateNote(noteId, updates);
    },
    [notesOperations]
  );

  const deleteNote = async (noteId: string) => {
    await notesOperations.deleteNote(noteId);

    if (selectedNote?.id === noteId) {
      const remainingNotes = filteredNotes.filter((note) => note.id !== noteId);
      setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
    }
  };

  const archiveNote = async (noteId: string) => {
    await notesOperations.archiveNote(noteId);

    if (selectedNote?.id === noteId) {
      const remainingNotes = filteredNotes.filter((note) => note.id !== noteId);
      setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>) => {
    const updatedFolder = await notesOperations.updateFolder(folderId, updates);

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

    return updatedFolder;
  };

  const reorderFolders = async (folderId: string, newIndex: number) => {
    try {
      await api.reorderFolder(folderId, newIndex);

      const newFolders = await fetchAllFolders();
      setFolders(newFolders);

      // Send WebSocket notification about folder reordering
      if (webSocket.isAuthenticated) {
        const reorderedFolder = newFolders.find((f) => f.id === folderId);
        if (reorderedFolder) {
          webSocket.sendFolderUpdated(
            folderId,
            { order: newIndex },
            reorderedFolder
          );
        }
      }
    } catch (error) {
      secureLogger.error('Folder reordering failed', error);
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
    notesOperations.permanentlyDeleteNote(noteId);

    if (selectedNote?.id === noteId) {
      const remainingNotes = filteredNotes.filter((note) => note.id !== noteId);
      setSelectedNote(remainingNotes.length > 0 ? remainingNotes[0] : null);
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    await notesOperations.moveNoteToFolder(noteId, folderId);
  };

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
    createNote: notesOperations.createNote,
    createFolder,
    updateNote,
    updateFolder,
    deleteNote,
    deleteFolder: notesOperations.deleteFolder,
    reorderFolders,
    toggleStar: notesOperations.toggleStar,
    archiveNote,
    restoreNote: notesOperations.restoreNote,
    hideNote: notesOperations.hideNote,
    unhideNote: notesOperations.unhideNote,
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
    // WebSocket sync status
    webSocket: {
      status: webSocket.status,
      isConnected: webSocket.isConnected,
      isAuthenticated: webSocket.isAuthenticated,
      userId: webSocket.userId,
      error: webSocket.error,
      reconnectAttempts: webSocket.reconnectAttempts,
      lastSync: webSocket.lastSync,
      joinedNotes: webSocket.joinedNotes,
      connect: webSocket.connect,
      disconnect: webSocket.disconnect,
      reconnect: webSocket.reconnect,
      clearError: webSocket.clearError,
    },
  };
}
