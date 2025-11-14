/**
 * Theme color presets for customizable app themes
 */

export type LightThemePreset = 'default' | 'coolGray';
export type DarkThemePreset = 'trueBlack' | 'darkGray';

interface ColorScheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: ColorScheme;
}

// Light theme presets
export const LIGHT_THEME_PRESETS: Record<LightThemePreset, ThemePreset> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Classic clean white',
    colors: {
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
  },
  coolGray: {
    id: 'coolGray',
    name: 'Cool Gray',
    description: 'Modern Notion-style',
    colors: {
      background: '#f8f9fa',
      foreground: '#25262b',
      card: '#f1f3f5',
      cardForeground: '#25262b',
      primary: '#343a46',
      primaryForeground: '#f8f9fa',
      secondary: '#e9ecef',
      secondaryForeground: '#343a46',
      muted: '#e9ecef',
      mutedForeground: '#8e8e93',
      accent: '#e9ecef',
      accentForeground: '#343a46',
      destructive: '#dc3545',
      destructiveForeground: '#f8f9fa',
      border: '#d0d4d8',
      input: '#e5e8eb',
      ring: '#b5b5b5',
    },
  },
};

// Dark theme presets
export const DARK_THEME_PRESETS: Record<DarkThemePreset, ThemePreset> = {
  trueBlack: {
    id: 'trueBlack',
    name: 'True Black',
    description: 'OLED-friendly pure black',
    colors: {
      background: '#0a0a0a',
      foreground: '#fcfcfc',
      card: '#1a1a1a',
      cardForeground: '#fcfcfc',
      primary: '#ebebeb',
      primaryForeground: '#1a1a1a',
      secondary: '#2a2a2a',
      secondaryForeground: '#fcfcfc',
      muted: '#2a2a2a',
      mutedForeground: '#b5b5b5',
      accent: '#2a2a2a',
      accentForeground: '#fcfcfc',
      destructive: '#b91c1c',
      destructiveForeground: '#fcfcfc',
      border: 'rgba(255, 255, 255, 0.1)',
      input: 'rgba(255, 255, 255, 0.15)',
      ring: '#8e8e93',
    },
  },
  darkGray: {
    id: 'darkGray',
    name: 'Dark Gray',
    description: 'Dark gray theme',
    colors: {
      background: '#181818',
      foreground: '#fcfcfc',
      card: '#252525',
      cardForeground: '#fcfcfc',
      primary: '#ebebeb',
      primaryForeground: '#252525',
      secondary: '#323232',
      secondaryForeground: '#fcfcfc',
      muted: '#3a3a3a',
      mutedForeground: '#b5b5b5',
      accent: '#323232',
      accentForeground: '#fcfcfc',
      destructive: '#b91c1c',
      destructiveForeground: '#fcfcfc',
      border: 'rgba(255, 255, 255, 0.1)',
      input: 'rgba(255, 255, 255, 0.15)',
      ring: '#8e8e93',
    },
  },
};
