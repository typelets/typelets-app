import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ViewHeaderProps {
  isStarred: boolean;
  isHidden: boolean;
  title: string;
  scrollY: Animated.Value;
  attachmentsCount: number;
  showAttachments: boolean;
  onBack: () => void;
  onToggleStar: () => void;
  onToggleHidden: () => void;
  onToggleAttachments: () => void;
  onEdit: () => void;
  theme: {
    colors: {
      primary: string;
      primaryForeground: string;
      mutedForeground: string;
      muted: string;
      foreground: string;
      border: string;
      card: string;
      secondary: string;
    };
    isDark: boolean;
  };
}
export function ViewHeader({
  isStarred,
  isHidden,
  title,
  scrollY,
  attachmentsCount,
  showAttachments,
  onBack,
  onToggleStar,
  onToggleHidden,
  onToggleAttachments,
  onEdit,
  theme,
}: ViewHeaderProps) {
  const titleOpacity = scrollY.interpolate({
    inputRange: [40, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: theme.colors.muted }]}
          onPress={onBack}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.mutedForeground} style={{ marginLeft: -2 }} />
        </TouchableOpacity>

        <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
          <Text
            style={[styles.headerTitle, { color: theme.colors.foreground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </Animated.View>

        <View style={styles.headerActions}>
          {attachmentsCount > 0 && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: showAttachments ? 'rgba(59, 130, 246, 0.15)' : theme.colors.muted }]}
              onPress={onToggleAttachments}
            >
              <View style={styles.attachmentButtonContent}>
                <View style={{ transform: [{ rotate: '45deg' }] }}>
                  <Ionicons
                    name="attach-outline"
                    size={20}
                    color={showAttachments ? "#3b82f6" : theme.colors.mutedForeground}
                  />
                </View>
                {attachmentsCount > 0 && (
                  <View style={[styles.attachmentBadge, { backgroundColor: showAttachments ? "#3b82f6" : theme.colors.mutedForeground }]}>
                    <Text style={styles.attachmentBadgeText}>
                      {attachmentsCount > 9 ? '9+' : attachmentsCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.colors.muted }]}
            onPress={onToggleStar}
          >
            <Ionicons
              name={isStarred ? "star" : "star-outline"}
              size={20}
              color={isStarred ? "#f59e0b" : theme.colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.colors.muted }]}
            onPress={onToggleHidden}
          >
            <Ionicons
              name={isHidden ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={theme.colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.colors.muted }]}
            onPress={onEdit}
          >
            <Ionicons name="create-outline" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
      <Animated.View
        style={[
          styles.divider,
          {
            backgroundColor: theme.colors.border,
            opacity: dividerOpacity
          }
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    minHeight: 44,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  attachmentButtonContent: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  attachmentBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});
