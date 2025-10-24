/**
 * Example usage of @typelets/editor
 * This file demonstrates how to use the editor in a React Native app
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Editor, EditorToolbar, useEditor } from './src';
import type { EditorRef } from './src';

export default function EditorExample() {
  const editor = useEditor({ initialContent: '# Hello World\n\nStart typing...' });
  const editorRef = useRef<EditorRef>(null);

  const handleBold = () => {
    const { start, end } = editor.selection;
    const newContent = editor.content.slice(0, start) + '**' +
                       editor.content.slice(start, end) + '**' +
                       editor.content.slice(end);
    editor.updateContent(newContent);
  };

  const handleItalic = () => {
    const { start, end } = editor.selection;
    const newContent = editor.content.slice(0, start) + '_' +
                       editor.content.slice(start, end) + '_' +
                       editor.content.slice(end);
    editor.updateContent(newContent);
  };

  const handleCode = () => {
    const { start, end } = editor.selection;
    const newContent = editor.content.slice(0, start) + '`' +
                       editor.content.slice(start, end) + '`' +
                       editor.content.slice(end);
    editor.updateContent(newContent);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.editorContainer}>
        <Editor
          ref={editorRef}
          value={editor.content}
          onChange={editor.updateContent}
          placeholder="Start typing..."
          theme="light"
        />
      </View>
      <EditorToolbar
        onBold={handleBold}
        onItalic={handleItalic}
        onCode={handleCode}
        theme="light"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
  },
});
