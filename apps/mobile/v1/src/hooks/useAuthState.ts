import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'typelets_auth_state';
const LAST_ACTIVITY_KEY = 'typelets_last_activity';
const AUTO_LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuthState = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check if user should be auto-locked
  useEffect(() => {
    const checkAutoLock = async () => {
      try {
        const [authState, lastActivityTime] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(LAST_ACTIVITY_KEY)
        ]);

        if (authState === 'true' && lastActivityTime) {
          const timeSinceLastActivity = Date.now() - parseInt(lastActivityTime);
          if (timeSinceLastActivity < AUTO_LOCK_DURATION) {
            setIsAuthenticated(true);
            setLastActivity(parseInt(lastActivityTime));
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAutoLock();
  }, []);

  // Update activity timestamp periodically
  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      AsyncStorage.setItem(LAST_ACTIVITY_KEY, now.toString()).catch((error) => {
        if (__DEV__) console.error(error);
      });
    };

    if (isAuthenticated) {
      updateActivity();
      const interval = setInterval(updateActivity, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Auto-lock check
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAutoLockTimer = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity >= AUTO_LOCK_DURATION) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkAutoLockTimer);
  }, [isAuthenticated, lastActivity]);

  const login = async (masterPassword: string): Promise<boolean> => {
    try {
      // In a real app, you'd validate the master password against a stored hash
      // For demo purposes, we'll accept any non-empty password
      if (!masterPassword.trim()) {
        return false;
      }

      // Simulate password validation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo - accept any password. In production, validate against hash
      const isValid = masterPassword.length >= 1;

      if (isValid) {
        setIsAuthenticated(true);
        await AsyncStorage.setItem(AUTH_KEY, 'true');
        await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }

      return isValid;
    } catch (error) {
      if (__DEV__) console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setIsAuthenticated(false);
      await AsyncStorage.multiRemove([AUTH_KEY, LAST_ACTIVITY_KEY]);
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    lastActivity
  };
};