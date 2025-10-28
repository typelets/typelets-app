import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams,useRouter } from 'expo-router';
import { Code,Quote, Redo, Undo } from 'lucide-react-native';
import React, { useEffect, useMemo,useRef, useState } from 'react';
import { Alert, Keyboard,ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Editor, type EditorColors,type EditorRef } from '@/editor/src';

import { FileUpload } from '../../components/FileUpload';
import { logger } from '../../lib/logger';
import { type FileAttachment,type Note, useApiService } from '../../services/api';
import { useTheme } from '../../theme';
import { EditorHeader } from './EditorHeader';

const NAVIGATION_DELAY = 100;

export default function EditNoteScreen() {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId, folderId } = params;
  const isEditing = !!noteId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
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

  // Map theme colors to editor colors
  const editorColors: EditorColors = useMemo(() => ({
    background: theme.colors.background,
    foreground: theme.colors.foreground,
    placeholder: theme.colors.mutedForeground,
    border: theme.colors.border,
    muted: theme.colors.muted,
    mutedForeground: theme.colors.mutedForeground,
    codeBackground: theme.colors.muted,
    codeBlockBackground: theme.colors.card,
    codeBlockBorder: theme.colors.border,
    blockquoteBorder: theme.colors.border,
    blockquoteText: theme.colors.mutedForeground,
    highlightBackground: theme.isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(254, 240, 138, 0.8)',
  }), [theme.colors, theme.isDark]);

  useEffect(() => {
    logger.info('[NOTE] EditNote screen mounted', {
      attributes: { noteId: noteId as string | undefined, isEditing, folderId: folderId as string | undefined }
    });

    if (isEditing && noteId) {
      const load = async () => {
        setLoading(true);
        try {
          logger.debug('[NOTE] Loading note for editing', { attributes: { noteId: noteId as string } });
          // Fetch note and attachments in parallel for better performance
          const [note, noteAttachments] = await Promise.all([
            api.getNote(noteId as string),
            api.getAttachments(noteId as string)
          ]);

          setNoteData(note || null);
          setTitle(note?.title || '');
          setContent(note?.content || '');
          setAttachments(noteAttachments);
          logger.info('[NOTE] Note loaded for editing', {
            attributes: {
              noteId: noteId as string,
              title: note?.title,
              attachmentsCount: noteAttachments.length
            }
          });
        } catch (error) {
          logger.error('[NOTE] Failed to load note for editing', error instanceof Error ? error : undefined, {
            attributes: { noteId: noteId as string }
          });
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
        logger.debug('[NOTE] Refreshing attachments', { attributes: { noteId: currentNoteId } });
        const noteAttachments = await api.getAttachments(currentNoteId);
        setAttachments(noteAttachments);
        logger.info('[NOTE] Attachments refreshed', {
          attributes: { noteId: currentNoteId, count: noteAttachments.length }
        });
      } catch (error) {
        logger.error('[NOTE] Failed to refresh attachments', error instanceof Error ? error : undefined, {
          attributes: { noteId: currentNoteId }
        });
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
        const currentNoteId = (noteId as string) || createdNoteId!;
        logger.info('[NOTE] Updating note', {
          attributes: { noteId: currentNoteId, title: titleToUse, contentLength: htmlContent.length }
        });
        savedNote = await api.updateNote(currentNoteId, {
          title: titleToUse,
          content: htmlContent,
        });
        logger.info('[NOTE] Note updated successfully', {
          attributes: { noteId: currentNoteId, title: titleToUse }
        });
      } else {
        logger.info('[NOTE] Creating new note', {
          attributes: { title: titleToUse, contentLength: htmlContent.length, folderId: folderId as string | undefined }
        });
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
        logger.info('[NOTE] Note created successfully', {
          attributes: { noteId: savedNote.id, title: titleToUse }
        });
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
            logger.debug('[NOTE] Loading attachments for newly created note', {
              attributes: { noteId: savedNote.id }
            });
            const noteAttachments = await api.getAttachments(savedNote.id);
            setAttachments(noteAttachments);
          } catch (error) {
            logger.error('[NOTE] Failed to load attachments for newly created note', error instanceof Error ? error : undefined, {
              attributes: { noteId: savedNote.id }
            });
          }
        }
      }

      return savedNote;
    } catch (error) {
      const operation = isEditing || createdNoteId ? 'update' : 'create';
      logger.error(`[NOTE] Failed to ${operation} note`, error instanceof Error ? error : undefined, {
        attributes: {
          noteId: (noteId as string) || createdNoteId || undefined,
          operation,
          title: titleToUse
        }
      });
      Alert.alert('Error', `Failed to ${operation} note`);
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
              logger.info('[NOTE] Deleting note', {
                attributes: { noteId: noteId as string, title: noteData.title }
              });
              await api.deleteNote(noteId as string);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              logger.info('[NOTE] Note deleted successfully', {
                attributes: { noteId: noteId as string }
              });

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
              logger.error('[NOTE] Failed to delete note', error instanceof Error ? error : undefined, {
                attributes: { noteId: noteId as string, title: noteData.title }
              });
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
        showToolbar={showToolbar}
        onBack={() => router.back()}
        onDelete={handleDelete}
        onSave={() => handleSave({ skipNavigation: showAttachments && !noteId && !createdNoteId })}
        onToggleAttachments={handleToggleAttachments}
        onToggleHeader={() => setShowHeader(prev => !prev)}
        onToggleToolbar={() => setShowToolbar(prev => !prev)}
        onDismissKeyboard={() => {
          editorRef.current?.blur();
          Keyboard.dismiss();
        }}
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
            <TouchableOpacity
              onPress={() => {
                editorRef.current?.blur();
                Keyboard.dismiss();
              }}
              activeOpacity={1}
              style={styles.metadata}
            >
              <Text style={[styles.date, { color: theme.colors.mutedForeground }]}>
                Created {new Date(noteData.createdAt).toLocaleDateString()}
                {noteData.updatedAt !== noteData.createdAt &&
                  ` • Updated ${new Date(noteData.updatedAt).toLocaleDateString()}`}
              </Text>
            </TouchableOpacity>
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

      {showToolbar && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View
            style={[
              styles.toolbarContainerTop,
              {
                backgroundColor: theme.colors.background,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              }
            ]}
          >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolbarScroll}
          >
            <TouchableOpacity
              onPress={() => {
                editorRef.current?.blur();
                Keyboard.dismiss();
              }}
              style={styles.toolbarButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>

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
        </>
      )}

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={[
        styles.richEditor,
        {
          backgroundColor: theme.colors.background,
        }
      ]}>
        <Editor
          ref={editorRef}
          value={content}
          onChange={setContent}
          onFormatChange={setActiveFormats}
          placeholder="Write your note..."
          theme={theme.isDark ? 'dark' : 'light'}
          colors={editorColors}
        />
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
  },
  toolbarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  toolbarContainerTop: {
    paddingVertical: 8,
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
