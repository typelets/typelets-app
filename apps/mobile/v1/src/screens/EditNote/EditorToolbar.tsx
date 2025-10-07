import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EditorBridge } from '@10play/tentap-editor';

interface EditorToolbarProps {
  editor: EditorBridge;
  keyboardHeight: number;
  theme: {
    colors: {
      background: string;
      border: string;
      foreground: string;
    };
  };
}
export function EditorToolbar({ editor, keyboardHeight, theme }: EditorToolbarProps) {
  return (
    <View
      style={[
        styles.toolbarContainer,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          bottom: keyboardHeight,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarButtons}
      >
        <TouchableOpacity
          onPress={() => editor.toggleBold()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>B</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleItalic()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, fontStyle: 'italic' }]}>I</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleUnderline()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'underline' }]}>U</Text>
        </TouchableOpacity>

        <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          onPress={() => editor.toggleHeading(1)}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleHeading(2)}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>H2</Text>
        </TouchableOpacity>

        <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          onPress={() => editor.toggleBulletList()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>•</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleOrderedList()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground }]}>1.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleTaskList()}
          style={styles.toolbarButton}
        >
          <Ionicons name="checkbox-outline" size={18} color={theme.colors.foreground} />
        </TouchableOpacity>

        <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />

        <TouchableOpacity
          onPress={() => editor.undo()}
          style={styles.toolbarButton}
        >
          <Ionicons name="arrow-undo" size={18} color={theme.colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.redo()}
          style={styles.toolbarButton}
        >
          <Ionicons name="arrow-redo" size={18} color={theme.colors.foreground} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 0.5,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 8,
  },
  toolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  toolbarButton: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
});
