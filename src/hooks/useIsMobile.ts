import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < breakpoint;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Optional: Export a more detailed hook with breakpoints
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(() => {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 640) return 'mobile';
    if (width < 768) return 'tablet-sm';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('mobile');
      else if (width < 768) setBreakpoint('tablet-sm');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile' || breakpoint === 'tablet-sm',
    isTablet: breakpoint === 'tablet' || breakpoint === 'tablet-sm',
    isDesktop: breakpoint === 'desktop',
  };
}

/**
 * Detect if user is on an actual mobile device (not just small screen)
 * Checks user agent to distinguish mobile devices from desktop browsers
 */
export function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileUA =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    setIsMobile(isMobileUA);
  }, []);

  return isMobile;
}

/**
 * Detect specific mobile platform (iOS or Android)
 */
export function useMobilePlatform(): 'ios' | 'android' | null {
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;

    if (/iphone|ipad|ipod/i.test(userAgent.toLowerCase())) {
      setPlatform('ios');
    } else if (/android/i.test(userAgent.toLowerCase())) {
      setPlatform('android');
    }
  }, []);

  return platform;
}
