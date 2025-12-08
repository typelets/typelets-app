import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { logger } from '../../lib/logger';
import { type Note, useApiService } from '../../services/api';
import { useTheme } from '../../theme';
import { createEmptySheet } from '../../utils/sheetTemplate';

const NAVIGATION_DELAY = 100;

export default function EditSheetScreen() {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { noteId, folderId } = params;
  const isEditing = !!noteId;
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && (isInternetReachable ?? false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const webViewRef = useRef<WebViewType>(null);
  const titleInputRef = useRef<TextInput>(null);

  // Load note data if editing
  useEffect(() => {
    logger.info('[SHEET] EditSheet screen mounted', {
      attributes: { noteId: noteId as string | undefined, isEditing, folderId: folderId as string | undefined }
    });

    if (isEditing && noteId) {
      const load = async () => {
        setLoading(true);
        try {
          const note = await api.getNote(noteId as string);
          setNoteData(note || null);
          setTitle(note?.title || 'Untitled Spreadsheet');
          setContent(note?.content || createEmptySheet('Untitled Spreadsheet'));
          logger.info('[SHEET] Sheet loaded for editing', {
            attributes: { noteId: noteId as string, title: note?.title }
          });
        } catch (error) {
          logger.error('[SHEET] Failed to load sheet', error as Error);
          Alert.alert('Error', 'Failed to load spreadsheet');
          router.back();
        } finally {
          setLoading(false);
        }
      };
      load();
    } else {
      // Creating new sheet
      setTitle('Untitled Spreadsheet');
      setContent(createEmptySheet('Untitled Spreadsheet'));
      setLoading(false);
    }
  }, [noteId, isEditing, folderId]);

  // Handle save
  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    Keyboard.dismiss();

    try {
      // Get current content from WebView
      const currentContent = await getContentFromWebView();

      if (isEditing && noteId) {
        // Update existing sheet
        await api.updateNote(noteId as string, {
          title: title || 'Untitled Spreadsheet',
          content: currentContent,
        });
        DeviceEventEmitter.emit('noteUpdated', { noteId });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logger.info('[SHEET] Sheet updated', { attributes: { noteId: noteId as string } });
      } else {
        // Create new sheet
        const newNote = await api.createNote({
          title: title || 'Untitled Spreadsheet',
          content: currentContent,
          type: 'sheets',
          folderId: folderId as string | undefined,
          starred: false,
          archived: false,
          deleted: false,
          hidden: false,
        });
        DeviceEventEmitter.emit('noteCreated', { note: newNote });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        logger.info('[SHEET] Sheet created', { attributes: { noteId: newNote.id } });
      }

      setHasUnsavedChanges(false);
      setTimeout(() => router.back(), NAVIGATION_DELAY);
    } catch (error) {
      logger.error('[SHEET] Failed to save sheet', error as Error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save spreadsheet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get content from WebView
  const getContentFromWebView = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!webViewRef.current) {
        resolve(content);
        return;
      }

      const messageHandler = (event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'content') {
            resolve(data.content);
          }
        } catch {
          resolve(content);
        }
      };

      // Temporarily set up message handler
      webViewRef.current?.injectJavaScript(`
        (function() {
          try {
            const workbookData = window.workbook?.save();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'content',
              content: JSON.stringify(workbookData)
            }));
          } catch(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'content',
              content: '${content.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'
            }));
          }
        })();
        true;
      `);

      // Set timeout to resolve with current content if no response
      setTimeout(() => resolve(content), 1000);
    });
  };

  // Handle back with unsaved changes warning
  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: handleSave },
        ]
      );
    } else {
      router.back();
    }
  };

  // Escape content for safe inclusion in HTML
  const escapedContent = useMemo(() => {
    return content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }, [content]);

  // WebView HTML with editable Univer
  const fullHtml = useMemo(() => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/@univerjs/preset-sheets-core/lib/index.css">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: ${theme.isDark ? '#0a0a0a' : '#ffffff'};
        }
        #app {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: ${theme.colors.mutedForeground};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        /* Override fonts */
        *, *::before, *::after {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        /* Make scrollbars visible */
        ::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
        }
        ::-webkit-scrollbar-track {
          background: ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} !important;
          border-radius: 7px !important;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} !important;
          border-radius: 7px !important;
        }
      </style>
    </head>
    <body>
      <div id="app"><div class="loading">Loading editor...</div></div>

      <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/rxjs/dist/bundles/rxjs.umd.min.js"></script>
      <script src="https://unpkg.com/@univerjs/presets/lib/umd/index.js"></script>
      <script src="https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/index.js"></script>
      <script src="https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/locales/en-US.js"></script>
      <script>
        (function() {
          const appEl = document.getElementById('app');

          try {
            const workbookData = JSON.parse('${escapedContent}');
            appEl.innerHTML = '';

            const { createUniver } = UniverPresets;
            const { LocaleType, mergeLocales } = UniverCore;
            const { UniverSheetsCorePreset } = UniverPresetSheetsCore;
            const localeData = UniverPresetSheetsCoreEnUS;

            const univerInstance = createUniver({
              locale: LocaleType.EN_US,
              locales: {
                [LocaleType.EN_US]: mergeLocales(localeData),
              },
              darkMode: ${theme.isDark},
              presets: [
                UniverSheetsCorePreset({
                  container: appEl,
                  header: true,
                  toolbar: true,
                  footer: true,
                }),
              ],
            });

            const { univerAPI } = univerInstance;
            const workbook = univerAPI.createWorkbook(workbookData);

            // Store globally for content extraction
            window.univerAPI = univerAPI;
            window.workbook = workbook;

            // Track changes
            univerAPI.onCommandExecuted((command) => {
              if (command.id !== 'sheet.operation.set-scroll' &&
                  command.id !== 'sheet.operation.set-zoom-ratio') {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'change'
                }));
              }
            });

            // Notify loaded
            setTimeout(() => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'loaded'
              }));
            }, 500);

          } catch (error) {
            appEl.innerHTML = '<div class="loading" style="color:#ef4444;">Failed to load: ' + error.message + '</div>';
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
        })();
      </script>
    </body>
    </html>
  `, [escapedContent, theme.isDark, theme.colors.mutedForeground]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            Loading spreadsheet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.foreground} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          {isEditingTitle ? (
            <TextInput
              ref={titleInputRef}
              style={[styles.titleInput, { color: theme.colors.foreground }]}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setHasUnsavedChanges(true);
              }}
              onBlur={() => setIsEditingTitle(false)}
              autoFocus
              selectTextOnFocus
              placeholder="Untitled Spreadsheet"
              placeholderTextColor={theme.colors.mutedForeground}
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
              <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
                {title || 'Untitled Spreadsheet'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.primaryForeground }]}>
              {isEditing ? 'Save' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* WebView Editor */}
      <View style={styles.webViewContainer}>
        {!webViewLoaded && (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
            <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
              Loading editor...
            </Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ html: fullHtml }}
          style={[styles.webview, { opacity: webViewLoaded ? 1 : 0 }]}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={true}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onLoadEnd={() => {
            setTimeout(() => setWebViewLoaded(true), 500);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'loaded') {
                setWebViewLoaded(true);
              } else if (data.type === 'change') {
                setHasUnsavedChanges(true);
              } else if (data.type === 'content') {
                // Content received - handled by getContentFromWebView
              }
            } catch {
              // Ignore parse errors
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 17,
    fontWeight: '600',
    padding: 0,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  webViewContainer: {
    flex: 1,
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  webview: {
    flex: 1,
  },
});
