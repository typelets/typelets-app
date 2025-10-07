import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Keyboard,
  Animated,
  Dimensions,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useTheme } from '../theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const theme = useTheme();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
      }
    } catch {
      Alert.alert('Sign In Error', 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded) return;
    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
      } else {
        // Handle email verification if needed
        Alert.alert('Verification Required', 'Please check your email to verify your account.');
      }
    } catch {
      Alert.alert('Sign Up Error', 'Unable to create account. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
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
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setIsForgotPassword(false);
    } catch {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
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
              {isForgotPassword ? 'Reset Password' : 'Welcome to Typelets'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
              {isForgotPassword ? 'Enter your email to receive a reset link' : isSignUp ? 'Create your account' : 'Sign in to continue'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formWrapper}>
          <View style={styles.form}>
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
});