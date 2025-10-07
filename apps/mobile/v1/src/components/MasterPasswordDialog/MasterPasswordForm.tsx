import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { usePasswordValidation } from './usePasswordValidation';
import { styles } from './styles';

interface MasterPasswordFormProps {
  isNewSetup: boolean;
  onSubmit: (password: string) => Promise<void>;
}

/**
 * Master password form component
 * Handles password input, validation, and submission
 */
export function MasterPasswordForm({
  isNewSetup,
  onSubmit,
}: MasterPasswordFormProps) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    passwordError,
    confirmPasswordError,
    validatePasswords,
    clearPasswordError,
    clearConfirmPasswordError,
    checkPasswordMatch,
    setPasswordError,
  } = usePasswordValidation();

  const handleSubmit = async () => {
    // Validate passwords
    const validation = validatePasswords(password, confirmPassword, isNewSetup);

    if (validation.hasErrors) {
      setIsLoading(false);
      return;
    }

    try {
      await onSubmit(password);

      // Clear password fields on success
      setPassword('');
      setConfirmPassword('');
      passwordRef.current?.clear();
      confirmPasswordRef.current?.clear();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (__DEV__) {
        console.error('Master password error:', errorMessage);
      }
      setPasswordError(
        isNewSetup ? 'Failed to setup master password' : 'Invalid password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    clearPasswordError();
    // Clear confirm password error if passwords now match
    if (confirmPassword && text === confirmPassword) {
      clearConfirmPasswordError();
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    clearConfirmPasswordError();
    // Check if passwords match
    checkPasswordMatch(password, text);
  };

  const title = isNewSetup ? 'Setup Master Password' : 'Enter Master Password';
  const subtitle = isNewSetup
    ? 'Create a master password to encrypt your notes'
    : 'Enter your master password to decrypt your notes';

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={passwordRef}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: passwordError ? '#ef4444' : theme.colors.border,
                color: theme.colors.foreground,
              },
            ]}
            placeholder="Master password"
            placeholderTextColor={theme.colors.mutedForeground}
            defaultValue=""
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            multiline={false}
            importantForAutofill="no"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={theme.colors.mutedForeground}
            />
          </TouchableOpacity>
          {passwordError ? (
            <Text style={[styles.errorText, { color: '#ef4444' }]}>
              {passwordError}
            </Text>
          ) : null}
        </View>

        {isNewSetup && (
          <View style={styles.inputContainer}>
            <TextInput
              ref={confirmPasswordRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: confirmPasswordError ? '#ef4444' : theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
              placeholder="Confirm password"
              placeholderTextColor={theme.colors.mutedForeground}
              defaultValue=""
              onChangeText={handleConfirmPasswordChange}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              importantForAutofill="no"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={theme.colors.mutedForeground}
              />
            </TouchableOpacity>
            {confirmPasswordError ? (
              <Text style={[styles.errorText, { color: '#ef4444' }]}>
                {confirmPasswordError}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.colors.primary },
            isLoading && styles.disabledButton,
          ]}
          onPress={async () => {
            // Set loading immediately when button is pressed
            setIsLoading(true);

            // Small delay to allow UI to render the loading state before blocking computation
            await new Promise((resolve) => setTimeout(resolve, 100));

            handleSubmit();
          }}
          disabled={isLoading}
          activeOpacity={0.7}
          testID="master-password-submit-button"
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
              <Text
                style={[styles.loadingText, { color: theme.colors.primaryForeground }]}
              >
                {isNewSetup ? 'Setting up...' : 'Unlocking...'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.buttonText, { color: theme.colors.primaryForeground }]}>
              {isNewSetup ? 'Setup Master Password' : 'Unlock'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {isNewSetup && (
        <View
          style={[
            styles.notice,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.noticeText, { color: theme.colors.foreground }]}>
            Your master password protects your notes with encryption. It&apos;s never
            stored, so if you lose it, your notes cannot be recovered.
          </Text>
        </View>
      )}
    </>
  );
}
