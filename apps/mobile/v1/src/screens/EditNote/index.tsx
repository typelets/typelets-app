import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Undo, Redo, Quote, Code } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useApiService, type Note, type FileAttachment } from '../../services/api';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { EditorHeader } from './EditorHeader';
import { FileUpload } from '../../components/FileUpload';
import { Editor, type EditorRef } from '../../../editor/src';

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
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    blockquote: false,
    heading: 0,
    codeBlock: false,
    bulletList: false,
    orderedList: false,
    taskList: false,
  });

  const editorRef = useRef<EditorRef>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (isEditing && noteId) {
      const load = async () => {
        setLoading(true);
        try {
          // Fetch note and attachments in parallel for better performance
          const [note, noteAttachments] = await Promise.all([
            api.getNote(noteId as string),
            api.getAttachments(noteId as string)
          ]);

          setNoteData(note || null);
          setTitle(note?.title || '');
          setContent(note?.content || '');
          setAttachments(noteAttachments);
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
      const htmlContent = content || '';

      let savedNote: Note;

      if ((isEditing && noteId) || createdNoteId) {
        savedNote = await api.updateNote((noteId as string) || createdNoteId!, {
          title: titleToUse,
          content: htmlContent,
        });
      } else {
        savedNote = await api.createNote({
          title: titleToUse,
          content: htmlContent,
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
      setIsSaving(false);

      if (!options?.skipNavigation) {
        setTimeout(() => {
          router.back();
        }, NAVIGATION_DELAY);
      } else {
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

  const handleToggleAttachments = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachments(prev => !prev);
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
        showHeader={showHeader}
        onBack={() => router.back()}
        onDelete={handleDelete}
        onSave={() => handleSave({ skipNavigation: showAttachments && !noteId && !createdNoteId })}
        onToggleAttachments={handleToggleAttachments}
        onToggleHeader={() => setShowHeader(prev => !prev)}
        theme={theme}
      />

      {showHeader && (
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
        </View>
      )}

      {showAttachments && (
        <View style={[styles.attachmentsSection, { paddingHorizontal: 16 }]}>
          <FileUpload
            noteId={(noteId as string) || createdNoteId || undefined}
            attachments={attachments}
            onUploadComplete={refreshAttachments}
            onDeleteComplete={refreshAttachments}
            onBeforeUpload={handleBeforeUpload}
          />
        </View>
      )}

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={[
        styles.richEditor,
        {
          backgroundColor: theme.colors.background,
          marginBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32,
        }
      ]}>
        <Editor
          ref={editorRef}
          value={content}
          onChange={setContent}
          onFormatChange={setActiveFormats}
          placeholder="Write your note..."
          theme={theme.dark ? 'dark' : 'light'}
        />
      </View>

      <View
        style={[
          styles.toolbarContainer,
          {
            backgroundColor: theme.colors.background,
            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.border,
          }
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarScroll}
        >
          {keyboardHeight > 0 ? (
            <TouchableOpacity
              onPress={() => {
                editorRef.current?.blur();
                Keyboard.dismiss();
              }}
              style={styles.toolbarButton}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => editorRef.current?.focus()}
              style={styles.toolbarButton}
            >
              <Ionicons name="chevron-up" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>
          )}

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.undo()}
            style={styles.toolbarButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Undo size={20} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.redo()}
            style={styles.toolbarButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Redo size={20} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.bold()}
            style={[
              styles.toolbarButton,
              activeFormats.bold && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, fontWeight: 'bold' }]}>B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.italic()}
            style={[
              styles.toolbarButton,
              activeFormats.italic && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, fontStyle: 'italic' }]}>I</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.underline()}
            style={[
              styles.toolbarButton,
              activeFormats.underline && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'underline' }]}>U</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.strikethrough()}
            style={[
              styles.toolbarButton,
              activeFormats.strikethrough && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'line-through' }]}>S</Text>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.heading(1)}
            style={[
              styles.toolbarButton,
              activeFormats.heading === 1 && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.heading(2)}
            style={[
              styles.toolbarButton,
              activeFormats.heading === 2 && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H2</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.heading(3)}
            style={[
              styles.toolbarButton,
              activeFormats.heading === 3 && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H3</Text>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.removeFormat()}
            style={styles.toolbarButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Ionicons name="text-outline" size={22} color={theme.colors.foreground} />
            </View>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.bulletList()}
            style={[
              styles.toolbarButton,
              activeFormats.bulletList && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="list" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.orderedList()}
            style={[
              styles.toolbarButton,
              activeFormats.orderedList && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="list-outline" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.checkboxList()}
            style={[
              styles.toolbarButton,
              activeFormats.taskList && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="checkbox-outline" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.indent()}
            style={styles.toolbarButton}
          >
            <Ionicons name="arrow-forward" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.outdent()}
            style={styles.toolbarButton}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => editorRef.current?.horizontalRule()}
            style={styles.toolbarButton}
          >
            <Ionicons name="remove-outline" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.blockquote()}
            style={[
              styles.toolbarButton,
              activeFormats.blockquote && { backgroundColor: theme.colors.muted }
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Quote size={18} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => editorRef.current?.codeBlock()}
            style={[
              styles.toolbarButton,
              activeFormats.codeBlock && { backgroundColor: theme.colors.muted }
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Code size={18} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  richEditor: {
    flex: 1,
    minHeight: 200,
  },
  toolbarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  toolbarScroll: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: 'center',
    gap: 4,
    flexDirection: 'row',
  },
  toolbarButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 0,
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
