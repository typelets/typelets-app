import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, DeviceEventEmitter, InteractionManager, Pressable, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList, type FlashList as FlashListType } from '@shopify/flash-list';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SquarePen } from 'lucide-react-native';

import { type Folder, type Note, useApiService } from '@/src/services/api';
import { useTheme } from '@/src/theme';
import { stripHtmlTags } from '@/src/utils/noteUtils';

import { CreateFolderSheet } from './CreateFolderSheet';
import { EmptyState } from './EmptyState';
import { FilterConfig, FilterSortSheet, SortConfig } from './FilterSortSheet';
import { NoteActionsSheet, type NoteActionsSheetRef } from './NoteActionsSheet';
import { NoteListItem } from './NoteListItem';
import { NotesHeader } from './NotesHeader';
import { SubfoldersList } from './SubfoldersList';
import { useFolderPaths } from './useFolderPaths';
import { useNotesFiltering } from './useNotesFiltering';
import { useNotesLoader } from './useNotesLoader';

// Constants for FAB scroll behavior
const FAB_ANIMATION_DISTANCE = 20;      // Distance to slide up during animation

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
  contentInsetTop?: number;
}

export default function NotesList({ navigation, route, renderHeader, scrollY: parentScrollY, contentInsetTop }: Props) {
  const theme = useTheme();
  const { user } = useUser();
  const api = useApiService();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { folderId, viewType, searchQuery } = route?.params || {};

  const [refreshing, setRefreshing] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [archivingNoteId, setArchivingNoteId] = useState<string | null>(null);
  const [closeSwipeables, setCloseSwipeables] = useState(0);
  const [showLoading, setShowLoading] = useState(false);

  // Performance tracking
  const screenFocusTime = useRef<number>(0);

  // Filter and sort state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    showAttachmentsOnly: false,
    showStarredOnly: false,
    showHiddenOnly: false,
    showCodeOnly: false,
    showDiagramOnly: false,
    showPublicOnly: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    option: 'created',
    direction: 'desc',
  });

  // Load notes with custom hook
  const { notes, setNotes, subfolders, setSubfolders, allFolders, loading, loadNotes } = useNotesLoader({
    folderId,
    viewType,
    sortConfig,
    userId: user?.id,
    screenFocusTime,
  });

  // Track when screen first focuses
  useEffect(() => {
    screenFocusTime.current = performance.now();
    console.log(`[PERF OPTIMIZED] Screen focused - starting timer`);
  }, []);

  // Delay showing spinner by 500ms to avoid flash for fast loads
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading && notes.length === 0) {
      timer = setTimeout(() => setShowLoading(true), 500);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading, notes.length]);

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Bottom sheet refs
  const createFolderSheetRef = useRef<BottomSheetModal>(null);
  const filterSortSheetRef = useRef<BottomSheetModal>(null);
  const noteActionsSheetRef = useRef<NoteActionsSheetRef>(null);
  const flatListRef = useRef<FlashListType<Note>>(null);
  const createNoteButtonRef = useRef<View>(null);

  // Scroll tracking for animated divider (use parent's scrollY if provided)
  const localScrollY = useRef(new Animated.Value(0)).current;
  const scrollY = parentScrollY || localScrollY;

  // Track if create note button is off screen
  const [createNoteButtonY, setCreateNoteButtonY] = useState(0);
  const [isCreateNoteButtonOffScreen, setIsCreateNoteButtonOffScreen] = useState(false);

  // Calculate FAB visibility based on whether Create Note button is off screen
  const fabOpacity = useRef(new Animated.Value(0)).current;
  const fabTranslateY = useRef(new Animated.Value(FAB_ANIMATION_DISTANCE)).current;

  // Update FAB visibility when button goes off screen
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fabOpacity, {
        toValue: isCreateNoteButtonOffScreen ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fabTranslateY, {
        toValue: isCreateNoteButtonOffScreen ? 0 : FAB_ANIMATION_DISTANCE,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isCreateNoteButtonOffScreen]);

  // Measure create note button position on mount and layout changes
  useEffect(() => {
    if (createNoteButtonRef.current) {
      createNoteButtonRef.current.measureInWindow((x, y, width, height) => {
        setCreateNoteButtonY(y + height);
      });
    }
  }, [notes.length, subfolders.length]);

  // Check if button is off screen based on scroll position
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      if (createNoteButtonY > 0) {
        // Button is off screen when its bottom position is above the top of the screen
        // Add a small buffer (50px) to trigger slightly before it's completely gone
        const isOffScreen = value > createNoteButtonY - 100;
        if (isOffScreen !== isCreateNoteButtonOffScreen) {
          setIsCreateNoteButtonOffScreen(isOffScreen);
        }
      }
    });

    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY, createNoteButtonY, isCreateNoteButtonOffScreen]);

  // Track last optimistic update to prevent immediate reload from overwriting it
  const lastOptimisticUpdateRef = useRef<number>(0);

  // Listen for note creation/update/delete events for optimistic UI updates
  useEffect(() => {
    const createdSubscription = DeviceEventEmitter.addListener('noteCreated', (note: Note) => {
      // Optimistically add the note to the list immediately
      setNotes(prevNotes => {
        // Check if note already exists (avoid duplicates)
        if (prevNotes.some(n => n.id === note.id)) {
          return prevNotes;
        }
        // Add note to the beginning of the list
        return [note, ...prevNotes];
      });
      // Track that we just did an optimistic update
      lastOptimisticUpdateRef.current = Date.now();
    });

    const updatedSubscription = DeviceEventEmitter.addListener('noteUpdated', (updatedData: Partial<Note> & { id: string }) => {
      // Optimistically update the note in the list immediately
      setNotes(prevNotes => {
        return prevNotes.map(n => n.id === updatedData.id ? { ...n, ...updatedData } : n);
      });
      // Track that we just did an optimistic update
      lastOptimisticUpdateRef.current = Date.now();
    });

    const deletedSubscription = DeviceEventEmitter.addListener('noteDeleted', (noteId: string) => {
      // Optimistically remove the note from the list immediately
      setNotes(prevNotes => {
        return prevNotes.filter(n => n.id !== noteId);
      });
      // Track that we just did an optimistic update
      lastOptimisticUpdateRef.current = Date.now();
    });

    return () => {
      createdSubscription.remove();
      updatedSubscription.remove();
      deletedSubscription.remove();
    };
  }, [setNotes]);

  // Track if this is the first focus (to force load)
  const isFirstFocus = useRef(true);

  // Load notes when screen focuses or params change
  useFocusEffect(
    React.useCallback(() => {
      // Skip reload if we just did an optimistic update (within 500ms)
      const timeSinceOptimisticUpdate = Date.now() - lastOptimisticUpdateRef.current;
      if (timeSinceOptimisticUpdate < 500) {
        if (__DEV__) {
          console.log('[NotesList] Skipping reload - just did optimistic update');
        }
        loadViewMode();
        return;
      }

      // Skip full reload on navigation back IF we already have decrypted notes
      // Only reload on first focus or when params change (deps)
      // Check if notes are actually decrypted (not just encrypted placeholders)
      const hasDecryptedNotes = notes.length > 0 && notes.some(note =>
        note.title !== '[ENCRYPTED]' && note.content !== '[ENCRYPTED]'
      );

      if (!isFirstFocus.current && hasDecryptedNotes) {
        if (__DEV__) {
          console.log('[NotesList] Skipping reload - already have', notes.length, 'decrypted notes cached');
        }
        loadViewMode();
        return;
      }

      if (__DEV__) {
        console.log('[NotesList] Full reload - first focus or params changed');
      }
      isFirstFocus.current = false;

      loadNotes();
      loadViewMode();
      // Reset scroll position when screen comes into focus
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }

      // Cleanup function - close all swipeables when navigating away
      return () => {
        setCloseSwipeables(prev => prev + 1);
      };
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

  const handleFolderCreated = useCallback((folder: Folder & { noteCount: number }) => {
    setSubfolders(prev => [...prev, folder]);
  }, [setSubfolders]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      // Save current scroll position before refresh
      const currentOffset = scrollY._value || 0;

      await loadNotes(true);

      // Restore scroll position after a small delay to let FlashList settle
      if (currentOffset > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: currentOffset, animated: false });
        }, 50);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmptyTrash = useCallback(async () => {
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
            // Save current notes in case we need to restore on error
            const previousNotes = [...notes];

            try {
              if (__DEV__) {
                console.log(`[NotesList] Empty trash - clearing ${deletedNotes.length} notes optimistically`);
              }

              // Optimistically clear all deleted notes from the list immediately
              setNotes(prevNotes => {
                const filtered = prevNotes.filter(n => !n.deleted);
                if (__DEV__) {
                  console.log(`[NotesList] After filter: ${prevNotes.length} -> ${filtered.length} notes`);
                }
                return filtered;
              });
              lastOptimisticUpdateRef.current = Date.now();

              // Empty the trash using the API
              if (__DEV__) {
                console.log(`[NotesList] Calling api.emptyTrash()`);
              }
              const result = await api.emptyTrash();
              if (__DEV__) {
                console.log(`[NotesList] api.emptyTrash() completed - ${result.deletedCount} deleted`);
              }

              // Success haptic feedback
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Navigate to main folders screen
              router.replace('/');
            } catch (error) {
              // Restore notes on error
              setNotes(previousNotes);
              if (__DEV__) console.error('Failed to empty trash:', error);
              Alert.alert('Error', 'Failed to empty trash. Please try again.');
            }
          },
        },
      ]
    );
  }, [notes, setNotes, api, router]);

  // Lazy cache for note previews and dates (only calculate when rendered)
  // DON'T clear this cache - let it persist across updates
  const notesEnhancedDataCache = useRef(new Map<string, { preview: string; formattedDate: string }>());

  // Pre-populate the enhanced data cache SYNCHRONOUSLY before filtering
  // This ensures FlashList has all preview data ready when rendering
  useMemo(() => {
    // Skip if no notes
    if (notes.length === 0) return;

    const populateStart = performance.now();
    let newEntriesCount = 0;

    // Pre-create date formatter for better performance
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    });

    notes.forEach(note => {
      // Skip if already in cache
      if (notesEnhancedDataCache.current.has(note.id)) return;

      // Generate preview (same logic as NoteListItem)
      let preview: string;
      if (note.hidden) {
        preview = '[HIDDEN]';
      } else if (!note.content || note.content.trim() === '') {
        // Empty content - just show blank (skip detectNoteType for performance)
        preview = '';
      } else {
        // Content is already stripped in cache, but check just in case
        const hasHtmlTags = note.content.includes('<');
        preview = hasHtmlTags
          ? stripHtmlTags(note.content).substring(0, 200)
          : note.content.substring(0, 200);
      }

      // Format date using pre-created formatter (faster)
      const formattedDate = dateFormatter.format(new Date(note.createdAt || Date.now()));

      notesEnhancedDataCache.current.set(note.id, { preview, formattedDate });
      newEntriesCount++;
    });

    const populateEnd = performance.now();
    if (newEntriesCount > 0) {
      console.log(`[CACHE] ⚡ Pre-populated ${newEntriesCount} note previews in ${(populateEnd - populateStart).toFixed(2)}ms (synchronous)`);
    }
  }, [notes]);

  // Filter and sort notes (enhanced cache is populated above)
  const filteredNotes = useNotesFiltering(notes, searchQuery, filterConfig, sortConfig);

  // Pre-calculate folder paths
  const folderPathsMap = useFolderPaths(allFolders);

  // Create a folder lookup map for O(1) access
  const foldersMap = useMemo(() => {
    return new Map(allFolders.map(folder => [folder.id, folder]));
  }, [allFolders]);

  // Check if any filters are active
  const hasActiveFilters = filterConfig.showAttachmentsOnly || filterConfig.showStarredOnly || filterConfig.showHiddenOnly || filterConfig.showCodeOnly || filterConfig.showDiagramOnly || filterConfig.showPublicOnly;

  // Extract theme colors as individual values to prevent object recreation
  const foregroundColor = theme.colors.foreground;
  const mutedForegroundColor = theme.colors.mutedForeground;
  const mutedColor = theme.colors.muted;
  const borderColor = theme.colors.border;
  const backgroundColor = theme.colors.background;

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

  // Stable onPress handler (fixes React.memo breaking)
  const handleNotePress = useCallback((noteId: string) => {
    navigation?.navigate('ViewNote', { noteId });
  }, [navigation]);

  // Handle long press to show actions
  const handleNoteLongPress = useCallback((note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    noteActionsSheetRef.current?.present(note);
  }, []);

  // Handle edit note
  const handleEditNote = useCallback((noteId: string) => {
    navigation?.navigate('EditNote', { noteId });
  }, [navigation]);

  // Handle move to folder
  const handleMoveToFolder = useCallback(async (noteId: string, newFolderId: string | null) => {
    try {
      // Build update object
      const updateData: { folderId?: string; archived?: boolean; deleted?: boolean } = {
        folderId: newFolderId || undefined,
      };

      // If moving from archive or trash, unset those flags
      if (viewType === 'archived') {
        updateData.archived = false;
      } else if (viewType === 'trash') {
        updateData.deleted = false;
      }

      await api.updateNote(noteId, updateData);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // If we're viewing a specific folder and the note is moved to a different folder, remove it from view
      if (folderId && newFolderId !== folderId) {
        // Remove from current view since it's no longer in this folder
        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
      } else if (viewType === 'archived' || viewType === 'trash') {
        // If viewing archive or trash, remove the note when moved (it's now unarchived/undeleted)
        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
      } else {
        // Otherwise just update the folderId in place (e.g., "All Notes" view, starred view, etc.)
        setNotes(prevNotes =>
          prevNotes.map(n => n.id === noteId ? { ...n, folderId: newFolderId || undefined } : n)
        );
      }
      lastOptimisticUpdateRef.current = Date.now();

      // Emit event for other listeners
      DeviceEventEmitter.emit('noteUpdated', { id: noteId, folderId: newFolderId });
    } catch (error) {
      console.error('Failed to move note:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to move note. Please try again.');
      loadNotes();
    }
  }, [api, folderId, viewType, setNotes, loadNotes]);

  // Handle toggle star
  const handleToggleStar = useCallback(async (noteId: string) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const newStarredValue = !note.starred;

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Optimistically update the note in the list FIRST for instant feedback
      setNotes(prevNotes =>
        prevNotes.map(n => n.id === noteId ? { ...n, starred: newStarredValue } : n)
      );
      lastOptimisticUpdateRef.current = Date.now();

      // Then update via API
      await api.updateNote(noteId, { starred: newStarredValue });

      // Emit event for other listeners
      DeviceEventEmitter.emit('noteUpdated', { id: noteId, starred: newStarredValue });
    } catch (error) {
      console.error('Failed to toggle star:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update note. Please try again.');
      // Reload to restore correct state
      loadNotes();
    }
  }, [api, notes, setNotes, loadNotes]);

  // Handle delete note (move to trash)
  const handleDeleteNote = useCallback((noteId: string) => {
    // Fire haptic feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Set deleting state IMMEDIATELY to show spinner
    setDeletingNoteId(noteId);

    // Run API call after interactions complete (non-blocking)
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Update note as deleted
        await api.updateNote(noteId, { deleted: true });

        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Keep spinner visible briefly before removing note
        await new Promise(resolve => setTimeout(resolve, 200));

        // Emit event - the event listener will handle removing from UI
        DeviceEventEmitter.emit('noteDeleted', noteId);
      } catch (error) {
        console.error('Failed to delete note:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to delete note. Please try again.');
      } finally {
        setDeletingNoteId(null);
      }
    });
  }, [api]);

  // Handle archive note
  const handleArchiveNote = useCallback((noteId: string) => {
    // Fire haptic feedback immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Set archiving state IMMEDIATELY to show spinner
    setArchivingNoteId(noteId);

    // Run API call after interactions complete (non-blocking)
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Update note as archived
        await api.updateNote(noteId, { archived: true });

        // Success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Keep spinner visible briefly before removing note
        await new Promise(resolve => setTimeout(resolve, 200));

        // Remove from current view immediately (archived notes don't show in folder/all views)
        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
        lastOptimisticUpdateRef.current = Date.now();

        // Emit event for other listeners
        DeviceEventEmitter.emit('noteUpdated', { id: noteId, archived: true });
      } catch (error) {
        console.error('Failed to archive note:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to archive note. Please try again.');
      } finally {
        setArchivingNoteId(null);
      }
    });
  }, [api, setNotes]);

  // Render individual note item
  const renderNoteItem = useCallback(({ item: note, index }: { item: Note; index: number }) => {
    return (
      <NoteListItem
        note={note}
        isLastItem={index === filteredNotes.length - 1}
        folderId={folderId}
        onPress={handleNotePress}
        onLongPress={handleNoteLongPress}
        onDelete={handleDeleteNote}
        onArchive={handleArchiveNote}
        folderPathsMap={folderPathsMap}
        foldersMap={foldersMap}
        skeletonOpacity={skeletonOpacity}
        enhancedDataCache={notesEnhancedDataCache}
        foregroundColor={foregroundColor}
        mutedForegroundColor={mutedForegroundColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        isDeleting={deletingNoteId === note.id}
        isArchiving={archivingNoteId === note.id}
        closeSwipeables={closeSwipeables}
      />
    );
  }, [filteredNotes.length, folderId, handleNotePress, handleNoteLongPress, handleDeleteNote, handleArchiveNote, folderPathsMap, foldersMap, skeletonOpacity, notesEnhancedDataCache, foregroundColor, mutedForegroundColor, mutedColor, borderColor, backgroundColor, deletingNoteId, archivingNoteId, closeSwipeables]);

  // Render list header (subfolders and create note button)
  const renderListHeader = useCallback(() => {
    // Don't hide header when loading - show it once we have notes
    if (loading && notes.length === 0) return null;

    return (
      <>
        {/* Header from parent */}
        {renderHeader && renderHeader()}

        {/* Subfolders Section */}
        {!viewType && (
          <SubfoldersList
            subfolders={subfolders}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onCreateFolderPress={() => createFolderSheetRef.current?.present()}
            onFolderPress={(folderId, folderName) => navigation?.navigate('Notes', { folderId, folderName })}
          />
        )}

        {/* Notes Section Header */}
        <NotesHeader
          filteredNotesCount={filteredNotes.length}
          totalNotesCount={notes.length}
          hasActiveFilters={hasActiveFilters}
          viewType={viewType}
          subfoldersCount={subfolders.length}
          onFilterPress={() => filterSortSheetRef.current?.present()}
          onCreateNotePress={() => navigation?.navigate('CreateNote', { folderId: route?.params?.folderId })}
          onEmptyTrashPress={handleEmptyTrash}
          createNoteButtonRef={createNoteButtonRef}
        />
      </>
    );
  }, [loading, notes.length, renderHeader, viewType, subfolders, viewMode, filteredNotes.length, hasActiveFilters, handleEmptyTrash, navigation, route?.params?.folderId, filterSortSheetRef]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading || filteredNotes.length > 0) return null;
    return <EmptyState searchQuery={searchQuery} />;
  }, [loading, filteredNotes.length, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {showLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      <FlashList
        ref={flatListRef}
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentInsetTop ? { paddingTop: contentInsetTop } : undefined}
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
            progressViewOffset={insets.top}
          />
        }
        drawDistance={2000}
        getItemType={() => {
          // Help FlashList recycle items better
          return 'note';
        }}
        overrideItemLayout={(layout) => {
          // Fixed layout for better scrolling performance
          // Padding: 12*2=24, Header: 23+8, Preview: 40+6, Meta: 20, Divider: 1
          layout.size = 112;
        }}
      />

      {/* Create Folder Bottom Sheet */}
      <CreateFolderSheet
        ref={createFolderSheetRef}
        folderId={folderId}
        onFolderCreated={handleFolderCreated}
      />

      {/* Filter & Sort Bottom Sheet */}
      <FilterSortSheet
        ref={filterSortSheetRef}
        filterConfig={filterConfig}
        setFilterConfig={setFilterConfig}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Note Actions Bottom Sheet */}
      <NoteActionsSheet
        ref={noteActionsSheetRef}
        note={null}
        folders={allFolders}
        onEdit={handleEditNote}
        onMoveToFolder={handleMoveToFolder}
        onToggleStar={handleToggleStar}
        onArchive={handleArchiveNote}
        onDelete={handleDeleteNote}
      />

      {/* Floating Action Button - Only visible when Create Note button scrolls off screen */}
      {viewType !== 'trash' && isCreateNoteButtonOffScreen && (
        <Pressable
          style={[
            styles.fab,
            {
              bottom: insets.bottom + 20,
              right: 20,
            }
          ]}
          onPress={() => navigation?.navigate('CreateNote', { folderId: route?.params?.folderId })}
        >
          <GlassView glassEffectStyle="regular" style={styles.fabGlass} pointerEvents="none">
            <View style={[styles.fabButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <SquarePen size={20} color={theme.colors.foreground} />
            </View>
          </GlassView>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabGlass: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
