import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps,BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback,useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Keyboard, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineIndicator } from '../../components/OfflineIndicator';
import { ACTION_BUTTON, FOLDER_CARD, FOLDER_COLORS, GLASS_BUTTON } from '../../constants/ui';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { type Folder, type FolderCounts,useApiService } from '../../services/api';
import { useTheme } from '../../theme';

// Special views configuration matching web app
const SPECIAL_VIEWS = [
  {
    id: 'all',
    label: 'All Notes',
    icon: 'document-text' as const,
  },
  {
    id: 'starred',
    label: 'Starred',
    icon: 'star' as const,
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: 'archive' as const,
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: 'trash' as const,
  },
];

// Helper function for time-based greeting
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    starred: 0,
    archived: 0,
    trash: 0,
  });

  // Store API methods in ref to prevent re-renders
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  }, [api]);

  // Create folder modal state
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // Bottom sheet ref
  const createFolderSheetRef = useRef<BottomSheetModal>(null);

  // Scroll tracking for animated divider
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animate greeting section based on scroll
  const greetingTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const greetingOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Snap points
  const snapPoints = useMemo(() => ['55%'], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
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

  // Check if screen is focused
  const isFocused = useIsFocused();
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstMountRef = useRef(true);
  const hasDataRef = useRef(false);

  // Load folders data
  const loadFoldersData = useCallback(async (isRefresh = false, forceRefresh = false) => {
    try {
      // Only show loading state if we don't have data yet (first load)
      // On refocus, show existing data immediately and update in background (no flicker)
      if (!isRefresh && !hasDataRef.current) {
        setLoading(true);
      }

      // Use the counts endpoint instead of fetching all notes
      // Force refresh bypasses cache to ensure fresh data (used on pull-to-refresh)
      const [foldersData, noteCounts] = await Promise.all([
        apiRef.current.getFolders(),
        apiRef.current.getCounts(undefined, forceRefresh) // Get counts from the API endpoint
      ]);

      // Show only ROOT folders (no parentId) on main screen
      const rootFolders = foldersData.filter(folder => !folder.parentId);

      // When called without folder_id, API returns:
      // { all: 78, starred: 7, archived: 0, trash: 1, folders: { folderId: { all, starred, ... } } }
      const foldersObject = noteCounts.folders as Record<string, FolderCounts> | undefined;

      // Add folder note counts from the API response
      const rootFoldersWithCounts = rootFolders.map(folder => {
        const folderCount = foldersObject?.[folder.id];
        return {
          ...folder,
          noteCount: folderCount?.all || 0
        };
      });

      setAllFolders(rootFoldersWithCounts);

      // Use the root-level counts from the API
      const newCounts = {
        all: noteCounts.all || 0,
        starred: noteCounts.starred || 0,
        archived: noteCounts.archived || 0,
        trash: noteCounts.trash || 0,
      };

      setCounts(newCounts);

      // Mark that we have data now (prevents loading state on refocus)
      hasDataRef.current = true;
    } catch (error) {
      if (__DEV__) console.error('Failed to load folders data:', error);
      setAllFolders([]);
      setCounts({ all: 0, starred: 0, archived: 0, trash: 0 });
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  }, []);

  // Load view mode
  const loadViewMode = useCallback(async () => {
    try {
      const savedMode = await AsyncStorage.getItem('viewMode');
      if (savedMode === 'grid' || savedMode === 'list') {
        setViewMode(savedMode);
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load view mode:', error);
    }
  }, []);

  // Load view mode only on mount
  useEffect(() => {
    loadViewMode();
  }, [loadViewMode]);

  // Reload data when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      // Clear any pending load
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }

      // Force refresh on first mount to ensure fresh data (prevents stale counts on app reload)
      const shouldForceRefresh = isFirstMountRef.current;
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }

      // Load immediately with force refresh on first mount
      loadFoldersData(false, shouldForceRefresh);
    }

    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, [isFocused, loadFoldersData]);

  // Reload data when network status changes (debounced to prevent flaky connections)
  useEffect(() => {
    if (!isFocused) return;

    // Debounce network status changes to avoid rapid reloads on flaky connections
    const timer = setTimeout(() => {
      if (__DEV__) {
        console.log('[HomeScreen] Network status changed, reloading data');
      }
      loadFoldersData();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [isConnected, isInternetReachable, isFocused, loadFoldersData]);

  // Handle loading delay
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => setShowLoading(true), 300);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      // Clear current data to force fresh load
      setAllFolders([]);
      setCounts({ all: 0, starred: 0, archived: 0, trash: 0 });
      await loadFoldersData(true, true); // isRefresh=true, forceRefresh=true
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    try {
      setIsCreatingFolder(true);
      const createdFolder = await api.createFolder(newFolderName.trim(), selectedColor);

      // Add the new folder to the list
      setAllFolders(prev => [...prev, createdFolder]);

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

  const headerHeight = (insets.top || 0) + 110; // Header + greeting section height

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, { paddingTop: headerHeight }]}
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
        >
          {!loading && (
          <>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <GlassView glassEffectStyle="regular" style={styles.glassActionButton}>
                <TouchableOpacity
                  style={styles.newNoteAction}
                  onPress={() => router.push('/edit-note')}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name="add" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.actionText, { color: theme.colors.foreground }]}>Start writing</Text>
                </TouchableOpacity>
              </GlassView>
            </View>

            {/* Special Views Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
                QUICK ACCESS
              </Text>
              <View style={styles.specialViewsList}>
                {SPECIAL_VIEWS.map((view) => (
                  <GlassView key={view.id} glassEffectStyle="regular" style={styles.glassSpecialViewItem}>
                    <TouchableOpacity
                      style={styles.specialViewItem}
                      onPress={() => {
                        router.push({
                          pathname: '/folder-notes',
                          params: { viewType: view.id }
                        });
                      }}
                    >
                      <View style={styles.specialViewContent}>
                        <View style={styles.specialViewIcon}>
                          <Ionicons name={view.icon} size={16} color={theme.colors.foreground} />
                        </View>
                        <Text style={[styles.specialViewLabel, { color: theme.colors.foreground }]}>
                          {view.label}
                        </Text>
                      </View>
                      <View style={[styles.countBadge, { backgroundColor: theme.colors.muted }]}>
                        <Text style={[styles.countText, { color: theme.colors.mutedForeground }]}>
                          {counts[view.id as keyof typeof counts] || 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </GlassView>
                ))}
              </View>
            </View>

            {/* Folders Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground, marginBottom: 0, paddingHorizontal: 0 }]}>
                  FOLDERS
                </Text>
                <View style={styles.viewModeToggle}>
                  <GlassView glassEffectStyle="regular" style={styles.glassViewModeButton}>
                    <TouchableOpacity
                      style={[
                        styles.viewModeButton,
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
                    >
                      <Ionicons
                        name="list"
                        size={16}
                        color={viewMode === 'list' ? theme.colors.primary : theme.colors.foreground}
                      />
                    </TouchableOpacity>
                  </GlassView>
                  <GlassView glassEffectStyle="regular" style={styles.glassViewModeButton}>
                    <TouchableOpacity
                      style={[
                        styles.viewModeButton,
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
                    >
                      <Ionicons
                        name="grid"
                        size={16}
                        color={viewMode === 'grid' ? theme.colors.primary : theme.colors.foreground}
                      />
                    </TouchableOpacity>
                  </GlassView>
                </View>
              </View>
              <View style={viewMode === 'grid' ? styles.foldersGrid : styles.foldersList}>
                {/* Create Folder Button */}
                <GlassView
                  glassEffectStyle="regular"
                  style={viewMode === 'grid' ? styles.glassCreateFolderGrid : styles.glassCreateFolderList}
                >
                  <TouchableOpacity
                    style={[
                      viewMode === 'grid' ? styles.createFolderButtonGrid : styles.createFolderButtonList,
                      { borderColor: theme.colors.border }
                    ]}
                    onPress={() => createFolderSheetRef.current?.present()}
                  >
                    <View style={viewMode === 'grid' ? styles.folderContentGrid : styles.folderContent}>
                      <Ionicons name="add" size={viewMode === 'grid' ? 24 : 16} color={theme.colors.primary} style={{ marginRight: viewMode === 'grid' ? 0 : 12, marginBottom: viewMode === 'grid' ? 8 : 0 }} />
                      <Text style={[styles.folderName, { color: theme.colors.foreground }]}>
                        Create Folder
                      </Text>
                    </View>
                  </TouchableOpacity>
                </GlassView>

                {allFolders.map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[
                      viewMode === 'grid' ? styles.folderItemGrid : styles.folderItem,
                      {
                        backgroundColor: viewMode === 'grid' ? folder.color || '#000000' : theme.colors.card,
                        borderColor: theme.colors.border
                      }
                    ]}
                    onPress={() => {
                      router.push({
                        pathname: '/folder-notes',
                        params: { folderId: folder.id, folderName: folder.name }
                      });
                    }}
                  >
                    <View style={viewMode === 'grid' ? styles.folderContentGrid : styles.folderContent}>
                      {viewMode === 'list' && (
                        <View style={[styles.folderColorDot, { backgroundColor: folder.color || '#000000' }]} />
                      )}
                      <Text style={[styles.folderName, { color: viewMode === 'grid' ? '#ffffff' : theme.colors.foreground }]} numberOfLines={1}>
                        {folder.name}
                      </Text>
                    </View>
                    {viewMode === 'list' && (
                      <View style={[styles.countBadge, { backgroundColor: theme.colors.muted }]}>
                        <Text style={[styles.countText, { color: theme.colors.mutedForeground }]}>
                          {folder.noteCount || 0}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
          )}
        </ScrollView>
      )}

      {/* Floating Header */}
      {!showLoading && (
        <View style={[styles.floatingHeader, { paddingTop: insets.top || 0 }]}>
          <LinearGradient
            colors={[
              theme.isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              theme.isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              theme.isDark ? 'rgba(10, 10, 10, 0.88)' : 'rgba(255, 255, 255, 0.88)',
              theme.isDark ? 'rgba(10, 10, 10, 0.80)' : 'rgba(255, 255, 255, 0.80)',
              theme.isDark ? 'rgba(10, 10, 10, 0.68)' : 'rgba(255, 255, 255, 0.68)',
              theme.isDark ? 'rgba(10, 10, 10, 0.52)' : 'rgba(255, 255, 255, 0.52)',
              theme.isDark ? 'rgba(10, 10, 10, 0.36)' : 'rgba(255, 255, 255, 0.36)',
              theme.isDark ? 'rgba(10, 10, 10, 0.22)' : 'rgba(255, 255, 255, 0.22)',
              theme.isDark ? 'rgba(10, 10, 10, 0.12)' : 'rgba(255, 255, 255, 0.12)',
              theme.isDark ? 'rgba(10, 10, 10, 0.05)' : 'rgba(255, 255, 255, 0.05)',
              'rgba(0, 0, 0, 0)',
            ]}
            locations={[0, 0.35, 0.45, 0.53, 0.60, 0.66, 0.72, 0.77, 0.82, 0.87, 1]}
            style={styles.headerGradient}
          />
          <View style={styles.headerSection}>
            <Animated.View
              style={[
                styles.greetingSection,
                {
                  transform: [{ translateY: greetingTranslateY }],
                  opacity: greetingOpacity,
                }
              ]}
            >
              <Text style={[styles.greeting, { color: theme.colors.foreground }]}>
                Good {getTimeOfDay()}
              </Text>
              <Text style={[styles.subgreeting, { color: theme.colors.mutedForeground }]}>
                What would you like to work on today?
              </Text>
            </Animated.View>
            <GlassView glassEffectStyle="regular" style={styles.glassAvatar}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="person" size={20} color={theme.colors.foreground} />
              </TouchableOpacity>
            </GlassView>
          </View>
        </View>
      )}

      {/* Offline Indicator - Floating Button */}
      <OfflineIndicator />

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
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>Create Folder</Text>
            <GlassView glassEffectStyle="regular" style={styles.glassIconButton}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => createFolderSheetRef.current?.dismiss()}
              >
                <Ionicons name="close" size={20} color={theme.colors.foreground} />
              </TouchableOpacity>
            </GlassView>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.modalBody}>
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

            <View style={styles.modalFooter}>
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
    </SafeAreaView>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 16,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: 35,
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  greetingSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 16,
    lineHeight: 22,
  },
  glassAvatar: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  avatarButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsSection: {
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  glassActionButton: {
    borderRadius: ACTION_BUTTON.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  newNoteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  actionIcon: {
    marginRight: ACTION_BUTTON.ICON_SPACING,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: GLASS_BUTTON.GAP,
  },
  glassViewModeButton: {
    borderRadius: GLASS_BUTTON.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  viewModeButton: {
    width: GLASS_BUTTON.SIZE,
    height: GLASS_BUTTON.SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: GLASS_BUTTON.ACTIVE_BACKGROUND,
  },
  specialViewsList: {
    gap: FOLDER_CARD.SPACING,
    paddingHorizontal: 16,
  },
  glassSpecialViewItem: {
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  specialViewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  specialViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  specialViewIcon: {
    marginRight: FOLDER_CARD.PADDING,
  },
  specialViewLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    fontSize: FOLDER_CARD.COUNT_SIZE,
    fontWeight: '500',
  },
  foldersList: {
    gap: FOLDER_CARD.SPACING,
    paddingHorizontal: 16,
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  glassCreateFolderList: {
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  glassCreateFolderGrid: {
    width: '48%',
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  createFolderButtonList: {
    width: '100%',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
  },
  createFolderButtonGrid: {
    width: '100%',
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
  },
  folderItemGrid: {
    width: '48%',
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderContentGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  folderColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: FOLDER_CARD.PADDING,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fullScreenBottomSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  bottomSheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  divider: {
    height: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  glassIconButton: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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
    borderColor: '#ffffff',
  },
  modalFooter: {
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
});
