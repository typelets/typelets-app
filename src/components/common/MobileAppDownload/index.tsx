import { Lock, Zap, Cloud, ExternalLink } from 'lucide-react';
import { useMobilePlatform } from '@/hooks/useIsMobile';
import { useState } from 'react';

const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.typelets.notes&pcampaignid=web_share';

export function MobileAppDownload() {
  const platform = useMobilePlatform();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center p-6 pt-8">
      <div className={`w-full max-w-md space-y-6 text-center transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
        {/* App Icon/Logo */}
        <div className="mx-auto flex h-32 w-32 items-center justify-center">
          <img
            src="/app-icon.png"
            alt="Typelets Logo"
            className="h-full w-full"
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Title */}
        <div className="-mt-2 space-y-2">
          <h1 className="text-foreground text-3xl font-bold">Typelets</h1>
          <p className="text-muted-foreground text-lg">
            Secure, encrypted note-taking
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 py-6">
          <div className="flex items-start gap-3 text-left">
            <div className="bg-muted rounded-lg p-2">
              <Lock className="text-foreground h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-semibold">End-to-End Encrypted</h3>
              <p className="text-muted-foreground text-sm">
                Your notes are encrypted on your device
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="bg-muted rounded-lg p-2">
              <Zap className="text-foreground h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-semibold">Fast & Intuitive</h3>
              <p className="text-muted-foreground text-sm">
                Native performance and smooth experience
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-left">
            <div className="bg-muted rounded-lg p-2">
              <Cloud className="text-foreground h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-semibold">Sync Everywhere</h3>
              <p className="text-muted-foreground text-sm">
                Access your notes across all devices
              </p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="space-y-4 pt-4">
          {platform === 'android' ? (
            <a
              href={ANDROID_STORE_URL}
              className="inline-block"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-20 w-auto"
              />
            </a>
          ) : platform === 'ios' ? (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-foreground font-semibold">iOS App Coming Soon</p>
            </div>
          ) : (
            <a
              href={ANDROID_STORE_URL}
              className="inline-block"
            >
              <img
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play"
                className="h-20 w-auto"
              />
            </a>
          )}
        </div>

        {/* Web Version Link */}
        <div className="border-border bg-card mt-8 rounded-lg border p-4">
          <p className="text-foreground mb-3 text-sm font-semibold">
            For the best experience, use the Typelets mobile application.
          </p>
          <a
            href="/?web=true"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Continue to Web Version
          </a>
        </div>
      </div>
    </div>
  );
}
