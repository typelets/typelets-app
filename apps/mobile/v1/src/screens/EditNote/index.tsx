import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RichText } from '@10play/tentap-editor';
import { useTheme } from '../../theme';
import { useApiService, type Note } from '../../services/api';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useNoteEditor } from '../../hooks/useNoteEditor';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';

const NAVIGATION_DELAY = 100;

export default function EditNoteScreen() {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId, folderId } = params;
  const isEditing = !!noteId;

  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteData, setNoteData] = useState<Note | null>(null);

  const keyboardHeight = useKeyboardHeight();
  const { editor, handleEditorLoad, loadNote } = useNoteEditor(noteId as string);
  useEffect(() => {
    if (isEditing && noteId) {
      const load = async () => {
        setLoading(true);
        try {
          const note = await loadNote();
          setNoteData(note || null);
          setTitle(note?.title || '');
        } finally {
          setLoading(false);
        }
      };
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }

    setIsSaving(true);

    try {
      const content = await editor.getHTML();
      if (__DEV__) {
        console.log('Content to save:', content);
      }

      if (isEditing && noteId) {
        await api.updateNote(noteId as string, {
          title: title.trim(),
          content,
        });
      } else {
        await api.createNote({
          title: title.trim(),
          content,
          folderId: folderId as string | undefined,
          starred: false,
          archived: false,
          deleted: false,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.back();
      }, NAVIGATION_DELAY);
    } catch (error) {
      if (__DEV__) console.error('Failed to save note:', error);
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'create'} note`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsSaving(false);
    }
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
        onBack={() => router.back()}
        onDelete={handleDelete}
        onSave={handleSave}
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

        <View style={[styles.divider, { backgroundColor: theme.colors.border, marginHorizontal: -16 }]} />
      </View>

      <View style={styles.editorContainer}>
        <RichText
          editor={editor}
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          onLoad={handleEditorLoad}
          webViewProps={{
            bounces: false,
            overScrollMode: 'never',
          }}
        />
      </View>

      <EditorToolbar
        editor={editor}
        keyboardHeight={keyboardHeight}
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
