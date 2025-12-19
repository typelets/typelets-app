import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { api, type ApiNote, type ApiFolder, type ApiPublicNote } from '@/lib/api/api.ts';
import { fileService } from '@/services/fileService';
import {
  clearEncryptionKeys,
  hasMasterPassword,
  isMasterPasswordUnlocked,
} from '@/lib/encryption';
// BACKLOG: WebSocket functionality moved to upcoming release
// import { useWebSocket } from './useWebSocket';
// import { useNotesSync } from './useNotesSync';
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
  // Public note fields
  isPublished: apiNote.isPublished ?? false,
  publicSlug: apiNote.publicSlug ?? null,
  publishedAt: apiNote.publishedAt ? new Date(apiNote.publishedAt) : null,
  publicUpdatedAt: apiNote.publicUpdatedAt ? new Date(apiNote.publicUpdatedAt) : null,
});

const convertApiFolder = (apiFolder: ApiFolder): Folder => ({
  ...apiFolder,
  createdAt: new Date(apiFolder.createdAt),
});

// Helper function for safe date conversion
const safeConvertDates = (item: Note | Folder): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemAny = item as any;

  if (itemAny.createdAt && typeof itemAny.createdAt === 'string') {
    item.createdAt = new Date(itemAny.createdAt);
  }

  // Note-specific properties
  if ('updatedAt' in item && itemAny.updatedAt && typeof itemAny.updatedAt === 'string') {
    (item as Note).updatedAt = new Date(itemAny.updatedAt);
  }

  if ('hiddenAt' in item && itemAny.hiddenAt && typeof itemAny.hiddenAt === 'string') {
    (item as Note).hiddenAt = new Date(itemAny.hiddenAt);
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

  // Track if this is the initial mount to avoid refetching on first render
  const isInitialFolderChange = useRef(true);

  // Define helper functions early for the sync handlers
  const fetchAllFolders = useCallback(async (): Promise<Folder[]> => {
    // Fetch first page to determine total pages
    const firstPageResponse = await retryWithBackoff(() =>
      api.getFolders({ page: 1, limit: 50 })
    );
    const firstPageFolders = firstPageResponse.folders.map(convertApiFolder);

    // Determine total pages
    const totalPages = firstPageResponse.pagination?.pages ?? 1;

    // If only one page, return immediately
    if (totalPages <= 1) {
      return firstPageFolders;
    }

    // Fetch remaining pages in parallel batches to respect rate limits
    const remainingPages = [];
    const batchSize = 3; // Process 3 pages at a time to avoid rate limiting

    for (let i = 2; i <= Math.min(totalPages, 50); i += batchSize) {
      const batchPromises = [];
      for (let page = i; page < i + batchSize && page <= Math.min(totalPages, 50); page++) {
        batchPromises.push(
          retryWithBackoff(() => api.getFolders({ page, limit: 50 }))
            .then(response => response.folders.map(convertApiFolder))
        );
      }
      const batchResults = await Promise.all(batchPromises);
      remainingPages.push(...batchResults);
    }

    // Combine all pages
    return [
      ...firstPageFolders,
      ...remainingPages.flat()
    ];
  }, []);

  // BACKLOG: refetchFolders moved to upcoming release (was used by WebSocket sync)
  // const refetchFolders = useCallback(async () => {
  //   try {
  //     const allFolders = await fetchAllFolders();
  //     setFolders(allFolders);
  //   } catch (error) {
  //     secureLogger.error('Failed to refetch folders:', error);
  //   }
  // }, [fetchAllFolders, setFolders]);

  // BACKLOG: WebSocket sync handlers moved to upcoming release
  // const syncHandlers = useNotesSync({
  //   folders,
  //   selectedFolder,
  //   setNotes,
  //   setFolders,
  //   setSelectedNote,
  //   safeConvertDates,
  //   refetchFolders,
  // });

  // BACKLOG: WebSocket integration for real-time sync - moved to upcoming release
  // Defer connection until after initial data load for better performance
  // const webSocket = useWebSocket({
  //   autoConnect: false,
  //   ...syncHandlers,
  //   onError: useCallback((error: Error | { message?: string }) => {
  //     // Only show connection errors to users if they persist
  //     secureLogger.error('WebSocket connection error', error);

  //     // Don't show transient connection errors during startup
  //     const isStartupError = Date.now() - window.performance.timeOrigin < 10000;
  //     const isConnectionClosed =
  //       error?.message?.includes?.('Connection closed');

  //     if (!isStartupError && !isConnectionClosed) {
  //       setError(`Connection error: ${error.message || 'Unknown error'}`);
  //     }
  //   }, []),
  //   onAuthenticated: useCallback((userId: string) => {
  //     secureLogger.authEvent('login', userId);
  //     setError(null); // Clear any previous connection errors
  //   }, []),
  // });

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
            secureLogger.warn(
              'Token provider not ready, continuing without API call'
            );
          } else if (
            error instanceof Error &&
            (error.message.includes('session has expired') ||
              error.message.includes('401') ||
              error.message.includes('Unauthorized'))
          ) {
            // Session expired - user needs to refresh
            secureLogger.error('Session expired', error);
            setError(
              'Your session has expired. Please refresh the page to continue.'
            );
            setEncryptionReady(false);
            setLoading(false);
            return;
          } else {
            // Re-throw for outer catch to handle
            secureLogger.error('Failed to get current user', error);
            setError(
              'Failed to connect to the server. Please refresh the page and try again.'
            );
            setEncryptionReady(false);
            setLoading(false);
            return;
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

  const fetchAllNotes = useCallback(async (folderId?: string): Promise<Note[]> => {
    // Build params - optionally filter by folder
    const baseParams: { page: number; limit: number; folderId?: string } = { page: 1, limit: 50 };
    if (folderId) {
      baseParams.folderId = folderId;
    }

    // Fetch first page to determine total pages
    const firstPageResponse = await retryWithBackoff(() =>
      api.getNotes(baseParams)
    );
    const firstPageNotes = firstPageResponse.notes.map(convertApiNote);

    // Determine total pages
    const totalPages = firstPageResponse.pagination?.pages ?? 1;

    // If only one page, return immediately
    if (totalPages <= 1) {
      return firstPageNotes;
    }

    // Fetch remaining pages in parallel batches to respect rate limits
    const remainingPages = [];
    const batchSize = 3; // Process 3 pages at a time to avoid rate limiting

    for (let i = 2; i <= Math.min(totalPages, 50); i += batchSize) {
      const batchPromises = [];
      for (let page = i; page < i + batchSize && page <= Math.min(totalPages, 50); page++) {
        batchPromises.push(
          retryWithBackoff(() => api.getNotes({ ...baseParams, page, limit: 50 }))
            .then(response => response.notes.map(convertApiNote))
        );
      }
      const batchResults = await Promise.all(batchPromises);
      remainingPages.push(...batchResults);
    }

    // Combine all pages
    return [
      ...firstPageNotes,
      ...remainingPages.flat()
    ];
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

      // Defer attachment loading - only add folder data initially
      // Attachments will be loaded on-demand when a note is selected
      // Preserve attachmentCount from API for displaying badges
      const notesWithFolders = allNotes.map((note) => {
        const folder = note.folderId
          ? folderMap.get(note.folderId)
          : undefined;
        return {
          ...note,
          attachments: [],
          attachmentCount: note.attachmentCount ?? 0,
          folder
        };
      });

      setNotes(notesWithFolders);
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

  // Refresh only notes in the current folder (and subfolders) for better performance
  const refreshCurrentFolder = useCallback(async () => {
    if (!selectedFolder) {
      // No folder selected, do full refresh
      return loadData();
    }

    try {
      setLoading(true);
      setError(null);

      // Get all folder IDs to fetch (selected + descendants)
      const folderIds = [selectedFolder.id, ...getDescendantIds(selectedFolder.id, folders)];

      // Fetch notes for each folder in parallel
      const folderNotesPromises = folderIds.map(folderId => fetchAllNotes(folderId));
      const folderNotesArrays = await Promise.all(folderNotesPromises);
      const fetchedNotes = folderNotesArrays.flat();

      // Create a folder map for quick lookup
      const folderMap = new Map(folders.map((f) => [f.id, f]));

      // Process fetched notes
      const processedNotes = fetchedNotes.map((note) => {
        const folder = note.folderId ? folderMap.get(note.folderId) : undefined;
        return {
          ...note,
          attachments: [],
          attachmentCount: note.attachmentCount ?? 0,
          folder
        };
      });

      // Merge with existing notes: replace notes in the fetched folders, keep others
      setNotes(prev => {
        // Remove old notes from the fetched folders
        const notesOutsideFolders = prev.filter(note => !folderIds.includes(note.folderId ?? ''));
        // Add the freshly fetched notes
        return [...notesOutsideFolders, ...processedNotes];
      });
    } catch (error) {
      secureLogger.error('Folder refresh failed', error);
      setError('Failed to refresh folder');
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, folders, fetchAllNotes, loadData]);

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

  // BACKLOG: WebSocket connection moved to upcoming release
  // Connect WebSocket after initial data load for better performance
  // useEffect(() => {
  //   if (!loading && encryptionReady && notes.length > 0 && !webSocket.isConnected) {
  //     // Delay connection slightly to ensure UI has rendered
  //     const timer = setTimeout(() => {
  //       webSocket.connect();
  //     }, 100);
  //     return () => clearTimeout(timer);
  //   }
  // }, [loading, encryptionReady, notes.length, webSocket]);

  // Notes filtering
  const {
    filteredNotes,
    notesCount,
    starredCount,
    archivedCount,
    trashedCount,
    hiddenCount,
    publicCount,
  } = useNotesFiltering({
    notes,
    folders,
    selectedFolder,
    currentView,
    searchQuery,
  });

  // Notes operations
  const {
    createNote: notesOpsCreateNote,
    creatingNote,
    hideNote: notesOpsHideNote,
    hidingNote,
    toggleStar: notesOpsToggleStar,
    starringStar,
    ...restNotesOperations
  } = useNotesOperations({
    folders,
    selectedNote,
    selectedFolder,
    encryptionReady,
    webSocket: null, // BACKLOG: WebSocket removed for upcoming release
    setNotes,
    setFolders,
    setSelectedNote,
    setError,
    loadData,
    convertApiNote: convertApiNote as (apiNote: unknown) => Note,
    safeConvertDates,
    getDescendantIds,
  });

  // BACKLOG: Auto-join selected note for real-time sync - moved to upcoming release
  // useEffect(() => {
  //   if (selectedNote?.id && webSocket.isAuthenticated) {
  //     // Leave previous note if any
  //     const joinedNotes = webSocket.joinedNotes;
  //     joinedNotes.forEach((noteId) => {
  //       if (noteId !== selectedNote.id) {
  //         webSocket.leaveNote(noteId);
  //       }
  //     });

  //     // Join current note for real-time sync
  //     if (!joinedNotes.includes(selectedNote.id)) {
  //       webSocket.joinNote(selectedNote.id);
  //     }
  //   }
  // }, [selectedNote?.id, webSocket.isAuthenticated, webSocket]);

  // REMOVED: Auto-refetch on folder change was causing performance issues for users with many notes
  // Filtering now happens purely client-side. Use the refresh button to sync new notes from server.
  // The isInitialFolderChange ref is kept for potential future use.
  useEffect(() => {
    if (isInitialFolderChange.current) {
      isInitialFolderChange.current = false;
    }
  }, [selectedFolder?.id]);

  // Load attachments on-demand when a note is selected
  useEffect(() => {
    if (!selectedNote?.id) return;

    // Skip if attachments already loaded
    if (selectedNote.attachments && selectedNote.attachments.length > 0) return;

    const loadAttachments = async () => {
      try {
        const attachments = await fileService.getAttachments(selectedNote.id);

        // Update the note in the notes list
        setNotes((prev) =>
          prev.map((note) =>
            note.id === selectedNote.id
              ? { ...note, attachments }
              : note
          )
        );

        // Update selected note
        setSelectedNote((prev) =>
          prev?.id === selectedNote.id
            ? { ...prev, attachments }
            : prev
        );
      } catch (error) {
        secureLogger.warn('Failed to load attachments for selected note', {
          noteId: '[REDACTED]',
          error,
        });
      }
    };

    void loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.id, setNotes, setSelectedNote]);

  const createFolder = async (
    name: string,
    color?: string,
    parentId?: string
  ) => {
    const newFolder = await restNotesOperations.createFolder(
      name,
      color,
      parentId
    );

    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]));
    }

    return newFolder;
  };

  const updateNote = useCallback(
    async (noteId: string, updates: Partial<Note>) => {
      await restNotesOperations.updateNote(noteId, updates);

      // Auto-sync public note if published and content/title changed
      if (updates.title !== undefined || updates.content !== undefined) {
        // Use selectedNote if it matches (most common case - editing the selected note)
        // Fall back to finding in notes array for edge cases
        const note = selectedNote?.id === noteId ? selectedNote : notes.find(n => n.id === noteId);
        if (note?.isPublished && note?.publicSlug) {
          // Sync in background without blocking the save
          void api.updatePublicNote(note.publicSlug, {
            title: updates.title ?? note.title,
            content: updates.content ?? note.content,
          }).catch(error => {
            secureLogger.warn('Failed to sync public note', { noteId, error });
          });
        }
      }
    },
    [restNotesOperations, notes, selectedNote]
  );

  const deleteNote = async (noteId: string) => {
    await restNotesOperations.deleteNote(noteId);

    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const archiveNote = async (noteId: string) => {
    await restNotesOperations.archiveNote(noteId);

    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>) => {
    const updatedFolder = await restNotesOperations.updateFolder(
      folderId,
      updates
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

    return updatedFolder;
  };

  const reorderFolders = async (folderId: string, newIndex: number) => {
    // Optimistic update - reorder locally first
    const previousFolders = [...folders];

    setFolders((currentFolders) => {
      const folderToMove = currentFolders.find((f) => f.id === folderId);
      if (!folderToMove) return currentFolders;

      // Get siblings (folders with same parent)
      const parentId = folderToMove.parentId;
      const siblings = currentFolders.filter((f) => f.parentId === parentId);
      const nonSiblings = currentFolders.filter((f) => f.parentId !== parentId);

      // Remove the folder from its current position
      const siblingsWithoutFolder = siblings.filter((f) => f.id !== folderId);

      // Insert at new position
      const reorderedSiblings = [
        ...siblingsWithoutFolder.slice(0, newIndex),
        folderToMove,
        ...siblingsWithoutFolder.slice(newIndex),
      ];

      return [...nonSiblings, ...reorderedSiblings];
    });

    try {
      await api.reorderFolder(folderId, newIndex);

      // Fetch fresh data in background to ensure consistency
      const newFolders = await fetchAllFolders();
      setFolders(newFolders);

      // BACKLOG: WebSocket notification moved to upcoming release
      // Send WebSocket notification about folder reordering
      // if (webSocket.isAuthenticated) {
      //   const reorderedFolder = newFolders.find((f) => f.id === folderId);
      //   if (reorderedFolder) {
      //     webSocket.sendFolderUpdated(
      //       folderId,
      //       { order: newIndex },
      //       reorderedFolder
      //     );
      //   }
      // }
    } catch (error) {
      // Rollback on error
      setFolders(previousFolders);
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
    restNotesOperations.permanentlyDeleteNote(noteId);

    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

  const moveNoteToFolder = async (noteId: string, folderId: string | null) => {
    await restNotesOperations.moveNoteToFolder(noteId, folderId);
  };

  // ===== Public Notes Functions =====

  const publishNote = useCallback(async (
    noteId: string,
    authorName?: string
  ): Promise<ApiPublicNote | null> => {
    // Find the note to publish
    const note = notes.find(n => n.id === noteId);
    if (!note) {
      setError('Note not found');
      return null;
    }

    try {
      // Publish the note (content is already decrypted in memory)
      const publicNote = await api.publishNote({
        noteId: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        authorName,
      });

      // Update local state with publish info using functional updates
      setNotes(prev => prev.map(n => {
        if (n.id === noteId) {
          return {
            ...n,
            isPublished: true,
            publicSlug: publicNote.slug,
            publishedAt: new Date(publicNote.publishedAt),
            publicUpdatedAt: new Date(publicNote.updatedAt),
          };
        }
        return n;
      }));

      setSelectedNote(prev => {
        if (prev?.id === noteId) {
          return {
            ...prev,
            isPublished: true,
            publicSlug: publicNote.slug,
            publishedAt: new Date(publicNote.publishedAt),
            publicUpdatedAt: new Date(publicNote.updatedAt),
          };
        }
        return prev;
      });

      return publicNote;
    } catch (error) {
      secureLogger.error('Failed to publish note', error);
      setError('Failed to publish note');
      return null;
    }
  }, [notes, setNotes, setSelectedNote, setError]);

  const unpublishNote = useCallback(async (noteId: string): Promise<boolean> => {
    // Find the note to unpublish (for getting the publicSlug)
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.publicSlug) {
      setError('Note not found or not published');
      return false;
    }

    try {
      await api.unpublishNote(note.publicSlug);

      // Update local state using functional updates to ensure fresh state
      setNotes(prev => prev.map(n => {
        if (n.id === noteId) {
          return {
            ...n,
            isPublished: false,
            publicSlug: null,
            publishedAt: null,
            publicUpdatedAt: null,
          };
        }
        return n;
      }));

      // Update selectedNote if it's the one being unpublished
      setSelectedNote(prev => {
        if (prev?.id === noteId) {
          return {
            ...prev,
            isPublished: false,
            publicSlug: null,
            publishedAt: null,
            publicUpdatedAt: null,
          };
        }
        return prev;
      });

      return true;
    } catch (error) {
      secureLogger.error('Failed to unpublish note', error);
      setError('Failed to unpublish note');
      return false;
    }
  }, [notes, setNotes, setSelectedNote, setError]);

  const syncPublicNote = useCallback(async (noteId: string): Promise<boolean> => {
    // Find the note to sync
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.publicSlug || !note.isPublished) {
      return false; // Not published, nothing to sync
    }

    try {
      const publicNote = await api.updatePublicNote(note.publicSlug, {
        title: note.title,
        content: note.content,
      });

      // Update local state with new sync time
      const updatedNote: Note = {
        ...note,
        publicUpdatedAt: new Date(publicNote.updatedAt),
      };

      setNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));

      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }

      return true;
    } catch (error) {
      secureLogger.error('Failed to sync public note', error);
      // Don't set error state for background sync failures
      return false;
    }
  }, [notes, selectedNote, setNotes, setSelectedNote]);

  return {
    notes: filteredNotes,
    allNotes: notes, // Unfiltered notes for note linking feature
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
    publicCount,
    createNote: notesOpsCreateNote,
    creatingNote,
    createFolder,
    updateNote,
    updateFolder,
    deleteNote,
    deleteFolder: restNotesOperations.deleteFolder,
    reorderFolders,
    toggleStar: notesOpsToggleStar,
    starringStar,
    archiveNote,
    restoreNote: restNotesOperations.restoreNote,
    hideNote: notesOpsHideNote,
    hidingNote,
    unhideNote: restNotesOperations.unhideNote,
    permanentlyDeleteNote,
    moveNoteToFolder,
    toggleFolderExpansion,
    publishNote,
    unpublishNote,
    syncPublicNote,
    setSelectedNote,
    setSelectedFolder,
    setCurrentView,
    setSearchQuery,
    setNotes,
    setFolders,
    refetch: refreshCurrentFolder,  // Smart refresh: folder-only when in folder, full refresh otherwise
    reinitialize: async () => {
      if (clerkUser) {
        await initializeUser();
        await loadData();
      }
    },
    // BACKLOG: WebSocket sync status moved to upcoming release
    // webSocket: {
    //   status: webSocket.status,
    //   isConnected: webSocket.isConnected,
    //   isAuthenticated: webSocket.isAuthenticated,
    //   userId: webSocket.userId,
    //   error: webSocket.error,
    //   reconnectAttempts: webSocket.reconnectAttempts,
    //   lastSync: webSocket.lastSync,
    //   joinedNotes: webSocket.joinedNotes,
    //   connect: webSocket.connect,
    //   disconnect: webSocket.disconnect,
    //   reconnect: webSocket.reconnect,
    //   clearError: webSocket.clearError,
    // },
  };
}
