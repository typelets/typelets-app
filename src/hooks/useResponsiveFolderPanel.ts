import { useState, useEffect, useCallback } from 'react';

// Breakpoint for auto-collapsing folders (1024px = typical tablet/small desktop)
const FOLDER_COLLAPSE_BREAKPOINT = 1024;
// Breakpoint for auto-collapsing notes panel (1280px = for larger screens with 3 panels)
const NOTES_COLLAPSE_BREAKPOINT = 1280;

export function useResponsiveFolderPanel(initialState = true) {
  // Track if user has manually toggled (to respect user preference)
  const [userHasToggled, setUserHasToggled] = useState(false);
  
  // Track the actual open/closed state
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // Auto-collapse on smaller screens initially
      return window.innerWidth >= FOLDER_COLLAPSE_BREAKPOINT && initialState;
    }
    return initialState;
  });

  // Track previous window width to detect crossing breakpoint
  const [previousWidth, setPreviousWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : FOLDER_COLLAPSE_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      
      // Only auto-toggle if user hasn't manually toggled
      if (!userHasToggled) {
        const wasAboveBreakpoint = previousWidth >= FOLDER_COLLAPSE_BREAKPOINT;
        const isAboveBreakpoint = currentWidth >= FOLDER_COLLAPSE_BREAKPOINT;
        
        // Auto-collapse when crossing breakpoint from larger to smaller
        if (wasAboveBreakpoint && !isAboveBreakpoint) {
          setIsOpen(false);
        }
        // Auto-expand when crossing breakpoint from smaller to larger
        else if (!wasAboveBreakpoint && isAboveBreakpoint) {
          setIsOpen(true);
        }
      }
      
      setPreviousWidth(currentWidth);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userHasToggled, previousWidth]);

  // Manual toggle function that respects user preference
  const toggleFolderPanel = useCallback((forceState?: boolean) => {
    setUserHasToggled(true);
    setIsOpen(prev => forceState !== undefined ? forceState : !prev);
    
    // Reset user toggle flag after 5 seconds to allow auto-behavior again
    setTimeout(() => {
      setUserHasToggled(false);
    }, 5000);
  }, []);

  // Reset function to clear user preference
  const resetToAuto = useCallback(() => {
    setUserHasToggled(false);
    const shouldBeOpen = window.innerWidth >= FOLDER_COLLAPSE_BREAKPOINT;
    setIsOpen(shouldBeOpen);
  }, []);

  return {
    isOpen,
    toggleFolderPanel,
    resetToAuto,
    isAutoCollapsed: window.innerWidth < FOLDER_COLLAPSE_BREAKPOINT && !userHasToggled,
  };
}

export function useResponsiveNotesPanel(initialState = true) {
  // Track if user has manually toggled (to respect user preference)
  const [userHasToggled, setUserHasToggled] = useState(false);
  
  // Track the actual open/closed state
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      // Auto-collapse on smaller screens initially
      return window.innerWidth >= NOTES_COLLAPSE_BREAKPOINT && initialState;
    }
    return initialState;
  });

  // Track previous window width to detect crossing breakpoint
  const [previousWidth, setPreviousWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : NOTES_COLLAPSE_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      
      // Only auto-toggle if user hasn't manually toggled
      if (!userHasToggled) {
        const wasAboveBreakpoint = previousWidth >= NOTES_COLLAPSE_BREAKPOINT;
        const isAboveBreakpoint = currentWidth >= NOTES_COLLAPSE_BREAKPOINT;
        
        // Auto-collapse when crossing breakpoint from larger to smaller
        if (wasAboveBreakpoint && !isAboveBreakpoint) {
          setIsOpen(false);
        }
        // Auto-expand when crossing breakpoint from smaller to larger
        else if (!wasAboveBreakpoint && isAboveBreakpoint) {
          setIsOpen(true);
        }
      }
      
      setPreviousWidth(currentWidth);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userHasToggled, previousWidth]);

  // Manual toggle function that respects user preference
  const toggleNotesPanel = useCallback((forceState?: boolean) => {
    setUserHasToggled(true);
    setIsOpen(prev => forceState !== undefined ? forceState : !prev);
    
    // Reset user toggle flag after 5 seconds to allow auto-behavior again
    setTimeout(() => {
      setUserHasToggled(false);
    }, 5000);
  }, []);

  // Reset function to clear user preference
  const resetToAuto = useCallback(() => {
    setUserHasToggled(false);
    const shouldBeOpen = window.innerWidth >= NOTES_COLLAPSE_BREAKPOINT;
    setIsOpen(shouldBeOpen);
  }, []);

  return {
    isOpen,
    toggleNotesPanel,
    resetToAuto,
    isAutoCollapsed: window.innerWidth < NOTES_COLLAPSE_BREAKPOINT && !userHasToggled,
  };
}