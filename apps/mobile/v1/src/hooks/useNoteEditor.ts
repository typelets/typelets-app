import { useCallback, useMemo, useRef, useEffect } from 'react';
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
  const contentSetRef = useRef(false); // Track if content has been set

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: false,
    initialContent: '',
    bridgeExtensions: TenTapStartKit,
  });

  const customCSS = useMemo(
    () => generateEditorStyles(theme.colors),
    [theme.colors]
  );

  // Reset refs when noteId changes
  useEffect(() => {
    editorReadyRef.current = false;
    pendingContentRef.current = null;
    contentSetRef.current = false;
  }, [noteId]);

  const handleEditorLoad = useCallback(() => {
    editor.injectCSS(customCSS, 'theme-css');

    // Inject after delay to override TenTap's default styles
    setTimeout(() => {
      editor.injectCSS(customCSS, 'theme-css');

      // Mark editor as ready
      editorReadyRef.current = true;

      // Set pending content if available and not already set
      if (pendingContentRef.current !== null && !contentSetRef.current) {
        if (__DEV__) {
          console.log('[iOS Fix] Setting pending content after editor ready...');
        }
        // Add extra delay on iOS for stability
        setTimeout(() => {
          if (!contentSetRef.current) {
            editor.setContent(pendingContentRef.current!);
            contentSetRef.current = true;

            // Position content at top before showing
            setTimeout(() => {
              editor.webviewRef?.current?.injectJavaScript(`
                function scrollToTop() {
                  window.scrollTo(0, 0);
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;

                  const prosemirror = document.querySelector('.ProseMirror');
                  if (prosemirror) {
                    prosemirror.scrollTop = 0;
                  }
                }

                // Scroll immediately
                scrollToTop();

                // Show content after positioning with smooth fade
                requestAnimationFrame(() => {
                  scrollToTop();
                  requestAnimationFrame(() => {
                    document.body.classList.add('ready');
                  });
                });
                true;
              `);
            }, 50);

            if (__DEV__) {
              console.log('[iOS Fix] Content set successfully');
            }
          }
          pendingContentRef.current = null;
        }, 200);
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

      if (editorReadyRef.current && !contentSetRef.current) {
        // Editor is ready, set content with increased delay for iOS
        setTimeout(() => {
          if (!contentSetRef.current) {
            if (__DEV__) {
              console.log('[iOS Fix] Setting editor content (editor ready)...');
            }
            editor.setContent(content);
            contentSetRef.current = true;

            // Position content at top before showing
            setTimeout(() => {
              editor.webviewRef?.current?.injectJavaScript(`
                function scrollToTop() {
                  window.scrollTo(0, 0);
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;

                  const prosemirror = document.querySelector('.ProseMirror');
                  if (prosemirror) {
                    prosemirror.scrollTop = 0;
                  }
                }

                // Scroll immediately
                scrollToTop();

                // Show content after positioning with smooth fade
                requestAnimationFrame(() => {
                  scrollToTop();
                  requestAnimationFrame(() => {
                    document.body.classList.add('ready');
                  });
                });
                true;
              `);
            }, 50);

            if (__DEV__) {
              console.log('[iOS Fix] Content set successfully from loadNote');
            }
          }
        }, 200);
      } else if (!contentSetRef.current) {
        // Editor not ready yet, store content to be set later
        if (__DEV__) {
          console.log('[iOS Fix] Editor not ready yet, storing content...');
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
