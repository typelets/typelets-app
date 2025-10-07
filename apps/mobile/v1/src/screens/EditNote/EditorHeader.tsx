import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditorHeaderProps {
  isEditing: boolean;
  noteData: unknown;
  isSaving: boolean;
  onBack: () => void;
  onDelete: () => void;
  onSave: () => void;
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
  onBack,
  onDelete,
  onSave,
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
});
