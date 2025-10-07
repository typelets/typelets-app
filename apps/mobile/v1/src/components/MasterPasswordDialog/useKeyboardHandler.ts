import { useEffect, useRef } from 'react';
import { Keyboard, Platform, Animated } from 'react-native';

/**
 * Hook to handle keyboard animations
 * Moves the view up when keyboard appears
 */
export function useKeyboardHandler() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const { height: keyboardHeight } = event.endCoordinates;

        // Move up by half the keyboard height
        const moveUpValue = keyboardHeight * 0.5;

        Animated.timing(animatedValue, {
          toValue: -moveUpValue,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [animatedValue]);

  return animatedValue;
}
