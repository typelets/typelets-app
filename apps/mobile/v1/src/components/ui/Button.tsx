import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle,ViewStyle } from 'react-native';

import { useTheme } from '../../theme';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: ViewStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  style,
  textStyle,
  onPress,
  disabled = false,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const getVariantStyles = (): {
    backgroundColor: string;
    color: string;
    borderWidth?: number;
    borderColor?: string;
    textDecorationLine?: 'underline' | 'none' | 'line-through' | 'underline line-through';
  } => {
    switch (variant) {
      case 'destructive':
        return {
          backgroundColor: theme.colors.destructive,
          color: theme.colors.destructiveForeground,
        };
      case 'outline':
        return {
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: theme.colors.input,
          color: theme.colors.foreground,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          color: theme.colors.secondaryForeground,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.foreground,
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
          color: theme.colors.primary,
          textDecorationLine: 'underline',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: theme.colors.primaryForeground,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { height: 36, paddingHorizontal: 12 };
      case 'lg':
        return { height: 44, paddingHorizontal: 32 };
      case 'icon':
        return { height: 40, width: 40, paddingHorizontal: 0 };
      default:
        return { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth || 0,
          borderColor: variantStyles.borderColor,
        },
        sizeStyles,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text
        style={[
          styles.baseText,
          {
            color: variantStyles.color,
            textDecorationLine: variantStyles.textDecorationLine,
          },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  baseText: {
    fontWeight: '600',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});