import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { styles } from './styles';

interface LoadingViewProps {
  isNewSetup: boolean;
}

/**
 * Loading view component
 * Shows during PBKDF2 key derivation
 */
export function LoadingView({ isNewSetup }: LoadingViewProps) {
  const theme = useTheme();

  return (
    <View style={styles.loadingContent}>
      <View style={styles.loadingCenter}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ marginBottom: 24 }}
        />

        <Text style={[styles.loadingTitle, { color: theme.colors.foreground }]}>
          Securing Your Data
        </Text>

        <View
          style={[
            styles.notice,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.noticeText, { color: theme.colors.foreground }]}>
            {isNewSetup
              ? 'We are generating military-grade encryption with 250,000 security iterations to protect your notes. Please wait and do not close the app.'
              : 'Verifying your master password and loading encryption keys. This may take a moment.'}
          </Text>
          <Text
            style={[
              styles.noticeText,
              { color: theme.colors.foreground, marginTop: 12 },
            ]}
          >
            This can take up to 5 minutes to complete.
          </Text>
        </View>
      </View>
    </View>
  );
}
