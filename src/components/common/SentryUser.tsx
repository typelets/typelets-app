import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import * as Sentry from '@sentry/react';

/**
 * Component that syncs Clerk user data with Sentry for better error tracking
 */
export function SentryUser() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Set user context in Sentry
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || undefined,
      });
    } else if (isLoaded && !user) {
      // Clear user context when logged out
      Sentry.setUser(null);
    }
  }, [user, isLoaded]);

  return null; // This component doesn't render anything
}
