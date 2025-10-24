import { useState, useCallback, useRef } from 'react';
import type { EditorState } from '../types';

export interface UseEditorOptions {
  initialContent?: string;
  maxHistory?: number;
}

export function useEditor(options: UseEditorOptions = {}) {
  const { initialContent = '', maxHistory = 50 } = options;

  const [state, setState] = useState<EditorState>({
    content: initialContent,
    selection: { start: 0, end: 0 },
    history: { past: [], future: [] },
  });

  const selectionRef = useRef(state.selection);

  const updateContent = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      content,
      history: {
        past: [...prev.history.past, prev.content].slice(-maxHistory),
        future: [],
      },
    }));
  }, [maxHistory]);

  const undo = useCallback(() => {
    setState((prev) => {
      const { past, future } = prev.history;
      if (past.length === 0) return prev;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);

      return {
        ...prev,
        content: previous,
        history: {
          past: newPast,
          future: [prev.content, ...future],
        },
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      const { past, future } = prev.history;
      if (future.length === 0) return prev;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        ...prev,
        content: next,
        history: {
          past: [...past, prev.content],
          future: newFuture,
        },
      };
    });
  }, []);

  const updateSelection = useCallback((start: number, end: number) => {
    selectionRef.current = { start, end };
    setState((prev) => ({ ...prev, selection: { start, end } }));
  }, []);

  const insertText = useCallback((text: string) => {
    const { start, end } = selectionRef.current;
    const before = state.content.slice(0, start);
    const after = state.content.slice(end);
    updateContent(before + text + after);
  }, [state.content, updateContent]);

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  return {
    content: state.content,
    selection: state.selection,
    updateContent,
    updateSelection,
    insertText,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
