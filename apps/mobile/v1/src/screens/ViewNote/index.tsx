import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../theme';
import { useViewNote } from '../../hooks/useViewNote';
import { ViewHeader } from './ViewHeader';
import { NoteContent } from './NoteContent';

export default function ViewNoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId } = params;

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);

  const { note, loading, htmlContent, handleEdit, handleToggleStar, handleToggleHidden } = useViewNote(noteId as string);

  useEffect(() => {
    // Reset scroll position when note changes
    scrollY.setValue(0);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [noteId, scrollY]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset scroll position when screen comes into focus
      scrollY.setValue(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [scrollY])
  );

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

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            Note not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.background }]}>
        <ViewHeader
          isStarred={note.starred}
          isHidden={note.hidden}
          title={note.title}
          scrollY={scrollY}
          onBack={() => router.back()}
          onToggleStar={handleToggleStar}
          onToggleHidden={handleToggleHidden}
          onEdit={handleEdit}
          theme={theme}
        />
      </View>

      <NoteContent
        note={note}
        htmlContent={htmlContent}
        scrollY={scrollY}
        scrollViewRef={scrollViewRef}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
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
