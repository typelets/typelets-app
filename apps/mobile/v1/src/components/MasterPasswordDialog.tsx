import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface MasterPasswordScreenProps {
  userId: string;
  isNewSetup: boolean;
  onSuccess: (password: string) => Promise<void>;
}

export function MasterPasswordScreen({
  userId,
  isNewSetup,
  onSuccess,
}: MasterPasswordScreenProps) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');


  // Keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    // Vibrate when component mounts
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const { height: keyboardHeight } = event.endCoordinates;
        setKeyboardHeight(keyboardHeight);

        // Calculate how much to move up (less aggressive than full keyboard height)
        const moveUpValue = keyboardHeight * 0.5; // Move up by half the keyboard height

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
        setKeyboardHeight(0);
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

  const handleSubmit = async () => {
    if (__DEV__) {
      console.log('🚨 HANDLESUBMIT CALLED - THIS SHOULD ALWAYS SHOW!');
      console.log('🔐 MasterPasswordDialog handleSubmit called');
      console.log('🔐 isNewSetup:', isNewSetup);
      console.log('🔐 password length:', password.length);
      console.log('🔐 confirmPassword length:', confirmPassword.length);
      console.log('🔐 passwords match:', password === confirmPassword);
    }

    // Validate input with visual feedback
    let hasErrors = false;

    if (!password.trim()) {
      setPasswordError('Please enter a password');
      hasErrors = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      hasErrors = true;
    }

    if (isNewSetup) {
      if (!confirmPassword.trim()) {
        setConfirmPasswordError('Please confirm your password');
        hasErrors = true;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError('Passwords do not match');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setIsLoading(false);
      return;
    }

    if (__DEV__) {
      console.log('🔐 Validation passed, calling onSuccess');
    }

    // Loading state already set by button press

    try {
      if (__DEV__) {
        console.log('🔐 About to call onSuccess with password');
      }

      await onSuccess(password);

      if (__DEV__) {
        console.log('🔐 onSuccess completed successfully');
      }
      // Clear password fields on success
      setPassword('');
      setConfirmPassword('');
      passwordRef.current?.clear();
      confirmPasswordRef.current?.clear();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (__DEV__) {
        console.log('🔐 onSuccess failed with error:', errorMessage);
      }
      // Show error with red border and text
      setPasswordError(isNewSetup ? 'Failed to setup master password' : 'Invalid password');
      if (__DEV__) console.error('Master password error:', errorMessage);
    } finally {
      setIsLoading(false);
      if (__DEV__) {
        console.log('🔐 handleSubmit completed, isLoading set to false');
      }
    }
  };


  const title = isNewSetup ? 'Setup Master Password' : 'Enter Master Password';
  const subtitle = isNewSetup
    ? 'Create a master password to encrypt your notes'
    : 'Enter your master password to decrypt your notes';

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
            <>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.foreground }]}>
                  {title}
                </Text>
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
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                  // Clear confirm password error if passwords now match
                  if (confirmPassword && text === confirmPassword) {
                    setConfirmPasswordError('');
                  }
                }}
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
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setConfirmPasswordError('');
                    // Check if passwords match
                    if (password && text && password !== text) {
                      setConfirmPasswordError('Passwords do not match');
                    }
                  }}
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
                styles.primaryButton,
                { backgroundColor: theme.colors.primary },
                isLoading && styles.disabledButton,
              ]}
              onPress={async () => {
                // Set loading immediately when button is pressed
                setIsLoading(true);

                // Small delay to allow UI to render the loading state before blocking computation
                await new Promise(resolve => setTimeout(resolve, 100));

                handleSubmit();
              }}
              disabled={isLoading}
              activeOpacity={0.7}
              testID="master-password-submit-button"
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                  <Text style={[styles.loadingText, { color: theme.colors.primaryForeground }]}>
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
                <View style={[
                  styles.notice,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }
                ]}>
                  <Text style={[styles.noticeText, { color: theme.colors.foreground }]}>
                    Your master password protects your notes with encryption. It’s never stored, so if you lose it, your notes cannot be recovered.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.loadingContent}>
              <View style={styles.loadingCenter}>
                <ActivityIndicator
                  size="large"
                  color={theme.colors.primary}
                  style={{ marginBottom: 24 }}
                />

                <Text style={[styles.loadingTitle, { color: theme.colors.foreground }]}>
                  Securing Your Data
                </Text>

                <View style={[
                  styles.notice,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border
                  }
                ]}>
                  <Text style={[styles.noticeText, { color: theme.colors.foreground }]}>
                    {isNewSetup
                      ? 'We are generating military-grade encryption with 250,000 security iterations to protect your notes. Please wait and do not close the app.'
                      : 'Verifying your master password and loading encryption keys. This may take a moment.'
                    }
                  </Text>
                  <Text style={[styles.noticeText, { color: theme.colors.foreground, marginTop: 12 }]}>
                    This can take up to 5 minutes to complete.
                  </Text>
                </View>

              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height - 100, // Ensure full height minus some buffer
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    paddingBottom: 40,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  actions: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  securityInfo: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
  },
  prominentCard: {
    marginTop: 24,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  prominentTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  prominentText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  timeWarning: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
    borderWidth: 1,
  },
  timeWarningText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  securityText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  notice: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  noticeText: {
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 20,
    fontWeight: '500',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400,
  },
  loadingCenter: {
    alignItems: 'center',
    maxWidth: 350,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
});
