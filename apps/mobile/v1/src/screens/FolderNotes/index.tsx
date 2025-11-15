import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput,BottomSheetView } from '@gorhom/bottom-sheet';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { House, UserRound } from 'lucide-react-native';
import { useCallback,useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, Pressable,StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineIndicator } from '@/src/components/OfflineIndicator';
import { Input } from '@/src/components/ui/Input';
import { ACTION_BUTTON, FOLDER_COLORS } from '@/src/constants/ui';
import { type Folder,useApiService } from '@/src/services/api';
import { useTheme } from '@/src/theme';

import NotesList from './components/NotesList';

function getViewTitle(viewType: string): string {
  switch (viewType) {
    case 'all': return 'All Notes';
    case 'starred': return 'Starred';
    case 'archived': return 'Archived';
    case 'trash': return 'Trash';
    default: return 'Notes';
  }
}

interface FolderNotesScreenProps {
  folderId?: string;
  folderName?: string;
  viewType?: 'all' | 'starred' | 'archived' | 'trash';
}

export default function FolderNotesScreen({ folderId, folderName, viewType }: FolderNotesScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const api = useApiService();
  const insets = useSafeAreaInsets();

  // Check if liquid glass is available
  useEffect(() => {
    console.log('🔍 Liquid Glass Available:', isLiquidGlassAvailable());
  }, []);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [breadcrumbFolders, setBreadcrumbFolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Folder settings state
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#3b82f6');
  const [isUpdatingFolder, setIsUpdatingFolder] = useState(false);

  // Bottom sheet refs
  const breadcrumbSheetRef = useRef<BottomSheetModal>(null);
  const folderSettingsSheetRef = useRef<BottomSheetModal>(null);

  // Scroll tracking for animated divider
  const scrollY = useRef(new Animated.Value(0)).current;

  // Snap points
  const snapPoints = useMemo(() => ['80%'], []);
  const settingsSnapPoints = useMemo(() => ['55%'], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
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
        folderSettingsSheetRef.current?.snapToIndex(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  // Build breadcrumbs by traversing up the folder hierarchy
  useEffect(() => {
    const buildBreadcrumbs = async () => {
      if (!folderId && !viewType) {
        setBreadcrumbs(['Notes']);
        // Still fetch folders for navigation menu
        try {
          const folders = await api.getFolders();
          setAllFolders(folders);
        } catch (error) {
          console.error('Failed to fetch folders:', error);
          setAllFolders([]);
        }
        return;
      }

      if (viewType) {
        // For special views, just show the view name
        setBreadcrumbs([getViewTitle(viewType)]);
        // Still fetch folders for navigation menu
        try {
          const folders = await api.getFolders();
          setAllFolders(folders);
        } catch (error) {
          console.error('Failed to fetch folders:', error);
          setAllFolders([]);
        }
        return;
      }

      try {
        const folders = await api.getFolders();
        const breadcrumbPath: string[] = [];
        const breadcrumbFolderList: Folder[] = [];

        // Find the current folder and traverse up to root
        let currentFolderId = folderId as string;
        while (currentFolderId) {
          const folder = folders.find(f => f.id === currentFolderId);
          if (folder) {
            breadcrumbPath.unshift(folder.name);
            breadcrumbFolderList.unshift(folder);
            currentFolderId = folder.parentId || '';
          } else {
            break;
          }
        }

        setBreadcrumbs(breadcrumbPath);
        setBreadcrumbFolders(breadcrumbFolderList);
        setAllFolders(folders);
      } catch (error) {
        console.error('Failed to build breadcrumbs:', error);
        setBreadcrumbs([folderName || 'Notes']);
        setBreadcrumbFolders([]);
        setAllFolders([]);
      }
    };

    buildBreadcrumbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, folderName, viewType]); // api is stable, don't include it

  // Format breadcrumbs for display
  const formatBreadcrumbs = (crumbs: string[]): string => {
    if (crumbs.length === 0) return 'Notes';
    return crumbs.join(' / ');
  };

  // Get current folder
  const currentFolder = breadcrumbFolders.length > 0 ? breadcrumbFolders[breadcrumbFolders.length - 1] : null;

  // Open folder settings sheet
  const openFolderSettings = () => {
    if (currentFolder) {
      setEditFolderName(currentFolder.name);
      setEditFolderColor(currentFolder.color || '#3b82f6');
      folderSettingsSheetRef.current?.present();
    }
  };

  // Update folder
  const handleUpdateFolder = async () => {
    if (!currentFolder || !editFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name.');
      return;
    }

    try {
      setIsUpdatingFolder(true);
      await api.updateFolder(currentFolder.id, {
        name: editFolderName.trim(),
        color: editFolderColor,
      });

      // Update local state
      setBreadcrumbFolders(prev =>
        prev.map(f => f.id === currentFolder.id ? { ...f, name: editFolderName.trim(), color: editFolderColor } : f)
      );
      setBreadcrumbs(prev => {
        const newCrumbs = [...prev];
        newCrumbs[newCrumbs.length - 1] = editFolderName.trim();
        return newCrumbs;
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      folderSettingsSheetRef.current?.dismiss();
    } catch (error) {
      console.error('Failed to update folder:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update folder. Please try again.');
    } finally {
      setIsUpdatingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async () => {
    if (!currentFolder) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteFolder(currentFolder.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              folderSettingsSheetRef.current?.dismiss();
              router.back();
            } catch (error: any) {
              console.error('Failed to delete folder:', error);
              const errorMessage = error?.message || 'Failed to delete folder. Please try again.';
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  // Create a navigation object that handles subfolder navigation
  const navigation = {
    navigate: (screen: string, navParams?: any) => {
      console.log(`Navigate to ${screen} with params:`, navParams);
      if (screen === 'Notes') {
        // Navigate to another folder-notes screen with new parameters
        const queryParams = new URLSearchParams();
        if (navParams?.folderId) queryParams.append('folderId', navParams.folderId);
        if (navParams?.folderName) queryParams.append('folderName', navParams.folderName);
        if (navParams?.viewType) queryParams.append('viewType', navParams.viewType);

        const queryString = queryParams.toString();
        const path = queryString ? `/folder-notes?${queryString}` : '/folder-notes';
        router.push(path as any);
      } else if (screen === 'CreateNote') {
        // Navigate to edit-note for creating new notes
        const queryParams = new URLSearchParams();
        if (navParams?.folderId) queryParams.append('folderId', navParams.folderId);
        const queryString = queryParams.toString();
        const path = queryString ? `/edit-note?${queryString}` : '/edit-note';
        router.push(path as any);
      } else if (screen === 'EditNote') {
        // Navigate to edit-note for editing existing notes
        const queryParams = new URLSearchParams();
        if (navParams?.noteId) queryParams.append('noteId', navParams.noteId);
        if (navParams?.folderId) queryParams.append('folderId', navParams.folderId);
        const queryString = queryParams.toString();
        const path = queryString ? `/edit-note?${queryString}` : '/edit-note';
        router.push(path as any);
      } else if (screen === 'ViewNote') {
        // Navigate to view-note for viewing notes
        const queryParams = new URLSearchParams();
        if (navParams?.noteId) queryParams.append('noteId', navParams.noteId);
        const queryString = queryParams.toString();
        const path = queryString ? `/view-note?${queryString}` : '/view-note';
        router.push(path as any);
      }
    }
  };

  // Create route object with params
  const route = {
    params: {
      folderId: folderId,
      folderName: folderName,
      viewType: viewType,
      searchQuery: searchQuery, // Pass search query to NotesList
    }
  };

  // Get the title using breadcrumbs
  const title = formatBreadcrumbs(breadcrumbs);

  return (
    <>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>

          <View style={[
            styles.headerContainer,
            {
              paddingTop: insets.top,
              paddingBottom: 35,
            }
          ]} pointerEvents="box-none">
            {/* Gradient background - opaque only at title, smooth fade starts early so buttons are transparent */}
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
              locations={[0, 0.35, 0.45, 0.53, 0.60, 0.66, 0.72, 0.77, 0.82, 0.90, 1]}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            <View style={styles.header}>
              <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.colors.foreground} style={{ marginLeft: -2 }} />
                </TouchableOpacity>
              </GlassView>

              <GlassView glassEffectStyle="regular" style={[styles.glassButton, { flex: 1, marginHorizontal: 12 }]}>
                <View style={styles.titleContainer}>
                  <Text style={[styles.titleText, { color: theme.colors.foreground }]} numberOfLines={1} ellipsizeMode="head">{title}</Text>
                </View>
              </GlassView>

              <View style={styles.headerActions}>
                <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => breadcrumbSheetRef.current?.present()}
                  >
                    <Ionicons
                      name="reorder-three-outline"
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </TouchableOpacity>
                </GlassView>

                <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      if (isSearchVisible) {
                        setIsSearchVisible(false);
                        setSearchQuery('');
                      } else {
                        setIsSearchVisible(true);
                      }
                    }}
                  >
                    <Ionicons
                      name={isSearchVisible ? "close" : "search"}
                      size={20}
                      color={theme.colors.foreground}
                    />
                  </TouchableOpacity>
                </GlassView>

                {/* Show settings button only for regular folders (not Quick Action views) */}
                {!viewType && folderId && (
                  <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={openFolderSettings}
                    >
                      <Ionicons name="settings-outline" size={20} color={theme.colors.foreground} />
                    </TouchableOpacity>
                  </GlassView>
                )}

                {/* Avatar - navigates to settings */}
                <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push('/settings')}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <View pointerEvents="none">
                      <UserRound size={20} color={theme.colors.foreground} />
                    </View>
                  </TouchableOpacity>
                </GlassView>
              </View>
            </View>

            {/* Search bar inside header */}
            {isSearchVisible && (
              <View style={styles.searchBar}>
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, {
                    color: theme.colors.foreground,
                    backgroundColor: theme.colors.muted,
                    borderWidth: 0,
                  }]}
                  autoFocus={true}
                />
              </View>
            )}
          </View>

        {/* Notes content */}
        <View style={[styles.content, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <NotesList navigation={navigation} route={route} scrollY={scrollY} contentInsetTop={insets.top + 58} />
        </View>

        {/* Offline Indicator - Floating Button */}
        <OfflineIndicator />
      </SafeAreaView>

      {/* Breadcrumb Navigation Menu - Bottom Sheet */}
      <BottomSheetModal
        ref={breadcrumbSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enableDynamicSizing={false}
        enablePanDownToClose={true}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Navigate to Folder</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => breadcrumbSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Scrollable content */}
          <BottomSheetScrollView
            style={styles.bottomSheetContent}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
              <TouchableOpacity
                style={styles.breadcrumbMenuItem}
                onPress={() => {
                  breadcrumbSheetRef.current?.dismiss();
                  router.replace('/');
                }}
              >
                <House size={20} color={theme.colors.foreground} />
                <Text style={[styles.breadcrumbMenuText, { color: theme.colors.foreground }]}>Home</Text>
              </TouchableOpacity>

              {/* Render folder tree hierarchically */}
              {(() => {
                const renderFolderTree = (parentId: string | null | undefined, depth: number = 0) => {
                  // Handle both null and undefined for root folders
                  const folders = allFolders.filter(f =>
                    parentId ? f.parentId === parentId : !f.parentId
                  );

                  return folders.map((folder) => {
                    const isInBreadcrumb = breadcrumbFolders.some(bf => bf.id === folder.id);
                    const isCurrent = breadcrumbFolders[breadcrumbFolders.length - 1]?.id === folder.id;

                    return (
                      <View key={folder.id}>
                        <TouchableOpacity
                          style={[
                            styles.breadcrumbMenuItem,
                            { paddingLeft: 20 + (depth * 20) }
                          ]}
                          onPress={() => {
                            breadcrumbSheetRef.current?.dismiss();
                            router.replace(`/folder-notes?folderId=${folder.id}&folderName=${folder.name}`);
                          }}
                        >
                          {depth > 0 && (
                            <View style={styles.treeConnector}>
                              <Text style={{ color: theme.colors.border }}>└─</Text>
                            </View>
                          )}
                          <View style={[styles.breadcrumbDot, { backgroundColor: folder.color || '#6b7280' }]} />
                          <Text style={[
                            styles.breadcrumbMenuText,
                            {
                              color: theme.colors.foreground,
                              fontWeight: isInBreadcrumb ? '600' : '500'
                            }
                          ]}>
                            {folder.name}
                          </Text>
                          {isCurrent && (
                            <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
                          )}
                        </TouchableOpacity>
                        {/* Render children if this folder is in the breadcrumb path */}
                        {isInBreadcrumb && renderFolderTree(folder.id, depth + 1)}
                      </View>
                    );
                  });
                };

                return renderFolderTree(null);
              })()}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>

      {/* Folder Settings Bottom Sheet */}
      <BottomSheetModal
        ref={folderSettingsSheetRef}
        snapPoints={settingsSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enablePanDownToClose={true}
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetView style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Folder Settings</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => folderSettingsSheetRef.current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.folderSettingsBody}>
            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>Folder Name</Text>
            <BottomSheetTextInput
              style={[styles.folderInput, {
                backgroundColor: theme.colors.muted,
                color: theme.colors.foreground,
                borderColor: theme.colors.border
              }]}
              placeholder="Enter folder name"
              placeholderTextColor={theme.colors.mutedForeground}
              value={editFolderName}
              onChangeText={setEditFolderName}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 20 }]}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    editFolderColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setEditFolderColor(color)}
                >
                  {editFolderColor === color && (
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.folderSettingsFooter}>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUpdateFolder}
              disabled={isUpdatingFolder}
            >
              <Text style={[styles.updateButtonText, { color: theme.colors.primaryForeground }]}>
                {isUpdatingFolder ? 'Updating...' : 'Update Folder'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: theme.colors.destructive }]}
              onPress={handleDeleteFolder}
            >
              <Text style={[styles.updateButtonText, { color: theme.colors.destructiveForeground }]}>
                Delete Folder
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 0,
    position: 'relative',
    minHeight: 44,
  },
  headerWithBorder: {
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    textAlign: 'left',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glassButton: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)', // Subtle backdrop for better icon visibility
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
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
  divider: {
    height: 0.5,
  },
  bottomSheetContent: {
    paddingTop: 8,
  },
  breadcrumbMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  breadcrumbMenuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  breadcrumbDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  treeConnector: {
    marginRight: 4,
  },
  // Folder settings styles
  folderSettingsBody: {
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
  folderInput: {
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
  folderSettingsFooter: {
    paddingHorizontal: 20,
    gap: 12,
  },
  updateButton: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
