import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Highlighter } from 'lucide-react-native';
import type { EditorBridge } from '@10play/tentap-editor';

interface EditorToolbarProps {
  editor: EditorBridge;
  keyboardHeight: number;
  bottomInset: number;
  theme: {
    colors: {
      background: string;
      border: string;
      foreground: string;
    };
  };
}
export function EditorToolbar({ editor, keyboardHeight, bottomInset, theme }: EditorToolbarProps) {
  // Calculate padding for iOS curved keyboard
  // When keyboard is open, use minimal padding
  const paddingBottom = Platform.OS === 'ios' && keyboardHeight > 0
    ? 4 // Minimal padding for curved keyboard
    : 24; // Default padding when keyboard is closed

  return (
    <View
      style={[
        styles.toolbarContainer,
        {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          bottom: keyboardHeight,
          paddingBottom,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarButtons}
      >
        {keyboardHeight > 0 && (
          <>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                editor.blur();
              }}
              style={styles.toolbarButton}
            >
              <Ionicons name="chevron-down" size={20} color={theme.colors.foreground} />
            </TouchableOpacity>
            <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />
          </>
        )}

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

        <TouchableOpacity
          onPress={() => editor.toggleStrike()}
          style={styles.toolbarButton}
        >
          <Text style={[styles.toolbarButtonText, { color: theme.colors.foreground, textDecorationLine: 'line-through' }]}>S</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => editor.toggleHighlight('#FFFF00')}
          style={styles.toolbarButton}
        >
          <Highlighter size={18} color={theme.colors.foreground} />
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
    paddingHorizontal: 8,
  },
  toolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 40,
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
