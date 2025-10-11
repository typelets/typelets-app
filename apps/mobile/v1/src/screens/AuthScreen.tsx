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
      logger.error('Sign in failed', err, {
        attributes: {
          email,
          errorMessage: error.errors?.[0]?.message,
        },
      });
      showToast(error.errors?.[0]?.message || 'Invalid email or password');
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
      logger.error('Sign up failed', err, {
        attributes: {
          email,
          firstName,
          lastName,
          errorMessage: error.errors?.[0]?.message,
        },
      });
      showToast(error.errors?.[0]?.message || 'Unable to create account');
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
        logger.warn('Sign up incomplete after verification', {
          attributes: {
            status: completeSignUp.status,
            missingFields: completeSignUp.missingFields,
            email,
          },
        });
        showToast('Unable to complete sign up. Check Clerk Dashboard settings.');
      }
    } catch (err: unknown) {
      const error = err as ClerkError;
      logger.error('Email verification failed', err, {
        attributes: {
          email,
          errorMessage: error.errors?.[0]?.message,
        },
      });
      showToast(error.errors?.[0]?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in all fields');
      return;
    }

    if (isSignUp && (!firstName.trim() || !lastName.trim())) {
      showToast('Please enter your first and last name');
      return;
    }

    if (isSignUp && !acceptedTerms) {
      showToast('Please accept the Terms of Service and Privacy Policy');
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
                              borderColor: isFocused ? theme.colors.primary : theme.colors.border,
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
                    onChangeText={(text) => setVerificationCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    style={styles.hiddenInput}
                  />
                </TouchableOpacity>

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
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                        autoComplete="name-given"
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={[styles.label, { color: theme.colors.foreground }]}>Last Name</Text>
                      <Input
                        placeholder="Enter your last name"
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                        autoComplete="name-family"
                      />
                    </View>
                  </>
                )}

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.foreground }]}>Email</Text>
                  <Input
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
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
                            borderColor: theme.colors.input,
                            color: theme.colors.foreground,
                            backgroundColor: theme.colors.background,
                          }
                        ]}
                        placeholder="Enter your password"
                        placeholderTextColor={theme.colors.mutedForeground}
                        defaultValue=""
                        onChangeText={setPassword}
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
                  </View>
                )}

                {!isSignUp && !isForgotPassword && (
                  <TouchableOpacity
                    onPress={() => setIsForgotPassword(true)}
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
                    onPress={() => setIsForgotPassword(false)}
                    style={styles.switchButton}
                  >
                    Back to Sign In
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onPress={() => setIsSignUp(!isSignUp)}
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
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
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
    justifyContent: 'space-between',
    marginBottom: 32,
    marginTop: 24,
    gap: 8,
  },
  pinBox: {
    flex: 1,
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