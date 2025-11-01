/**
 * Offline Indicator - Floating Button
 * Shows orange floating button when offline
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useNetworkStatus } from '../services/network/networkManager';
import { useTheme } from '../theme';

export const OfflineIndicator: React.FC = () => {
  const theme = useTheme();
  const { isOnline } = useNetworkStatus();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#FF9500' }]}>
      <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
      <Text style={styles.text}>Offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
