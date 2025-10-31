import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../../theme';

export interface FilterConfig {
  showAttachmentsOnly: boolean;
  showStarredOnly: boolean;
  showHiddenOnly: boolean;
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

export const FilterSortSheet = forwardRef<BottomSheetModal, FilterSortSheetProps>(
  ({ filterConfig, setFilterConfig, sortConfig, setSortConfig, hasActiveFilters }, ref) => {
    const theme = useTheme();

    const snapPoints = useMemo(() => ['70%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

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
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
              onPress={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()}
            >
              <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <View style={styles.bottomSheetBody}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>FILTER</Text>
              <TouchableOpacity
                style={[styles.viewModeButton, { backgroundColor: theme.colors.muted, opacity: hasActiveFilters ? 1 : 0 }]}
                onPress={() => setFilterConfig({ showAttachmentsOnly: false, showStarredOnly: false, showHiddenOnly: false })}
                activeOpacity={0.7}
                disabled={!hasActiveFilters}
              >
                <Ionicons name="close" size={16} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showAttachmentsOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showAttachmentsOnly: !prev.showAttachmentsOnly }))}
            >
              <Ionicons
                name={filterConfig.showAttachmentsOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showAttachmentsOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Attachments Only</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showStarredOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showStarredOnly: !prev.showStarredOnly }))}
            >
              <Ionicons
                name={filterConfig.showStarredOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showStarredOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Starred Only</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: filterConfig.showHiddenOnly ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setFilterConfig(prev => ({ ...prev, showHiddenOnly: !prev.showHiddenOnly }))}
            >
              <Ionicons
                name={filterConfig.showHiddenOnly ? "checkbox" : "square-outline"}
                size={24}
                color={filterConfig.showHiddenOnly ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Hidden Only</Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground, marginTop: 24 }]}>SORT BY</Text>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'updated' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'updated', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'updated' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'updated' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Last Modified</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'created' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'created', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'created' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'created' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Created Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'title' && sortConfig.direction === 'asc' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'title', direction: 'asc' })}
            >
              <Ionicons
                name={sortConfig.option === 'title' && sortConfig.direction === 'asc' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'title' && sortConfig.direction === 'asc' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Title (A-Z)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterOption, { backgroundColor: sortConfig.option === 'title' && sortConfig.direction === 'desc' ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]}
              onPress={() => setSortConfig({ option: 'title', direction: 'desc' })}
            >
              <Ionicons
                name={sortConfig.option === 'title' && sortConfig.direction === 'desc' ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sortConfig.option === 'title' && sortConfig.direction === 'desc' ? theme.colors.primary : theme.colors.mutedForeground}
              />
              <Text style={[styles.filterOptionText, { color: theme.colors.foreground }]}>Title (Z-A)</Text>
            </TouchableOpacity>
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
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
