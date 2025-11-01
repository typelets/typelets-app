import React, { useEffect,useState } from 'react';
import { ActivityIndicator,Text, View } from 'react-native';

import { useTheme } from '../../theme';
import { styles } from './styles';

interface LoadingViewProps {
  isNewSetup: boolean;
  stage?: 'securing' | 'caching';
  cacheMode?: 'encrypted' | 'decrypted';
}

/**
 * Loading view component
 * Shows during PBKDF2 key derivation and note caching
 */
export function LoadingView({ isNewSetup, stage = 'securing', cacheMode = 'encrypted' }: LoadingViewProps) {
  const theme = useTheme();
  const [dots, setDots] = useState('');

  // Animate dots to show the app is not frozen
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Content for "Securing Your Data" stage
  if (stage === 'securing') {
    return (
      <View style={styles.loadingContent}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={{ marginBottom: 24 }}
          />

          <Text style={[styles.loadingTitle, { color: theme.colors.foreground }]}>
            Securing Your Data{dots}
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
                { color: theme.colors.foreground, marginTop: 12, fontWeight: '600' },
              ]}
            >
              This process can take 2-5 minutes. The app may appear frozen but it&apos;s working{dots}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Content for "Caching Your Data" stage
  return (
    <View style={styles.loadingContent}>
      <View style={styles.loadingCenter}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ marginBottom: 24 }}
        />

        <Text style={[styles.loadingTitle, { color: theme.colors.foreground }]}>
          Caching Your Data{dots}
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
            {cacheMode === 'decrypted'
              ? 'Downloading and decrypting all your notes for instant offline access. This improves performance but stores decrypted content locally.'
              : 'Downloading all your notes in encrypted form for offline access. Notes will be decrypted on-demand for better security.'}
          </Text>
          <Text
            style={[
              styles.noticeText,
              { color: theme.colors.foreground, marginTop: 12, fontWeight: '600' },
            ]}
          >
            {cacheMode === 'decrypted'
              ? `This may take 5-10 seconds${dots}`
              : `This should only take a few seconds${dots}`}
          </Text>
        </View>
      </View>
    </View>
  );
}
