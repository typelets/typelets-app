import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect,useState } from 'react';
import { useColorScheme } from 'react-native';

import { DARK_THEME_PRESETS, type DarkThemePreset,LIGHT_THEME_PRESETS, type LightThemePreset } from './presets';

export type ThemeMode = 'light' | 'dark' | 'system';
export type { DarkThemePreset,LightThemePreset };

export const theme = {
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#25262b',
      card: '#ffffff',
      cardForeground: '#25262b',
      primary: '#343a46',
      primaryForeground: '#fcfcfc',
      secondary: '#f5f5f5',
      secondaryForeground: '#343a46',
      muted: '#f5f5f5',
      mutedForeground: '#8e8e93',
      accent: '#f5f5f5',
      accentForeground: '#343a46',
      destructive: '#dc3545',
      destructiveForeground: '#fcfcfc',
      border: '#C0C0C0',
      input: '#EBEBEB',
      ring: '#b5b5b5',
    },
    dark: {
      background: '#252525',
      foreground: '#fcfcfc',
      card: '#353535',
      cardForeground: '#fcfcfc',
      primary: '#ebebeb',
      primaryForeground: '#353535',
      secondary: '#454545',
      secondaryForeground: '#fcfcfc',
      muted: '#454545',
      mutedForeground: '#b5b5b5',
      accent: '#454545',
      accentForeground: '#fcfcfc',
      destructive: '#b91c1c',
      destructiveForeground: '#fcfcfc',
      border: 'rgba(255, 255, 255, 0.1)',
      input: 'rgba(255, 255, 255, 0.15)',
      ring: '#8e8e93',
    }
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 2,
    xl: 12,
  },
};

export type Theme = typeof theme;

const ThemeContext = createContext<{
  colors: typeof theme.colors.light;
  spacing: typeof theme.spacing;
  typography: typeof theme.typography;
  borderRadius: typeof theme.borderRadius;
  isDark: boolean;
  themeMode: ThemeMode;
  lightTheme: LightThemePreset;
  darkTheme: DarkThemePreset;
  setThemeMode: (mode: ThemeMode) => void;
  setLightTheme: (preset: LightThemePreset) => void;
  setDarkTheme: (preset: DarkThemePreset) => void;
  toggleTheme: () => void;
} | null>(null);

// Hook for using theme in components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to light theme if no provider
    return {
      colors: theme.colors.light,
      spacing: theme.spacing,
      typography: theme.typography,
      borderRadius: theme.borderRadius,
      isDark: false,
      themeMode: 'system' as ThemeMode,
      lightTheme: 'default' as LightThemePreset,
      darkTheme: 'trueBlack' as DarkThemePreset,
      setThemeMode: () => {},
      setLightTheme: () => {},
      setDarkTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};

// Theme Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [lightTheme, setLightThemeState] = useState<LightThemePreset>('default');
  const [darkTheme, setDarkThemeState] = useState<DarkThemePreset>('trueBlack');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedMode, savedLightTheme, savedDarkTheme] = await Promise.all([
          AsyncStorage.getItem('themeMode'),
          AsyncStorage.getItem('lightTheme'),
          AsyncStorage.getItem('darkTheme'),
        ]);

        if (savedMode) {
          setThemeModeState(savedMode as ThemeMode);
        }
        if (savedLightTheme) {
          setLightThemeState(savedLightTheme as LightThemePreset);
        }
        if (savedDarkTheme) {
          setDarkThemeState(savedDarkTheme as DarkThemePreset);
        }
      } catch (error) {
        if (__DEV__) console.error('Failed to load theme preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Update isDark when system color scheme or theme mode changes
  useEffect(() => {
    switch (themeMode) {
      case 'light':
        setIsDark(false);
        break;
      case 'dark':
        setIsDark(true);
        break;
      case 'system':
        setIsDark(systemColorScheme === 'dark');
        break;
    }
  }, [themeMode, systemColorScheme]);

  // Persist theme mode changes
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeModeState(mode);
    } catch (error) {
      if (__DEV__) console.error('Failed to save theme mode:', error);
    }
  };

  // Persist light theme changes
  const setLightTheme = async (preset: LightThemePreset) => {
    try {
      await AsyncStorage.setItem('lightTheme', preset);
      setLightThemeState(preset);
    } catch (error) {
      if (__DEV__) console.error('Failed to save light theme:', error);
    }
  };

  // Persist dark theme changes
  const setDarkTheme = async (preset: DarkThemePreset) => {
    try {
      await AsyncStorage.setItem('darkTheme', preset);
      setDarkThemeState(preset);
    } catch (error) {
      if (__DEV__) console.error('Failed to save dark theme:', error);
    }
  };

  // Legacy toggle function for backwards compatibility
  const toggleTheme = () => {
    switch (themeMode) {
      case 'light':
        setThemeMode('dark');
        break;
      case 'dark':
        setThemeMode('system');
        break;
      case 'system':
        setThemeMode('light');
        break;
    }
  };

  // Get current color scheme from preset
  const currentColors = isDark
    ? DARK_THEME_PRESETS[darkTheme].colors
    : LIGHT_THEME_PRESETS[lightTheme].colors;

  const value = {
    colors: currentColors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
    isDark,
    themeMode,
    lightTheme,
    darkTheme,
    setThemeMode,
    setLightTheme,
    setDarkTheme,
    toggleTheme,
  };

  // Don't render until preferences are loaded
  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};