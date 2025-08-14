import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { hasMasterPassword, isMasterPasswordUnlocked } from '@/lib/encryption';

export function useMasterPassword() {
  const { user } = useUser();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    const checkMasterPassword = () => {
      const hasPassword = hasMasterPassword(user.id);
      const isUnlocked = isMasterPasswordUnlocked(user.id);

      // Needs unlock if has password but not unlocked
      setNeedsUnlock(hasPassword && !isUnlocked);
      setIsChecking(false);
    };

    checkMasterPassword();
  }, [user]);

  const handleUnlockSuccess = () => {
    setNeedsUnlock(false);
    // Reload the page to refresh all notes with the new key
    window.location.reload();
  };

  return {
    needsUnlock,
    isChecking,
    userId: user?.id,
    handleUnlockSuccess,
  };
}
