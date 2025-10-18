import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobilePlatform } from '@/hooks/useIsMobile';

const ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.typelets.notes&pcampaignid=web_share';
const BANNER_DISMISSED_KEY = 'typelets_mobile_banner_dismissed';

export function MobileAppBanner() {
  const platform = useMobilePlatform();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed && platform) {
      setIsDismissed(false);
    }
  }, [platform]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  const handleDownload = () => {
    if (platform === 'android') {
      window.open(ANDROID_STORE_URL, '_blank');
    }
    // iOS will show "coming soon" message
  };

  if (isDismissed || !platform) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground fixed top-0 right-0 left-0 z-50 border-b shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 p-4">
        <div className="flex flex-1 items-center gap-3">
          <Smartphone className="h-6 w-6 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Get the Typelets Mobile App</p>
            <p className="text-xs opacity-90">
              {platform === 'android'
                ? 'Better experience on Android'
                : 'iOS app coming soon'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {platform === 'android' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="h-8 text-xs whitespace-nowrap"
            >
              Download
            </Button>
          ) : (
            <span className="text-xs font-medium opacity-90">Coming Soon</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
