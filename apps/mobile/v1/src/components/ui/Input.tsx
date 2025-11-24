import React, { forwardRef } from 'react';
import { Platform,StyleProp, TextInput, TextInputProps, TextStyle } from 'react-native';

import { useTheme } from '../../theme';

export interface InputProps extends TextInputProps {
  style?: StyleProp<TextStyle>;
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
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 0,
          fontSize: 16,
          color: theme.colors.foreground,
          backgroundColor: theme.colors.background,
          height: 48,
          textAlignVertical: 'center',
        },
        style,
      ]}
      placeholderTextColor={theme.colors.mutedForeground}
      {...props}
    />
  );
});

Input.displayName = 'Input';