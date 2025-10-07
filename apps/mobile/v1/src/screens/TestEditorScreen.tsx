import React from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';

export default function TestEditorScreen() {
  const editor = useEditorBridge({
    autofocus: true,
    avoidIosKeyboard: true,
    initialContent: '<p>This is a test - can you see the toolbar?</p>',
  });

  return (
    <SafeAreaView style={styles.fullScreen}>
      <RichText editor={editor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});
