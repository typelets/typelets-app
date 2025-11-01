import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { NOTE_CARD } from '../../constants/ui';
import { useTheme } from '../../theme';

interface NotesHeaderProps {
  filteredNotesCount: number;
  totalNotesCount: number;
  hasActiveFilters: boolean;
  viewType?: 'all' | 'starred' | 'archived' | 'trash';
  subfoldersCount: number;
  onFilterPress: () => void;
  onCreateNotePress: () => void;
  onEmptyTrashPress: () => void;
}

export const NotesHeader: React.FC<NotesHeaderProps> = ({
  filteredNotesCount,
  totalNotesCount,
  hasActiveFilters,
  viewType,
  subfoldersCount,
  onFilterPress,
  onCreateNotePress,
  onEmptyTrashPress,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.notesSection}>
      <View style={[styles.sectionHeader, { marginTop: subfoldersCount > 0 ? 12 : 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          NOTES ({String(filteredNotesCount || 0)})
          {filteredNotesCount !== totalNotesCount && ` (${totalNotesCount} total)`}
        </Text>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            { backgroundColor: theme.colors.muted },
            hasActiveFilters && styles.viewModeButtonActive
          ]}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={hasActiveFilters ? "funnel" : "funnel-outline"}
            size={16}
            color={hasActiveFilters ? theme.colors.primary : theme.colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      {/* Create Note Button / Empty Trash Button */}
      {viewType === 'trash' ? (
        filteredNotesCount > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: NOTE_CARD.SPACING }}>
            <TouchableOpacity
              style={[styles.createNoteButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.destructive }]}
              onPress={onEmptyTrashPress}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="trash" size={16} color={theme.colors.destructive} style={{ marginRight: 12 }} />
                <Text style={[styles.buttonText, { color: theme.colors.destructive }]}>
                  Empty Trash
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View style={{ paddingHorizontal: 16, marginBottom: NOTE_CARD.SPACING }}>
          <TouchableOpacity
            style={[styles.createNoteButton, { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.secondary, borderColor: theme.colors.border }]}
            onPress={onCreateNotePress}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="add" size={16} color={theme.colors.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.buttonText, { color: theme.colors.foreground }]}>
                Create Note
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  notesSection: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  viewModeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  createNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
