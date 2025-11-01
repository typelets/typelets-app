import { useUser } from '@clerk/clerk-expo';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback,useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { type Folder, type Note, useApiService } from '../../services/api';
import { useTheme } from '../../theme';
import { CreateFolderSheet } from './CreateFolderSheet';
import { EmptyState } from './EmptyState';
import { FilterConfig, FilterSortSheet, SortConfig } from './FilterSortSheet';
import { NoteListItem } from './NoteListItem';
import { NotesHeader } from './NotesHeader';
import { SubfoldersList } from './SubfoldersList';
import { useFolderPaths } from './useFolderPaths';
import { useNotesFiltering } from './useNotesFiltering';
import { useNotesLoader } from './useNotesLoader';

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

export default function NotesListScreen({ navigation, route, renderHeader, scrollY: parentScrollY }: Props) {
  const theme = useTheme();
  const { user } = useUser();
  const api = useApiService();
  const { folderId, viewType, searchQuery } = route?.params || {};

  const [refreshing, setRefreshing] = useState(false);

  // Performance tracking
  const screenFocusTime = useRef<number>(0);

  // Filter and sort state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    showAttachmentsOnly: false,
    showStarredOnly: false,
    showHiddenOnly: false,
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

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Bottom sheet refs
  const createFolderSheetRef = useRef<BottomSheetModal>(null);
  const filterSortSheetRef = useRef<BottomSheetModal>(null);
  const flatListRef = useRef<FlatList<Note>>(null);

  // Scroll tracking for animated divider (use parent's scrollY if provided)
  const localScrollY = useRef(new Animated.Value(0)).current;
  const scrollY = parentScrollY || localScrollY;

  // Load notes when screen focuses or params change
  useFocusEffect(
    React.useCallback(() => {
      loadNotes();
      loadViewMode();
      // Reset scroll position when screen comes into focus
      if (flatListRef.current) {
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

  const handleFolderCreated = useCallback((folder: Folder & { noteCount: number }) => {
    setSubfolders(prev => [...prev, folder]);
  }, []);

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

  // Filter and sort notes
  const filteredNotes = useNotesFiltering(notes, searchQuery, filterConfig, sortConfig);

  // Pre-calculate folder paths
  const folderPathsMap = useFolderPaths(allFolders);

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
    return (
      <NoteListItem
        note={note}
        isLastItem={index === filteredNotes.length - 1}
        folderId={folderId}
        onPress={(noteId) => navigation?.navigate('ViewNote', { noteId })}
        folderPathsMap={folderPathsMap}
        foldersMap={foldersMap}
        skeletonOpacity={skeletonOpacity}
        enhancedDataCache={notesEnhancedDataCache}
      />
    );
  }, [filteredNotes.length, folderId, navigation, folderPathsMap, foldersMap, skeletonOpacity, notesEnhancedDataCache]);

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
      {/* Show loading spinner on initial load */}
      {loading && notes.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

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
        removeClippedSubviews={false}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        initialNumToRender={100}
        windowSize={21}
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
});
