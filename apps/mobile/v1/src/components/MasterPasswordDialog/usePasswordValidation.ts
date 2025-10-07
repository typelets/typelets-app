import { useState } from 'react';

interface ValidationResult {
  hasErrors: boolean;
  passwordError: string;
  confirmPasswordError: string;
}

export function usePasswordValidation() {
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validatePasswords = (
    password: string,
    confirmPassword: string,
    isNewSetup: boolean
  ): ValidationResult => {
    let hasErrors = false;
    let newPasswordError = '';
    let newConfirmPasswordError = '';

    // Validate password
    if (!password.trim()) {
      newPasswordError = 'Please enter a password';
      hasErrors = true;
    } else if (password.length < 8) {
      newPasswordError = 'Password must be at least 8 characters long';
      hasErrors = true;
    }

    // Validate confirmation password for new setup
    if (isNewSetup) {
      if (!confirmPassword.trim()) {
        newConfirmPasswordError = 'Please confirm your password';
        hasErrors = true;
      } else if (password !== confirmPassword) {
        newConfirmPasswordError = 'Passwords do not match';
        hasErrors = true;
      }
    }

    setPasswordError(newPasswordError);
    setConfirmPasswordError(newConfirmPasswordError);

    return {
      hasErrors,
      passwordError: newPasswordError,
      confirmPasswordError: newConfirmPasswordError,
    };
  };

  const clearPasswordError = () => setPasswordError('');
  const clearConfirmPasswordError = () => setConfirmPasswordError('');

  const checkPasswordMatch = (password: string, confirmPassword: string) => {
    if (password && confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
    } else if (password === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  return {
    passwordError,
    confirmPasswordError,
    validatePasswords,
    clearPasswordError,
    clearConfirmPasswordError,
    checkPasswordMatch,
    setPasswordError,
  };
}
