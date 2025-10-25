import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import type { EditorRef } from './Editor';

export interface EditorToolbarColors {
  background: string;
  buttonBackground: string;
  buttonText: string;
  border: string;
}

export interface EditorToolbarProps {
  editorRef: React.RefObject<EditorRef | null>;
  theme?: 'light' | 'dark';
  colors?: EditorToolbarColors;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorRef,
  theme = 'light',
  colors,
}) => {
  const isDark = theme === 'dark';

  // Use provided colors or fall back to hardcoded theme colors
  const toolbarColors: EditorToolbarColors = colors || {
    background: isDark ? '#2a2a2a' : '#f5f5f5',
    buttonBackground: isDark ? '#333' : '#fff',
    buttonText: isDark ? '#fff' : '#000',
    border: isDark ? '#444' : '#ddd',
  };

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
        { backgroundColor: toolbarColors.buttonBackground },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.buttonText,
        { color: toolbarColors.buttonText },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[
      styles.toolbar,
      {
        backgroundColor: toolbarColors.background,
        borderTopColor: toolbarColors.border,
      },
    ]}>
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
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
