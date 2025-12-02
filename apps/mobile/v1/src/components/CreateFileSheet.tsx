import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { GlassView } from 'expo-glass-effect';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MdiIcon, mdiCodeTags, mdiFileDocumentOutline, mdiFileTableBoxOutline, mdiTextBoxOutline, mdiVectorSquare } from './MdiIcon';
import { useTheme } from '../theme';

export interface CreateFileSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface CreateFileSheetProps {
  onCreateNote: () => void;
}

interface FileTypeOption {
  id: 'note' | 'sheet' | 'diagram' | 'code' | 'document';
  title: string;
  subtitle: string;
  iconPath: string;
  iconColor: string;
  available: boolean;
}

const FILE_TYPES: FileTypeOption[] = [
  {
    id: 'note',
    title: 'Note',
    subtitle: 'Write with rich text formatting',
    iconPath: mdiTextBoxOutline,
    iconColor: '#f43f5e',
    available: true,
  },
  {
    id: 'sheet',
    title: 'Spreadsheet',
    subtitle: 'Create tables and calculations',
    iconPath: mdiFileTableBoxOutline,
    iconColor: '#22c55e',
    available: false,
  },
  {
    id: 'diagram',
    title: 'Diagram',
    subtitle: 'Draw flowcharts and diagrams',
    iconPath: mdiVectorSquare,
    iconColor: '#a855f7',
    available: false,
  },
  {
    id: 'code',
    title: 'Code',
    subtitle: 'Write and save code snippets',
    iconPath: mdiCodeTags,
    iconColor: '#f59e0b',
    available: false,
  },
  {
    id: 'document',
    title: 'Document',
    subtitle: 'Long-form writing with pages',
    iconPath: mdiFileDocumentOutline,
    iconColor: '#3b82f6',
    available: false,
  },
];

export const CreateFileSheet = forwardRef<CreateFileSheetRef, CreateFileSheetProps>(
  ({ onCreateNote }, ref) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }));

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

    const handleSelect = (option: FileTypeOption) => {
      if (!option.available) {
        Alert.alert('Coming Soon', `${option.title} creation is coming in a future update. Stay tuned!`);
        return;
      }

      sheetRef.current?.dismiss();

      if (option.id === 'note') {
        onCreateNote();
      }
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        enableDynamicSizing={true}
        enablePanDownToClose={true}
        maxDynamicContentSize={600}
      >
        <BottomSheetScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              Create New
            </Text>
            <GlassView
              glassEffectStyle="regular"
              style={[
                styles.glassButton,
                { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' },
              ]}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => sheetRef.current?.dismiss()}
              >
                <Ionicons name="close" size={20} color={theme.colors.foreground} />
              </TouchableOpacity>
            </GlassView>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={[styles.optionsContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {FILE_TYPES.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: option.available ? 1 : 0.5,
                  },
                ]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.colors.muted }]}>
                  <MdiIcon path={option.iconPath} size={24} color={option.iconColor} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: theme.colors.mutedForeground }]}>
                    {option.subtitle}
                  </Text>
                </View>
                {!option.available && (
                  <View style={[styles.comingSoonBadge, { backgroundColor: theme.colors.muted }]}>
                    <Text style={[styles.comingSoonText, { color: theme.colors.mutedForeground }]}>
                      Soon
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

CreateFileSheet.displayName = 'CreateFileSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  glassButton: {
    borderRadius: 17,
    overflow: 'hidden',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
