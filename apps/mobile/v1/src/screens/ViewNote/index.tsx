import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect,useLocalSearchParams, useRouter } from 'expo-router';
import { GlassView } from 'expo-glass-effect';
import React, { useCallback,useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { GLASS_BG_DARK, GLASS_BG_LIGHT, SHEET_HEADER_BG_DARK, SHEET_HEADER_BG_LIGHT } from '../../components/NativeSheetsViewer';
import { PublishNoteSheet, PublishNoteSheetRef } from '../../components/PublishNoteSheet';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useViewNote } from '../../hooks/useViewNote';
import { logger } from '../../lib/logger';
import { type FileAttachment,useApiService } from '../../services/api';
import { getCachedNoteType } from '../../services/api/databaseCache';
import { useTheme } from '../../theme';
import { NoteContent, SheetControlsData } from './NoteContent';
import { ViewHeader } from './ViewHeader';

// Progressive loading messages for sheets
const SHEET_LOADING_MESSAGES = [
  'Loading Sheet',
  'Crunching numbers',
  'Wrangling cells',
  'Almost there',
  'Worth the wait',
  'Any second now',
  'Still on it',
];

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
  const [sheetLoaded, setSheetLoaded] = useState(false);

  // Sheet controls for rendering glass buttons outside ScrollView
  const [sheetControls, setSheetControls] = useState<SheetControlsData | null>(null);
  // Key to force remount of GlassView when app returns from background
  const [glassKey, setGlassKey] = useState(0);

  // Cached note type for early "Loading Sheet" display (checked synchronously via state initialization)
  const [cachedType, setCachedType] = useState<string | null>(null);
  const [cachedTypeChecked, setCachedTypeChecked] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Check cached note type immediately on mount for instant "Loading Sheet" display
  useEffect(() => {
    let cancelled = false;

    // Reset states when noteId changes
    setSheetLoaded(false);
    setCachedType(null);
    setCachedTypeChecked(false);
    setLoadingMessageIndex(0);

    if (noteId) {
      getCachedNoteType(noteId as string).then((type) => {
        if (!cancelled) {
          setCachedType(type);
          setCachedTypeChecked(true);
        }
      });
    } else {
      setCachedTypeChecked(true);
    }

    return () => { cancelled = true; };
  }, [noteId]);

  // Determine if this is a sheet (from cache or actual note)
  const isSheetType = note?.type === 'sheets' || cachedType === 'sheets';

  // Progressive loading messages for sheets
  useEffect(() => {
    if (!isSheetType || sheetLoaded) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setLoadingMessageIndex(1), 1000));
    timers.push(setTimeout(() => setLoadingMessageIndex(2), 2000));
    timers.push(setTimeout(() => setLoadingMessageIndex(3), 3000));
    timers.push(setTimeout(() => setLoadingMessageIndex(4), 4000));
    timers.push(setTimeout(() => setLoadingMessageIndex(5), 5000));
    timers.push(setTimeout(() => setLoadingMessageIndex(6), 6500));

    return () => timers.forEach(clearTimeout);
  }, [isSheetType, sheetLoaded]);

  // Listen for app state changes to restore liquid glass effect on sheet controls
  useEffect(() => {
    if (!isSheetType) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Small delay to ensure app is fully visible before remounting glass controls
        setTimeout(() => {
          setGlassKey(k => k + 1);
        }, 100);
      }
    });

    return () => subscription.remove();
  }, [isSheetType]);

  // Wrap handleEdit with offline check and sheets check
  const handleEdit = () => {
    // Show coming soon message for sheets
    if (note?.type === 'sheets') {
      Alert.alert('Coming Soon', 'Spreadsheet editing is coming in a future update. Stay tuned!');
      return;
    }

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
      // Reload attachments on focus to catch any uploads from EditNote
      if (noteId && isOnline) {
        lastLoadedNoteId.current = null; // Force reload
        loadAttachments();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollY, noteId, isOnline])
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

  // Loading message - use cached type for early "Loading Sheet" display
  const loadingMessage = isSheetType
    ? SHEET_LOADING_MESSAGES[loadingMessageIndex]
    : 'Loading';

  // Single loading state - show loading overlay for:
  // 1. Checking cached type (very brief)
  // 2. Fetching note from API
  // 3. For sheets: while WebView is loading
  const showLoading = !cachedTypeChecked || loading || (isSheetType && !sheetLoaded);

  // Note not found state
  if (!loading && cachedTypeChecked && !note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            Note not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use theme background for sheets
  const bgColor = theme.colors.background;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['left', 'right']}>
      {/* Content - hidden while loading (but rendered so WebView can preload) */}
      {note && (
        <>
          <Animated.ScrollView
            ref={scrollViewRef}
            style={[{ flex: 1 }, showLoading && styles.hiddenContent]}
            contentContainerStyle={note.type === 'sheets' ? { paddingTop: (insets.top || 0) + 58, flex: 1 } : { paddingTop: (insets.top || 0) + 58 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={note.type !== 'diagram' && note.type !== 'sheets'}
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
            {/* Hide title for sheets until loaded */}
            {(note.type !== 'sheets' || sheetLoaded) && (
              <View style={styles.titleContainer}>
                <Text style={[styles.noteTitle, { color: theme.colors.foreground }]}>
                  {note.title}
                </Text>
                <Text style={[styles.noteMetadata, { color: theme.colors.mutedForeground }]}>
                  Created {new Date(note.createdAt).toLocaleDateString()}
                  {note.updatedAt !== note.createdAt && ` • Updated ${new Date(note.updatedAt).toLocaleDateString()}`}
                </Text>
              </View>
            )}

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
              bottomInset={insets.bottom}
              sheetTopInset={sheetControls?.hasMultipleSheets ? 42 : 0}
              theme={theme}
              onSheetLoaded={() => setSheetLoaded(true)}
              onSheetControlsReady={setSheetControls}
            />
          </Animated.ScrollView>

          {/* Floating Header - hide while loading */}
          {!showLoading && (
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
              isEditDisabled={false}
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
          )}

          {/* Sheet controls - rendered outside ScrollView for proper liquid glass effect */}
          {!showLoading && sheetControls && (
            <>
              {/* Zoom controls */}
              <View key={`zoom-${glassKey}`} style={[sheetStyles.zoomControls, { bottom: insets.bottom - 10, right: 18 }]}>
                <TouchableOpacity onPress={sheetControls.onZoomOut}>
                  <GlassView
                    glassEffectStyle="regular"
                    style={[sheetStyles.glassButton, { backgroundColor: theme.isDark ? GLASS_BG_DARK : GLASS_BG_LIGHT }]}
                    pointerEvents="none"
                  >
                    <View style={sheetStyles.zoomButtonInner}>
                      <Text style={[sheetStyles.zoomButtonText, { color: theme.colors.foreground }]}>−</Text>
                    </View>
                  </GlassView>
                </TouchableOpacity>
                <TouchableOpacity onPress={sheetControls.onZoomReset}>
                  <GlassView
                    glassEffectStyle="regular"
                    style={[sheetStyles.glassLabelContainer, { backgroundColor: theme.isDark ? GLASS_BG_DARK : GLASS_BG_LIGHT }]}
                    pointerEvents="none"
                  >
                    <View style={sheetStyles.zoomLabelInner}>
                      <Text style={[sheetStyles.zoomLabel, { color: theme.colors.foreground }]}>
                        {Math.round(sheetControls.zoom * 100)}%
                      </Text>
                    </View>
                  </GlassView>
                </TouchableOpacity>
                <TouchableOpacity onPress={sheetControls.onZoomIn}>
                  <GlassView
                    glassEffectStyle="regular"
                    style={[sheetStyles.glassButton, { backgroundColor: theme.isDark ? GLASS_BG_DARK : GLASS_BG_LIGHT }]}
                    pointerEvents="none"
                  >
                    <View style={sheetStyles.zoomButtonInner}>
                      <Text style={[sheetStyles.zoomButtonText, { color: theme.colors.foreground }]}>+</Text>
                    </View>
                  </GlassView>
                </TouchableOpacity>
              </View>

              {/* Sheet tabs - positioned at top, connected to sheet headers */}
              {sheetControls.hasMultipleSheets && (
                <View
                  key={`tabs-${glassKey}`}
                  style={[
                    sheetStyles.tabBar,
                    {
                      top: (insets.top || 0) + 58 + 72,
                      backgroundColor: theme.isDark ? SHEET_HEADER_BG_DARK : SHEET_HEADER_BG_LIGHT,
                    },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={sheetStyles.tabScrollContent}
                  >
                    {sheetControls.sheetNames.map((name, index) => {
                      const isActive = index === sheetControls.activeSheetIndex;
                      return (
                        <TouchableOpacity
                          key={`sheet-tab-${name}`}
                          onPress={() => sheetControls.onSelectSheet(index)}
                          style={sheetStyles.tabButton}
                        >
                          <Text style={[
                            sheetStyles.tabText,
                            {
                              color: theme.colors.foreground,
                              opacity: isActive ? 1 : 0.6,
                            }
                          ]}>
                            {name}
                          </Text>
                          {isActive && (
                            <View style={[
                              sheetStyles.tabIndicator,
                              { backgroundColor: theme.colors.primary }
                            ]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </>
          )}

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
        </>
      )}

      {/* Single loading overlay - always same position */}
      {showLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            {loadingMessage}
          </Text>
        </View>
      )}

      {/* Refresh indicator - rendered after header so it appears on top */}
      {refreshing && !showLoading && (
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
  hiddenContent: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
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

// Styles for sheet controls (zoom and tabs)
const sheetStyles = StyleSheet.create({
  zoomControls: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    gap: 8,
  },
  glassButton: {
    borderRadius: 19,
    overflow: 'hidden',
  },
  glassLabelContainer: {
    borderRadius: 19,
    overflow: 'hidden',
  },
  zoomButtonInner: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 22,
    fontWeight: '500',
  },
  zoomLabelInner: {
    height: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    zIndex: 20,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  tabButton: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
  },
});
