import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Platform, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import { Undo, Redo } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useApiService, type Note, type FileAttachment } from '../../services/api';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { EditorHeader } from './EditorHeader';
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
  const [editorReady, setEditorReady] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(true);

  const richTextRef = useRef<RichEditor>(null);
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
          setAttachments(noteAttachments);

          // Store content to be set when editor is ready
          if (note?.content) {
            setPendingContent(note.content);
          }
        } finally {
          setLoading(false);
        }
      };
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, isEditing]);

  // Set content when editor is ready
  useEffect(() => {
    if (editorReady && pendingContent && richTextRef.current) {
      richTextRef.current.setContentHTML(pendingContent);
      setPendingContent(null);
    }
  }, [editorReady, pendingContent]);

  // Register toolbar to track active formats
  useEffect(() => {
    if (editorReady && richTextRef.current) {
      richTextRef.current.registerToolbar((items) => {
        const formats = items.map(item => typeof item === 'string' ? item : item.type);
        setActiveFormats(formats);
      });

      // Inject custom JavaScript to handle Enter key in checkbox lists using command method
      setTimeout(() => {
        richTextRef.current?.command(`
          (function() {
            if (window.checkboxEnterHandlerAdded) return;
            window.checkboxEnterHandlerAdded = true;

            document.addEventListener('keydown', function(e) {
              if (e.key === 'Enter' && !e.shiftKey) {
                const selection = window.getSelection();
                if (!selection.rangeCount) return;

                const range = selection.getRangeAt(0);
                let node = range.startContainer;

                // Find parent list item
                let listItem = node;
                while (listItem && listItem.nodeName !== 'LI') {
                  listItem = listItem.parentElement;
                  if (!listItem || listItem === document.body) break;
                }

                if (listItem && listItem.nodeName === 'LI') {
                  // Check if this list item contains a checkbox
                  const checkbox = listItem.querySelector('input[type="checkbox"]');
                  if (checkbox) {
                    e.preventDefault();

                    // Create new list item with checkbox
                    const newLi = document.createElement('li');
                    const newCheckbox = document.createElement('input');
                    newCheckbox.type = 'checkbox';
                    newCheckbox.style.cssText = 'width: 16px !important; height: 16px !important; margin: 0 8px 0 0 !important; flex-shrink: 0 !important;';

                    const textNode = document.createTextNode('\\u200B'); // Zero-width space

                    newLi.appendChild(newCheckbox);
                    newLi.appendChild(textNode);

                    // Insert new list item after current one
                    listItem.parentNode.insertBefore(newLi, listItem.nextSibling);

                    // Move cursor to new list item
                    const newRange = document.createRange();
                    newRange.setStart(textNode, 1);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                  }
                }
              }
            }, true);
          })();
        `);
      }, 500);
    }
  }, [editorReady]);

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

  const transformCheckboxHtml = (html: string): string => {
    // Transform plain checkbox lists to Tiptap-compatible format using regex
    let transformed = html;

    // First, identify and transform UL elements containing checkboxes
    // Match UL tags that contain checkbox inputs
    transformed = transformed.replace(
      /<ul([^>]*)>([\s\S]*?)<\/ul>/gi,
      (match, ulAttrs, ulContent) => {
        // Check if this UL contains checkboxes
        if (ulContent.includes('type="checkbox"') || ulContent.includes("type='checkbox'")) {
          // Add data-type="taskList" if not already present
          const hasDataType = /data-type/i.test(ulAttrs);
          const newUlAttrs = hasDataType ? ulAttrs : `${ulAttrs} data-type="taskList"`;

          // Transform each LI that contains a checkbox
          const transformedContent = ulContent.replace(
            /<li([^>]*)>([\s\S]*?)<\/li>/gi,
            (liMatch, liAttrs, liContent) => {
              // Check if this LI contains a checkbox
              const checkboxMatch = liContent.match(/<input([^>]*type=["']checkbox["'][^>]*)>/i);
              if (checkboxMatch) {
                // Add data-type="taskItem" to LI
                const hasLiDataType = /data-type/i.test(liAttrs);
                const newLiAttrs = hasLiDataType ? liAttrs : `${liAttrs} data-type="taskItem"`;

                // Extract checkbox and remaining content
                const checkbox = checkboxMatch[0];
                let remainingContent = liContent.replace(checkbox, '').trim();

                // Remove non-breaking spaces that might be at the start
                remainingContent = remainingContent.replace(/^(&nbsp;|\u00A0)+/, '');

                // Wrap checkbox in label if not already
                const wrappedCheckbox = checkbox.includes('<label>')
                  ? checkbox
                  : `<label>${checkbox}</label>`;

                // Wrap remaining content in div if it's not empty and not already wrapped
                let wrappedContent = '';
                if (remainingContent) {
                  // Check if content is already wrapped in a div or p
                  if (!/^<(div|p)[\s>]/i.test(remainingContent)) {
                    wrappedContent = `<div>${remainingContent}</div>`;
                  } else {
                    wrappedContent = remainingContent;
                  }
                }

                return `<li${newLiAttrs}>${wrappedCheckbox}${wrappedContent}</li>`;
              }
              return liMatch;
            }
          );

          return `<ul${newUlAttrs}>${transformedContent}</ul>`;
        }
        return match;
      }
    );

    return transformed;
  };

  const handleSave = async (options?: { skipNavigation?: boolean }) => {
    const titleToUse = title.trim() || 'Untitled';

    setIsSaving(true);

    try {
      let htmlContent = await richTextRef.current?.getContentHtml() || '';

      // Transform checkbox lists to Tiptap format
      htmlContent = transformCheckboxHtml(htmlContent);

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

      <RichEditor
        ref={richTextRef}
        style={[
          styles.richEditor,
          {
            backgroundColor: theme.colors.background,
            marginBottom: keyboardHeight > 0 ? keyboardHeight + 32 : 32,
          }
        ]}
        editorStyle={{
          backgroundColor: theme.colors.background,
          color: theme.colors.foreground,
          placeholderColor: theme.colors.mutedForeground,
          contentCSSText: `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            padding: 12px 16px 0 16px;
            color: ${theme.colors.foreground};

            * {
              margin-top: 0;
            }

            *:first-child {
              margin-top: 0 !important;
            }

            p {
              margin: 0 0 8px 0;
            }

            h1, h2, h3, h4, h5, h6 {
              font-weight: 600;
              margin: 8px 0 8px 0;
            }

            h1:first-child, h2:first-child, h3:first-child {
              margin-top: 0;
            }

            h1 { font-size: 32px; line-height: 1.2; }
            h2 { font-size: 24px; line-height: 1.3; }
            h3 { font-size: 20px; line-height: 1.4; }

            ul, ol {
              padding-left: 20px;
              margin: 8px 0;
            }

            li {
              margin: 4px 0;
            }

            /* Task list checkbox styling - unified for both mobile and web */
            ul[data-type="taskList"],
            ul:has(> li > input[type="checkbox"]) {
              list-style: none !important;
              padding-left: 0 !important;
              margin: 8px 0 !important;
            }

            li[data-type="taskItem"],
            li:has(> input[type="checkbox"]),
            li:has(> label > input[type="checkbox"]) {
              display: flex !important;
              align-items: center !important;
              margin: 4px 0 !important;
              list-style: none !important;
            }

            input[type="checkbox"] {
              width: 16px !important;
              height: 16px !important;
              min-width: 16px !important;
              min-height: 16px !important;
              margin: 0 8px 0 0 !important;
              flex-shrink: 0 !important;
              cursor: pointer !important;
            }

            li[data-type="taskItem"] label,
            li label:has(> input[type="checkbox"]) {
              display: contents !important;
            }

            /* Hide the empty span that Tiptap adds */
            li[data-type="taskItem"] label > span {
              display: none !important;
            }

            li[data-type="taskItem"] > div,
            li[data-type="taskItem"] > p {
              flex: 1 !important;
              line-height: 1.6 !important;
              margin: 0 !important;
            }

            /* Remove p tag margins inside task items */
            li[data-type="taskItem"] p {
              margin: 0 !important;
              line-height: 1.6 !important;
            }

            pre {
              background-color: ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.muted} !important;
              color: ${theme.colors.foreground} !important;
              border: 1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent'} !important;
              border-radius: 6px !important;
              padding: 12px 16px 12px 12px !important;
              overflow-x: auto !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 14px !important;
              white-space: pre !important;
              word-wrap: normal !important;
              overflow-wrap: normal !important;
            }

            code {
              background-color: ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.muted} !important;
              color: ${theme.colors.foreground} !important;
              padding: 2px 6px !important;
              border-radius: 3px !important;
              font-family: 'Courier New', Courier, monospace !important;
              font-size: 14px !important;
              white-space: pre !important;
            }

            pre code {
              background-color: transparent !important;
              padding: 0 !important;
              white-space: pre !important;
            }
          `
        }}
        placeholder="Write your note..."
        initialHeight={250}
        useContainer={false}
        editorInitializedCallback={() => setEditorReady(true)}
      />

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
                richTextRef.current?.blurContentEditor();
                Keyboard.dismiss();
              }}
              style={styles.toolbarButton}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => richTextRef.current?.focusContentEditor()}
              style={styles.toolbarButton}
            >
              <Ionicons name="chevron-up" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>
          )}

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => {
              richTextRef.current?.command('document.execCommand("undo")');
            }}
            style={[styles.toolbarButton, { minWidth: 44 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Undo size={20} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              richTextRef.current?.command('document.execCommand("redo")');
            }}
            style={[styles.toolbarButton, { minWidth: 44 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Redo size={20} color={theme.colors.foreground} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.setBold, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('bold') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, fontWeight: 'bold' }]}>B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.setItalic, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('italic') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, fontStyle: 'italic' }]}>I</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.setUnderline, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('underline') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'underline' }]}>U</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.setStrikethrough, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('strikeThrough') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'line-through' }]}>S</Text>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.heading1, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('heading1') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.heading2, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('heading2') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H2</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.heading3, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('heading3') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H3</Text>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => {
              if (richTextRef.current) {
                richTextRef.current.command('document.execCommand("removeFormat")');
                richTextRef.current.command('document.execCommand("formatBlock", false, "p")');
              }
            }}
            style={[styles.toolbarButton, { minWidth: 44 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <View pointerEvents="none">
              <Ionicons name="text-outline" size={22} color={theme.colors.foreground} />
            </View>
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.insertBulletsList, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('unorderedList') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="list" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.insertOrderedList, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('orderedList') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="list-outline" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.checkboxList, 'result')}
            style={[
              styles.toolbarButton,
              activeFormats.includes('checkboxList') && { backgroundColor: theme.colors.muted }
            ]}
          >
            <Ionicons name="checkbox-outline" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.indent, 'result')}
            style={styles.toolbarButton}
          >
            <Ionicons name="arrow-forward" size={20} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => richTextRef.current?.sendAction(actions.outdent, 'result')}
            style={styles.toolbarButton}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.foreground} />
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
    gap: 2,
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
    marginHorizontal: 4,
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
