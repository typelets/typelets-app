import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';
import { LoadingView } from './LoadingView';
import { MasterPasswordForm } from './MasterPasswordForm';
import { styles } from './styles';
import { useKeyboardHandler } from './useKeyboardHandler';

interface MasterPasswordScreenProps {
  userId: string;
  isNewSetup: boolean;
  onSuccess: (password: string) => Promise<void>;
}

/**
 * Master Password Screen Component
 * Handles master password setup and unlock flows
 */
export function MasterPasswordScreen({
  isNewSetup,
  onSuccess,
}: MasterPasswordScreenProps) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const animatedValue = useKeyboardHandler();

  // Reset loading state and vibrate when component mounts
  // This ensures the form is shown after sign out/sign in
  useEffect(() => {
    setIsLoading(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleFormSubmit = async (password: string) => {
    setIsLoading(true);
    try {
      await onSuccess(password);
    } catch (error) {
      // Always clear loading state on error so user can retry
      setIsLoading(false);

      // Re-throw to let parent handle
      throw error;
    }

    // Don't clear loading here on success - let parent state change handle it
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateY: animatedValue }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {!isLoading ? (
            <MasterPasswordForm
              key={`password-form-${isNewSetup}`} // Force remount when setup state changes
              isNewSetup={isNewSetup}
              onSubmit={handleFormSubmit}
            />
          ) : (
            <LoadingView isNewSetup={isNewSetup} />
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
