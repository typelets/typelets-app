import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef,useState } from 'react';
import { Alert } from 'react-native';

import { logger } from '../lib/logger';
import { generateNoteHtml } from '../screens/ViewNote/htmlGenerator';
import { type Note,useApiService } from '../services/api';
import { useTheme } from '../theme';

interface UseViewNoteReturn {
  note: Note | null;
  loading: boolean;
  htmlContent: string;
  handleEdit: () => void;
  handleToggleStar: () => Promise<void>;
  handleToggleHidden: () => Promise<void>;
  refresh: () => Promise<void>;
  updateNoteLocally: (updates: Partial<Note>) => void;
}

/**
 * Hook to manage note viewing logic
 * Handles loading, starring, and navigation to edit
 */
export function useViewNote(noteId: string): UseViewNoteReturn {
  const theme = useTheme();
  const api = useApiService();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const currentNoteIdRef = useRef<string | null>(null);

  const loadNote = async () => {
    try {
      setLoading(true);
      logger.debug('[NOTE] Loading note', { attributes: { noteId } });
      const noteData = await api.getNote(noteId);
      setNote(noteData);
      hasLoadedRef.current = true;
      currentNoteIdRef.current = noteId;
      logger.info('[NOTE] Note loaded successfully', {
        attributes: { noteId, title: noteData.title, starred: noteData.starred }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to load note', error instanceof Error ? error : undefined, {
        attributes: { noteId }
      });
      Alert.alert('Error', 'Failed to load note.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const shouldReload = !hasLoadedRef.current || currentNoteIdRef.current !== noteId;

      if (noteId && shouldReload) {
        loadNote();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId])
  );

  const handleEdit = () => {
    hasLoadedRef.current = false;
    router.push(`/edit-note?noteId=${noteId}`);
  };

  const refresh = async () => {
    await loadNote();
  };

  const handleToggleStar = async () => {
    if (!note) return;

    try {
      logger.info('[NOTE] Toggling star', {
        attributes: { noteId: note.id, currentStarred: note.starred, newStarred: !note.starred }
      });
      const updatedNote = await api.updateNote(note.id, { starred: !note.starred });
      // Preserve public note fields that may not be returned by the API
      setNote({
        ...updatedNote,
        isPublished: note.isPublished,
        publicSlug: note.publicSlug,
        publishedAt: note.publishedAt,
        publicUpdatedAt: note.publicUpdatedAt,
      });
      logger.info('[NOTE] Star toggled successfully', {
        attributes: { noteId: note.id, starred: updatedNote.starred }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to toggle star', error instanceof Error ? error : undefined, {
        attributes: { noteId: note.id }
      });
      Alert.alert('Error', 'Failed to update note.');
    }
  };

  const handleToggleHidden = async () => {
    if (!note) return;

    // Prevent hiding public notes
    if (note.isPublished && !note.hidden) {
      Alert.alert(
        'Cannot Hide Public Note',
        'Please unpublish this note before hiding it.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      logger.info('[NOTE] Toggling hidden', {
        attributes: { noteId: note.id, currentHidden: note.hidden, newHidden: !note.hidden }
      });
      const updatedNote = note.hidden
        ? await api.unhideNote(note.id)
        : await api.hideNote(note.id);
      // Preserve public note fields that may not be returned by the API
      setNote({
        ...updatedNote,
        isPublished: note.isPublished,
        publicSlug: note.publicSlug,
        publishedAt: note.publishedAt,
        publicUpdatedAt: note.publicUpdatedAt,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('[NOTE] Hidden toggled successfully', {
        attributes: { noteId: note.id, hidden: updatedNote.hidden }
      });
    } catch (error) {
      logger.error('[NOTE] Failed to toggle hidden', error instanceof Error ? error : undefined, {
        attributes: { noteId: note.id }
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update note.');
    }
  };

  const htmlContent = useMemo(
    () => note ? generateNoteHtml(note.content, theme.colors, theme.isDark) : '',
    [note, theme.colors, theme.isDark]
  );

  const updateNoteLocally = (updates: Partial<Note>) => {
    if (note) {
      setNote({ ...note, ...updates });
    }
  };

  return {
    note,
    loading,
    htmlContent,
    handleEdit,
    handleToggleStar,
    handleToggleHidden,
    refresh,
    updateNoteLocally,
  };
}
