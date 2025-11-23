import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useFocusEffect,useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback,useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PublishNoteSheet, PublishNoteSheetRef } from '../../components/PublishNoteSheet';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useViewNote } from '../../hooks/useViewNote';
import { logger } from '../../lib/logger';
import { type FileAttachment,useApiService } from '../../services/api';
import { useTheme } from '../../theme';
import { NoteContent } from './NoteContent';
import { ViewHeader } from './ViewHeader';

export default function ViewNoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId } = params;
  const api = useApiService();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && (isInternetReachable ?? false);
  const insets = useSafeAreaInsets();

  // Log screen mount
  useEffect(() => {
    logger.info('[NOTE] ViewNote screen mounted', { attributes: { noteId: noteId as string } });
  }, [noteId]);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const publishSheetRef = useRef<PublishNoteSheetRef>(null);

  const { note, loading, htmlContent, handleEdit: handleEditInternal, handleToggleStar, handleToggleHidden, refresh, updateNoteLocally } = useViewNote(noteId as string);
  const [refreshing, setRefreshing] = useState(false);

  // Wrap handleEdit with offline check (allow editing temp notes created offline)
  const handleEdit = () => {
    const isTempNote = (noteId as string).startsWith('temp_');
    if (!isOnline && !isTempNote) {
      Alert.alert('Offline', 'You cannot edit synced notes while offline. Please connect to the internet and try again.');
      return;
    }
    handleEditInternal();
  };

  useEffect(() => {
    scrollY.setValue(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [noteId, scrollY]);

  const loadingRef = useRef(false);
  const lastLoadedNoteId = useRef<string | null>(null);

  const loadAttachments = useCallback(async () => {
    if (!noteId || loadingRef.current) return;

    // Skip attachment loading when offline
    if (!isOnline) {
      if (__DEV__) {
        console.log('[NOTE] Device offline - skipping attachment load');
      }
      setAttachments([]);
      setLoadingAttachments(false);
      return;
    }

    try {
      loadingRef.current = true;
      setLoadingAttachments(true);
      logger.debug('[NOTE] Loading attachments', { attributes: { noteId: noteId as string } });
      const noteAttachments = await api.getAttachments(noteId as string);
      setAttachments(noteAttachments);
      lastLoadedNoteId.current = noteId as string;
      logger.info('[NOTE] Attachments loaded successfully', {
        attributes: { noteId: noteId as string, count: noteAttachments.length }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to load attachments', error instanceof Error ? error : undefined, {
        attributes: { noteId: noteId as string }
      });
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
      loadingRef.current = false;
    }
  }, [noteId, api, isOnline]);

  useEffect(() => {
    // Reset lastLoadedNoteId when noteId changes
    if (noteId && lastLoadedNoteId.current !== noteId) {
      lastLoadedNoteId.current = null;
    }

    // Load attachments if online and not already loaded
    if (noteId && lastLoadedNoteId.current !== noteId && isOnline) {
      loadAttachments();
    }
  }, [noteId, isOnline, loadAttachments]);

  const handleDownloadAttachment = async (attachment: FileAttachment) => {
    if (downloadingId) {
      alert('Please wait for the current download to complete');
      return;
    }

    try {
      setDownloadingId(attachment.id);
      logger.info('[NOTE] Downloading attachment', {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
      const fileUri = await api.downloadFile(attachment);
      await api.shareFile(fileUri);
      logger.info('[NOTE] Attachment shared', {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to download/share attachment', error instanceof Error ? error : undefined, {
        attributes: { attachmentId: attachment.id, filename: attachment.originalName }
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Too Many Requests') || errorMessage.includes('429')) {
        alert('Too many download requests. Please wait 1-2 minutes and try again.');
      } else if (errorMessage.includes('not available')) {
        alert('Sharing is not available on this device.');
      } else {
        alert(`Failed to download file: ${errorMessage.substring(0, 100)}`);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      scrollY.setValue(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
      // Don't reload attachments on refocus - they're already loaded
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollY, noteId])
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        refresh(),
        isOnline ? loadAttachments() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            Loading note...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            Note not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: (insets.top || 0) + 58 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={note.type !== 'diagram'}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.isDark ? '#666666' : '#999999'}
            colors={[theme.isDark ? '#666666' : '#999999']}
          />
        }
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.noteTitle, { color: theme.colors.foreground }]}>
            {note.title}
          </Text>
          <Text style={[styles.noteMetadata, { color: theme.colors.mutedForeground }]}>
            Created {new Date(note.createdAt).toLocaleDateString()}
            {note.updatedAt !== note.createdAt && ` • Updated ${new Date(note.updatedAt).toLocaleDateString()}`}
          </Text>
        </View>

        {showAttachments && attachments.length > 0 && (
          <View style={[styles.attachmentsContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachmentsScroll}>
              {loadingAttachments ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginHorizontal: 16 }} />
              ) : (
                attachments.map((attachment) => {
                  const isDownloading = downloadingId === attachment.id;
                  return (
                    <TouchableOpacity
                      key={attachment.id}
                      style={[
                        styles.attachmentItem,
                        {
                          backgroundColor: theme.colors.muted,
                          borderColor: theme.colors.border,
                          opacity: isDownloading ? 0.6 : 1,
                        }
                      ]}
                      onPress={() => handleDownloadAttachment(attachment)}
                      disabled={isDownloading || !!downloadingId}
                    >
                      <View style={styles.attachmentIcon}>
                        <Text style={styles.attachmentEmoji}>{api.getFileIcon(attachment.mimeType)}</Text>
                      </View>
                      <View style={styles.attachmentInfo}>
                        <Text style={[styles.attachmentName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {attachment.originalName}
                        </Text>
                        <Text style={[styles.attachmentSize, { color: theme.colors.mutedForeground }]}>
                          {api.formatFileSize(attachment.size)}
                        </Text>
                      </View>
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        <NoteContent
          note={note}
          htmlContent={htmlContent}
          scrollY={scrollY}
          scrollViewRef={scrollViewRef}
          showTitle={false}
          theme={theme}
        />
      </Animated.ScrollView>

      {/* Floating Header */}
      <ViewHeader
        isStarred={note.starred}
        isHidden={note.hidden}
        isPublished={note.isPublished}
        title={note.title}
        scrollY={scrollY}
        attachmentsCount={attachments.length}
        showAttachments={showAttachments}
        isOffline={!isOnline}
        isTempNote={(noteId as string).startsWith('temp_')}
        insets={insets}
        onBack={() => router.back()}
        onToggleStar={handleToggleStar}
        onToggleHidden={handleToggleHidden}
        onToggleAttachments={() => setShowAttachments(!showAttachments)}
        onEdit={handleEdit}
        onPublish={() => {
          publishSheetRef.current?.present(note);
        }}
        theme={theme}
      />

      {/* Publish Note Bottom Sheet */}
      <PublishNoteSheet
        ref={publishSheetRef}
        onPublishStateChange={(noteId, isPublished, slug) => {
          updateNoteLocally({
            isPublished,
            publicSlug: slug || null,
            publishedAt: isPublished ? new Date().toISOString() : null,
            publicUpdatedAt: isPublished ? new Date().toISOString() : null,
          });
        }}
      />

      {/* Refresh indicator - rendered after header so it appears on top */}
      {refreshing && (
        <View style={[styles.refreshIndicator, { top: (insets.top || 0) + 70 }]}>
          <ActivityIndicator size="large" color={theme.isDark ? '#ffffff' : '#000000'} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  refreshIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 32,
  },
  noteMetadata: {
    fontSize: 12,
  },
  attachmentsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  attachmentsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minWidth: 200,
    maxWidth: 250,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentEmoji: {
    fontSize: 20,
  },
  attachmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  attachmentSize: {
    fontSize: 12,
  },
});
