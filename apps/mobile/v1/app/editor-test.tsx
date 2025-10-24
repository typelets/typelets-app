import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Editor, EditorToolbar } from '../editor/src';
import type { EditorRef } from '../editor/src';
import { useTheme } from '@/src/theme';
import { useApiService } from '@/src/services/api';

export default function EditorTestScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { noteId } = params;
  const api = useApiService();
  const editorRef = useRef<EditorRef>(null);

  // Store content as HTML (Tiptap format)
  const [content, setContent] = useState('<h1>WYSIWYG Editor</h1><p>Use the toolbar below to format text!</p>');
  const [title, setTitle] = useState('Test Note');
  const [loading, setLoading] = useState(false);

  // Load note if noteId is provided
  useEffect(() => {
    if (noteId) {
      const loadNote = async () => {
        setLoading(true);
        try {
          const note = await api.getNote(noteId as string);
          console.log('=== LOADED NOTE ===');
          console.log('Title:', note?.title);
          console.log('Content:', note?.content);
          console.log('Content length:', note?.content?.length);

          // Check for bullet lists
          if (note?.content?.includes('<ul>') || note?.content?.includes('<ul ')) {
            console.log('=== FOUND BULLET LIST IN NOTE ===');
            const ulMatch = note.content.match(/<ul[^>]*>[\s\S]*?<\/ul>/i);
            if (ulMatch) {
              console.log('Bullet list HTML:', ulMatch[0]);
            }
          }

          // Check for ordered lists
          if (note?.content?.includes('<ol>') || note?.content?.includes('<ol ')) {
            console.log('=== FOUND ORDERED LIST IN NOTE ===');
            const olMatch = note.content.match(/<ol[^>]*>[\s\S]*?<\/ol>/i);
            if (olMatch) {
              console.log('Ordered list HTML:', olMatch[0]);
            }
          }

          // Check for code blocks
          if (note?.content?.includes('<pre>') || note?.content?.includes('<code>')) {
            console.log('=== FOUND CODE BLOCK IN NOTE ===');
            const preMatch = note.content.match(/<pre[^>]*>[\s\S]*?<\/pre>/i);
            if (preMatch) {
              console.log('Pre/Code block HTML:', preMatch[0]);
            }
            // Also check for inline code
            const codeMatch = note.content.match(/<code[^>]*>[\s\S]*?<\/code>/i);
            if (codeMatch && !preMatch) {
              console.log('Inline code HTML:', codeMatch[0]);
            }
          }

          // Check for blockquotes
          if (note?.content?.includes('<blockquote>') || note?.content?.includes('<blockquote ')) {
            console.log('=== FOUND BLOCKQUOTE IN NOTE ===');
            const quoteMatch = note.content.match(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/i);
            if (quoteMatch) {
              console.log('Blockquote HTML:', quoteMatch[0]);
            }
          }

          console.log('==================');
          if (note) {
            setTitle(note.title || 'Untitled');
            setContent(note.content || '<p><br></p>');
          }
        } catch (error) {
          console.error('Failed to load note:', error);
        } finally {
          setLoading(false);
        }
      };
      loadNote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.editorContainer}>
          <Editor
            ref={editorRef}
            value={content}
            onChange={setContent}
            placeholder="Start typing..."
            theme={theme.dark ? 'dark' : 'light'}
          />
        </View>
        <EditorToolbar
          editorRef={editorRef}
          theme={theme.dark ? 'dark' : 'light'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  keyboardAvoid: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
  },
});
