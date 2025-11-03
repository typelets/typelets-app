import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Folder, Note } from '@/src/services/api';
import { useTheme } from '@/src/theme';
import { stripHtmlTags } from '@/src/utils/noteUtils';

import { NoteSkeletonItem } from './NoteSkeletonItem';

interface NoteListItemProps {
  note: Note;
  isLastItem: boolean;
  folderId?: string;
  onPress: (noteId: string) => void;
  folderPathsMap: Map<string, string>;
  foldersMap: Map<string, Folder>;
  skeletonOpacity: Animated.Value;
  enhancedDataCache: React.MutableRefObject<Map<string, { preview: string; formattedDate: string }>>;
}

export const NoteListItem: React.FC<NoteListItemProps> = ({
  note,
  isLastItem,
  folderId,
  onPress,
  folderPathsMap,
  foldersMap,
  skeletonOpacity,
  enhancedDataCache,
}) => {
  const theme = useTheme();

  // Check if note is still encrypted (loading skeleton)
  const noteIsEncrypted = note.title === '[ENCRYPTED]' || note.content === '[ENCRYPTED]';

  // Render skeleton for encrypted notes
  if (noteIsEncrypted) {
    return <NoteSkeletonItem skeletonOpacity={skeletonOpacity} isLastItem={isLastItem} />;
  }

  // Lazy calculation - strip HTML and format date only when rendered
  let enhancedData = enhancedDataCache.current.get(note.id);
  if (!enhancedData) {
    enhancedData = {
      preview: note.hidden ? '[HIDDEN]' : stripHtmlTags(note.content || ''),
      formattedDate: new Date(note.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    enhancedDataCache.current.set(note.id, enhancedData);
  }

  const folderPath = note.folderId ? folderPathsMap.get(note.folderId) || '' : '';
  const noteFolder = note.folderId ? foldersMap.get(note.folderId) : undefined;

  return (
    <View style={styles.noteListItemWrapper}>
      <Pressable
        onPress={() => onPress(note.id)}
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
      {!isLastItem && <View style={[styles.noteListDivider, { backgroundColor: theme.colors.border }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
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
    // @ts-ignore - StyleSheet.hairlineWidth is intentionally used for height (ultra-thin divider)
    height: StyleSheet.hairlineWidth,
    marginLeft: 0,
  },
});
