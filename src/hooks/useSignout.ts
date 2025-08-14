import { useClerk, useUser } from '@clerk/clerk-react';
import { clearUserEncryptionData } from '@/lib/encryption';
import { useCallback } from 'react';

export function useSignout() {
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignout = useCallback(async () => {
    // Clear encryption data before signing out
    if (user?.id) {
      // Clear all encryption-related data for this user
      clearUserEncryptionData(user.id);

      // Also clear the test encryption and master password flag
      localStorage.removeItem(`test_encryption_${user.id}`);
      localStorage.removeItem(`has_master_password_${user.id}`);
    }

    // Perform the actual signout
    await signOut();
  }, [signOut, user?.id]);

  return { signOut: handleSignout };
}
