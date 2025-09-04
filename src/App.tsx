import { useEffect, useRef } from 'react';
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  SignIn,
  SignUp,
  useAuth,
  useUser,
} from '@clerk/clerk-react';
import Index from '@/components/common/SEO';
import { SEO_CONFIG } from '@/constants';
import { api } from '@/lib/api/api.ts';
import { fileService } from '@/services/fileService';
import { clearUserEncryptionData } from '@/lib/encryption';
import MainApp from '@/pages/MainApp';

function AppContent() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    api.setTokenProvider(getToken);
    fileService.setTokenProvider(getToken);
  }, [getToken]);

  useEffect(() => {
    if (previousUserId.current && !isSignedIn) {
      const userId = previousUserId.current;
      clearUserEncryptionData(userId);
      localStorage.removeItem(`test_encryption_${userId}`);
      localStorage.removeItem(`has_master_password_${userId}`);
      previousUserId.current = null;
    } else if (user?.id && isSignedIn) {
      previousUserId.current = user.id;
    }
  }, [isSignedIn, user?.id]);

  const isSignInPage = window.location.pathname === '/sign-in';
  const isSignUpPage = window.location.pathname === '/sign-up';

  if (isSignInPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignIn routing="path" path="/sign-in" />
      </div>
    );
  }

  if (isSignUpPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <SignUp routing="path" path="/sign-up" />
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <Index {...SEO_CONFIG.signedOut} />
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <Index {...SEO_CONFIG.signedIn} type="website" />
        <MainApp />
      </SignedIn>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
