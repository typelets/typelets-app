import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/theme';

interface EmptyStateProps {
  searchQuery?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery }) => {
  const theme = useTheme();

  if (!searchQuery) return null;

  return (
    <View style={styles.emptySearchState}>
      <Text style={[styles.emptySearchText, { color: theme.colors.mutedForeground }]}>
        No notes found. Try a different search term.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptySearchState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySearchText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
