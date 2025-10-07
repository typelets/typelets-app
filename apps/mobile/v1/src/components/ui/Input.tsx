import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface InputProps extends TextInputProps {
  style?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({ style, ...props }, ref) => {
  const theme = useTheme();

  return (
    <TextInput
      ref={ref}
      style={[
        {
          borderWidth: 1,
          borderColor: theme.colors.input,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.lg, // 12px
          paddingVertical: theme.spacing.md, // 8px
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.foreground,
          backgroundColor: theme.colors.background,
          minHeight: 40,
        },
        style,
      ]}
      placeholderTextColor={theme.colors.mutedForeground}
      {...props}
    />
  );
});

Input.displayName = 'Input';