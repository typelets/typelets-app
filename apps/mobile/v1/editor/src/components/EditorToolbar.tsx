import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import type { EditorRef } from './Editor';

export interface EditorToolbarProps {
  editorRef: React.RefObject<EditorRef>;
  theme?: 'light' | 'dark';
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorRef,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const Button = ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.button,
        isDark ? styles.darkButton : styles.lightButton,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.buttonText,
        isDark ? styles.darkText : styles.lightText,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.toolbar, isDark ? styles.darkToolbar : styles.lightToolbar]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Button label="B" onPress={() => editorRef.current?.bold()} />
        <Button label="I" onPress={() => editorRef.current?.italic()} />
        <Button label="U" onPress={() => editorRef.current?.underline()} />
        <Button label="H1" onPress={() => editorRef.current?.heading(1)} />
        <Button label="H2" onPress={() => editorRef.current?.heading(2)} />
        <Button label="H3" onPress={() => editorRef.current?.heading(3)} />
        <Button label="•" onPress={() => editorRef.current?.bulletList()} />
        <Button label="1." onPress={() => editorRef.current?.orderedList()} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    borderTopWidth: 1,
  },
  lightToolbar: {
    backgroundColor: '#f5f5f5',
    borderTopColor: '#ddd',
  },
  darkToolbar: {
    backgroundColor: '#2a2a2a',
    borderTopColor: '#444',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  lightButton: {
    backgroundColor: '#fff',
  },
  darkButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lightText: {
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
});
