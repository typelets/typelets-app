import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { forwardRef, JSX, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Folder, type Note } from '@/src/services/api';
import { useTheme } from '@/src/theme';

interface NoteActionsSheetProps {
  note: Note | null;
  folders: Folder[];
  onEdit: (noteId: string) => void;
  onMoveToFolder: (noteId: string, folderId: string | null) => void;
  onToggleStar: (noteId: string) => void;
  onArchive: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}

export interface NoteActionsSheetRef {
  present: (note: Note) => void;
  dismiss: () => void;
}

export const NoteActionsSheet = forwardRef<NoteActionsSheetRef, NoteActionsSheetProps>(
  ({ note, folders, onEdit, onMoveToFolder, onToggleStar, onArchive, onDelete }, ref) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const [currentNote, setCurrentNote] = useState<Note | null>(note);
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    const snapPoints = useMemo(() => ['95%'], []);

    useImperativeHandle(ref, () => ({
      present: (noteToShow: Note) => {
        setCurrentNote(noteToShow);
        setShowFolderPicker(false);
        bottomSheetRef.current?.present();
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

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

    const handleEdit = () => {
      if (currentNote) {
        onEdit(currentNote.id);
        bottomSheetRef.current?.dismiss();
      }
    };

    const handleMoveToFolder = (folderId: string | null) => {
      if (currentNote) {
        onMoveToFolder(currentNote.id, folderId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        bottomSheetRef.current?.dismiss();
      }
    };

    const handleToggleStar = () => {
      if (currentNote) {
        onToggleStar(currentNote.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        bottomSheetRef.current?.dismiss();
      }
    };

    const handleArchive = () => {
      if (currentNote) {
        onArchive(currentNote.id);
        bottomSheetRef.current?.dismiss();
      }
    };

    const handleDelete = () => {
      if (currentNote) {
        onDelete(currentNote.id);
        bottomSheetRef.current?.dismiss();
      }
    };

    // Build folder hierarchy for display
    const buildFolderTree = (parentId: string | null | undefined, depth: number = 0): JSX.Element[] => {
      const childFolders = folders.filter(f =>
        parentId ? f.parentId === parentId : !f.parentId
      );

      return childFolders.flatMap((folder) => {
        const isCurrent = currentNote?.folderId === folder.id;

        return [
          <TouchableOpacity
            key={folder.id}
            style={[
              styles.folderOption,
              { paddingLeft: 20 + (depth * 20) }
            ]}
            onPress={() => handleMoveToFolder(folder.id)}
          >
            {depth > 0 && (
              <Text style={{ color: theme.colors.border, marginRight: 8 }}>└─</Text>
            )}
            <View style={[styles.folderDot, { backgroundColor: folder.color || '#6b7280' }]} />
            <Text style={[styles.folderOptionText, { color: theme.colors.foreground }]}>
              {folder.name}
            </Text>
            {isCurrent && (
              <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
            )}
          </TouchableOpacity>,
          ...buildFolderTree(folder.id, depth + 1)
        ];
      });
    };

    if (!currentNote) return null;

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={insets.top + 10}
        enablePanDownToClose={true}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
              {showFolderPicker ? 'Move to Folder' : 'Note Actions'}
            </Text>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => {
                if (showFolderPicker) {
                  setShowFolderPicker(false);
                } else {
                  bottomSheetRef.current?.dismiss();
                }
              }}
            >
              <Ionicons name={showFolderPicker ? "arrow-back" : "close"} size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {showFolderPicker ? (
            <BottomSheetScrollView
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {/* Root/Home option */}
              <TouchableOpacity
                style={styles.folderOption}
                onPress={() => handleMoveToFolder(null)}
              >
                <Ionicons name="home-outline" size={20} color={theme.colors.foreground} style={{ marginRight: 8 }} />
                <Text style={[styles.folderOptionText, { color: theme.colors.foreground }]}>
                  Home
                </Text>
                {!currentNote.folderId && (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>

              {/* Folder tree */}
              {buildFolderTree(null)}
            </BottomSheetScrollView>
          ) : (
            <BottomSheetScrollView
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 60 }}
            >
              {/* Edit Note */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleEdit}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons name="pencil-outline" size={20} color={theme.colors.foreground} />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.foreground }]}>
                  Edit Note
                </Text>
              </TouchableOpacity>

              {/* Move to Folder */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => setShowFolderPicker(true)}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons name="folder-outline" size={20} color={theme.colors.foreground} />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.foreground }]}>
                  Move to Folder
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {/* Toggle Star */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleToggleStar}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons
                    name={currentNote.starred ? "star" : "star-outline"}
                    size={20}
                    color={currentNote.starred ? "#f59e0b" : theme.colors.foreground}
                  />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.foreground }]}>
                  {currentNote.starred ? 'Unstar' : 'Star'}
                </Text>
              </TouchableOpacity>

              {/* Archive */}
              {!currentNote.archived && !currentNote.deleted && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={handleArchive}
                >
                  <View style={[styles.actionIcon, { backgroundColor: theme.colors.muted }]}>
                    <Ionicons name="archive-outline" size={20} color={theme.colors.foreground} />
                  </View>
                  <Text style={[styles.actionText, { color: theme.colors.foreground }]}>
                    Archive
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDelete}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.destructive} />
                </View>
                <Text style={[styles.actionText, { color: theme.colors.destructive }]}>
                  {currentNote.deleted ? 'Delete Permanently' : 'Move to Trash'}
                </Text>
              </TouchableOpacity>
            </BottomSheetScrollView>
          )}
        </View>
      </BottomSheetModal>
    );
  }
);

NoteActionsSheet.displayName = 'NoteActionsSheet';

const styles = StyleSheet.create({
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
    paddingTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  folderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  folderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  folderOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
