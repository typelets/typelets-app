import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

const KEYBOARD_TOOLBAR_OFFSET = 8;

/**
 * Hook to track keyboard height for positioning floating elements
 * Returns keyboard height + offset to position toolbar above keyboard
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height + KEYBOARD_TOOLBAR_OFFSET);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  return keyboardHeight;
}
