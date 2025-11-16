import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GLASS_BUTTON } from '@/src/constants/ui';

interface EditorHeaderProps {
  isEditing: boolean;
  noteData: unknown;
  isSaving: boolean;
  isOffline?: boolean;
  isTempNote?: boolean;
  attachmentsCount?: number;
  showAttachments?: boolean;
  showHeader?: boolean;
  showToolbar?: boolean;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
  onToggleAttachments?: () => void;
  onToggleHeader?: () => void;
  onToggleToolbar?: () => void;
  onDismissKeyboard?: () => void;
  onTestEditor?: () => void;
  theme: {
    colors: {
      primary: string;
      destructive: string;
      destructiveForeground: string;
      primaryForeground: string;
      muted: string;
      mutedForeground: string;
      border: string;
      foreground: string;
    };
    isDark: boolean;
  };
}

export function EditorHeader({
  isEditing,
  isSaving,
  isOffline = false,
  isTempNote = false,
  attachmentsCount = 0,
  showAttachments = false,
  showHeader = true,
  showToolbar = false,
  onBack,
  onDelete,
  onSave,
  onToggleAttachments,
  onToggleHeader,
  onToggleToolbar,
  onDismissKeyboard,
  onTestEditor,
  theme,
}: EditorHeaderProps) {
  return (
    <View style={styles.headerWrapper}>
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
        locations={[0, 0.35, 0.45, 0.53, 0.60, 0.66, 0.72, 0.77, 0.82, 0.87, 1]}
        style={styles.gradient}
      />
      <View style={styles.header}>
        <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.foreground} style={{ marginLeft: -2 }} />
          </TouchableOpacity>
        </GlassView>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => {
            if (onDismissKeyboard) {
              onDismissKeyboard();
            }
          }}
          activeOpacity={1}
        >
          <View style={{ flex: 1 }} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {onToggleHeader && (
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <TouchableOpacity
                style={[styles.iconButton, showHeader && styles.iconButtonActive]}
                onPress={onToggleHeader}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View pointerEvents="none">
                  <Ionicons
                    name={showHeader ? "contract" : "expand"}
                    size={20}
                    color={showHeader ? theme.colors.primary : theme.colors.foreground}
                  />
                </View>
              </TouchableOpacity>
            </GlassView>
          )}

          {onToggleToolbar && (
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <TouchableOpacity
                style={[styles.iconButton, showToolbar && styles.iconButtonActive]}
                onPress={onToggleToolbar}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View pointerEvents="none">
                  <Ionicons
                    name="text-outline"
                    size={20}
                    color={showToolbar ? theme.colors.primary : theme.colors.foreground}
                  />
                </View>
              </TouchableOpacity>
            </GlassView>
          )}

          {onToggleAttachments && (
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <TouchableOpacity
                style={[styles.iconButton, showAttachments && styles.iconButtonActive]}
                onPress={onToggleAttachments}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={styles.attachmentButtonContent} pointerEvents="none">
                  <View style={{ transform: [{ rotate: '45deg' }] }} pointerEvents="none">
                    <Ionicons
                      name="attach-outline"
                      size={20}
                      color={showAttachments ? theme.colors.primary : theme.colors.foreground}
                    />
                  </View>
                  {attachmentsCount > 0 && (
                    <View style={[styles.attachmentBadge, { backgroundColor: showAttachments ? theme.colors.primary : theme.colors.mutedForeground }]} pointerEvents="none">
                      <Text style={[styles.attachmentBadgeText, { color: '#ffffff' }]}>
                        {attachmentsCount > 9 ? '9+' : attachmentsCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </GlassView>
          )}

          {onTestEditor && isEditing && (
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onTestEditor}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="flask-outline" size={20} color="#10b981" />
              </TouchableOpacity>
            </GlassView>
          )}

          {isEditing && (
            <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
              <TouchableOpacity
                style={[styles.iconButton, { opacity: (isOffline && !isTempNote) ? 0.4 : 1 }]}
                onPress={onDelete}
                disabled={isOffline && !isTempNote}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash" size={20} color={theme.colors.foreground} />
              </TouchableOpacity>
            </GlassView>
          )}

          <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  opacity: isSaving || (isOffline && isEditing && !isTempNote) ? 0.4 : 1
                }
              ]}
              onPress={() => {
                if (!isSaving && !(isOffline && isEditing && !isTempNote)) {
                  onSave();
                }
              }}
              disabled={isOffline && isEditing && !isTempNote}
              activeOpacity={isSaving || (isOffline && isEditing && !isTempNote) ? 1 : 0.2}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View pointerEvents="none">
                {isSaving ? (
                  <ActivityIndicator size="small" color={theme.colors.foreground} />
                ) : (
                  <Check size={20} color={theme.colors.foreground} strokeWidth={2.5} />
                )}
              </View>
            </TouchableOpacity>
          </GlassView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
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
    paddingBottom: 8,
    minHeight: 44,
  },
  glassButton: {
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
