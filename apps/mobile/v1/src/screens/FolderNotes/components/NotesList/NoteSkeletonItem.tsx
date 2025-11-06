import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '@/src/theme';

interface NoteSkeletonItemProps {
  skeletonOpacity: Animated.Value;
  isLastItem: boolean;
}

export const NoteSkeletonItem: React.FC<NoteSkeletonItemProps> = ({ skeletonOpacity, isLastItem }) => {
  const theme = useTheme();

  // Use shared animation from parent - NO per-item animations for performance
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
  noteListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteListDivider: {
    // @ts-ignore - StyleSheet.hairlineWidth is intentionally used for height (ultra-thin divider)
    height: StyleSheet.hairlineWidth,
    marginLeft: 0,
  },
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
