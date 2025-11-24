import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearUserEncryptionData } from '@/src/lib/encryption';
import { apiCache } from '@/src/services/api/cache';
import { clearAllCacheMetadata, clearCachedFolders, clearCachedNotes } from '@/src/services/api/databaseCache';
import SettingsScreen from '@/src/screens/Settings';

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { user } = useUser();

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear encryption data first
      if (user?.id) {
        if (__DEV__) {
          console.log('🔓 Clearing encryption data for user:', user.id);
        }
        await clearUserEncryptionData(user.id);
        if (__DEV__) {
          console.log('✅ Encryption data cleared successfully');
        }
      }

      // Clear master password from AsyncStorage
      if (__DEV__) {
        console.log('🔑 Clearing master password');
      }
      await AsyncStorage.removeItem('masterPasswordHash');
      if (__DEV__) {
        console.log('✅ Master password cleared');
      }

      // Clear all caches
      if (__DEV__) {
        console.log('🗑️ Clearing all caches');
      }

      // Clear SQLite database caches
      await clearCachedNotes();
      await clearCachedFolders();
      await clearAllCacheMetadata();

      // Clear in-memory API cache
      apiCache.clearAll();

      // Clear AsyncStorage caches (notes previews, etc.)
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key =>
        key.startsWith('notes-cache-') ||
        key.startsWith('folders-cache-') ||
        key.startsWith('viewMode')
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      if (__DEV__) {
        console.log('✅ All caches cleared');
      }

      // Sign out from Clerk
      await signOut();

      // No need to navigate - AppWrapper will automatically handle showing AuthScreen
      if (__DEV__) {
        console.log('✅ Logout completed - AppWrapper will handle navigation');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Logout error:', error);
      }
      // Still attempt to sign out even if clearing data fails
      await signOut();
      if (__DEV__) {
        console.log('✅ Logout completed after error - AppWrapper will handle navigation');
      }
    }
  };

  return <SettingsScreen onLogout={handleLogout} />;
}
