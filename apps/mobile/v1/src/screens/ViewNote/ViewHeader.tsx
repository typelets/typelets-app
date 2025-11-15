import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, StyleSheet, Text,TouchableOpacity, View } from 'react-native';

import { GLASS_BUTTON } from '@/src/constants/ui';

interface ViewHeaderProps {
  isStarred: boolean;
  isHidden: boolean;
  title: string;
  scrollY: Animated.Value;
  attachmentsCount: number;
  showAttachments: boolean;
  isOffline?: boolean;
  isTempNote?: boolean;
  insets?: { top: number; bottom: number; left: number; right: number };
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
  isOffline = false,
  isTempNote = false,
  insets,
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

  return (
    <>
      <View style={[styles.headerWrapper, { paddingTop: insets?.top || 0 }]}>
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
          style={styles.gradient}
        />
        <View style={styles.header}>
          <GlassView glassEffectStyle="regular" style={styles.glassButton}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.foreground} style={{ marginLeft: -2 }} />
            </TouchableOpacity>
          </GlassView>

          <Animated.View style={[styles.glassTitleButton, { opacity: titleOpacity }]}>
            <GlassView glassEffectStyle="regular" style={{ flex: 1, borderRadius: 19, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
              <View style={styles.titleButton}>
                <Text
                  style={[styles.headerTitle, { color: theme.colors.foreground }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              </View>
            </GlassView>
          </Animated.View>

          <View style={styles.headerActions}>
            {attachmentsCount > 0 && (
              <GlassView glassEffectStyle="regular" style={styles.glassButton}>
                <TouchableOpacity
                  style={[styles.iconButton, showAttachments && styles.iconButtonActive]}
                  onPress={onToggleAttachments}
                >
                  <View style={styles.attachmentButtonContent}>
                    <View style={{ transform: [{ rotate: '45deg' }] }}>
                      <Ionicons
                        name="attach-outline"
                        size={20}
                        color={showAttachments ? theme.colors.primary : theme.colors.foreground}
                      />
                    </View>
                    {attachmentsCount > 0 && (
                      <View style={[styles.attachmentBadge, { backgroundColor: showAttachments ? theme.colors.primary : theme.colors.mutedForeground }]}>
                        <Text style={[styles.attachmentBadgeText, { color: '#ffffff' }]}>
                          {attachmentsCount > 9 ? '9+' : attachmentsCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </GlassView>
            )}

            <GlassView glassEffectStyle="regular" style={styles.glassButton}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onToggleStar}
              >
                <Ionicons
                  name={isStarred ? "star" : "star-outline"}
                  size={20}
                  color={isStarred ? "#f59e0b" : theme.colors.foreground}
                />
              </TouchableOpacity>
            </GlassView>

            <GlassView glassEffectStyle="regular" style={styles.glassButton}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onToggleHidden}
              >
                <Ionicons
                  name={isHidden ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.foreground}
                />
              </TouchableOpacity>
            </GlassView>

            <GlassView glassEffectStyle="regular" style={styles.glassButton}>
              <TouchableOpacity
                style={[styles.iconButton, { opacity: (isOffline && !isTempNote) ? 0.4 : 1 }]}
                onPress={onEdit}
                disabled={isOffline && !isTempNote}
              >
                <Ionicons name="create-outline" size={20} color={theme.colors.foreground} />
              </TouchableOpacity>
            </GlassView>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: 35,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    minHeight: 44,
  },
  glassButton: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  glassTitleButton: {
    flex: 1,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    marginHorizontal: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: GLASS_BUTTON.ACTIVE_BACKGROUND,
  },
  titleButton: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 10,
    fontWeight: '600',
  },
});
