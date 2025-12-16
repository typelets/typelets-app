import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { type Folder, type Note, useApiService } from '@/src/services/api';
import { useTheme } from '@/src/theme';
import { stripHtmlTags } from '@/src/utils/noteUtils';

import { FilterConfig, FilterSortSheet, SortConfig } from '../FolderNotes/components/NotesList/FilterSortSheet';
import { NoteListItem } from '../FolderNotes/components/NotesList/NoteListItem';
import { useFolderPaths } from '../FolderNotes/components/NotesList/useFolderPaths';
import { useNotesFiltering } from '../FolderNotes/components/NotesList/useNotesFiltering';

interface SearchScreenProps {
  initialQuery?: string;
}

export default function SearchScreen({ initialQuery }: SearchScreenProps) {
  const theme = useTheme();
  const { user } = useUser();
  const api = useApiService();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter and sort state
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    showAttachmentsOnly: false,
    showCodeOnly: false,
    showDiagramOnly: false,
    showHiddenOnly: false,
    showNoteOnly: false,
    showPublicOnly: false,
    showSheetOnly: false,
    showStarredOnly: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    option: 'updated',
    direction: 'desc',
  });

  const filterSortSheetRef = useRef<BottomSheetModal>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delay showing spinner to avoid flicker for fast loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSpinner(true), 500);
      return () => clearTimeout(timer);
    } else {
      setShowSpinner(false);
    }
  }, [loading]);

  // Auto-focus search input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load notes only when user types a search query
  useEffect(() => {
    const loadNotes = async () => {
      if (!user?.id) return;
      if (!debouncedQuery.trim()) {
        // No query - don't load notes
        setNotes([]);
        setHasSearched(false);
        return;
      }

      try {
        setLoading(true);
        setHasSearched(true);
        const [fetchedNotes, fetchedFolders] = await Promise.all([
          api.getNotes({ deleted: false }),
          api.getFolders(),
        ]);
        setNotes(fetchedNotes);
        setAllFolders(fetchedFolders);
      } catch (error) {
        console.error('[Search] Failed to load notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, debouncedQuery]);

  // Filter notes
  const filteredNotes = useNotesFiltering(notes, debouncedQuery, filterConfig, sortConfig);

  // Pre-calculate folder paths
  const folderPathsMap = useFolderPaths(allFolders);

  // Create a folder lookup map
  const foldersMap = useMemo(() => {
    return new Map(allFolders.map(folder => [folder.id, folder]));
  }, [allFolders]);

  // Check if any filters are active
  const hasActiveFilters = filterConfig.showAttachmentsOnly || filterConfig.showStarredOnly ||
    filterConfig.showHiddenOnly || filterConfig.showCodeOnly || filterConfig.showDiagramOnly ||
    filterConfig.showPublicOnly || filterConfig.showSheetOnly || filterConfig.showNoteOnly;

  // Extract theme colors
  const foregroundColor = theme.colors.foreground;
  const mutedForegroundColor = theme.colors.mutedForeground;
  const mutedColor = theme.colors.muted;
  const borderColor = theme.colors.border;
  const backgroundColor = theme.colors.background;

  // Skeleton animation
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(skeletonOpacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(skeletonOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]);
    Animated.loop(pulse).start();
    return () => skeletonOpacity.stopAnimation();
  }, [skeletonOpacity]);

  // Enhanced data cache
  const notesEnhancedDataCache = useRef(new Map<string, { preview: string; formattedDate: string }>());

  // Pre-populate cache
  useMemo(() => {
    if (notes.length === 0) return;

    const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

    notes.forEach(note => {
      if (notesEnhancedDataCache.current.has(note.id)) return;

      let preview: string;
      if (note.hidden) {
        preview = '[HIDDEN]';
      } else if (!note.content || note.content.trim() === '') {
        preview = '';
      } else {
        const hasHtmlTags = note.content.includes('<');
        preview = hasHtmlTags
          ? stripHtmlTags(note.content).substring(0, 200)
          : note.content.substring(0, 200);
      }

      const formattedDate = dateFormatter.format(new Date(note.createdAt || Date.now()));
      notesEnhancedDataCache.current.set(note.id, { preview, formattedDate });
    });
  }, [notes]);

  // Handle note press
  const handleNotePress = useCallback((noteId: string) => {
    Keyboard.dismiss();
    router.push({ pathname: '/view-note', params: { noteId } });
  }, [router]);

  // Handle long press
  const handleNoteLongPress = useCallback((note: Note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Render note item
  const renderNoteItem: ListRenderItem<Note> = useCallback(({ item: note, index }) => {
    return (
      <NoteListItem
        note={note}
        isLastItem={index === filteredNotes.length - 1}
        onPress={handleNotePress}
        onLongPress={handleNoteLongPress}
        folderPathsMap={folderPathsMap}
        foldersMap={foldersMap}
        skeletonOpacity={skeletonOpacity}
        enhancedDataCache={notesEnhancedDataCache}
        foregroundColor={foregroundColor}
        mutedForegroundColor={mutedForegroundColor}
        mutedColor={mutedColor}
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        showFolderPaths={true}
      />
    );
  }, [filteredNotes.length, handleNotePress, handleNoteLongPress, folderPathsMap, foldersMap, skeletonOpacity, foregroundColor, mutedForegroundColor, mutedColor, borderColor, backgroundColor]);

  // Render empty state
  const renderEmptyComponent = useCallback(() => {
    if (loading) return null;

    // Only show "no results" message if user has actually searched
    const showNoResults = hasSearched && debouncedQuery.trim();

    // If no search yet, just show blank area that dismisses keyboard on tap
    if (!showNoResults) {
      return <Pressable style={styles.emptyContainer} onPress={Keyboard.dismiss} />;
    }

    return (
      <Pressable style={styles.emptyContainer} onPress={Keyboard.dismiss}>
        <Ionicons name="search-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
          No results found
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.mutedForeground }]}>
          No notes match "{debouncedQuery}"
        </Text>
      </Pressable>
    );
  }, [loading, hasSearched, debouncedQuery, theme.colors]);

  // Render header
  const renderHeader = useCallback(() => {
    // Only show header when we have search results
    if (!hasSearched || filteredNotes.length === 0) return null;

    return (
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.colors.mutedForeground }]}>
          {filteredNotes.length} {filteredNotes.length === 1 ? 'result' : 'results'}
          {hasActiveFilters && ' (filtered)'}
        </Text>
      </View>
    );
  }, [hasSearched, filteredNotes.length, hasActiveFilters, theme.colors.mutedForeground]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      {/* Header with gradient background */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]} pointerEvents="box-none">
        <LinearGradient
          colors={[
            theme.isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            theme.isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            theme.isDark ? 'rgba(10, 10, 10, 0.88)' : 'rgba(250, 250, 250, 0.88)',
            theme.isDark ? 'rgba(10, 10, 10, 0.80)' : 'rgba(250, 250, 250, 0.80)',
            theme.isDark ? 'rgba(10, 10, 10, 0.68)' : 'rgba(250, 250, 250, 0.68)',
            theme.isDark ? 'rgba(10, 10, 10, 0.52)' : 'rgba(250, 250, 250, 0.52)',
            theme.isDark ? 'rgba(10, 10, 10, 0.36)' : 'rgba(250, 250, 250, 0.36)',
            theme.isDark ? 'rgba(10, 10, 10, 0.22)' : 'rgba(250, 250, 250, 0.22)',
            theme.isDark ? 'rgba(10, 10, 10, 0.12)' : 'rgba(250, 250, 250, 0.12)',
            theme.isDark ? 'rgba(10, 10, 10, 0.05)' : 'rgba(250, 250, 250, 0.05)',
            theme.isDark ? 'rgba(0, 0, 0, 0)' : 'rgba(250, 250, 250, 0)',
          ]}
          locations={[0, 0.35, 0.45, 0.53, 0.60, 0.66, 0.72, 0.77, 0.82, 0.90, 1]}
          pointerEvents="none"
          style={styles.headerGradient}
        />

        <View style={styles.header}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="none">
              <View style={styles.iconButton}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.foreground} style={{ marginLeft: -2 }} />
              </View>
            </GlassView>
          </Pressable>

          {/* Search Input with Glass Effect */}
          <GlassView glassEffectStyle="regular" style={[styles.searchInputGlass, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="box-none">
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={theme.colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: theme.colors.foreground }]}
                placeholder="Search notes"
                placeholderTextColor={theme.colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </GlassView>

          {/* Filter Button */}
          <Pressable
            onPress={() => filterSortSheetRef.current?.present()}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="none">
              <View style={styles.iconButton}>
                <Ionicons
                  name={hasActiveFilters ? 'options' : 'options-outline'}
                  size={20}
                  color={hasActiveFilters ? theme.colors.primary : theme.colors.foreground}
                />
              </View>
            </GlassView>
          </Pressable>
        </View>
      </View>

      {/* Loading State - only show spinner after 500ms delay */}
      {showSpinner && (
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 56 }]}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
        </View>
      )}

      {/* Results List */}
      {!loading && (
        <FlashList
          data={filteredNotes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          drawDistance={2000}
          contentContainerStyle={{ paddingTop: insets.top + 56 }}
          overrideItemLayout={(layout: any) => {
            layout.size = 112;
          }}
        />
      )}

      {/* Filter & Sort Bottom Sheet */}
      <FilterSortSheet
        ref={filterSortSheetRef}
        filterConfig={filterConfig}
        setFilterConfig={setFilterConfig}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        hasActiveFilters={hasActiveFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 35,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputGlass: {
    flex: 1,
    height: 40,
    borderRadius: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
