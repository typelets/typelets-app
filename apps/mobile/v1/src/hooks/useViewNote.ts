import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useApiService, type Note } from '../services/api';
import { useTheme } from '../theme';
import { generateNoteHtml } from '../screens/ViewNote/htmlGenerator';

interface UseViewNoteReturn {
  note: Note | null;
  loading: boolean;
  htmlContent: string;
  handleEdit: () => void;
  handleToggleStar: () => Promise<void>;
  handleToggleHidden: () => Promise<void>;
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

  const loadNote = async () => {
    try {
      setLoading(true);
      const noteData = await api.getNote(noteId);
      setNote(noteData);
    } catch (error) {
      if (__DEV__) console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Reload note when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      if (noteId) {
        loadNote();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [noteId])
  );

  const handleEdit = () => {
    router.push(`/edit-note?noteId=${noteId}`);
  };

  const handleToggleStar = async () => {
    if (!note) return;

    try {
      const updatedNote = await api.updateNote(note.id, { starred: !note.starred });
      setNote(updatedNote);
    } catch (error) {
      if (__DEV__) console.error('Failed to toggle star:', error);
      Alert.alert('Error', 'Failed to update note.');
    }
  };

  const handleToggleHidden = async () => {
    if (!note) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updatedNote = note.hidden
        ? await api.unhideNote(note.id)
        : await api.hideNote(note.id);
      setNote(updatedNote);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.error('Failed to toggle hidden:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update note.');
    }
  };

  const htmlContent = useMemo(
    () => note ? generateNoteHtml(note.content, theme.colors, theme.isDark) : '',
    [note, theme.colors, theme.isDark]
  );

  return {
    note,
    loading,
    htmlContent,
    handleEdit,
    handleToggleStar,
    handleToggleHidden,
  };
}
