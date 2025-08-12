import { useEffect } from 'react';
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  SignIn,
  SignUp,
  useAuth,
} from '@clerk/clerk-react';
import Index from '@/components/common/SEO';
import { SEO_CONFIG } from '@/constants';
import { api } from '@/lib/api/api.ts';
import MainApp from '@/pages/MainApp';

function AppContent() {
  const { getToken } = useAuth();

  useEffect(() => {
    api.setTokenProvider(getToken);
  }, [getToken]);

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
