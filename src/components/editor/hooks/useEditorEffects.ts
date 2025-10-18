import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/types/note';

interface UseEditorEffectsProps {
  editor: Editor | null;
  note: Note | null;
  updateCounts: (text: string) => void;
  setScrollPercentage: (percentage: number) => void;
  zoomLevel: number;
  baseFontSize: string;
  setBaseFontSize: (size: string) => void;
  lastContentRef: React.MutableRefObject<string>;
}

export function useEditorEffects({
  editor,
  note,
  updateCounts,
  setScrollPercentage,
  zoomLevel,
  baseFontSize,
  setBaseFontSize,
  lastContentRef,
}: UseEditorEffectsProps) {
  // Sync editor content with note changes
  useEffect(() => {
    if (!editor || !note || !editor.view) return;

    const currentContent = editor.getHTML();
    if (note.content !== currentContent) {
      const editorHasFocus = editor.isFocused;

      if (!editorHasFocus) {
        const { from, to } = editor.state.selection;

        editor.commands.setContent(note.content || '', {
          emitUpdate: false,
          parseOptions: {
            preserveWhitespace: 'full',
          },
        });
        lastContentRef.current = note.content || '';

        const text = editor.state.doc.textContent;
        updateCounts(text);

        try {
          const docSize = editor.state.doc.content.size;
          if (from <= docSize && to <= docSize) {
            editor.commands.setTextSelection({ from, to });
          }
        } catch {
          // Ignore cursor restoration errors
        }
      } else {
        lastContentRef.current = currentContent;
      }
    }
  }, [note, editor, updateCounts, lastContentRef]);

  // Initialize word count when editor is ready
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;

    // Calculate initial word count
    const text = editor.state.doc.textContent;
    updateCounts(text);
  }, [editor, updateCounts]);

  // Track scroll percentage
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;

    const updateScrollPercentage = () => {
      const editorView = editor.view;
      if (!editorView || !editorView.dom) return;

      const { scrollTop, scrollHeight, clientHeight } = editorView.dom;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll <= 0) {
        setScrollPercentage(0);
      } else {
        const percentage = Math.round((scrollTop / maxScroll) * 100);
        setScrollPercentage(Math.min(100, Math.max(0, percentage)));
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('scroll', updateScrollPercentage);

    // Initial calculation
    updateScrollPercentage();

    return () => {
      editorElement.removeEventListener('scroll', updateScrollPercentage);
    };
  }, [editor, setScrollPercentage]);

  // Store the original font size when editor is first created
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom || baseFontSize) return;

    const editorElement = editor.view.dom as HTMLElement;
    const computedStyle = window.getComputedStyle(editorElement);
    const originalFontSize = computedStyle.fontSize;
    setBaseFontSize(originalFontSize);
  }, [editor, baseFontSize, setBaseFontSize]);

  // Apply zoom level to editor
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom || !baseFontSize) return;

    const editorElement = editor.view.dom as HTMLElement;

    if (zoomLevel === 100) {
      // At 100%, use the original font size
      editorElement.style.fontSize = baseFontSize;
    } else {
      // Calculate the new font size based on the original
      const baseSize = parseFloat(baseFontSize);
      const scaleFactor = zoomLevel / 100;
      const newSize = baseSize * scaleFactor;
      editorElement.style.fontSize = `${newSize}px`;
    }
  }, [editor, zoomLevel, baseFontSize]);
}
