import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet,Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '../theme';

interface BottomNavigationProps {
  activeTab?: 'folders' | 'add' | 'settings';
}

export default function BottomNavigation({ activeTab = 'folders' }: BottomNavigationProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.bottomNav, {
      backgroundColor: theme.colors.card,
      borderTopColor: theme.colors.border,
      borderLeftColor: theme.colors.border,
      borderRightColor: theme.colors.border,
      borderBottomColor: theme.colors.border,
      borderColor: theme.colors.border,
    }]}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/')}
      >
        <Ionicons
          name="folder"
          size={20}
          color={activeTab === 'folders' ? theme.colors.primary : theme.colors.mutedForeground}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/edit-note')}
      >
        <View style={[styles.addButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.addText, { color: theme.colors.primaryForeground }]}>+</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/settings')}
      >
        <View style={[styles.avatar, { backgroundColor: activeTab === 'settings' ? theme.colors.primary : theme.colors.mutedForeground }]}>
          <Ionicons
            name="person"
            size={12}
            color={activeTab === 'settings' ? theme.colors.primaryForeground : theme.colors.background}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    height: 50,
    paddingBottom: 6,
    paddingTop: 6,
    marginBottom: 20,
    marginHorizontal: 16,
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});