import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditorHeaderProps {
  isEditing: boolean;
  noteData: unknown;
  isSaving: boolean;
  attachmentsCount?: number;
  showAttachments?: boolean;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
  onToggleAttachments?: () => void;
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
  noteData,
  isSaving,
  attachmentsCount = 0,
  showAttachments = false,
  onBack,
  onDelete,
  onSave,
  onToggleAttachments,
  theme,
}: EditorHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={[styles.headerButton, { backgroundColor: theme.colors.muted }]}
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={20} color={theme.colors.mutedForeground} style={{ marginLeft: -2 }} />
      </TouchableOpacity>

      <View style={styles.titleSpacer} />

      <View style={styles.headerActions}>
        {isEditing && onToggleAttachments && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: showAttachments ? 'rgba(59, 130, 246, 0.15)' : theme.colors.muted }]}
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

        {isEditing && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.muted }]}
            onPress={onDelete}
          >
            <Ionicons name="trash" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.muted }]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
          ) : (
            <Ionicons name="checkmark" size={20} color={theme.colors.mutedForeground} />
          )}
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
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  titleSpacer: {
    flex: 1,
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
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
});
