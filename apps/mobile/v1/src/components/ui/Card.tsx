import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { NOTE_CARD } from '../../constants/ui';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: NOTE_CARD.BORDER_RADIUS,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View
      style={[
        {
          padding: 16,
          paddingBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardTitle({ children }: CardTitleProps) {
  const theme = useTheme();

  return (
    <Text
      style={{
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.cardForeground,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

export function CardDescription({ children }: CardDescriptionProps) {
  const theme = useTheme();

  return (
    <Text
      style={{
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.mutedForeground,
      }}
    >
      {children}
    </Text>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style }: CardFooterProps) {
  return (
    <View
      style={[
        {
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}