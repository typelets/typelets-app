import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FOLDER_CARD } from '@/src/constants/ui';
import type { Folder } from '@/src/services/api';
import { useTheme } from '@/src/theme';

interface SubfoldersListProps {
  subfolders: (Folder & { noteCount?: number })[];
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  onCreateFolderPress: () => void;
  onFolderPress: (folderId: string, folderName: string) => void;
}

export const SubfoldersList: React.FC<SubfoldersListProps> = ({
  subfolders,
  viewMode,
  setViewMode,
  onCreateFolderPress,
  onFolderPress,
}) => {
  const theme = useTheme();

  const handleViewModeChange = async (mode: 'list' | 'grid') => {
    setViewMode(mode);
    try {
      await AsyncStorage.setItem('viewMode', mode);
    } catch (error) {
      if (__DEV__) console.error('Failed to save view mode:', error);
    }
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          FOLDERS ({String(subfolders?.length || 0)})
        </Text>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { backgroundColor: theme.colors.muted },
              viewMode === 'list' && styles.viewModeButtonActive
            ]}
            onPress={() => handleViewModeChange('list')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="list"
              size={16}
              color={viewMode === 'list' ? theme.colors.primary : theme.colors.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              { backgroundColor: theme.colors.muted },
              viewMode === 'grid' && styles.viewModeButtonActive
            ]}
            onPress={() => handleViewModeChange('grid')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid"
              size={16}
              color={viewMode === 'grid' ? theme.colors.primary : theme.colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={viewMode === 'grid' ? styles.subfoldersGrid : styles.subfoldersList}>
        {/* Create Folder Button */}
        <Pressable
          style={[
            viewMode === 'grid' ? styles.subfolderItemGrid : styles.subfolderItem,
            { backgroundColor: theme.isDark ? theme.colors.card : theme.colors.secondary, borderColor: theme.colors.border }
          ]}
          onPress={onCreateFolderPress}
          android_ripple={{ color: theme.colors.muted }}
        >
          <View style={viewMode === 'grid' ? styles.subfolderContentGrid : styles.subfolderContent}>
            <Ionicons name="add" size={viewMode === 'grid' ? 24 : 16} color={theme.colors.primary} style={{ marginRight: viewMode === 'grid' ? 0 : 12, marginBottom: viewMode === 'grid' ? 8 : 0 }} />
            <Text style={[styles.subfolderName, { color: theme.colors.foreground }]}>
              Create Folder
            </Text>
          </View>
        </Pressable>

        {subfolders.map((subfolder) => (
          <Pressable
            key={subfolder.id}
            style={[
              viewMode === 'grid' ? styles.subfolderItemGrid : styles.subfolderItem,
              {
                backgroundColor: viewMode === 'grid' ? subfolder.color || '#000000' : theme.colors.card,
                borderColor: theme.colors.border
              }
            ]}
            onPress={() => onFolderPress(subfolder.id, subfolder.name)}
            android_ripple={{ color: theme.colors.muted }}
          >
            <View style={viewMode === 'grid' ? styles.subfolderContentGrid : styles.subfolderContent}>
              {viewMode === 'list' && (
                <View style={[styles.subfolderColorDot, { backgroundColor: subfolder.color || '#000000' }]} />
              )}
              <Text style={[styles.subfolderName, { color: viewMode === 'grid' ? '#ffffff' : theme.colors.foreground }]} numberOfLines={1}>
                {subfolder.name}
              </Text>
            </View>
            {viewMode === 'list' && (
              <View style={[styles.subfolderCountBadge, { backgroundColor: theme.colors.muted }]}>
                <Text style={[styles.subfolderCountText, { color: theme.colors.mutedForeground }]}>
                  {String(subfolder.noteCount || 0)}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
  viewModeToggle: {
    flexDirection: 'row',
    gap: 4,
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
  subfoldersList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  subfoldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  subfolderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: FOLDER_CARD.PADDING,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
  },
  subfolderItemGrid: {
    width: '48%',
    padding: 16,
    borderRadius: FOLDER_CARD.BORDER_RADIUS,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subfolderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subfolderContentGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subfolderColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subfolderName: {
    fontSize: FOLDER_CARD.NAME_SIZE,
    fontWeight: '500',
  },
  subfolderCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  subfolderCountText: {
    fontSize: FOLDER_CARD.COUNT_SIZE,
    fontWeight: '500',
  },
});
