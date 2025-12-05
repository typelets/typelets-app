import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { FOLDER_COLORS } from '@/src/constants/ui';
import { type Folder, useApiService } from '@/src/services/api';
import { useTheme } from '@/src/theme';

interface CreateFolderSheetProps {
  folderId?: string;
  onFolderCreated: (folder: Folder & { noteCount: number }) => void;
}

export const CreateFolderSheet = forwardRef<BottomSheetModal, CreateFolderSheetProps>(
  ({ folderId, onFolderCreated }, ref) => {
    const theme = useTheme();
    const api = useApiService();

    const [newFolderName, setNewFolderName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    const snapPoints = useMemo(() => ['55%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      []
    );

    // Add keyboard listener to snap back to original position
    useEffect(() => {
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          // Snap back to the original position when keyboard hides
          (ref as React.RefObject<BottomSheetModal>).current?.snapToIndex(0);
        }
      );

      return () => {
        keyboardDidHideListener.remove();
      };
    }, [ref]);

    const handleCreateFolder = async () => {
      if (!newFolderName.trim()) {
        Alert.alert('Error', 'Please enter a folder name.');
        return;
      }

      try {
        setIsCreatingFolder(true);
        const createdFolder = await api.createFolder(newFolderName.trim(), selectedColor, folderId);

        // Notify parent component
        onFolderCreated({ ...createdFolder, noteCount: 0 });

        // Reset modal state
        setNewFolderName('');
        setSelectedColor('#3b82f6');
        (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        if (__DEV__) console.error('Failed to create folder:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to create folder. Please try again.');
      } finally {
        setIsCreatingFolder(false);
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enablePanDownToClose={true}
        android_keyboardInputMode="adjustPan"
      >
        <BottomSheetView style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Create Folder</Text>
            <TouchableOpacity onPress={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()}>
              <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="none">
                <View style={styles.iconButton}>
                  <Ionicons name="close" size={20} color={theme.colors.foreground} />
                </View>
              </GlassView>
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bottomSheetBody}>
            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>Folder Name</Text>
            <BottomSheetTextInput
              style={[styles.input, {
                backgroundColor: theme.colors.muted,
                color: theme.colors.foreground,
                borderColor: theme.colors.border
              }]}
              placeholder="Enter folder name"
              placeholderTextColor={theme.colors.mutedForeground}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 20 }]}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#ffffff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.bottomSheetFooter}>
            <TouchableOpacity
              onPress={handleCreateFolder}
              disabled={isCreatingFolder}
              style={{ opacity: isCreatingFolder ? 0.6 : 1 }}
            >
              <GlassView
                glassEffectStyle="regular"
                style={[styles.glassCreateButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]}
                pointerEvents="none"
              >
                <View style={[styles.createButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.createButtonText, { color: theme.colors.primaryForeground }]}>
                    {isCreatingFolder ? 'Creating...' : 'Create'}
                  </Text>
                </View>
              </GlassView>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

CreateFolderSheet.displayName = 'CreateFolderSheet';

const styles = StyleSheet.create({
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  glassButton: {
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
  },
  bottomSheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomSheetFooter: {
    paddingHorizontal: 20,
  },
  glassCreateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButton: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
