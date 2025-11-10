import { Ionicons } from '@expo/vector-icons';
import { Code2, Network } from 'lucide-react-native';
import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';

import type { Folder, Note } from '@/src/services/api';
import { detectNoteType } from '@/src/utils/noteTypeDetection';
import { stripHtmlTags } from '@/src/utils/noteUtils';

import { NoteSkeletonItem } from './NoteSkeletonItem';

interface NoteListItemProps {
  note: Note;
  isLastItem: boolean;
  folderId?: string;
  onPress: (noteId: string) => void;
  onLongPress?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  folderPathsMap: Map<string, string>;
  foldersMap: Map<string, Folder>;
  skeletonOpacity: Animated.Value;
  enhancedDataCache: React.MutableRefObject<Map<string, { preview: string; formattedDate: string }>>;
  // Pass theme colors as props instead of using hook in each item
  foregroundColor: string;
  mutedForegroundColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
}

const NoteListItemComponent: React.FC<NoteListItemProps> = ({
  note,
  isLastItem,
  folderId,
  onPress,
  onLongPress,
  onDelete,
  onArchive,
  folderPathsMap,
  foldersMap,
  skeletonOpacity,
  enhancedDataCache,
  foregroundColor,
  mutedForegroundColor,
  mutedColor,
  borderColor,
  backgroundColor,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  // Detect note type from content with memoization for performance
  // MUST be called before any conditional returns (React hooks rules)
  const noteType = useMemo(() => detectNoteType(note), [note]);
  const isDiagram = noteType === 'diagram';
  const isCode = noteType === 'code';

  // Check if note is still encrypted (loading skeleton)
  const noteIsEncrypted = note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]';

  // Render skeleton for encrypted notes
  if (noteIsEncrypted) {
    return <NoteSkeletonItem skeletonOpacity={skeletonOpacity} isLastItem={isLastItem} />;
  }

  // Lazy calculation - strip HTML and format date only when rendered
  // Use cache version if available, otherwise create minimal version
  let enhancedData = enhancedDataCache.current.get(note.id);
  if (!enhancedData) {
    let preview: string;
    if (note.hidden) {
      preview = '[HIDDEN]';
    } else if (!note.content || note.content.trim() === '') {
      // Empty content - show placeholder based on note type
      preview = isDiagram ? 'Diagram (loading...)' : isCode ? 'Code (loading...)' : 'Loading...';
    } else {
      // Content is already stripped HTML from cache or freshly decrypted
      // Only strip HTML if it contains tags (cached notes are pre-stripped)
      const hasHtmlTags = note.content.includes('<');
      preview = hasHtmlTags
        ? stripHtmlTags(note.content).substring(0, 200)
        : note.content.substring(0, 200); // Already stripped, just truncate
    }

    enhancedData = {
      preview,
      formattedDate: new Date(note.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    enhancedDataCache.current.set(note.id, enhancedData);
  }

  const folderPath = note.folderId ? folderPathsMap.get(note.folderId) || '' : '';
  const noteFolder = note.folderId ? foldersMap.get(note.folderId) : undefined;

  // Render right swipe action (Delete - red)
  const renderRightActions = (prog: Reanimated.SharedValue<number>, drag: Reanimated.SharedValue<number>) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const styleAnimation = useAnimatedStyle(() => {
      const width = Math.abs(drag.value);
      return {
        width: Math.max(width, 80),
        transform: [{ translateX: 0 }],
      };
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const iconOpacity = useAnimatedStyle(() => {
      const dragAmount = Math.abs(drag.value);
      if (dragAmount < 100) return { opacity: 1 };
      const opacity = Math.max(1 - (dragAmount - 100) / 20, 0);
      return { opacity };
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const textOpacity = useAnimatedStyle(() => {
      const dragAmount = Math.abs(drag.value);
      if (dragAmount < 100) return { opacity: 0 };
      const opacity = Math.min((dragAmount - 100) / 20, 1);
      return { opacity };
    });

    return (
      <Reanimated.View style={[styles.deleteAction, styleAnimation]}>
        <Reanimated.View style={[styles.swipeActionContent, iconOpacity]}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Reanimated.View>
        <Reanimated.View style={[styles.swipeActionContent, textOpacity]}>
          <Text style={styles.swipeActionText}>Delete</Text>
        </Reanimated.View>
      </Reanimated.View>
    );
  };

  // Render left swipe action (Archive - blue)
  // IMPORTANT: Always define this function to avoid hooks count issues
  const canArchive = !note.archived && !note.deleted;
  const renderLeftActions = (prog: Reanimated.SharedValue<number>, drag: Reanimated.SharedValue<number>) => {
    // Always call hooks in the same order to avoid React hooks errors
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const styleAnimation = useAnimatedStyle(() => {
      const width = Math.abs(drag.value);
      return {
        width: Math.max(width, 80),
        transform: [{ translateX: 0 }],
      };
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const iconOpacity = useAnimatedStyle(() => {
      const dragAmount = Math.abs(drag.value);
      if (dragAmount < 100) return { opacity: 1 };
      const opacity = Math.max(1 - (dragAmount - 100) / 20, 0);
      return { opacity };
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const textOpacity = useAnimatedStyle(() => {
      const dragAmount = Math.abs(drag.value);
      if (dragAmount < 100) return { opacity: 0 };
      const opacity = Math.min((dragAmount - 100) / 20, 1);
      return { opacity };
    });

    // Return null AFTER all hooks are called
    if (!canArchive) return null;

    return (
      <Reanimated.View style={[styles.archiveAction, styleAnimation]}>
        <Reanimated.View style={[styles.swipeActionContent, iconOpacity]}>
          <Ionicons name="archive-outline" size={24} color="#fff" />
        </Reanimated.View>
        <Reanimated.View style={[styles.swipeActionContent, textOpacity]}>
          <Text style={styles.swipeActionText}>Archive</Text>
        </Reanimated.View>
      </Reanimated.View>
    );
  };

  return (
    <View style={styles.noteListItemWrapper}>
      <Swipeable
        ref={swipeableRef}
        friction={1.2}
        rightThreshold={100}
        leftThreshold={100}
        overshootRight={true}
        overshootLeft={canArchive}
        renderRightActions={renderRightActions}
        renderLeftActions={canArchive ? renderLeftActions : undefined}
        onSwipeableOpen={(direction) => {
          // Auto-execute action when fully swiped through
          // direction 'left' = swiping left = delete (right actions opening)
          // direction 'right' = swiping right = archive (left actions opening)
          if (direction === 'right' && canArchive) {
            onArchive?.(note.id);
            // Close swipeable after action
            setTimeout(() => swipeableRef.current?.close(), 300);
          } else if (direction === 'left') {
            onDelete?.(note.id);
            // Close swipeable after action
            setTimeout(() => swipeableRef.current?.close(), 300);
          }
        }}
      >
        <Pressable
          onPress={() => onPress(note.id)}
          onLongPress={() => onLongPress?.(note)}
          style={[styles.noteListItem, { backgroundColor, paddingHorizontal: 16 }]}
          android_ripple={{ color: mutedColor }}
        >
          <View style={styles.noteListContent}>
          <View style={styles.noteListHeader}>
            <Text
              style={[styles.noteListTitle, { color: foregroundColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {String(note.title || 'Untitled')}
            </Text>
            <View style={styles.noteListMeta}>
              {isDiagram && (
                <Network size={12} color="#06b6d4" style={{ marginRight: 8 }} />
              )}
              {isCode && (
                <Code2 size={12} color="#22c55e" style={{ marginRight: 8 }} />
              )}
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
              <Text style={[styles.noteListTime, { color: mutedForegroundColor }]}>
                {enhancedData?.formattedDate || ''}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.noteListPreview, { color: mutedForegroundColor }]}
            numberOfLines={2}
          >
            {enhancedData?.preview || ''}
          </Text>
          {!folderId && folderPath && (
            <View style={styles.noteListFolderInfo}>
              <View style={[styles.noteListFolderDot, { backgroundColor: noteFolder?.color || '#6b7280' }]} />
              <Text style={[styles.noteListFolderPath, { color: mutedForegroundColor }]} numberOfLines={1}>
                {folderPath}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      </Swipeable>
      {!isLastItem && <View style={[styles.noteListDivider, { backgroundColor: borderColor }]} />}
    </View>
  );
};

// Memoized version - just use default shallow comparison
// This is faster than custom comparison during scroll
export const NoteListItem = React.memo(NoteListItemComponent);

const styles = StyleSheet.create({
  noteListItemWrapper: {
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
    // @ts-ignore - StyleSheet.hairlineWidth is intentionally used for height (ultra-thin divider)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: '100%',
  },
  archiveAction: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: '100%',
  },
  swipeActionContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
