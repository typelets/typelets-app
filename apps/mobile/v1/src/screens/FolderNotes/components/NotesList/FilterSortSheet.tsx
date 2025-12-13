import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import React, { forwardRef, memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/theme';

export interface FilterConfig {
  showAttachmentsOnly: boolean;
  showCodeOnly: boolean;
  showDiagramOnly: boolean;
  showHiddenOnly: boolean;
  showNoteOnly: boolean;
  showPublicOnly: boolean;
  showSheetOnly: boolean;
  showStarredOnly: boolean;
}

export interface SortConfig {
  option: 'updated' | 'created' | 'title';
  direction: 'asc' | 'desc';
}

interface FilterSortSheetProps {
  filterConfig: FilterConfig;
  setFilterConfig: React.Dispatch<React.SetStateAction<FilterConfig>>;
  sortConfig: SortConfig;
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>;
  hasActiveFilters: boolean;
}

// Memoized filter checkbox component with optimistic local state for instant feedback
const FilterCheckbox = memo(function FilterCheckbox({
  label,
  isActive,
  onToggle,
  primaryColor,
  mutedColor,
  foregroundColor,
  borderColor,
}: {
  label: string;
  isActive: boolean;
  onToggle: () => void;
  primaryColor: string;
  mutedColor: string;
  foregroundColor: string;
  borderColor: string;
}) {
  // Optimistic local state for instant visual feedback
  const [localActive, setLocalActive] = useState(isActive);

  // Sync with parent state when it catches up
  useEffect(() => {
    setLocalActive(isActive);
  }, [isActive]);

  const handlePress = useCallback(() => {
    // Instant visual update
    setLocalActive(prev => !prev);
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Trigger actual state update (deferred)
    onToggle();
  }, [onToggle]);

  return (
    <Pressable
      style={[
        styles.filterOptionGrid,
        { backgroundColor: localActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderColor },
      ]}
      onPress={handlePress}
    >
      <Ionicons
        name={localActive ? 'checkbox' : 'square-outline'}
        size={20}
        color={localActive ? primaryColor : mutedColor}
      />
      <Text style={[styles.filterOptionTextGrid, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
});

// Memoized sort radio button component with optimistic local state
const SortRadio = memo(function SortRadio({
  label,
  isActive,
  onSelect,
  primaryColor,
  mutedColor,
  foregroundColor,
}: {
  label: string;
  isActive: boolean;
  onSelect: () => void;
  primaryColor: string;
  mutedColor: string;
  foregroundColor: string;
}) {
  // Optimistic local state for instant visual feedback
  const [localActive, setLocalActive] = useState(isActive);

  // Sync with parent state when it catches up
  useEffect(() => {
    setLocalActive(isActive);
  }, [isActive]);

  const handlePress = useCallback(() => {
    // Instant visual update
    setLocalActive(true);
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Trigger actual state update (deferred)
    onSelect();
  }, [onSelect]);

  return (
    <Pressable
      style={[styles.filterOption, { backgroundColor: localActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
      onPress={handlePress}
    >
      <Ionicons
        name={localActive ? 'radio-button-on' : 'radio-button-off'}
        size={24}
        color={localActive ? primaryColor : mutedColor}
      />
      <Text style={[styles.filterOptionText, { color: foregroundColor }]}>{label}</Text>
    </Pressable>
  );
});

export const FilterSortSheet = forwardRef<BottomSheetModal, FilterSortSheetProps>(
  ({ filterConfig, setFilterConfig, sortConfig, setSortConfig, hasActiveFilters }, ref) => {
    const theme = useTheme();

    const snapPoints = useMemo(() => ['80%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
          pressBehavior="close"
        />
      ),
      []
    );

    // Memoized toggle handlers - wrapped in startTransition for responsive UI
    const toggleAttachments = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showAttachmentsOnly: !prev.showAttachmentsOnly }))), [setFilterConfig]);
    const toggleCode = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showCodeOnly: !prev.showCodeOnly }))), [setFilterConfig]);
    const toggleDiagram = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showDiagramOnly: !prev.showDiagramOnly }))), [setFilterConfig]);
    const toggleHidden = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showHiddenOnly: !prev.showHiddenOnly }))), [setFilterConfig]);
    const toggleNote = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showNoteOnly: !prev.showNoteOnly }))), [setFilterConfig]);
    const togglePublic = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showPublicOnly: !prev.showPublicOnly }))), [setFilterConfig]);
    const toggleSheet = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showSheetOnly: !prev.showSheetOnly }))), [setFilterConfig]);
    const toggleStarred = useCallback(() => startTransition(() => setFilterConfig(prev => ({ ...prev, showStarredOnly: !prev.showStarredOnly }))), [setFilterConfig]);
    const clearFilters = useCallback(() => startTransition(() => setFilterConfig({ showAttachmentsOnly: false, showCodeOnly: false, showDiagramOnly: false, showHiddenOnly: false, showNoteOnly: false, showPublicOnly: false, showSheetOnly: false, showStarredOnly: false })), [setFilterConfig]);

    // Memoized sort handlers - wrapped in startTransition for responsive UI
    const sortByUpdated = useCallback(() => startTransition(() => setSortConfig({ option: 'updated', direction: 'desc' })), [setSortConfig]);
    const sortByCreated = useCallback(() => startTransition(() => setSortConfig({ option: 'created', direction: 'desc' })), [setSortConfig]);
    const sortByTitleAsc = useCallback(() => startTransition(() => setSortConfig({ option: 'title', direction: 'asc' })), [setSortConfig]);
    const sortByTitleDesc = useCallback(() => startTransition(() => setSortConfig({ option: 'title', direction: 'desc' })), [setSortConfig]);

    const dismissSheet = useCallback(() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss(), [ref]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={45}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={{ paddingBottom: 32 }}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>Filter & Sort</Text>
            <Pressable onPress={dismissSheet}>
              <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="none">
                <View style={styles.iconButton}>
                  <Ionicons name="close" size={20} color={theme.colors.foreground} />
                </View>
              </GlassView>
            </Pressable>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bottomSheetBody}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>FILTER</Text>
              {hasActiveFilters && (
                <Pressable
                  style={[styles.viewModeButton, { backgroundColor: theme.colors.muted }]}
                  onPress={clearFilters}
                >
                  <Ionicons name="close" size={16} color={theme.colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* 2x2 grid layout - Alphabetically ordered */}
            <View style={styles.filterGrid}>
              <FilterCheckbox label="Attachment" isActive={filterConfig.showAttachmentsOnly} onToggle={toggleAttachments} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Code" isActive={filterConfig.showCodeOnly} onToggle={toggleCode} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Diagram" isActive={filterConfig.showDiagramOnly} onToggle={toggleDiagram} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Hidden" isActive={filterConfig.showHiddenOnly} onToggle={toggleHidden} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Note" isActive={filterConfig.showNoteOnly} onToggle={toggleNote} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Public" isActive={filterConfig.showPublicOnly} onToggle={togglePublic} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Sheet" isActive={filterConfig.showSheetOnly} onToggle={toggleSheet} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
              <FilterCheckbox label="Starred" isActive={filterConfig.showStarredOnly} onToggle={toggleStarred} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} borderColor={theme.colors.border} />
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 24 }]}>SORT BY</Text>

            <SortRadio label="Last Modified" isActive={sortConfig.option === 'updated'} onSelect={sortByUpdated} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} />
            <SortRadio label="Created Date" isActive={sortConfig.option === 'created'} onSelect={sortByCreated} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} />
            <SortRadio label="Title (A-Z)" isActive={sortConfig.option === 'title' && sortConfig.direction === 'asc'} onSelect={sortByTitleAsc} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} />
            <SortRadio label="Title (Z-A)" isActive={sortConfig.option === 'title' && sortConfig.direction === 'desc'} onSelect={sortByTitleDesc} primaryColor={theme.colors.primary} mutedColor={theme.colors.mutedForeground} foregroundColor={theme.colors.foreground} />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

FilterSortSheet.displayName = 'FilterSortSheet';

const styles = StyleSheet.create({
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  bottomSheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  glassButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  viewModeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '48%',
    gap: 8,
  },
  filterOptionTextGrid: {
    fontSize: 14,
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    flex: 1,
  },
});
