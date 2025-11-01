import { Ionicons } from '@expo/vector-icons';
import { Check } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EditorHeaderProps {
  isEditing: boolean;
  noteData: unknown;
  isSaving: boolean;
  isOffline?: boolean;
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
    };
  };
}
export function EditorHeader({
  isEditing,
  isSaving,
  isOffline = false,
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
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: theme.colors.muted }]}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.mutedForeground} style={{ marginLeft: -2 }} />
      </TouchableOpacity>

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
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: showHeader ? 'rgba(59, 130, 246, 0.15)' : theme.colors.muted }]}
            onPress={onToggleHeader}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Ionicons
                name={showHeader ? "contract" : "expand"}
                size={20}
                color={showHeader ? "#3b82f6" : theme.colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        )}

        {onToggleToolbar && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: showToolbar ? 'rgba(59, 130, 246, 0.15)' : theme.colors.muted }]}
            onPress={onToggleToolbar}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Ionicons
                name="text-outline"
                size={20}
                color={showToolbar ? "#3b82f6" : theme.colors.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        )}

        {onToggleAttachments && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: showAttachments ? 'rgba(59, 130, 246, 0.15)' : theme.colors.muted }]}
            onPress={onToggleAttachments}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View style={styles.attachmentButtonContent} pointerEvents="none">
              <View style={{ transform: [{ rotate: '45deg' }] }} pointerEvents="none">
                <Ionicons
                  name="attach-outline"
                  size={20}
                  color={showAttachments ? "#3b82f6" : theme.colors.mutedForeground}
                />
              </View>
              {attachmentsCount > 0 && (
                <View style={[styles.attachmentBadge, { backgroundColor: showAttachments ? "#3b82f6" : theme.colors.mutedForeground }]} pointerEvents="none">
                  <Text style={[styles.attachmentBadgeText, { color: showAttachments ? '#ffffff' : theme.colors.muted }]}>
                    {attachmentsCount > 9 ? '9+' : attachmentsCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {onTestEditor && isEditing && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={onTestEditor}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="flask-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}

        {isEditing && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.muted, opacity: isOffline ? 0.4 : 1 }]}
            onPress={onDelete}
            disabled={isOffline}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: theme.colors.muted,
              opacity: isSaving || (isOffline && isEditing) ? 0.4 : 1
            }
          ]}
          onPress={() => {
            if (!isSaving && !(isOffline && isEditing)) {
              onSave();
            }
          }}
          disabled={isOffline && isEditing}
          activeOpacity={isSaving || (isOffline && isEditing) ? 1 : 0.2}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View pointerEvents="none">
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
            ) : (
              <Check size={20} color={theme.colors.mutedForeground} strokeWidth={2.5} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 44,
  },
  headerButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
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
