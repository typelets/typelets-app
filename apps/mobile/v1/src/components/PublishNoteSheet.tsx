/**
 * Publish Note Bottom Sheet
 * Allows users to publish/unpublish notes as public web pages
 */

import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { GlassView } from 'expo-glass-effect';
import { Globe } from 'lucide-react-native';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Note, useApiService } from '@/src/services/api';
import { useTheme } from '@/src/theme';

interface PublishNoteSheetProps {
  onPublishStateChange?: (noteId: string, isPublished: boolean, slug?: string) => void;
}

export interface PublishNoteSheetRef {
  present: (note: Note) => void;
  dismiss: () => void;
}

export const PublishNoteSheet = forwardRef<PublishNoteSheetRef, PublishNoteSheetProps>(
  ({ onPublishStateChange }, ref) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const api = useApiService();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [authorName, setAuthorName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [publicSlug, setPublicSlug] = useState<string | null>(null);
    const [publishedAt, setPublishedAt] = useState<string | null>(null);
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    const snapPoints = useMemo(() => ['65%'], []);

    useImperativeHandle(ref, () => ({
      present: async (note: Note) => {
        setCurrentNote(note);
        setIsPublished(note.isPublished || false);
        setPublicSlug(note.publicSlug || null);
        setPublishedAt(note.publishedAt || null);
        setLastSynced(note.publicUpdatedAt || note.publishedAt || null);
        setAuthorName('');
        setIsLoading(false);
        // Force close first then present to ensure clean state
        bottomSheetRef.current?.dismiss();
        // Small delay to ensure dismiss completes before present
        setTimeout(() => {
          bottomSheetRef.current?.present();
        }, 50);

        // Fetch latest public note info if published
        if (note.isPublished && note.publicSlug) {
          try {
            const info = await api.getPublicNoteInfo(note.id);
            if (info) {
              setAuthorName(info.authorName || '');
              setLastSynced(info.updatedAt);
            }
          } catch (error) {
            // Ignore errors, use cached info
          }
        }
      },
      dismiss: () => {
        bottomSheetRef.current?.dismiss();
      },
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

    const handlePublish = async () => {
      if (!currentNote) return;

      try {
        setIsLoading(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const result = await api.publishNote({
          noteId: currentNote.id,
          title: currentNote.title,
          content: currentNote.content,
          type: currentNote.type,
          authorName: authorName.trim() || undefined,
        });

        setIsPublished(true);
        setPublicSlug(result.slug);
        setPublishedAt(result.publishedAt);
        setLastSynced(result.updatedAt);

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPublishStateChange?.(currentNote.id, true, result.slug);
      } catch (error) {
        console.error('Failed to publish note:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to publish note. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleUnpublish = async () => {
      if (!currentNote || !publicSlug) return;

      Alert.alert(
        'Unpublish Note',
        'This will remove the public version of your note. Anyone with the link will no longer be able to view it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unpublish',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                await api.unpublishNote(publicSlug);

                setIsPublished(false);
                setPublicSlug(null);
                setPublishedAt(null);
                setLastSynced(null);

                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onPublishStateChange?.(currentNote.id, false);
                bottomSheetRef.current?.dismiss();
              } catch (error) {
                console.error('Failed to unpublish note:', error);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', 'Failed to unpublish note. Please try again.');
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    };

    const handleCopyLink = async () => {
      if (!publicSlug || !currentNote) return;

      const url = api.getPublicUrl(publicSlug);
      try {
        // Use Share API - on iOS the share sheet includes a "Copy" option
        await Share.share({
          title: currentNote.title,
          message: url,
          url: url,
        });
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled or failed:', error);
      }
    };

    const handleShare = async () => {
      if (!publicSlug || !currentNote) return;

      const url = api.getPublicUrl(publicSlug);
      try {
        await Share.share({
          title: currentNote.title,
          message: `${currentNote.title}\n\n${url}`,
          url: url,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    };

    const formatDate = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    if (!currentNote) return null;

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.colors.card }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        topInset={insets.top + 10}
        enablePanDownToClose={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom + 20 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Globe size={22} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
                {isPublished ? 'Published Note' : 'Publish Note'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => bottomSheetRef.current?.dismiss()}
            >
              <GlassView glassEffectStyle="regular" style={[styles.glassButton, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)' }]} pointerEvents="none">
                <View style={styles.iconButton}>
                  <Ionicons name="close" size={20} color={theme.colors.foreground} />
                </View>
              </GlassView>
            </TouchableOpacity>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Content */}
          <View style={styles.content}>
            {isPublished ? (
              <>
                {/* Published State */}
                <View style={[styles.urlContainer, { backgroundColor: theme.colors.muted }]}>
                  <Text style={[styles.urlLabel, { color: theme.colors.mutedForeground }]}>
                    Public URL
                  </Text>
                  <Text style={[styles.urlText, { color: theme.colors.foreground }]} numberOfLines={1}>
                    {publicSlug ? api.getPublicUrl(publicSlug) : ''}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
                    onPress={handleCopyLink}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.colors.foreground} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.foreground }]}>
                      Copy Link
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-outline" size={18} color={theme.colors.foreground} />
                    <Text style={[styles.actionButtonText, { color: theme.colors.foreground }]}>
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Last Synced */}
                {lastSynced && (
                  <Text style={[styles.syncedText, { color: theme.colors.mutedForeground }]}>
                    Last synced: {formatDate(lastSynced)}
                  </Text>
                )}

                {/* Unpublish Button */}
                <TouchableOpacity
                  style={[styles.unpublishButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  onPress={handleUnpublish}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.foreground} />
                  ) : (
                    <Text style={[styles.unpublishButtonText, { color: theme.colors.foreground }]}>
                      Unpublish Note
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Warning */}
                <View style={[styles.warningBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B' }]}>
                  <Ionicons name="warning-outline" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
                  <Text style={[styles.warningText, { color: theme.colors.foreground }]}>
                    Publishing bypasses end-to-end encryption. An unencrypted copy will be stored on our servers and anyone with the link can view it.
                  </Text>
                </View>

                {/* Author Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.mutedForeground }]}>
                    Author Name (optional)
                  </Text>
                  <BottomSheetTextInput
                    style={[styles.input, {
                      backgroundColor: theme.colors.muted,
                      color: theme.colors.foreground,
                      borderColor: theme.colors.border
                    }]}
                    placeholder="Enter your name"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={authorName}
                    onChangeText={setAuthorName}
                  />
                </View>

                {/* Publish Button */}
                <TouchableOpacity
                  style={[styles.publishButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handlePublish}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                  ) : (
                    <>
                      <Globe size={18} color={theme.colors.primaryForeground} />
                      <Text style={[styles.publishButtonText, { color: theme.colors.primaryForeground }]}>
                        Publish Note
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

PublishNoteSheet.displayName = 'PublishNoteSheet';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  glassButton: {
    borderRadius: 17,
    overflow: 'hidden',
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  urlContainer: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  urlText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncedText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  unpublishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  unpublishButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
