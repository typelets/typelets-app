import { useRouter, Stack } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { clearUserEncryptionData } from '@/src/lib/encryption';
import SettingsScreen from '@/src/screens/SettingsScreen';

export default function SettingsPage() {
  const router = useRouter();
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
      // Still attempt to sign out even if clearing encryption data fails
      await signOut();
      if (__DEV__) {
        console.log('✅ Logout completed after error - AppWrapper will handle navigation');
      }
    }
  };

  // Create navigation object
  const navigation = {
    navigate: (screen: string, params?: any) => {
      if (__DEV__) {
        console.log(`Navigate to ${screen} with params:`, params);
      }
    },
    goBack: () => {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsScreen navigation={navigation} onLogout={handleLogout} />
    </>
  );
}
