import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RichText } from '@10play/tentap-editor';
import { useTheme } from '../../theme';
import { useApiService, type Note, type FileAttachment } from '../../services/api';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useNoteEditor } from '../../hooks/useNoteEditor';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { FileUpload } from '../../components/FileUpload';

const NAVIGATION_DELAY = 100;

export default function EditNoteScreen() {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId, folderId } = params;
  const isEditing = !!noteId;
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);

  const keyboardHeight = useKeyboardHeight();
  const { editor, handleEditorLoad, loadNote } = useNoteEditor(noteId as string || createdNoteId || undefined);

  // Calculate toolbar height (toolbar itself + padding + keyboard)
  // iOS: 60px toolbar + keyboard height + minimal padding for curved keyboard
  // Android: 60px toolbar + keyboard height
  const toolbarHeight = Platform.OS === 'ios'
    ? 60 + keyboardHeight + (keyboardHeight > 0 ? 4 : 0)
    : 60 + keyboardHeight;
  useEffect(() => {
    if (isEditing && noteId) {
      const load = async () => {
        setLoading(true);
        try {
          const note = await loadNote();
          setNoteData(note || null);
          setTitle(note?.title || '');

          if (note) {
            const noteAttachments = await api.getAttachments(noteId as string);
            setAttachments(noteAttachments);
          }
        } finally {
          setLoading(false);
        }
      };
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, isEditing]);

  const refreshAttachments = async () => {
    const currentNoteId = (noteId as string) || createdNoteId;
    if (currentNoteId) {
      try {
        const noteAttachments = await api.getAttachments(currentNoteId);
        setAttachments(noteAttachments);
      } catch (error) {
        console.error('Failed to refresh attachments:', error);
      }
    }
  };

  const handleSave = async (options?: { skipNavigation?: boolean }) => {
    const titleToUse = title.trim() || 'Untitled';

    setIsSaving(true);

    try {
      const content = await editor.getHTML();
      if (__DEV__) {
        console.log('Content to save:', content);
      }

      let savedNote: Note;

      if ((isEditing && noteId) || createdNoteId) {
        savedNote = await api.updateNote((noteId as string) || createdNoteId!, {
          title: titleToUse,
          content,
        });
      } else {
        savedNote = await api.createNote({
          title: titleToUse,
          content,
          folderId: folderId as string | undefined,
          starred: false,
          archived: false,
          deleted: false,
          hidden: false,
        });
        setCreatedNoteId(savedNote.id);
        setTitle(titleToUse);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!options?.skipNavigation) {
        setTimeout(() => {
          router.back();
        }, NAVIGATION_DELAY);
      } else {
        setIsSaving(false);
        // Refresh attachments if we just created the note and staying on the page
        if (!noteId && savedNote.id) {
          try {
            const noteAttachments = await api.getAttachments(savedNote.id);
            setAttachments(noteAttachments);
          } catch (error) {
            console.error('Failed to refresh attachments:', error);
          }
        }
      }

      return savedNote;
    } catch (error) {
      if (__DEV__) console.error('Failed to save note:', error);
      Alert.alert('Error', `Failed to ${isEditing || createdNoteId ? 'update' : 'create'} note`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSaving(false);
      return null;
    }
  };

  const handleToggleAttachments = () => {
    setShowAttachments(!showAttachments);
  };

  const handleBeforeUpload = async (): Promise<string | null> => {
    // If it's a new note (no noteId and no createdNoteId), prompt to save first
    if (!noteId && !createdNoteId) {
      Alert.alert(
        'Save Note First',
        'Please save your note before adding attachments.',
        [{ text: 'OK' }]
      );
      return null;
    }

    return (noteId as string) || createdNoteId;
  };

  const handleDelete = async () => {
    if (!noteData || !noteId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteNote(noteId as string);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Navigate back to the folder/notes list, skipping the view-note screen
              if (router.canGoBack()) {
                router.back(); // Go back from edit screen
                setTimeout(() => {
                  if (router.canGoBack()) {
                    router.back(); // Go back from view screen to notes list
                  }
                }, NAVIGATION_DELAY);
              }
            } catch (error) {
              if (__DEV__) console.error('Failed to delete note:', error);
              Alert.alert('Error', 'Failed to delete note');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <EditorHeader
        isEditing={isEditing}
        noteData={noteData}
        isSaving={isSaving}
        attachmentsCount={attachments.length}
        showAttachments={showAttachments}
        onBack={() => router.back()}
        onDelete={handleDelete}
        onSave={() => handleSave({ skipNavigation: showAttachments && !noteId && !createdNoteId })}
        onToggleAttachments={handleToggleAttachments}
        theme={theme}
      />

      <View style={styles.titleContainer}>
        <TextInput
          placeholder="Untitled note"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.titleInput, { color: theme.colors.foreground }]}
        />

        {isEditing && noteData && (
          <View style={styles.metadata}>
            <Text style={[styles.date, { color: theme.colors.mutedForeground }]}>
              Created {new Date(noteData.createdAt).toLocaleDateString()}
              {noteData.updatedAt !== noteData.createdAt &&
                ` • Updated ${new Date(noteData.updatedAt).toLocaleDateString()}`}
            </Text>
          </View>
        )}

        {showAttachments && (
          <View style={styles.attachmentsSection}>
            <FileUpload
              noteId={(noteId as string) || createdNoteId || undefined}
              attachments={attachments}
              onUploadComplete={refreshAttachments}
              onDeleteComplete={refreshAttachments}
              onBeforeUpload={handleBeforeUpload}
            />
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.border, marginHorizontal: -16 }]} />
      </View>

      <View style={[
        styles.editorContainer,
        Platform.OS === 'ios' && keyboardHeight > 0 && { marginBottom: toolbarHeight },
        Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight + 60 }
      ]}>
        <RichText
          key={(noteId as string) || createdNoteId || 'new-note'}
          editor={editor}
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          onLoad={handleEditorLoad}
          webViewProps={{
            bounces: false,
            overScrollMode: 'never',
            injectedJavaScript: Platform.OS === 'android' ? `
              (function() {
                function scrollToCursor() {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    const scrollBuffer = 220; // Extra space for toolbar

                    // Check if cursor is too low on screen
                    if (rect.bottom > window.innerHeight - scrollBuffer) {
                      window.scrollBy({
                        top: rect.bottom - (window.innerHeight - scrollBuffer),
                        behavior: 'smooth'
                      });
                    }
                  }
                }

                // Listen for selection changes
                document.addEventListener('selectionchange', scrollToCursor);

                // Listen for input events
                document.addEventListener('input', scrollToCursor);

                // Listen for click events
                document.addEventListener('click', scrollToCursor);
              })();
              true;
            ` : undefined,
          }}
        />
      </View>

      <EditorToolbar
        editor={editor}
        keyboardHeight={keyboardHeight}
        bottomInset={insets.bottom}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 32,
    padding: 0,
  },
  metadata: {
    gap: 4,
  },
  date: {
    fontSize: 12,
  },
  attachmentsSection: {
    marginTop: 12,
  },
  divider: {
    height: 0.5,
    marginTop: 12,
  },
  editorContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});
