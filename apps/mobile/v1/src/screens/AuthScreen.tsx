import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Linking,
  ToastAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useTheme } from '../theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../lib/logger';

/**
 * Type definitions for Clerk SDK with legal acceptance fields
 * These fields are documented in Clerk but not in the official TypeScript types
 */
interface ClerkSignUpParams {
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
  legalAccepted?: boolean;
}

interface ClerkUpdateParams {
  legalAccepted?: boolean;
  legalAcceptedAt?: number;
}

/**
 * Type for Clerk error objects
 */
interface ClerkError {
  errors?: Array<{ message?: string }>;
}

/**
 * Display a toast notification (Android) or log message (iOS)
 * @param message - The message to display
 */
const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS, just log to console for now (can be replaced with a toast library)
    console.log('Toast:', message);
  }
};

/**
 * Authentication screen for sign in and sign up
 * Features:
 * - Email/password authentication
 * - Email verification with PIN code
 * - Terms of Service acceptance
 * - Password reset flow
 */
export default function AuthScreen() {
  const theme = useTheme();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const passwordRef = useRef<TextInput>(null);

  // Keyboard handling
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const { height: keyboardHeight } = event.endCoordinates;

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

  /**
   * Handle sign in with email and password
   */
  const handleSignIn = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        logger.recordEvent('sign_in_success', {
          email,
        });
      }
    } catch (err: unknown) {
      const error = err as ClerkError;
      const originalMessage = error.errors?.[0]?.message || '';
      // Replace confusing Clerk messages with user-friendly ones
      let message = 'Invalid email or password';
      if (originalMessage.toLowerCase().includes('identifier')) {
        message = 'Email or password is incorrect';
      } else if (originalMessage.toLowerCase().includes('account')) {
        message = 'Email or password is incorrect';
      } else if (originalMessage) {
        message = 'Email or password is incorrect';
      }

      logger.error('Sign in failed', err, {
        attributes: {
          email,
          errorMessage: originalMessage,
        },
      });
      setErrorMessage(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle sign up with email, password, name, and legal acceptance
   * Sends email verification code after account creation
   */
  const handleSignUp = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    setErrorMessage('');

    try {
      // Create sign up with all required fields including legal acceptance
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        legalAccepted: true, // Required by Clerk Dashboard configuration
      } as ClerkSignUpParams);

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Show verification screen
      setPendingVerification(true);
      showToast(`Verification code sent to ${email}`);
      logger.recordEvent('sign_up_verification_sent', {
        email,
      });
    } catch (err: unknown) {
      const error = err as ClerkError;
      const originalMessage = error.errors?.[0]?.message || '';
      // Replace specific Clerk messages with generic ones
      let message = 'Unable to create account';
      if (originalMessage.toLowerCase().includes('email') && originalMessage.toLowerCase().includes('taken')) {
        message = 'Unable to create account with this email';
      } else if (originalMessage.toLowerCase().includes('password') && originalMessage.toLowerCase().includes('strong')) {
        message = 'Password must contain uppercase, lowercase, number, and special character';
      } else if (originalMessage) {
        message = 'Unable to create account';
      }

      logger.error('Sign up failed', err, {
        attributes: {
          email,
          firstName,
          lastName,
          errorMessage: originalMessage,
        },
      });
      setErrorMessage(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle email verification code submission
   * Attempts to set legal acceptance and complete sign up
   */
  const handleVerifyEmail = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    setErrorMessage('');

    try {
      // Try multiple approaches to set legal acceptance (fallback for different Clerk configurations)
      try {
        // Approach 1: Update with legalAccepted field
        await signUp.update({
          legalAccepted: true,
        } as ClerkUpdateParams);
      } catch (err1: unknown) {
        try {
          // Approach 2: Update with legalAcceptedAt timestamp
          await signUp.update({
            legalAcceptedAt: new Date().getTime(),
          } as ClerkUpdateParams);
        } catch (err2: unknown) {
          if (__DEV__) {
            const error = err2 as { errors?: Array<{ message?: string }> };
            console.log('Legal update error:', error.errors?.[0]?.message);
          }
        }
      }

      // Attempt to verify the email address with the provided code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === 'complete') {
        await setActiveSignUp({ session: completeSignUp.createdSessionId });
        logger.recordEvent('sign_up_complete', {
          email,
        });
      } else {
        const message = 'Unable to complete sign up. Please try again.';
        logger.warn('Sign up incomplete after verification', {
          attributes: {
            status: completeSignUp.status,
            missingFields: completeSignUp.missingFields,
            email,
          },
        });
        setErrorMessage(message);
        showToast(message);
      }
    } catch (err: unknown) {
      const error = err as ClerkError;
      const message = error.errors?.[0]?.message || 'Invalid verification code';
      logger.error('Email verification failed', err, {
        attributes: {
          email,
          errorMessage: message,
        },
      });
      setErrorMessage(message);
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isSignUp && !firstName.trim()) {
      const message = 'Please enter your first name';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (isSignUp && !lastName.trim()) {
      const message = 'Please enter your last name';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (!email.trim()) {
      const message = 'Please enter your email';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (!password.trim()) {
      const message = 'Please enter your password';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (isSignUp && password.length < 8) {
      const message = 'Password must be at least 8 characters';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (isSignUp && !acceptedTerms) {
      const message = 'Please accept the Terms of Service and Privacy Policy';
      setErrorMessage(message);
      showToast(message);
      return;
    }

    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  const handleForgotPassword = async () => {
    if (!signInLoaded) return;

    if (!email.trim()) {
      showToast('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setIsForgotPassword(false);
      showToast('Password reset email sent');
    } catch {
      showToast('Failed to send reset email');
    } finally {
      setLoading(false);
    }
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              {pendingVerification ? 'Verify Email' : isForgotPassword ? 'Reset Password' : 'Welcome to Typelets'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
              {pendingVerification
                ? 'Enter the verification code'
                : isForgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Create your account' : 'Sign in to continue'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formWrapper}>
          <View style={styles.form}>
            {pendingVerification ? (
              // Verification Code Form
              <>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => passwordRef.current?.focus()}
                  style={styles.pinWrapper}
                >
                  <View style={styles.pinContainer}>
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const digit = verificationCode[index] || '';
                      const isFocused = verificationCode.length === index;

                      return (
                        <View
                          key={index}
                          style={[
                            styles.pinBox,
                            {
                              borderColor: errorMessage ? '#ef4444' : (isFocused ? theme.colors.primary : theme.colors.border),
                              backgroundColor: theme.colors.background,
                            }
                          ]}
                        >
                          <Text style={[styles.pinDigit, { color: theme.colors.foreground }]}>
                            {digit}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Hidden input for keyboard */}
                  <TextInput
                    ref={passwordRef}
                    value={verificationCode}
                    onChangeText={(text) => {
                      setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    style={styles.hiddenInput}
                  />
                </TouchableOpacity>

                {errorMessage ? (
                  <Text style={[styles.errorText, { color: '#ef4444', textAlign: 'center', marginTop: -24, marginBottom: 16 }]}>
                    {errorMessage}
                  </Text>
                ) : null}

                <Button
                  onPress={handleVerifyEmail}
                  disabled={loading || verificationCode.length !== 6}
                  style={styles.submitButton}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Button>

                <Button
                  variant="ghost"
                  onPress={() => {
                    setPendingVerification(false);
                    setVerificationCode('');
                    setErrorMessage('');
                  }}
                  style={styles.switchButton}
                >
                  Back to Sign Up
                </Button>
              </>
            ) : (
              // Sign In/Sign Up Form
              <>
                {isSignUp && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: theme.colors.foreground }]}>First Name</Text>
                      <Input
                        placeholder="Enter your first name"
                        value={firstName}
                        onChangeText={(text) => {
                          setFirstName(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        autoCapitalize="words"
                        autoComplete="name-given"
                        style={(errorMessage && errorMessage.toLowerCase().includes('first name')) ? { borderColor: '#ef4444' } : undefined}
                      />
                      {errorMessage && errorMessage.toLowerCase().includes('first name') ? (
                        <Text style={[styles.errorText, { color: '#ef4444' }]}>
                          {errorMessage}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: theme.colors.foreground }]}>Last Name</Text>
                      <Input
                        placeholder="Enter your last name"
                        value={lastName}
                        onChangeText={(text) => {
                          setLastName(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        autoCapitalize="words"
                        autoComplete="name-family"
                        style={(errorMessage && errorMessage.toLowerCase().includes('last name')) ? { borderColor: '#ef4444' } : undefined}
                      />
                      {errorMessage && errorMessage.toLowerCase().includes('last name') ? (
                        <Text style={[styles.errorText, { color: '#ef4444' }]}>
                          {errorMessage}
                        </Text>
                      ) : null}
                    </View>
                  </>
                )}

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.foreground }]}>Email</Text>
                  <Input
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errorMessage) setErrorMessage('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    style={(errorMessage && (
                      (isSignUp && (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('account'))) ||
                      errorMessage.toLowerCase() === 'please enter your email' ||
                      (!isSignUp && (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')))
                    )) ? { borderColor: '#ef4444' } : undefined}
                  />
                  {errorMessage && (
                    (isSignUp && (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('account'))) ||
                    errorMessage.toLowerCase() === 'please enter your email' ||
                    (!isSignUp && (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')))
                  ) ? (
                    <Text style={[styles.errorText, { color: '#ef4444' }]}>
                      {errorMessage}
                    </Text>
                  ) : null}
                </View>

                {!isForgotPassword && (
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: theme.colors.foreground }]}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        ref={passwordRef}
                        style={[
                          styles.passwordInput,
                          {
                            borderColor: (errorMessage && (
                              errorMessage.toLowerCase().includes('password') ||
                              errorMessage.toLowerCase().includes('characters') ||
                              errorMessage.toLowerCase().includes('contain') ||
                              (!isSignUp && (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')))
                            )) ? '#ef4444' : theme.colors.input,
                            color: theme.colors.foreground,
                            backgroundColor: theme.colors.background,
                          }
                        ]}
                        placeholder="Enter your password"
                        placeholderTextColor={theme.colors.mutedForeground}
                        defaultValue=""
                        onChangeText={(text) => {
                          setPassword(text);
                          if (errorMessage) setErrorMessage('');
                        }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline={false}
                        importantForAutofill="no"
                        autoComplete="password"
                        editable={!loading}
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
                    </View>
                    {errorMessage && (
                      errorMessage.toLowerCase().includes('password') ||
                      errorMessage.toLowerCase().includes('characters') ||
                      errorMessage.toLowerCase().includes('contain')
                    ) ? (
                      <Text style={[styles.errorText, { color: '#ef4444' }]}>
                        {errorMessage}
                      </Text>
                    ) : null}
                  </View>
                )}

                {!isSignUp && !isForgotPassword && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsForgotPassword(true);
                      setErrorMessage('');
                    }}
                    style={styles.forgotPasswordButton}
                  >
                    <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                      Forgot password?
                    </Text>
                  </TouchableOpacity>
                )}

                {isSignUp && (
                  <TouchableOpacity
                    style={styles.termsContainer}
                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, { borderColor: theme.colors.border, backgroundColor: acceptedTerms ? theme.colors.primary : theme.colors.background }]}>
                      {acceptedTerms && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.primaryForeground} />
                      )}
                    </View>
                    <Text style={[styles.termsText, { color: theme.colors.foreground }]}>
                      I agree to the{' '}
                      <Text
                        style={[styles.termsLink, { color: theme.colors.primary }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://typelets.com/terms');
                        }}
                      >
                        Terms of Service
                      </Text>
                      {' '}and{' '}
                      <Text
                        style={[styles.termsLink, { color: theme.colors.primary }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://typelets.com/privacy');
                        }}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}

                <Button
                  onPress={isForgotPassword ? handleForgotPassword : handleSubmit}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  {loading ? 'Loading...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
                </Button>

                {isForgotPassword ? (
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setIsForgotPassword(false);
                      setErrorMessage('');
                    }}
                    style={styles.switchButton}
                  >
                    Back to Sign In
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setIsSignUp(!isSignUp);
                      setErrorMessage('');
                    }}
                    style={styles.switchButton}
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Button>
                )}
              </>
            )}
          </View>
          </View>
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
  formWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 480,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  submitButton: {
    width: '100%',
    marginTop: 16,
    marginBottom: 16,
  },
  switchButton: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 48,
    fontSize: 14,
    minHeight: 40,
    // iOS-specific fix for centered placeholder text
    ...(Platform.OS === 'ios' && {
      paddingTop: 10,
      paddingBottom: 10,
    }),
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  pinWrapper: {
    position: 'relative',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 24,
    gap: 8,
  },
  pinBox: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigit: {
    fontSize: 24,
    fontWeight: '600',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});