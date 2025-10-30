import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Keyboard, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { FOLDER_CARD, FOLDER_COLORS, NOTE_CARD, SECTION } from '../constants/ui';
import { type Folder, type FolderCounts, type Note, useApiService } from '../services/api';
import { decryptNote } from '../services/api/encryption';
import { useTheme } from '../theme';

interface RouteParams {
  folderId?: string;
  viewType?: 'all' | 'starred' | 'archived' | 'trash';
  searchQuery?: string;
  folderName?: string;
}

interface Props {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: RouteParams;
  };
  renderHeader?: () => React.ReactNode;
  scrollY?: Animated.Value;
}

// Helper function to strip HTML tags and decode entities
function stripHtmlTags(html: string): string {
  if (!html) return '';

  // Remove HTML tags (apply repeatedly to handle nested/incomplete tags)
  let previous;
  let text = html;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);

  // Decode common HTML entities (decode &amp; last to prevent double-unescaping)
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

  // Remove extra whitespace and normalize
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export default function NotesListScreen({ navigation, route, renderHeader, scrollY: parentScrollY }: Props) {
  const theme = useTheme();
  const api = useApiService();
  const { user } = useUser();
  const { folderId, viewType, searchQuery } = route?.params || {};

  const [notes, setNotes] = useState<Note[]>([]);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track if notes have been loaded to prevent unnecessary refetch on navigation back
  const hasLoadedRef = useRef(false);
  const currentParamsRef = useRef<{ folderId?: string; viewType?: string; searchQuery?: string } | null>(null);

  // Performance tracking
  const screenFocusTime = useRef<number>(0);
  const notesLoadedTime = useRef<number>(0);

  // Track when screen first focuses
  useEffect(() => {
    screenFocusTime.current = performance.now();
    console.log(`[PERF OPTIMIZED] Screen focused - starting timer`);
  }, []);

  // Measure UI render time after notes are loaded
  useEffect(() => {
    if (notes.length > 0 && notesLoadedTime.current > 0 && !loading) {
      requestAnimationFrame(() => {
        const renderComplete = performance.now();
        const timeToRender = renderComplete - notesLoadedTime.current;
        const totalTime = renderComplete - screenFocusTime.current;
        console.log(`[PERF OPTIMIZED] UI render time: ${timeToRender.toFixed(2)}ms`);
        console.log(`[PERF OPTIMIZED] TOTAL TIME (focus to ready): ${totalTime.toFixed(2)}ms for ${notes.length} notes`);
        notesLoadedTime.current = 0;
      });
    }
  }, [notes, loading]);

  // Create folder modal state
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter and sort state
  const [filterConfig, setFilterConfig] = useState({
    showAttachmentsOnly: false,
    showStarredOnly: false,
    showHiddenOnly: false,
  });
  const [sortConfig, setSortConfig] = useState<{
    option: 'updated' | 'created' | 'title';
    direction: 'asc' | 'desc';
  }>({
    option: 'created',
    direction: 'desc',
  });

  // Bottom sheet refs
  const createFolderSheetRef = useRef<BottomSheetModal>(null);
  const filterSortSheetRef = useRef<BottomSheetModal>(null);
  const flatListRef = useRef<FlatList<Note>>(null);

  // Snap points
  const snapPoints = useMemo(() => ['55%'], []);
  const filterSortSnapPoints = useMemo(() => ['70%'], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  // Add keyboard listener to snap back to original position
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Snap back to the original position when keyboard hides
        createFolderSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  // Scroll tracking for animated divider (use parent's scrollY if provided)
  const localScrollY = useRef(new Animated.Value(0)).current;
  const scrollY = parentScrollY || localScrollY;

  // Handle loading delay
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Load notes when screen focuses or params change
  useFocusEffect(
    React.useCallback(() => {
      // Check if params have changed
      const paramsChanged =
        !currentParamsRef.current ||
        currentParamsRef.current.folderId !== folderId ||
        currentParamsRef.current.viewType !== viewType ||
        currentParamsRef.current.searchQuery !== searchQuery;

      // Determine if this is the first load
      const isFirstLoad = !hasLoadedRef.current;

      // Always reload when screen comes into focus
      // Use refresh mode if not first load to avoid showing spinner
      if (isFirstLoad || paramsChanged) {
        loadNotes(); // Full load with spinner on first load or param change
        loadViewMode();
        currentParamsRef.current = { folderId, viewType, searchQuery };
      } else {
        // Silent refresh without spinner for subsequent focuses
        loadNotes(true); // Pass true for isRefresh to skip loading state
      }

      // Reset scroll position when screen comes into focus (only if params changed)
      if (paramsChanged && flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [folderId, viewType, searchQuery])
  );

  const loadViewMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('viewMode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load view mode:', error);
    }
  };

  const loadNotes = async (isRefresh = false) => {
    try {
      const loadStartTime = performance.now();
      console.log(`[PERF OPTIMIZED] 🚀 loadNotes started at ${(loadStartTime - screenFocusTime.current).toFixed(2)}ms from screen focus`);

      if (!isRefresh) {
        setLoading(true);
      }

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

      // Now decrypt the first 10 notes from the SORTED list
      const userId = user?.id;
      if (userId && sortedNotes.length > 0) {
        const batchSize = Math.min(10, sortedNotes.length);
        const firstBatch = sortedNotes.slice(0, batchSize);

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

        // Set notes with first batch decrypted, rest still encrypted
        const remaining = sortedNotes.slice(batchSize);
        setNotes([...decryptedBatch, ...remaining]);

        // Clear loading state NOW - UI will show immediately with 10 real notes + 83 skeletons
        if (!isRefresh) {
          const showUITime = performance.now();
          console.log(`[PERF OPTIMIZED] ✅ SHOWING UI NOW - Total time: ${(showUITime - screenFocusTime.current).toFixed(2)}ms`);
          setLoading(false);
        }

        // Mark that notes have been loaded
        hasLoadedRef.current = true;

        // Decrypt remaining notes in background
        if (remaining.length > 0) {
          const encryptedRemaining = remaining.filter(note =>
            note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]'
          );

          if (encryptedRemaining.length > 0) {
            setTimeout(() => {
              console.log(`[PERF OPTIMIZED] 🔐 Starting background decryption of ${encryptedRemaining.length} notes`);
              Promise.all(
                encryptedRemaining.map(note => decryptNote(note, userId))
              ).then(decryptedRemaining => {
                // Update notes: replace encrypted notes with decrypted versions
                setNotes(currentNotes => {
                  const updated = [...currentNotes];
                  decryptedRemaining.forEach(decryptedNote => {
                    const index = updated.findIndex(n => n.id === decryptedNote.id);
                    if (index !== -1) {
                      updated[index] = decryptedNote;
                    }
                  });
                  return updated;
                });
                console.log(`[PERF OPTIMIZED] ✅ Finished decrypting all ${encryptedRemaining.length} remaining notes`);
              });
            }, 500);
          }
        }
      } else {
        setNotes(sortedNotes);
        if (!isRefresh) {
          setLoading(false);
        }
        // Mark that notes have been loaded
        hasLoadedRef.current = true;
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
      // Clear loading state on error
      if (!isRefresh) {
        setLoading(false);
      }
      // Mark as loaded even on error to prevent reload loop
      hasLoadedRef.current = true;
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    try {
      setIsCreatingFolder(true);
      const createdFolder = await api.createFolder(newFolderName.trim(), selectedColor, folderId);

      // Add the new folder to the subfolders list (count will be 0 for new folders)
      setSubfolders(prev => [...prev, { ...createdFolder, noteCount: 0 }]);

      // Reset modal state
      setNewFolderName('');
      setSelectedColor('#3b82f6');
      createFolderSheetRef.current?.dismiss();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.error('Failed to create folder:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadNotes(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmptyTrash = async () => {
    const deletedNotes = notes.filter(note => note.deleted);

    Alert.alert(
      'Empty Trash',
      `Are you sure you want to permanently delete all ${deletedNotes.length} notes in the trash? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              // Empty the trash using the API
              const result = await api.emptyTrash();

              // Reload notes to update the view
              await loadNotes(true);

              Alert.alert('Success', `${result.deletedCount} notes permanently deleted.`);
            } catch (error) {
              if (__DEV__) console.error('Failed to empty trash:', error);
              Alert.alert('Error', 'Failed to empty trash. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Memoize filtering and sorting to avoid recalculation on every render
  const filteredNotes = useMemo(() => {
    // Filter notes by search query
    const searchFilteredNotes = notes.filter(
      note =>
        note.title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        note.content.toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    // Apply additional filters
    const additionallyFilteredNotes = searchFilteredNotes.filter(note => {
      if (filterConfig.showAttachmentsOnly && (!note.attachments || note.attachments.length === 0) && (!note.attachmentCount || note.attachmentCount === 0)) {
        return false;
      }
      if (filterConfig.showStarredOnly && !note.starred) {
        return false;
      }
      return !filterConfig.showHiddenOnly || note.hidden;
    });

    // Sort notes
    return [...additionallyFilteredNotes].sort((a, b) => {
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
          aValue = (a.title || 'Untitled').toLowerCase();
          bValue = (b.title || 'Untitled').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [notes, searchQuery, filterConfig, sortConfig]);

  // Pre-calculate folder paths for all folders (O(n) once instead of O(n*m) repeatedly)
  const folderPathsMap = useMemo(() => {
    const pathMap = new Map<string, string>();

    const buildFolderPath = (folderId: string): string => {
      // Check cache first
      if (pathMap.has(folderId)) {
        return pathMap.get(folderId)!;
      }

      const folder = allFolders.find(f => f.id === folderId);
      if (!folder) return '';

      const path: string[] = [];
      let currentFolder: Folder | undefined = folder;

      while (currentFolder) {
        path.unshift(currentFolder.name);
        if (currentFolder.parentId) {
          // Check if parent path is already calculated
          if (pathMap.has(currentFolder.parentId)) {
            path.unshift(pathMap.get(currentFolder.parentId)!);
            break;
          }
          currentFolder = allFolders.find(f => f.id === currentFolder?.parentId);
        } else {
          break;
        }
      }

      const fullPath = path.join(' / ');
      pathMap.set(folderId, fullPath);
      return fullPath;
    };

    // Pre-calculate paths for all folders
    allFolders.forEach(folder => buildFolderPath(folder.id));

    return pathMap;
  }, [allFolders]);

  // Lazy cache for note previews and dates (only calculate when rendered)
  const notesEnhancedDataCache = useRef(new Map<string, { preview: string; formattedDate: string }>());

  // Clear cache when notes change
  useEffect(() => {
    notesEnhancedDataCache.current.clear();
  }, [notes]);

  // Create a folder lookup map for O(1) access
  const foldersMap = useMemo(() => {
    return new Map(allFolders.map(folder => [folder.id, folder]));
  }, [allFolders]);

  // Check if any filters are active
  const hasActiveFilters = filterConfig.showAttachmentsOnly || filterConfig.showStarredOnly || filterConfig.showHiddenOnly;

  // Skeleton shimmer animation
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Create pulsing animation
    const pulse = Animated.sequence([
      Animated.timing(skeletonOpacity, {
        toValue: 0.7,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(skeletonOpacity, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    // Loop the animation
    Animated.loop(pulse).start();

    // Cleanup
    return () => skeletonOpacity.stopAnimation();
  }, [skeletonOpacity]);

  // Render individual note item
  const renderNoteItem = useCallback(({ item: note, index }: { item: Note; index: number }) => {
    const isLastNote = index === filteredNotes.length - 1;

    // Check if note is still encrypted (loading skeleton)
    // We check the title/content instead of using isNoteEncrypted because
    // decrypted notes still have encryptedTitle/encryptedContent fields
    const noteIsEncrypted = note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]';

    // Render skeleton for encrypted notes
    if (noteIsEncrypted) {
      return (
        <View style={styles.noteListItemWrapper}>
          <View style={styles.noteListItem}>
            <View style={styles.noteListContent}>
              <View style={styles.noteListHeader}>
                <Animated.View
                  style={[
                    styles.skeletonTitle,
                    { backgroundColor: theme.colors.muted, opacity: skeletonOpacity }
                  ]}
                />
                <View style={styles.noteListMeta}>
                  <Animated.View
                    style={[
                      styles.skeletonDate,
                      { backgroundColor: theme.colors.muted, opacity: skeletonOpacity }
                    ]}
                  />
                </View>
              </View>
              <Animated.View
                style={[
                  styles.skeletonPreview,
                  { backgroundColor: theme.colors.muted, opacity: skeletonOpacity }
                ]}
              />
              <Animated.View
                style={[
                  styles.skeletonPreview,
                  { backgroundColor: theme.colors.muted, width: '60%', opacity: skeletonOpacity }
                ]}
              />
            </View>
          </View>
          {!isLastNote && <View style={[styles.noteListDivider, { backgroundColor: theme.colors.border }]} />}
        </View>
      );
    }

    // Lazy calculation - strip HTML and format date only when rendered
    let enhancedData = notesEnhancedDataCache.current.get(note.id);
    if (!enhancedData) {
      enhancedData = {
        preview: note.hidden ? '[HIDDEN]' : stripHtmlTags(note.content || ''),
        formattedDate: new Date(note.createdAt || Date.now()).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      };
      notesEnhancedDataCache.current.set(note.id, enhancedData);
    }

    const folderPath = note.folderId ? folderPathsMap.get(note.folderId) || '' : '';
    const noteFolder = note.folderId ? foldersMap.get(note.folderId) : undefined;

    return (
      <View style={styles.noteListItemWrapper}>
        <Pressable
          onPress={() => navigation?.navigate('ViewNote', { noteId: note.id })}
          style={styles.noteListItem}
          android_ripple={{ color: theme.colors.muted }}
        >
          <View style={styles.noteListContent}>
            <View style={styles.noteListHeader}>
              <Text
                style={[styles.noteListTitle, { color: theme.colors.foreground }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {String(note.title || 'Untitled')}
              </Text>
              <View style={styles.noteListMeta}>
                {((note.attachments?.length ?? 0) > 0 || (note.attachmentCount ?? 0) > 0) && (
                  <View style={styles.attachmentBadge}>
                    <View style={{ transform: [{ rotate: '45deg' }] }}>
                      <Ionicons name="attach-outline" size={14} color="#3b82f6" />
                    </View>
                    <Text style={[styles.attachmentCount, { color: '#3b82f6' }]}>
                      {note.attachments?.length || note.attachmentCount || 0}
                    </Text>
                  </View>
                )}
                {note.starred && (
                  <Ionicons name="star" size={14} color="#f59e0b" style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.noteListTime, { color: theme.colors.mutedForeground }]}>
                  {enhancedData?.formattedDate || ''}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.noteListPreview, { color: theme.colors.mutedForeground }]}
              numberOfLines={2}
            >
              {enhancedData?.preview || ''}
            </Text>
            {!folderId && folderPath && (
              <View style={styles.noteListFolderInfo}>
                <View style={[styles.noteListFolderDot, { backgroundColor: noteFolder?.color || '#6b7280' }]} />
                <Text style={[styles.noteListFolderPath, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
                  {folderPath}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
        {!isLastNote && <View style={[styles.noteListDivider, { backgroundColor: theme.colors.border }]} />}
      </View>
    );
  }, [folderPathsMap, foldersMap, filteredNotes.length, folderId, navigation, theme.colors, skeletonOpacity]);

  // Render list header (subfolders and create note button)
  const renderListHeader = useCallback(() => {
    if (loading) return null;

    return (
      <>
        {/* Header from parent */}
        {renderHeader && renderHeader()}

        {/* Subfolders Section */}
        {!viewType && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
                FOLDERS ({String(subfolders?.length || 0)})
              </Text>
              <View style={styles.viewModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    { backgroundColor: theme.colors.muted },
                    viewMode === 'list' && styles.viewModeButtonActive
                  ]}
                  onPress={async () => {
                    setViewMode('list');
                    try {
                      await AsyncStorage.setItem('viewMode', 'list');
                    } catch (error) {
                      if (__DEV__) console.error('Failed to save view mode:', error);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="list"
                    size={16}
                    color={viewMode === 'list' ? theme.colors.primary : theme.colors.mutedForeground}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.viewModeButton,
                    { backgroundColor: theme.colors.muted },
                    viewMode === 'grid' && styles.viewModeButtonActive
                  ]}
                  onPress={async () => {
                    setViewMode('grid');
                    try {
                      await AsyncStorage.setItem('viewMode', 'grid');
                    } catch (error) {
                      if (__DEV__) console.error('Failed to save view mode:', error);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="grid"
                    size={16}
                    color={viewMode === 'grid' ? theme.colors.primary : theme.colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={viewMode === 'grid' ? styles.subfoldersGrid : styles.subfoldersList}>
              {/* Create Folder Button */}
              <Pressable
                style={[
                  viewMode === 'grid' ? styles.subfolderItemGrid : styles.subfolderItem,
                  { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.secondary, borderColor: theme.colors.border }
                ]}
                onPress={() => createFolderSheetRef.current?.present()}
                android_ripple={{ color: theme.colors.muted }}
              >
                <View style={viewMode === 'grid' ? styles.subfolderContentGrid : styles.subfolderContent}>
                  <Ionicons name="add" size={viewMode === 'grid' ? 24 : 16} color={theme.colors.primary} style={{ marginRight: viewMode === 'grid' ? 0 : 12, marginBottom: viewMode === 'grid' ? 8 : 0 }} />
                  <Text style={[styles.subfolderName, { color: theme.colors.foreground }]}>
                    Create Folder
                  </Text>
                </View>
              </Pressable>

              {subfolders.map((subfolder) => (
                <Pressable
                  key={subfolder.id}
                  style={[
                    viewMode === 'grid' ? styles.subfolderItemGrid : styles.subfolderItem,
                    {
                      backgroundColor: viewMode === 'grid' ? subfolder.color || '#000000' : theme.colors.card,
                      borderColor: theme.colors.border
                    }
                  ]}
                  onPress={() => navigation?.navigate('Notes', { folderId: subfolder.id, folderName: subfolder.name })}
                  android_ripple={{ color: theme.colors.muted }}
                >
                  <View style={viewMode === 'grid' ? styles.subfolderContentGrid : styles.subfolderContent}>
                    {viewMode === 'list' && (
                      <View style={[styles.subfolderColorDot, { backgroundColor: subfolder.color || '#000000' }]} />
                    )}
                    <Text style={[styles.subfolderName, { color: viewMode === 'grid' ? '#ffffff' : theme.colors.foreground }]} numberOfLines={1}>
                      {subfolder.name}
                    </Text>
                  </View>
                  {viewMode === 'list' && (
                    <View style={[styles.subfolderCountBadge, { backgroundColor: theme.colors.muted }]}>
                      <Text style={[styles.subfolderCountText, { color: theme.colors.mutedForeground }]}>
                        {String(subfolder.noteCount || 0)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Notes Section Header */}
        <View style={styles.notesSection}>
          <View style={[styles.sectionHeader, { marginTop: subfolders.length > 0 ? 12 : 16 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
              NOTES ({String(filteredNotes?.length || 0)})
              {filteredNotes.length !== notes.length && ` (${notes.length} total)`}
            </Text>
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                { backgroundColor: theme.colors.muted },
                hasActiveFilters && styles.viewModeButtonActive
              ]}
              onPress={() => filterSortSheetRef.current?.present()}
              activeOpacity={0.7}
            >
              <Ionicons
                name={hasActiveFilters ? "funnel" : "funnel-outline"}
                size={16}
                color={hasActiveFilters ? theme.colors.primary : theme.colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>

          {/* Create Note Button / Empty Trash Button */}
          {viewType === 'trash' ? (
            filteredNotes.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: NOTE_CARD.SPACING }}>
                <TouchableOpacity
                  style={[styles.createNoteButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.destructive }]}
                  onPress={handleEmptyTrash}
                >
                  <View style={styles.subfolderContent}>
                    <Ionicons name="trash" size={16} color={theme.colors.destructive} style={{ marginRight: 12 }} />
                    <Text style={[styles.subfolderName, { color: theme.colors.destructive }]}>
                      Empty Trash
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )
          ) : (
            <View style={{ paddingHorizontal: 16, marginBottom: NOTE_CARD.SPACING }}>
              <TouchableOpacity
                style={[styles.createNoteButton, { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.secondary, borderColor: theme.colors.border }]}
                onPress={() => navigation?.navigate('CreateNote', { folderId: route?.params?.folderId })}
              >
                <View style={styles.subfolderContent}>
                  <Ionicons name="add" size={16} color={theme.colors.primary} style={{ marginRight: 12 }} />
                  <Text style={[styles.subfolderName, { color: theme.colors.foreground }]}>
                    Create Note
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    );
  }, [loading, renderHeader, viewType, subfolders, theme.colors, theme.isDark, viewMode, filteredNotes.length, notes.length, hasActiveFilters, handleEmptyTrash, navigation, route?.params?.folderId]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading || filteredNotes.length > 0) return null;

    if (searchQuery) {
      return (
        <View style={styles.emptySearchState}>
          <Text style={[styles.emptySearchText, { color: theme.colors.mutedForeground }]}>
            No notes found. Try a different search term.
          </Text>
        </View>
      );
    }

    return null;
  }, [loading, filteredNotes.length, searchQuery, theme.colors.mutedForeground]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <Animated.FlatList
          ref={flatListRef}
          data={filteredNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={<View style={{ height: 40 }} />}
          style={styles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.isDark ? '#666666' : '#000000'}
              colors={[theme.isDark ? '#666666' : '#000000']}
            />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={100}
          initialNumToRender={10}
          windowSize={10}
        />
      )}


      {/* Create Folder Bottom Sheet */}
      <BottomSheetModal
        ref={createFolderSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enablePanDownToClose={true}
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetView style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Create Folder</Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => createFolderSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bottomSheetBody}>
            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>Folder Name</Text>
            <BottomSheetTextInput
              style={[styles.input, {
                backgroundColor: theme.colors.muted,
                color: theme.colors.foreground,
                borderColor: theme.colors.border
              }]}
              placeholder="Enter folder name"
              placeholderTextColor={theme.colors.mutedForeground}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 20 }]}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.bottomSheetFooter}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateFolder}
              disabled={isCreatingFolder}
            >
              <Text style={[styles.createButtonText, { color: theme.colors.primaryForeground }]}>
                {isCreatingFolder ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Filter & Sort Bottom Sheet */}
      <BottomSheetModal
        ref={filterSortSheetRef}
        snapPoints={filterSortSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Filter & Sort</Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => filterSortSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bottomSheetBody}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>FILTER</Text>
              <TouchableOpacity
                style={[styles.viewModeButton, { backgroundColor: theme.colors.muted, opacity: hasActiveFilters ? 1 : 0 }]}
                onPress={() => setFilterConfig({ showAttachmentsOnly: false, showStarredOnly: false, showHiddenOnly: false })}
                activeOpacity={0.7}
                disabled={!hasActiveFilters}
              >
                <Ionicons name="close" size={16} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showAttachmentsOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showAttachmentsOnly: !prev.showAttachmentsOnly }))}
            >
              <Ionicons
                name={filterConfig.showAttachmentsOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showAttachmentsOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Attachments Only</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showStarredOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showStarredOnly: !prev.showStarredOnly }))}
            >
              <Ionicons
                name={filterConfig.showStarredOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showStarredOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Starred Only</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showHiddenOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showHiddenOnly: !prev.showHiddenOnly }))}
            >
              <Ionicons
                name={filterConfig.showHiddenOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showHiddenOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Hidden Only</Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 2 }]}>SORT BY</Text>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'updated' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'updated', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'updated' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'updated' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Last Modified</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'created' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'created', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'created' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'created' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Created Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'title' && sortConfig.direction === 'asc' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'title', direction: 'asc' })}
            >
              <Ionicons
                name={sortConfig.option === 'title' && sortConfig.direction === 'asc' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'title' && sortConfig.direction === 'asc' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Title (A-Z)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'title' && sortConfig.direction === 'desc' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'title', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'title' && sortConfig.direction === 'desc' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'title' && sortConfig.direction === 'desc' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Title (Z-A)</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedDivider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    zIndex: 1000,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  noteCardContainer: {
    marginBottom: NOTE_CARD.SPACING,
    paddingHorizontal: 16,
  },
  noteCardContent: {
    padding: NOTE_CARD.PADDING,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: NOTE_CARD.TITLE_SIZE,
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  starIcon: {
    marginLeft: 12,
    marginTop: 1,
  },
  noteContent: {
    fontSize: NOTE_CARD.PREVIEW_SIZE,
    lineHeight: 21,
    opacity: 0.7,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    marginBottom: 10,
    marginHorizontal: -NOTE_CARD.PADDING,
    opacity: 0.3,
  },
  timestamp: {
    fontSize: NOTE_CARD.TIMESTAMP_SIZE,
    opacity: 0.5,
    fontWeight: '400',
  },
  noteCardFooter: {
    flexDirection: 'column',
    gap: 6,
  },
  noteFolderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteFolderDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  noteFolderPath: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '400',
    flex: 1,
  },
  createNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: FOLDER_CARD.PADDING,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
  },
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySearchText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Subfolders styles
  subfoldersSection: {
    marginBottom: SECTION.SPACING,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  subfoldersList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  subfoldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  subfolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: FOLDER_CARD.PADDING,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
  },
  subfolderItemGrid: {
    width: '48%',
    padding: 16,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subfolderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subfolderContentGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subfolderColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subfolderName: {
    fontSize: FOLDER_CARD.NAME_SIZE,
    fontWeight: '500',
  },
  subfolderCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  subfolderCountText: {
    fontSize: FOLDER_CARD.COUNT_SIZE,
    fontWeight: '500',
  },
  notesSection: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  viewModeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  // Grid view styles
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  noteGridItemWrapper: {
    width: '48%',
  },
  noteGridItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
  },
  // List view styles
  noteListItemWrapper: {
    paddingHorizontal: 16,
  },
  noteListItem: {
  },
  noteListContent: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  noteListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteListTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  noteListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 8,
  },
  attachmentCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteListTime: {
    fontSize: 14,
    fontWeight: '400',
  },
  noteListPreview: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  noteListFolderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  noteListFolderDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  noteListFolderPath: {
    fontSize: 13,
    fontWeight: '400',
  },
  noteListDivider: {
    height: 1,
    marginLeft: 0,
  },
  // Bottom sheet styles
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
  },
  bottomSheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomSheetFooter: {
    paddingHorizontal: 20,
  },
  createButton: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    flex: 1,
  },
  // Skeleton loading styles (opacity is animated, not static)
  skeletonTitle: {
    height: 20,
    width: '60%',
    borderRadius: 4,
  },
  skeletonDate: {
    height: 14,
    width: 60,
    borderRadius: 4,
  },
  skeletonPreview: {
    height: 16,
    width: '100%',
    borderRadius: 4,
    marginTop: 6,
  },
});
