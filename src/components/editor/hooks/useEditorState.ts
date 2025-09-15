import { useState, useCallback, useRef } from 'react';

export function useEditorState() {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>(
    'saved'
  );
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [baseFontSize, setBaseFontSize] = useState<string>('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  // Unified function to calculate and update word/character counts
  const updateCounts = useCallback((text: string) => {
    const trimmedText = text.trim();
    const words = trimmedText ? trimmedText.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);

    // Calculate reading time (average 200 words per minute)
    const minutes = Math.ceil(words / 200);
    setReadingTime(minutes);
  }, []);

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(200, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(50, prev - 10));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  return {
    // State
    saveStatus,
    setSaveStatus,
    wordCount,
    charCount,
    scrollPercentage,
    setScrollPercentage,
    readingTime,
    zoomLevel,
    baseFontSize,
    setBaseFontSize,

    // Refs
    saveTimeoutRef,
    lastContentRef,

    // Functions
    updateCounts,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
  };
}
