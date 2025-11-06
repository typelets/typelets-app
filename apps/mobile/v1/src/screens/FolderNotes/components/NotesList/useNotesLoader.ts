import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { Folder, FolderCounts, Note } from '@/src/services/api';
import { useApiService } from '@/src/services/api';
import { decryptNote } from '@/src/services/api/encryption';

import type { SortConfig } from './FilterSortSheet';

interface UseNotesLoaderProps {
  folderId?: string;
  viewType?: 'all' | 'starred' | 'archived' | 'trash';
  sortConfig: SortConfig;
  userId?: string;
  screenFocusTime: React.MutableRefObject<number>;
}

export function useNotesLoader({
  folderId,
  viewType,
  sortConfig,
  userId,
  screenFocusTime,
}: UseNotesLoaderProps) {
  const api = useApiService();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const notesLoadedTime = useRef<number>(0);

  const loadNotes = useCallback(async (isRefresh = false) => {
    try {
      const loadStartTime = performance.now();
      console.log(`[PERF OPTIMIZED] 🚀 loadNotes started at ${(loadStartTime - screenFocusTime.current).toFixed(2)}ms from screen focus`);

      // Only show loading state if we don't have notes already AND not refreshing
      // When refreshing, the RefreshControl shows its own spinner, so we don't need the loading overlay
      if (!isRefresh && notes.length === 0) {
        setLoading(true);
      } else if (!isRefresh && notes.length > 0) {
        // We have notes already - just refresh silently in background
        console.log(`[PERF OPTIMIZED] ⚡ Refreshing ${notes.length} notes silently in background`);
      }
      // Note: When isRefresh=true, we don't set loading=true because RefreshControl shows its own spinner

      // Build query params for server-side filtering
      const queryParams: Record<string, string | boolean | undefined> = {};

      // Add folder filter if specified
      if (folderId) {
        queryParams.folderId = folderId;
      }

      // Add view type filters
      if (viewType === 'starred') {
        queryParams.starred = true;
      } else if (viewType === 'archived') {
        queryParams.archived = true;
      } else if (viewType === 'trash') {
        queryParams.deleted = true;
      } else if (viewType === 'all') {
        // For 'all' view, exclude deleted and archived
        queryParams.deleted = false;
        queryParams.archived = false;
      } else if (folderId) {
        // For regular folder view (no viewType), exclude deleted and archived
        queryParams.deleted = false;
        queryParams.archived = false;
      }

      // Fetch notes with server-side filtering (much faster!)
      const apiCallStart = performance.now();
      console.log(`[PERF OPTIMIZED] 📡 Starting API call at ${(apiCallStart - screenFocusTime.current).toFixed(2)}ms`);
      const filteredNotes = await api.getNotes(queryParams);

      if (__DEV__) {
        console.log('✅ Fetched notes with server-side filtering:', filteredNotes.length);
      }

      notesLoadedTime.current = performance.now();
      const apiDuration = notesLoadedTime.current - apiCallStart;
      console.log(`[PERF OPTIMIZED] 📦 API call completed in ${apiDuration.toFixed(2)}ms - ${filteredNotes.length} notes loaded`);

      // Sort notes first (we can sort encrypted notes by date metadata)
      const sortedNotes = [...filteredNotes].sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (sortConfig.option) {
          case 'updated':
            aValue = new Date(a.updatedAt);
            bValue = new Date(b.updatedAt);
            break;
          case 'created':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'title':
            // For encrypted notes, title will be '[ENCRYPTED]', so we use createdAt as fallback
            aValue = a.title === '[ENCRYPTED]' ? new Date(a.createdAt) : (a.title || 'Untitled').toLowerCase();
            bValue = b.title === '[ENCRYPTED]' ? new Date(b.createdAt) : (b.title || 'Untitled').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });

      // Set ALL notes immediately with [ENCRYPTED] markers so UI shows all items (skeletons)
      setNotes(sortedNotes);

      // Clear loading state NOW - UI will show immediately with all skeletons
      if (!isRefresh) {
        const showUITime = performance.now();
        console.log(`[PERF OPTIMIZED] ✅ SHOWING UI NOW with ${sortedNotes.length} notes (all as skeletons initially) - Total time: ${(showUITime - screenFocusTime.current).toFixed(2)}ms`);
        setLoading(false);
      }

      // Now decrypt the first 10 notes from the SORTED list (after UI renders)
      if (userId && sortedNotes.length > 0) {
        const batchSize = Math.min(10, sortedNotes.length);
        const firstBatch = sortedNotes.slice(0, batchSize);
        const remaining = sortedNotes.slice(batchSize);

        // Small delay to ensure UI renders with all skeletons first
        await new Promise(resolve => setTimeout(resolve, 50));

        const decryptStart = performance.now();
        console.log(`[PERF OPTIMIZED] 🔐 Starting decryption of first ${batchSize} sorted notes`);

        // Decrypt first batch
        const decryptedBatch = await Promise.all(
          firstBatch.map(note => {
            if (note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]') {
              return decryptNote(note, userId);
            }
            return Promise.resolve(note);
          })
        );

        const decryptEnd = performance.now();
        console.log(`[PERF OPTIMIZED] 🔓 Decrypted first ${batchSize} notes in ${(decryptEnd - decryptStart).toFixed(2)}ms`);

        // Update notes with first batch decrypted, rest still encrypted
        setNotes([...decryptedBatch, ...remaining]);

        // Decrypt remaining notes in background (in batches of 10)
        if (remaining.length > 0) {
          const encryptedRemaining = remaining.filter(note =>
            note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]'
          );

          if (encryptedRemaining.length > 0) {
            console.log(`[PERF OPTIMIZED] 🔐 Starting background decryption of ${encryptedRemaining.length} notes - will update once at end`);

            // Decrypt ALL in background, update UI ONCE at end to avoid scroll jank
            setTimeout(async () => {
              try {
                // Decrypt all remaining notes at once (parallel for speed)
                const allDecrypted = await Promise.all(
                  encryptedRemaining.map(note => decryptNote(note, userId))
                );

                console.log(`[PERF OPTIMIZED] ✅ Decrypted all ${encryptedRemaining.length} notes - applying single update`);

                // Single UI update with all decrypted notes
                const updateMap = new Map(allDecrypted.map(n => [n.id, n]));

                setNotes(currentNotes => {
                  return currentNotes.map(note => updateMap.get(note.id) || note);
                });

                console.log(`[PERF OPTIMIZED] 🎉 UI updated with all decrypted notes`);
              } catch (error) {
                console.error('[PERF OPTIMIZED] Decryption error:', error);
              }
            }, 1000); // Wait longer before starting decryption
          }
        }
      } else {
        setNotes(sortedNotes);
        if (!isRefresh) {
          setLoading(false);
        }
      }

      // Load subfolders and their counts in background (non-blocking)
      console.log(`[PERF OPTIMIZED] 📂 Loading folders in background (non-blocking) at ${(performance.now() - screenFocusTime.current).toFixed(2)}ms`);
      (async () => {
        try {
          if (folderId) {
            // Get folders and counts in parallel
            const [foldersData, noteCounts] = await Promise.all([
              api.getFolders(),
              api.getCounts(folderId) // Get counts for subfolders of this folder
            ]);

            // If viewing a specific folder, show its subfolders
            const currentFolderSubfolders = foldersData.filter(folder => folder.parentId === folderId);

            // Add note counts from the API response
            // API returns folder counts directly as { folderId: { all, starred, ... } }
            const subfoldersWithCounts = currentFolderSubfolders.map(folder => {
              const folderCount = noteCounts[folder.id] as FolderCounts | undefined;
              return {
                ...folder,
                noteCount: folderCount?.all || 0
              };
            });

            setSubfolders(subfoldersWithCounts);
            setAllFolders(foldersData);
          } else {
            // Don't show folders in special views (all, starred, archived, trash)
            setSubfolders([]);
            // Still need folders for displaying folder info in note list
            const foldersData = await api.getFolders();
            setAllFolders(foldersData);
          }
        } catch (error) {
          console.error('[PERF OPTIMIZED] Failed to load folders in background:', error);
          setSubfolders([]);
        }
      })();

      // Log that loadNotes function has completed and returned
      console.log(`[PERF OPTIMIZED] 🎉 loadNotes function completed and returned at ${(performance.now() - screenFocusTime.current).toFixed(2)}ms`);
    } catch (error) {
      if (__DEV__) console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
      setNotes([]);
      setSubfolders([]);
      // Always clear loading state on error
      setLoading(false);
    }
  }, [api, folderId, viewType, sortConfig, userId, screenFocusTime]);

  return {
    notes,
    setNotes,
    subfolders,
    setSubfolders,
    allFolders,
    loading,
    loadNotes,
  };
}
