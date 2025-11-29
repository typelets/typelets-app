import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { hasMasterPassword, isMasterPasswordUnlocked } from '@/lib/encryption';

export function useMasterPassword() {
  const { user } = useUser();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect -- Check encryption status on user change */
  useEffect(() => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    const checkMasterPassword = () => {
      const hasPassword = hasMasterPassword(user.id);
      const isUnlocked = isMasterPasswordUnlocked(user.id);

      // Needs unlock if:
      // 1. User has password but not unlocked (returning user)
      // 2. User doesn't have password at all (new user needs to set one up)
      setNeedsUnlock(!hasPassword || (hasPassword && !isUnlocked));
      setIsChecking(false);
    };

    checkMasterPassword();
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
