import { useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { useEditorBridge, TenTapStartKit, type EditorBridge } from '@10play/tentap-editor';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { useApiService, type Note } from '../services/api';
import { generateEditorStyles } from '../screens/EditNote/styles';

const CSS_INJECTION_DELAY = 100;

interface UseNoteEditorReturn {
  editor: EditorBridge;
  customCSS: string;
  handleEditorLoad: () => void;
  loadNote: () => Promise<Note | undefined>;
}

/**
 * Hook to manage TenTap editor initialization and note loading
 * Handles CSS injection, theme colors, and content management
 */
export function useNoteEditor(noteId?: string): UseNoteEditorReturn {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const editorReadyRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: '<p></p>',
    bridgeExtensions: TenTapStartKit,
  });

  const customCSS = useMemo(
    () => generateEditorStyles(theme.colors),
    [theme.colors]
  );

  const handleEditorLoad = useCallback(() => {
    editor.injectCSS(customCSS, 'theme-css');

    // Inject after delay to override TenTap's default styles
    setTimeout(() => {
      editor.injectCSS(customCSS, 'theme-css');

      editorReadyRef.current = true;
      if (pendingContentRef.current !== null) {
        if (__DEV__) {
          console.log('Setting pending content after editor ready...');
        }
        editor.setContent(pendingContentRef.current);
        pendingContentRef.current = null;
      }
    }, CSS_INJECTION_DELAY);
  }, [editor, customCSS]);

  const loadNote = useCallback(async () => {
    if (!noteId) return;

    try {
      const note = await api.getNote(noteId);
      if (__DEV__) {
        console.log('Loaded note:', { id: note.id, title: note.title, contentLength: note.content?.length });
      }

      const content = note.content || '';

      if (editorReadyRef.current) {
        setTimeout(() => {
          if (__DEV__) {
            console.log('Setting editor content (editor ready)...');
          }
          editor.setContent(content);
        }, 100);
      } else {
        if (__DEV__) {
          console.log('Editor not ready yet, storing content...');
        }
        pendingContentRef.current = content;
      }

      return note;
    } catch (error) {
      if (__DEV__) console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
      router.back();
    }
  }, [api, noteId, editor, router]);

  return {
    editor,
    customCSS,
    handleEditorLoad,
    loadNote,
  };
}
