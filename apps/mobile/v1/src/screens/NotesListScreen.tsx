import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, Keyboard, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useApiService, type Note, type Folder } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { NOTE_CARD, FOLDER_CARD, SECTION, FOLDER_COLORS } from '../constants/ui';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetTextInput, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

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
  const { folderId, viewType, searchQuery } = route?.params || {};
  const { height: windowHeight } = useWindowDimensions();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subfolders, setSubfolders] = useState<Folder[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create folder modal state
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Bottom sheet ref
  const createFolderSheetRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Snap points
  const snapPoints = useMemo(() => ['55%'], []);

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

  // Load notes when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadNotes();
      loadViewMode();
      // Reset scroll position when screen comes into focus
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
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
      if (!isRefresh) {
        setLoading(true);
      }
      if (__DEV__) {
        console.log('🎯 Loading notes for:', { folderId, viewType });
      }

      const [allNotesData, foldersData] = await Promise.all([
        api.getNotes(), // Get all notes, filter client-side
        api.getFolders() // Load all folders to find subfolders
      ]);

      if (__DEV__) {
        console.log('📝 All notes received:', allNotesData.length);
      }

      // Client-side filtering
      let filteredNotes = allNotesData;

      // First filter by folder if specified
      if (folderId) {
        filteredNotes = filteredNotes.filter(note => note.folderId === folderId);
        if (__DEV__) {
          console.log('📁 After folder filter:', filteredNotes.length);
        }
      }

      // Then filter by view type
      if (viewType) {
        switch (viewType) {
          case 'all':
            filteredNotes = filteredNotes.filter(note => !note.deleted && !note.archived);
            break;
          case 'starred':
            filteredNotes = filteredNotes.filter(note => note.starred && !note.deleted && !note.archived);
            break;
          case 'archived':
            filteredNotes = filteredNotes.filter(note => note.archived && !note.deleted);
            break;
          case 'trash':
            filteredNotes = filteredNotes.filter(note => note.deleted);
            break;
        }
      } else if (folderId) {
        // Regular folder view: exclude deleted and archived
        filteredNotes = filteredNotes.filter(note => !note.deleted && !note.archived);
      }

      if (__DEV__) {
        console.log('✅ Final filtered notes:', filteredNotes.length);
      }

      setNotes(filteredNotes);

      // Find subfolders
      let currentFolderSubfolders: Folder[];

      if (folderId) {
        // If viewing a specific folder, show its subfolders
        currentFolderSubfolders = foldersData.filter(folder => folder.parentId === folderId);
      } else {
        // Don't show folders in special views (all, starred, archived, trash)
        currentFolderSubfolders = [];
      }

      // Recursive function to get all nested folder IDs
      const getAllNestedFolderIds = (parentFolderId: string): string[] => {
        const ids = [parentFolderId];
        const childFolders = foldersData.filter(f => f.parentId === parentFolderId);
        childFolders.forEach(childFolder => {
          ids.push(...getAllNestedFolderIds(childFolder.id));
        });
        return ids;
      };

      // Add note counts to subfolders (including nested subfolder notes)
      const subfoldersWithCounts = currentFolderSubfolders.map(folder => {
        const allNestedFolderIds = getAllNestedFolderIds(folder.id);
        const folderNotes = allNotesData.filter(note =>
          allNestedFolderIds.includes(note.folderId || '') &&
          !note.deleted &&
          !note.archived
        );

        return {
          ...folder,
          noteCount: folderNotes.length
        };
      });
      setSubfolders(subfoldersWithCounts);

      // Store all folders for looking up note folder info
      setAllFolders(foldersData);
    } catch (error) {
      if (__DEV__) console.error('Failed to load notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
      setNotes([]);
      setSubfolders([]);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
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

      // Add the new folder to the subfolders list
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

  const filteredNotes = notes.filter(
    note =>
      note.title.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      note.content.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {showLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollViewContent, { minHeight: windowHeight }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={true}
          bounces={true}
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
          <Pressable style={{ flex: 1 }} onPress={() => {}}>
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

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground, paddingHorizontal: 16, marginTop: subfolders.length > 0 ? 12 : 16 }]}>
                NOTES ({String(filteredNotes?.length || 0)})
              </Text>

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

              {filteredNotes.length === 0 && searchQuery ? (
                <View style={styles.emptySearchState}>
                  <Text style={[styles.emptySearchText, { color: theme.colors.mutedForeground }]}>
                    No notes found. Try a different search term.
                  </Text>
                </View>
              ) : (
                <View>
                {filteredNotes.map((note, index) => {
                  const noteFolder = allFolders.find(f => f.id === note.folderId);

                  // Build folder path
                  const getFolderPath = (folder: typeof noteFolder): string => {
                    if (!folder) return '';
                    const path: string[] = [];
                    let currentFolder: Folder | undefined = folder;

                    while (currentFolder) {
                      path.unshift(currentFolder.name);
                      if (currentFolder.parentId) {
                        currentFolder = allFolders.find(f => f.id === currentFolder?.parentId);
                      } else {
                        break;
                      }
                    }

                    return path.join(' / ');
                  };

                  const folderPath = getFolderPath(noteFolder);
                  const isLastNote = index === filteredNotes.length - 1;

                  return (
                    <View key={note.id} style={styles.noteListItemWrapper}>
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
                              {String(new Date(note.createdAt || Date.now()).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              }))}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.noteListPreview, { color: theme.colors.mutedForeground }]}
                          numberOfLines={2}
                        >
                          {note.hidden ? '[HIDDEN]' : String(stripHtmlTags(note.content || ''))}
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
                })}
                </View>
              )}
            </View>

            {/* Spacer to ensure content fills screen */}
            <View style={{ flex: 1, minHeight: 100 }} />
          </Pressable>
          )}
        </ScrollView>
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
    marginBottom: 12,
    paddingHorizontal: 16,
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
    paddingTop: 16,
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
    height: StyleSheet.hairlineWidth,
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
});
