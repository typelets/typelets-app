import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useApiService, type ApiUserUsage } from '@/src/services/api';
import { useTheme } from '../../theme';

interface UsageBottomSheetProps {
  sheetRef: React.RefObject<BottomSheetModal>;
  snapPoints: string[];
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export function UsageBottomSheet({ sheetRef, snapPoints }: UsageBottomSheetProps) {
  const theme = useTheme();
  const api = useApiService();
  const [usage, setUsage] = useState<ApiUserUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.getCurrentUser(true);

      if (user.usage) {
        setUsage(user.usage);
      }
    } catch (err) {
      setError('Failed to load usage data');
      console.error('Error loading usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const getProgressColor = (percent: number): string => {
    if (percent >= 95) return '#EF4444';
    if (percent >= 80) return '#F59E0B';
    return theme.colors.primary;
  };

  const styles = createStyles(theme);

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.card }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
      topInset={45}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.bottomSheetHeader}>
          <Text style={[styles.bottomSheetTitle, { color: theme.colors.foreground }]}>
            Usage & Limits
          </Text>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.muted }]}
            onPress={() => sheetRef.current?.dismiss()}
          >
            <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : usage ? (
          <BottomSheetScrollView style={styles.scrollContent}>
            {/* Storage Usage */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Storage</Text>
                <Text style={styles.sectionValue}>
                  {formatBytes(usage.storage.totalBytes)} / {usage.storage.limitGB} GB
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(usage.storage.usagePercent, 100)}%`,
                      backgroundColor: getProgressColor(usage.storage.usagePercent),
                    },
                  ]}
                />
              </View>

              <Text style={styles.percentText}>
                {usage.storage.usagePercent.toFixed(1)}% used
              </Text>

              {usage.storage.usagePercent >= 95 && (
                <View style={[styles.warningBox, styles.errorWarning]}>
                  <Text style={styles.warningText}>
                    ⚠️ Storage nearly full. Delete some notes to free up space.
                  </Text>
                </View>
              )}
              {usage.storage.usagePercent >= 80 && usage.storage.usagePercent < 95 && (
                <View style={[styles.warningBox, styles.cautionWarning]}>
                  <Text style={styles.warningText}>
                    ⚠️ Storage usage is high
                  </Text>
                </View>
              )}
            </View>

            {/* Notes Count */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.sectionValue}>
                  {usage.notes.count.toLocaleString()} / {usage.notes.limit.toLocaleString()}
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(usage.notes.usagePercent, 100)}%`,
                      backgroundColor: getProgressColor(usage.notes.usagePercent),
                    },
                  ]}
                />
              </View>

              <Text style={styles.percentText}>
                {usage.notes.usagePercent.toFixed(1)}% used
              </Text>

              {usage.notes.usagePercent >= 95 && (
                <View style={[styles.warningBox, styles.errorWarning]}>
                  <Text style={styles.warningText}>
                    ⚠️ Note limit nearly reached. Delete some notes to create new ones.
                  </Text>
                </View>
              )}
              {usage.notes.usagePercent >= 80 && usage.notes.usagePercent < 95 && (
                <View style={[styles.warningBox, styles.cautionWarning]}>
                  <Text style={styles.warningText}>
                    ⚠️ Approaching note limit
                  </Text>
                </View>
              )}
            </View>
          </BottomSheetScrollView>
        ) : null}
      </View>
    </BottomSheetModal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    bottomSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 0,
      paddingBottom: 12,
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: 0.5,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 16,
      color: '#EF4444',
      textAlign: 'center',
    },
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.foreground,
    },
    sectionValue: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.mutedForeground,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    percentText: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
      marginTop: 4,
    },
    warningBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    errorWarning: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: '#EF4444',
    },
    cautionWarning: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: '#F59E0B',
    },
    warningText: {
      fontSize: 14,
      color: theme.colors.foreground,
      lineHeight: 20,
    },
  });
