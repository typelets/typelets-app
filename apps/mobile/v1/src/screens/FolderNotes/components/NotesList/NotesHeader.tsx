import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { NOTE_CARD, GLASS_BUTTON } from '@/src/constants/ui';
import { useTheme } from '@/src/theme';

interface NotesHeaderProps {
  filteredNotesCount: number;
  totalNotesCount: number;
  hasActiveFilters: boolean;
  viewType?: 'all' | 'starred' | 'archived' | 'trash';
  subfoldersCount: number;
  onFilterPress: () => void;
  onCreateNotePress: () => void;
  onEmptyTrashPress: () => void;
  createNoteButtonRef?: React.RefObject<View>;
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
  createNoteButtonRef,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.notesSection}>
      <View style={[styles.sectionHeader, { marginTop: subfoldersCount > 0 ? 12 : 16 }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          NOTES ({String(filteredNotesCount || 0)})
          {filteredNotesCount !== totalNotesCount && ` (${totalNotesCount} total)`}
        </Text>
        <GlassView glassEffectStyle="regular" style={styles.squareButtonGlass}>
          <TouchableOpacity
            style={styles.squareButton}
            onPress={onFilterPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hasActiveFilters ? "funnel" : "funnel-outline"}
              size={16}
              color={hasActiveFilters ? theme.colors.primary : theme.colors.foreground}
            />
          </TouchableOpacity>
        </GlassView>
      </View>

      {/* Create Note Button / Empty Trash Button - Full width to match note list */}
      {viewType === 'trash' ? (
        filteredNotesCount > 0 && (
          <View style={styles.buttonWrapper}>
            <GlassView glassEffectStyle="regular" style={styles.createNoteButtonGlass}>
              <Pressable
                style={styles.createNoteButton}
                onPress={onEmptyTrashPress}
              >
                <Ionicons name="trash" size={16} color={theme.colors.foreground} style={{ marginRight: 12 }} />
                <Text style={[styles.buttonText, { color: theme.colors.foreground }]}>
                  Empty Trash
                </Text>
              </Pressable>
            </GlassView>
          </View>
        )
      ) : (
        <View style={styles.buttonWrapper} ref={createNoteButtonRef} collapsable={false}>
          <GlassView glassEffectStyle="regular" style={styles.createNoteButtonGlass}>
            <Pressable
              style={styles.createNoteButton}
              onPress={onCreateNotePress}
            >
              <Ionicons name="add" size={16} color={theme.colors.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.buttonText, { color: theme.colors.foreground }]}>
                Create Note
              </Text>
            </Pressable>
          </GlassView>
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
  squareButtonGlass: {
    borderRadius: GLASS_BUTTON.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  squareButton: {
    width: GLASS_BUTTON.SIZE,
    height: GLASS_BUTTON.SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    paddingHorizontal: 16,
    marginBottom: NOTE_CARD.SPACING,
  },
  createNoteButtonGlass: {
    borderRadius: NOTE_CARD.BORDER_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  createNoteButton: {
    borderRadius: NOTE_CARD.BORDER_RADIUS,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
