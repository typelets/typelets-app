import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useViewNote } from '../../hooks/useViewNote';
import { useApiService, type FileAttachment } from '../../services/api';
import { ViewHeader } from './ViewHeader';
import { NoteContent } from './NoteContent';

export default function ViewNoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId } = params;
  const api = useApiService();

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { note, loading, htmlContent, handleEdit, handleToggleStar, handleToggleHidden } = useViewNote(noteId as string);

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

    try {
      loadingRef.current = true;
      setLoadingAttachments(true);
      const noteAttachments = await api.getAttachments(noteId as string);
      setAttachments(noteAttachments);
      lastLoadedNoteId.current = noteId as string;
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
      loadingRef.current = false;
    }
  }, [noteId, api]);

  useEffect(() => {
    if (noteId && lastLoadedNoteId.current !== noteId) {
      loadAttachments();
    }
  }, [noteId, loadAttachments]);

  const handleDownloadAttachment = async (attachment: FileAttachment) => {
    if (downloadingId) {
      alert('Please wait for the current download to complete');
      return;
    }

    try {
      setDownloadingId(attachment.id);
      const fileUri = await api.downloadFile(attachment);
      await api.shareFile(fileUri);
    } catch (error) {
      console.error('Failed to download attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Too Many Requests') || errorMessage.includes('429')) {
        alert('Too many download requests. Please wait 1-2 minutes and try again.');
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

      if (noteId && lastLoadedNoteId.current === noteId && !loadingRef.current) {
        lastLoadedNoteId.current = null;
        loadAttachments();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollY, noteId])
  );

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.background }]}>
        <ViewHeader
          isStarred={note.starred}
          isHidden={note.hidden}
          title={note.title}
          scrollY={scrollY}
          attachmentsCount={attachments.length}
          showAttachments={showAttachments}
          onBack={() => router.back()}
          onToggleStar={handleToggleStar}
          onToggleHidden={handleToggleHidden}
          onToggleAttachments={() => setShowAttachments(!showAttachments)}
          onEdit={handleEdit}
          theme={theme}
        />
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <NoteContent
          note={note}
          htmlContent={htmlContent}
          scrollY={scrollY}
          scrollViewRef={scrollViewRef}
          showTitle={false}
          theme={theme}
        />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
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
