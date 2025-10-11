import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useEditorBridge, TenTapStartKit, type EditorBridge } from '@10play/tentap-editor';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { useApiService, type Note } from '../services/api';
import { generateEditorStyles } from '../screens/EditNote/styles';

const EDITOR_LOAD_DELAY = 300;
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

  // Initialize editor with TenTapStartKit
  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: '<p></p>',
    bridgeExtensions: TenTapStartKit,
  });

  // Generate custom CSS memoized on theme colors
  const customCSS = useMemo(
    () => generateEditorStyles(theme.colors),
    [theme.colors]
  );

  // Handler for when WebView loads - inject CSS at the right time
  const handleEditorLoad = useCallback(() => {
    editor.injectCSS(customCSS, 'theme-css');

    // Also inject after a slight delay to ensure it overrides TenTap's default styles
    setTimeout(() => {
      editor.injectCSS(customCSS, 'theme-css');
    }, CSS_INJECTION_DELAY);
  }, [editor, customCSS]);

  // Load note content if editing
  const loadNote = useCallback(async () => {
    if (!noteId) return;

    try {
      const note = await api.getNote(noteId);
      if (__DEV__) {
        console.log('Loaded note:', { id: note.id, title: note.title, contentLength: note.content?.length });
      }

      // Wait for editor to mount, then set content
      setTimeout(() => {
        if (__DEV__) {
          console.log('Setting editor content...');
        }
        editor.setContent(note.content || '');
      }, EDITOR_LOAD_DELAY);

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
