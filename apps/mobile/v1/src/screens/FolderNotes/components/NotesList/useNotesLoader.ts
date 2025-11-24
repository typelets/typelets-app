import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, InteractionManager } from 'react-native';

import type { Folder, FolderCounts, Note } from '@/src/services/api';
import { useApiService } from '@/src/services/api';
import { decryptNote } from '@/src/services/api/encryption';

import type { SortConfig } from './FilterSortSheet';

interface UseNotesLoaderProps {
  folderId?: string;
  viewType?: 'all' | 'starred' | 'public' | 'archived' | 'trash';
  sortConfig: SortConfig;
  userId?: string;
  screenFocusTime: React.MutableRefObject<number>;
}

/**
 * Helper to decrypt notes in chunks with periodic yields to keep UI responsive
 * This prevents blocking the main thread during decryption
 */
async function decryptNotesWithYield(
  notes: Note[],
  userId: string,
  chunkSize: number = 5
): Promise<Note[]> {
  const results: Note[] = [];
  let chunksProcessed = 0;

  for (let i = 0; i < notes.length; i += chunkSize) {
    const chunk = notes.slice(i, i + chunkSize);

    // Decrypt this chunk
    const decryptedChunk = await Promise.all(
      chunk.map(note => {
        if (note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]') {
          return decryptNote(note, userId);
        }
        return Promise.resolve(note);
      })
    );

    results.push(...decryptedChunk);
    chunksProcessed++;

    // Yield every 2 chunks (10 notes) to keep UI responsive while maximizing speed
    // Use requestAnimationFrame for better timing than setImmediate
    if (chunksProcessed % 2 === 0 && i + chunkSize < notes.length) {
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    }
  }

  return results;
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
  const cacheKey = `notes-cache-v2-${viewType || 'folder'}-${folderId || 'root'}`; // v2 to invalidate old encrypted caches
  const cacheTimestampKey = `${cacheKey}-timestamp`;
  const cacheLoadedRef = useRef<boolean>(false); // Track if cache was loaded
  const cacheLoadingRef = useRef<Promise<void> | null>(null); // Track if cache is currently loading
  const cachedNotesRef = useRef<Note[]>([]); // Store cached notes for immediate access (state may lag)
  const cacheTimestampRef = useRef<number>(0); // When cache was last saved

  // Helper to create lightweight note previews for caching (minimal content to fit 2MB limit)
  const createNotePreviews = (notes: Note[]): Note[] => {
    // Import stripHtmlTags inline to avoid circular dependency
    const stripHtml = (html: string): string => {
      if (!html) return '';
      let text = html;
      let previous;
      do {
        previous = text;
        text = text.replace(/<[^>]*>/g, '');
      } while (text !== previous);
      return text.replace(/\s+/g, ' ').trim();
    };

    // CRITICAL: Filter out any encrypted notes before caching
    const decryptedNotes = notes.filter(note =>
      note.title !== '[ENCRYPTED]' && note.content !== '[ENCRYPTED]'
    );

    if (decryptedNotes.length < notes.length) {
      console.warn(`[CACHE] ⚠️ Filtered out ${notes.length - decryptedNotes.length} encrypted notes from cache`);
    }

    return decryptedNotes.map(note => ({
      id: note.id,
      title: note.title,
      // Strip HTML and save plain text preview for faster scroll rendering
      content: note.content ? stripHtml(note.content).substring(0, 300) : '',
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      starred: note.starred,
      hidden: note.hidden,
      archived: note.archived,
      deleted: note.deleted,
      folderId: note.folderId,
      userId: note.userId,
      type: note.type,
      attachments: note.attachments,
      // Omit: encryptedKey, iv, salt (not needed for list display)
    })) as Note[];
  };

  // Load cached notes immediately on mount (metadata only, no content)
  useEffect(() => {
    // Reset cache loaded flag when cacheKey changes
    cacheLoadedRef.current = false;
    cachedNotesRef.current = []; // Clear cached notes ref

    const loadCachedNotes = async () => {
      const cacheLoadStart = performance.now();
      try {
        const [cached, timestampStr] = await Promise.all([
          AsyncStorage.getItem(cacheKey),
          AsyncStorage.getItem(cacheTimestampKey)
        ]);

        if (cached) {
          const cachedNotes = JSON.parse(cached) as Note[];
          const cacheTimestamp = timestampStr ? parseInt(timestampStr, 10) : 0;
          const cacheAge = Date.now() - cacheTimestamp;
          cacheTimestampRef.current = cacheTimestamp;

          // Check if cache contains encrypted notes (skeletons)
          const encryptedCount = cachedNotes.filter(n =>
            n.title === '[ENCRYPTED]' || n.content === '[ENCRYPTED]'
          ).length;

          // REJECT cache if it contains ANY encrypted notes
          if (encryptedCount > 0) {
            console.error(`[CACHE] ❌ REJECTED: Cache contains ${encryptedCount}/${cachedNotes.length} encrypted notes - clearing bad cache`);
            await AsyncStorage.removeItem(cacheKey);
            await AsyncStorage.removeItem(cacheTimestampKey);
            cacheLoadedRef.current = false;
            return; // Don't use this cache
          }

          // Store in ref for immediate access (state may lag due to async updates)
          cachedNotesRef.current = cachedNotes;

          // CRITICAL: Set state synchronously to avoid 0 notes state
          setNotes(cachedNotes);
          setLoading(false); // Don't show loading if we have cached data
          cacheLoadedRef.current = true; // Mark cache as loaded

          console.log(`[CACHE] ✅ State updated with ${cachedNotes.length} cached notes`);

          const cacheLoadEnd = performance.now();
          const ageMinutes = (cacheAge / 1000 / 60).toFixed(1);
          console.log(`[CACHE] ✅ Loaded ${cachedNotes.length} fully decrypted notes from cache in ${(cacheLoadEnd - cacheLoadStart).toFixed(2)}ms (age: ${ageMinutes}min)`);
          console.log(`[CACHE] ✅ All cached notes are decrypted (no skeletons)`);
        } else {
          console.log(`[CACHE] No cache found for ${cacheKey}`);
        }
      } catch (error) {
        console.error('[CACHE] Failed to load cached notes:', error);
        // Clear corrupted cache
        AsyncStorage.removeItem(cacheKey).catch(() => {});
      } finally {
        cacheLoadingRef.current = null; // Cache loading complete
      }
    };

    // Store the loading promise so loadNotes can wait for it
    cacheLoadingRef.current = loadCachedNotes();
  }, [cacheKey]);

  const loadNotes = useCallback(async (isRefresh = false) => {
    try {
      const loadStartTime = performance.now();
      console.log(`[PERF OPTIMIZED] 🚀 loadNotes started at ${(loadStartTime - screenFocusTime.current).toFixed(2)}ms from screen focus`);

      // Wait for cache loading to complete if it's still loading
      if (cacheLoadingRef.current) {
        console.log(`[CACHE] ⏳ Waiting for cache to finish loading...`);
        await cacheLoadingRef.current;
        console.log(`[CACHE] ✅ Cache loading complete, proceeding with loadNotes`);
      }

      // Check if we have very fresh cache (< 5 seconds old) - if so, show it IMMEDIATELY
      // For slightly older cache, wait for API to verify no changes
      const cacheAge = Date.now() - cacheTimestampRef.current;
      const cacheIsVeryFresh = cacheLoadedRef.current && cacheAge < 5000; // 5 seconds

      if (cacheIsVeryFresh && cachedNotesRef.current.length > 0 && !isRefresh) {
        console.log(`[PERF ⚡⚡⚡] INSTANT LOAD: Cache is ${(cacheAge / 1000).toFixed(1)}s old - showing immediately!`);
        setNotes(cachedNotesRef.current);
        setLoading(false);
        // Continue to fetch updates in background below
      } else if (!isRefresh && notes.length === 0 && !cacheLoadedRef.current) {
        // Only show loading state if we don't have notes already AND not refreshing AND cache not loaded
        setLoading(true);
      } else if (!isRefresh && (notes.length > 0 || cacheLoadedRef.current)) {
        // We have notes already or cache is loaded - just refresh silently in background
        console.log(`[PERF OPTIMIZED] ⚡ Refreshing silently in background (${notes.length} notes${cacheLoadedRef.current ? ', cache loaded' : ''})`);
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
      } else if (viewType === 'public') {
        // Public view: fetch all non-deleted, non-archived notes
        // Client-side filtering by isPublished happens in useNotesFiltering
        queryParams.deleted = false;
        queryParams.archived = false;
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

      // If we have cached notes loaded, DON'T replace them with encrypted skeletons
      // Keep cached notes visible and merge with API response during decryption
      // Use cachedNotesRef (not state) because state may lag!
      if (cacheLoadedRef.current) {
        console.log(`[PERF OPTIMIZED] Cache active - keeping cached notes visible (${cachedNotesRef.current.length} in ref, ${notes.length} in state), will merge after decryption`);
        // Don't replace with encrypted notes - keep cache visible until decryption
        // But ensure state has the cached notes if it doesn't already
        if (notes.length === 0 && cachedNotesRef.current.length > 0) {
          console.log(`[PERF OPTIMIZED] 🔧 State was empty, re-setting from cache ref (${cachedNotesRef.current.length} notes)`);
          setNotes(cachedNotesRef.current);
        }
      } else {
        // No cache - set encrypted notes immediately (will show skeletons)
        setNotes(sortedNotes);
        console.log(`[PERF OPTIMIZED] No cache - showing ${sortedNotes.length} encrypted notes (skeletons)`);
      }

      // DON'T cache encrypted notes here - wait until after decryption
      // Caching encrypted notes causes skeletons on next load
      console.log(`[CACHE] Skipping cache save of encrypted notes - will save after decryption`);

      // Clear loading state NOW - UI will show immediately
      if (!isRefresh) {
        const showUITime = performance.now();
        console.log(`[PERF OPTIMIZED] ✅ SHOWING UI NOW - Total time: ${(showUITime - screenFocusTime.current).toFixed(2)}ms`);
        setLoading(false);
      }

      // Reuse cacheAge from above - check if cache is still recent (< 30 seconds) for ultra-fast mode
      const cacheIsFresh = cacheLoadedRef.current && cacheAge < 30000; // 30 seconds

      // CRITICAL: Verify cache count matches API result count
      // If counts differ, fresh data is available (new note created, note deleted, etc.)
      // In this case, skip ultra-fast mode and use the fresh API data
      const cacheCountMatches = cachedNotesRef.current.length === sortedNotes.length;

      if (!cacheCountMatches && cacheIsFresh) {
        console.log(`[PERF ⚡⚡⚡] SKIPPING ULTRA FAST MODE: Cache count mismatch (cached: ${cachedNotesRef.current.length}, API: ${sortedNotes.length}) - using fresh data`);
      }

      if (cacheIsFresh && cachedNotesRef.current.length > 0 && cacheCountMatches) {
        console.log(`[PERF ⚡⚡⚡] ULTRA FAST MODE: Cache is ${(cacheAge / 1000).toFixed(1)}s old - SKIPPING ALL DECRYPTION!`);
        console.log(`[PERF ⚡⚡⚡] Using ${cachedNotesRef.current.length} cached notes directly - INSTANT LOAD!`);

        // Just use cache directly, no decryption needed
        setNotes(cachedNotesRef.current);
        if (!isRefresh) {
          setLoading(false);
        }

        // Still load folders in background
        (async () => {
          try {
            if (folderId) {
              const [foldersData, noteCounts] = await Promise.all([
                api.getFolders(),
                api.getCounts(folderId)
              ]);
              const currentFolderSubfolders = foldersData.filter(folder => folder.parentId === folderId);
              const subfoldersWithCounts = currentFolderSubfolders.map(folder => {
                const folderCount = noteCounts[folder.id] as FolderCounts | undefined;
                return { ...folder, noteCount: folderCount?.all || 0 };
              });
              setSubfolders(subfoldersWithCounts);
              setAllFolders(foldersData);
            } else {
              setSubfolders([]);
              const foldersData = await api.getFolders();
              setAllFolders(foldersData);
            }
          } catch (error) {
            console.error('[PERF ⚡⚡⚡] Failed to load folders:', error);
            setSubfolders([]);
          }
        })();

        console.log(`[PERF ⚡⚡⚡] 🎉 ULTRA FAST loadNotes completed - INSTANT!`);
        return;
      }

      // Cache is stale or doesn't exist - proceed with decryption
      // Now decrypt the first 20 notes from the SORTED list IMMEDIATELY (no waiting)
      if (userId && sortedNotes.length > 0) {
        const batchSize = Math.min(20, sortedNotes.length);
        const firstBatch = sortedNotes.slice(0, batchSize);
        const remaining = sortedNotes.slice(batchSize);

        const decryptStart = performance.now();
        console.log(`[PERF OPTIMIZED] 🔐 Starting IMMEDIATE non-blocking decryption of first ${batchSize} sorted notes`);

        // Decrypt first batch with yields to keep UI responsive (5 notes at a time for speed)
        const decryptedBatch = await decryptNotesWithYield(firstBatch, userId, 5);

        const decryptEnd = performance.now();
        console.log(`[PERF OPTIMIZED] 🔓 Non-blocking decryption of first ${batchSize} notes completed in ${(decryptEnd - decryptStart).toFixed(2)}ms`);

        // Update notes with first batch decrypted
        // If cache is active, merge decrypted notes by ID (not index!) to avoid skeleton flash
        // Use cachedNotesRef (not state) to avoid timing issues
        let mergedNotes: Note[];
        if (cacheLoadedRef.current && cachedNotesRef.current.length > 0) {
          // Create maps for efficient lookup
          const decryptedMap = new Map(decryptedBatch.map(n => [n.id, n]));
          const cachedMap = new Map(cachedNotesRef.current.map(n => [n.id, n]));

          // Use sortedNotes (from API) as source of truth for order and existence
          // Prefer decrypted > cached > encrypted for each note
          mergedNotes = sortedNotes.map(freshNote => {
            // First priority: newly decrypted note (first 10)
            if (decryptedMap.has(freshNote.id)) {
              return decryptedMap.get(freshNote.id)!;
            }
            // Second priority: cached note (already decrypted from previous visit)
            if (cachedMap.has(freshNote.id)) {
              return cachedMap.get(freshNote.id)!;
            }
            // Last resort: encrypted note (new notes not in cache - will show skeleton briefly)
            return freshNote;
          });

          const cachedUsed = mergedNotes.filter(n => cachedMap.has(n.id) && !decryptedMap.has(n.id)).length;
          const encryptedCount = mergedNotes.filter(n => n.title === '[ENCRYPTED]' || n.content === '[ENCRYPTED]').length;

          console.log(`[PERF OPTIMIZED] 🔄 Merged: ${decryptedBatch.length} newly decrypted + ${cachedUsed} from cache (${cachedNotesRef.current.length} in ref) + ${encryptedCount} still encrypted`);
          if (encryptedCount > 0) {
            console.warn(`[PERF OPTIMIZED] ⚠️ ${encryptedCount} notes will show SKELETONS until background decrypt completes`);
          } else {
            console.log(`[PERF OPTIMIZED] ✅ NO SKELETONS - all notes from cache or freshly decrypted!`);
          }
        } else {
          // No cache - show decrypted batch + encrypted remaining
          mergedNotes = [...decryptedBatch, ...remaining];
          const encryptedCount = remaining.filter(n => n.title === '[ENCRYPTED]' || n.content === '[ENCRYPTED]').length;
          console.log(`[PERF OPTIMIZED] 🔄 No cache - showing ${decryptedBatch.length} decrypted + ${encryptedCount} encrypted (skeletons)`);
        }

        setNotes(mergedNotes);

        // DON'T cache yet - wait for full background decryption to complete
        // Caching here would save encrypted notes causing skeletons on next load
        console.log(`[CACHE] Skipping cache update after first batch - waiting for full decryption`);

        // Decrypt remaining notes in background (in batches of 10)
        if (remaining.length > 0) {
          const encryptedRemaining = remaining.filter(note =>
            note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]'
          );

          if (encryptedRemaining.length > 0) {
            const bgDecryptStartTime = performance.now();
            console.log(`[PERF OPTIMIZED] 🔐 Starting background decryption of ${encryptedRemaining.length} notes IMMEDIATELY...`);

            // Decrypt ALL in background with yields to keep UI responsive (NO DELAY!)
            setTimeout(async () => {
              try {
                console.log(`[PERF OPTIMIZED] 🔐 Non-blocking background decryption starting now...`);
                const bgDecryptActualStart = performance.now();

                // Decrypt all remaining notes with yields (8 at a time for faster background processing)
                const allDecrypted = await decryptNotesWithYield(encryptedRemaining, userId, 8);

                const bgDecryptEnd = performance.now();
                const totalTime = (bgDecryptEnd - bgDecryptStartTime).toFixed(2);
                const decryptTime = (bgDecryptEnd - bgDecryptActualStart).toFixed(2);

                console.log(`[PERF OPTIMIZED] ✅ Non-blocking background decryption completed: ${encryptedRemaining.length} notes in ${decryptTime}ms (total: ${totalTime}ms including delay)`);

                // Single UI update with all decrypted notes
                const updateMap = new Map(allDecrypted.map(n => [n.id, n]));

                // Then update UI and cache together
                setNotes(currentNotes => {
                  const updatedNotes = currentNotes.map(note => updateMap.get(note.id) || note);

                  // Update cache with fully decrypted notes (runs async, doesn't block UI)
                  const cacheStartTime = performance.now();

                  // Check if any are still encrypted before creating previews
                  const stillEncrypted = updatedNotes.filter(n =>
                    n.title === '[ENCRYPTED]' || n.content === '[ENCRYPTED]'
                  ).length;

                  if (stillEncrypted > 0) {
                    console.error(`[CACHE] ❌ SKIPPING CACHE: ${stillEncrypted}/${updatedNotes.length} notes are still encrypted`);
                  } else {
                    // Only cache if ALL notes are fully decrypted
                    const notePreviews = createNotePreviews(updatedNotes);

                    // Double-check notePreviews don't contain encrypted notes
                    if (notePreviews.length < updatedNotes.length) {
                      console.error(`[CACHE] ❌ ERROR: createNotePreviews filtered out ${updatedNotes.length - notePreviews.length} notes!`);
                    }

                    const timestamp = Date.now();
                    cacheTimestampRef.current = timestamp;

                    Promise.all([
                      AsyncStorage.setItem(cacheKey, JSON.stringify(notePreviews)),
                      AsyncStorage.setItem(cacheTimestampKey, timestamp.toString())
                    ])
                      .then(() => {
                        const cacheEndTime = performance.now();
                        console.log(`[CACHE] 💾 Saved ${notePreviews.length} fully decrypted notes to cache in ${(cacheEndTime - cacheStartTime).toFixed(2)}ms`);
                        console.log(`[CACHE] ✅ Verified: All cached notes are decrypted (no skeletons next time)`);
                      })
                      .catch(error => {
                        console.error('[CACHE] Failed to update cache with decrypted notes:', error);
                        // Clear old cache on error
                        AsyncStorage.removeItem(cacheKey).catch(() => {});
                        AsyncStorage.removeItem(cacheTimestampKey).catch(() => {});
                      });
                  }

                  return updatedNotes;
                });

                console.log(`[PERF OPTIMIZED] 🎉 UI updated with all decrypted notes`);
              } catch (error) {
                console.error('[PERF OPTIMIZED] Decryption error:', error);
              }
            }, 0); // Start background decryption IMMEDIATELY to cache all notes
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
  }, [api, folderId, viewType, sortConfig, userId, screenFocusTime, cacheKey]);

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
