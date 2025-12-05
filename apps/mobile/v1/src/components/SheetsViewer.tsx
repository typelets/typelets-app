import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface SheetsViewerProps {
  content: string;
  theme: {
    colors: {
      foreground: string;
      mutedForeground: string;
      border: string;
      muted: string;
    };
    isDark: boolean;
  };
  onLoaded?: () => void;
  hideLoadingOverlay?: boolean;
}

/**
 * SheetsViewer - Read-only spreadsheet viewer for mobile
 * Uses Univer library via WebView to render spreadsheets exactly as they appear on web
 */
// Fun loading messages that appear progressively
const LOADING_MESSAGES = [
  'Loading Sheet',
  'Crunching numbers',
  'Almost there',
  'Worth the wait',
];

export function SheetsViewer({ content, theme, onLoaded, hideLoadingOverlay }: SheetsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  // Progress through loading messages
  useEffect(() => {
    if (!loading) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // After 1 second, show second message
    timers.push(setTimeout(() => setMessageIndex(1), 1000));
    // After 2 seconds, show third message
    timers.push(setTimeout(() => setMessageIndex(2), 2000));
    // After 3.5 seconds, show fourth message
    timers.push(setTimeout(() => setMessageIndex(3), 3500));

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Reset message index when loading starts
  useEffect(() => {
    if (loading) {
      setMessageIndex(0);
    }
  }, [loading]);

  // Escape content for safe inclusion in HTML
  const escapedContent = useMemo(() => {
    return content
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }, [content]);

  const fullHtml = useMemo(() => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/@univerjs/preset-sheets-core/lib/index.css">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: ${theme.isDark ? 'rgb(27, 28, 31)' : '#f3f3f3'};
        }
        body {
          width: 100%;
          height: calc(100% - 24px);
          overflow: hidden;
          background-color: ${theme.isDark ? '#0a0a0a' : '#ffffff'};
          margin-bottom: 24px;
        }
        #app {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: ${theme.colors.mutedForeground};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #ef4444;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          text-align: center;
        }
        /* Hide toolbar and formula bar */
        .univer-toolbar,
        .univer-formula-bar,
        [class*="toolbar"],
        [class*="formula-bar"] {
          display: none !important;
        }
        /* Hide zoom controls and status bar */
        [class*="zoom-slider"],
        [class*="zoomSlider"],
        [class*="zoom-container"],
        [class*="zoomContainer"],
        [class*="zoom"],
        [class*="Zoom"],
        [class*="status-bar"],
        [class*="statusbar"],
        [class*="StatusBar"],
        [class*="footer"],
        [class*="Footer"],
        input[type="range"] {
          display: none !important;
        }
        /* Hide the entire bottom status/info bar except sheet tabs */
        .univer-sheet-bar > *:not([class*="sheet-tab"]):not([class*="sheetTab"]):not([class*="tab-bar"]):not([class*="tabBar"]) {
          display: none !important;
        }
        /* Override ALL fonts to use system font */
        *, *::before, *::after {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .univer-font-sans,
        .univer-font-mono,
        [class*="univer-font"] {
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        /* Make scrollbars thicker and more visible for touch */
        *, *::before, *::after {
          scrollbar-width: auto !important;
          scrollbar-color: ${theme.isDark ? 'rgba(255,255,255,0.5) rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4) rgba(0,0,0,0.1)'} !important;
        }
        ::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
        }
        ::-webkit-scrollbar-track {
          background: ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} !important;
          border-radius: 7px !important;
        }
        ::-webkit-scrollbar-thumb {
          background: ${theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} !important;
          border-radius: 7px !important;
          border: 2px solid transparent !important;
          background-clip: padding-box !important;
        }
        ::-webkit-scrollbar-corner {
          background: transparent !important;
        }
        /* Override Univer's thin scrollbar */
        .univer-scrollbar-thin::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
        }
        [class*="scrollbar"]::-webkit-scrollbar {
          width: 14px !important;
          height: 14px !important;
        }
        /* Hide permission dialogs only, allow sheet list popup */
        .univer-confirm-dialog,
        .univer-alert {
          display: none !important;
        }
        /* Ensure popups and menus appear above overlay */
        [class*="popup"],
        [class*="Popup"],
        [class*="menu"],
        [class*="Menu"],
        [class*="dropdown"],
        [class*="Dropdown"],
        [class*="popover"],
        [class*="Popover"] {
          z-index: 1000 !important;
          pointer-events: auto !important;
        }
        /* Ensure sheet bar (bottom tabs) is visible with safe area padding */
        .univer-sheet-bar,
        [class*="sheet-bar"],
        [class*="sheetbar"] {
          display: flex !important;
          visibility: visible !important;
          margin-bottom: 0 !important;
          padding-bottom: 16px !important;
          min-height: 44px !important;
          box-sizing: content-box !important;
        }
        /* Hide add sheet button and sheet menu button in view mode */
        [class*="add-sheet"],
        [class*="addSheet"] {
          display: none !important;
        }
        /* Make footer buttons bigger for touch */
        footer button {
          min-height: 40px !important;
          min-width: 40px !important;
          font-size: 14px !important;
        }
        footer button svg {
          width: 24px !important;
          height: 24px !important;
        }
        /* Make arrow buttons bigger */
        footer button svg.univerjs-icon-more-icon {
          width: 28px !important;
          height: 28px !important;
        }
        /* Prevent keyboard from appearing */
        input, textarea, [contenteditable] {
          pointer-events: none !important;
          opacity: 0 !important;
          position: absolute !important;
          left: -9999px !important;
        }
        * {
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        /* Make sheet tabs bigger and centered */
        [data-u-comp="slide-tab-item"] {
          min-height: 40px !important;
          font-size: 16px !important;
          align-items: center !important;
          justify-content: center !important;
        }
        [data-u-comp="slide-tab-item"] span {
          font-size: 16px !important;
        }
        [data-u-comp="slide-tab-bar"] {
          align-items: center !important;
          height: 100% !important;
        }
        /* Make footer section taller to fit bigger buttons */
        footer section[data-range-selector] {
          height: 48px !important;
          min-height: 48px !important;
        }
        /* Hide non-functional dropdown buttons (sheet menu and zoom percentage) */
        [data-slot="dropdown-menu-trigger"] {
          display: none !important;
        }
        /* Hide add sheet button (the one with plus/increase icon) */
        footer button:has(.univerjs-icon-increase-icon):first-of-type {
          display: none !important;
        }
        footer button .univerjs-icon-increase-icon {
          /* Target the add button specifically by checking parent context */
        }
        /* More specific: hide first button in the left section of footer */
        footer > section > div:first-child > div:first-child > button:first-child {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <div id="app"></div>

      <!-- Load dependencies in correct order -->
      <script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/rxjs/dist/bundles/rxjs.umd.min.js"></script>
      <script src="https://unpkg.com/@univerjs/presets/lib/umd/index.js"></script>
      <script src="https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/index.js"></script>
      <script src="https://unpkg.com/@univerjs/preset-sheets-core/lib/umd/locales/en-US.js"></script>
      <script>
        (function() {
          const appEl = document.getElementById('app');

          try {
            // Parse the workbook data
            const workbookData = JSON.parse('${escapedContent}');

            // Clear loading message
            appEl.innerHTML = '';

            // Access globals - UniverPresets, UniverCore, UniverPresetSheetsCore
            const { createUniver } = UniverPresets;
            const { LocaleType, mergeLocales } = UniverCore;
            const { UniverSheetsCorePreset } = UniverPresetSheetsCore;
            const localeData = UniverPresetSheetsCoreEnUS;

            const univerInstance = createUniver({
              locale: LocaleType.EN_US,
              locales: {
                [LocaleType.EN_US]: mergeLocales(localeData),
              },
              darkMode: ${theme.isDark},
              presets: [
                UniverSheetsCorePreset({
                  container: appEl,
                  footer: {
                    sheetBar: true,      // Keep sheet tabs for switching
                    statisticBar: false, // Hide statistics
                    menus: false,        // Hide bottom menus (gridlines button etc)
                    zoomSlider: false    // Hide zoom slider
                  },
                  sheets: {
                    scrollConfig: {
                      barSize: 0,
                      enableHorizontal: false,
                      enableVertical: false
                    }
                  }
                }),
              ],
            });

            const { univerAPI } = univerInstance;

            // Create workbook with the data
            const workbook = univerAPI.createWorkbook(workbookData);

            // Prevent keyboard from appearing - blur any focused elements and disable all inputs
            function preventKeyboard() {
              if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
              }
              // Make all inputs readonly and disable them
              document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
                el.setAttribute('readonly', 'true');
                el.setAttribute('disabled', 'true');
                if (el.contentEditable === 'true') {
                  el.contentEditable = 'false';
                }
                el.blur();
              });
            }

            // Run immediately and on short intervals during load
            preventKeyboard();
            setTimeout(preventKeyboard, 100);
            setTimeout(preventKeyboard, 300);
            setTimeout(preventKeyboard, 500);
            setTimeout(preventKeyboard, 1000);

            // Use MutationObserver to catch dynamically created inputs
            const observer = new MutationObserver((mutations) => {
              preventKeyboard();
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // Also prevent focus on the entire document
            document.addEventListener('focus', (e) => {
              if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true')) {
                e.target.blur();
                e.preventDefault();
              }
            }, true);

            // Get workbook info for scroll commands
            const unitId = workbook ? workbook.getId() : null;
            const getSheetId = () => workbook ? workbook.getActiveSheet()?.getSheetId() : null;

            // Block ALL commands except scrolling, zoom, and sheet switching - true read-only
            univerAPI.onBeforeCommandExecute((command) => {
              // Log command for debugging
              console.log('Command:', command.id);

              // Allow scroll, zoom, sheet switching, and menu operations
              if (command.id === 'sheet.operation.set-scroll' ||
                  command.id === 'sheet.operation.set-zoom-ratio' ||
                  command.id.includes('zoom') ||
                  command.id.includes('Zoom') ||
                  command.id.includes('sheet') ||
                  command.id.includes('Sheet') ||
                  command.id.includes('activate') ||
                  command.id.includes('Activate') ||
                  command.id.includes('menu') ||
                  command.id.includes('Menu') ||
                  command.id.includes('popup') ||
                  command.id.includes('Popup') ||
                  command.id.includes('dialog') ||
                  command.id.includes('Dialog') ||
                  command.id.includes('open') ||
                  command.id.includes('Open') ||
                  command.id.includes('show') ||
                  command.id.includes('Show') ||
                  command.id.includes('list') ||
                  command.id.includes('List')) {
                return;
              }
              throw new Error('Read-only');
            });

            // After Univer renders, add hybrid touch handling (tap to select, swipe to scroll)
            setTimeout(() => {
              // Get the canvas element for forwarding tap events
              const canvas = document.querySelector('canvas');

              // Prevent keyboard from appearing on footer button clicks
              const footer = document.querySelector('footer');
              if (footer) {
                footer.addEventListener('click', (e) => {
                  if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.blur();
                  }
                }, true);
              }

              // Create touch overlay for hybrid gesture handling
              const overlay = document.createElement('div');
              overlay.id = 'touch-overlay';
              overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:80px;z-index:50;';
              appEl.style.position = 'relative';
              appEl.appendChild(overlay);

              // Scroll state
              let scrollX = 0;
              let scrollY = 0;
              let velocityX = 0;
              let velocityY = 0;
              let lastX = 0;
              let lastY = 0;
              let lastTime = 0;
              let momentumId = null;

              // Gesture detection state
              let touchStartX = 0;
              let touchStartY = 0;
              let touchStartTime = 0;
              let hasMoved = false;
              let gestureMode = null; // 'tap', 'scroll', 'pinch'

              // Pinch zoom state
              let initialPinchDistance = 0;
              let currentZoom = 1;

              // Thresholds for gesture detection
              const TAP_MAX_DURATION = 300; // ms - max time for a tap
              const TAP_MAX_DISTANCE = 10;  // px - max movement for a tap

              // iOS-like scroll physics
              const DECELERATION = 0.97;           // Faster deceleration for snappier feel
              const MIN_VELOCITY = 0.5;            // Higher threshold to stop momentum
              const MOMENTUM_VELOCITY_THRESHOLD = 2.5; // Must be moving this fast to trigger momentum
              const VELOCITY_DECAY_ON_SLOW = 0.7;  // How much to reduce velocity when moving slow

              // Track velocity samples for better release velocity calculation
              let velocitySamples = [];
              const MAX_SAMPLES = 5;

              function doScroll() {
                const sheetId = getSheetId();
                if (unitId && sheetId) {
                  try {
                    univerAPI.executeCommand('sheet.operation.set-scroll', {
                      unitId: unitId,
                      sheetId: sheetId,
                      sheetViewStartRow: 0,
                      sheetViewStartColumn: 0,
                      offsetX: scrollX,
                      offsetY: scrollY
                    });
                  } catch(e) {}
                }
              }

              function momentumScroll() {
                if (Math.abs(velocityX) < MIN_VELOCITY && Math.abs(velocityY) < MIN_VELOCITY) {
                  momentumId = null;
                  return;
                }
                velocityX *= DECELERATION;
                velocityY *= DECELERATION;
                scrollX = Math.max(0, scrollX + velocityX);
                scrollY = Math.max(0, scrollY + velocityY);
                doScroll();
                momentumId = requestAnimationFrame(momentumScroll);
              }

              // Calculate release velocity from recent samples (like iOS does)
              function getReleaseVelocity() {
                if (velocitySamples.length < 2) return { vx: 0, vy: 0 };

                // Use weighted average of recent samples, favoring more recent ones
                let totalWeight = 0;
                let vx = 0;
                let vy = 0;

                for (let i = 0; i < velocitySamples.length; i++) {
                  const weight = (i + 1); // More recent = higher weight
                  vx += velocitySamples[i].vx * weight;
                  vy += velocitySamples[i].vy * weight;
                  totalWeight += weight;
                }

                return {
                  vx: vx / totalWeight,
                  vy: vy / totalWeight
                };
              }

              function getPinchDistance(touches) {
                const dx = touches[0].pageX - touches[1].pageX;
                const dy = touches[0].pageY - touches[1].pageY;
                return Math.sqrt(dx * dx + dy * dy);
              }

              // Forward tap to canvas by temporarily hiding overlay
              function forwardTapToCanvas(x, y) {
                // Temporarily hide overlay to let the tap through
                overlay.style.pointerEvents = 'none';

                // Find element at tap position and simulate click
                const elementAtPoint = document.elementFromPoint(x, y);
                if (elementAtPoint) {
                  // Dispatch touch events
                  const touchObj = new Touch({
                    identifier: Date.now(),
                    target: elementAtPoint,
                    clientX: x,
                    clientY: y,
                    pageX: x,
                    pageY: y,
                    radiusX: 2.5,
                    radiusY: 2.5,
                    rotationAngle: 0,
                    force: 1
                  });

                  const touchStartEvent = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true,
                    touches: [touchObj],
                    targetTouches: [touchObj],
                    changedTouches: [touchObj]
                  });

                  const touchEndEvent = new TouchEvent('touchend', {
                    bubbles: true,
                    cancelable: true,
                    touches: [],
                    targetTouches: [],
                    changedTouches: [touchObj]
                  });

                  elementAtPoint.dispatchEvent(touchStartEvent);
                  setTimeout(() => {
                    elementAtPoint.dispatchEvent(touchEndEvent);
                    // Also try mouse events as fallback
                    const mouseDown = new MouseEvent('mousedown', {
                      bubbles: true,
                      cancelable: true,
                      clientX: x,
                      clientY: y,
                      view: window
                    });
                    const mouseUp = new MouseEvent('mouseup', {
                      bubbles: true,
                      cancelable: true,
                      clientX: x,
                      clientY: y,
                      view: window
                    });
                    const click = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      clientX: x,
                      clientY: y,
                      view: window
                    });
                    elementAtPoint.dispatchEvent(mouseDown);
                    elementAtPoint.dispatchEvent(mouseUp);
                    elementAtPoint.dispatchEvent(click);
                  }, 10);
                }

                // Re-enable overlay after a short delay
                setTimeout(() => {
                  overlay.style.pointerEvents = 'auto';
                }, 100);
              }

              overlay.addEventListener('touchstart', function(e) {
                // Stop any ongoing momentum
                if (momentumId) {
                  cancelAnimationFrame(momentumId);
                  momentumId = null;
                }

                if (e.touches.length === 2) {
                  // Two fingers - pinch zoom
                  gestureMode = 'pinch';
                  hasMoved = true; // Prevent tap on pinch end
                  initialPinchDistance = getPinchDistance(e.touches);
                  // Store initial zoom when pinch starts
                  initialZoom = currentZoom;
                } else if (e.touches.length === 1 && gestureMode !== 'pinch') {
                  // Single finger - could be tap or scroll
                  touchStartX = e.touches[0].pageX;
                  touchStartY = e.touches[0].pageY;
                  touchStartTime = performance.now();
                  lastX = touchStartX;
                  lastY = touchStartY;
                  lastTime = touchStartTime;
                  hasMoved = false;
                  gestureMode = null;
                  velocityX = 0;
                  velocityY = 0;
                  velocitySamples = []; // Reset velocity samples
                }
              }, { passive: true });

              // Track initial zoom for pinch
              let initialZoom = 1;

              // Helper function to set zoom using multiple approaches
              function setZoom(zoomRatio) {
                console.log('Setting zoom to:', zoomRatio);

                // Try Facade API first
                try {
                  const activeSheet = workbook.getActiveSheet();
                  if (activeSheet) {
                    if (typeof activeSheet.zoom === 'function') {
                      activeSheet.zoom(zoomRatio);
                      console.log('Zoom via facade.zoom() succeeded');
                      return true;
                    }
                    if (typeof activeSheet.setZoom === 'function') {
                      activeSheet.setZoom(zoomRatio);
                      console.log('Zoom via facade.setZoom() succeeded');
                      return true;
                    }
                  }
                } catch(e) {
                  console.log('Zoom via facade failed:', e.message);
                }

                // Try command API
                try {
                  univerAPI.executeCommand('sheet.operation.set-zoom-ratio', {
                    unitId: unitId,
                    zoomRatio: zoomRatio
                  });
                  console.log('Zoom via command succeeded');
                  return true;
                } catch(e) {
                  console.log('Zoom via command failed:', e.message);
                }

                // CSS transform fallback (visual only)
                if (canvas) {
                  canvas.style.transform = 'scale(' + zoomRatio + ')';
                  canvas.style.transformOrigin = 'top left';
                  console.log('Zoom via CSS transform');
                  return true;
                }

                return false;
              }

              overlay.addEventListener('touchmove', function(e) {
                if (e.touches.length === 2) {
                  // Pinch zoom - always handle when 2 fingers
                  console.log('Pinch detected, touches:', e.touches.length);

                  if (gestureMode !== 'pinch') {
                    gestureMode = 'pinch';
                    initialPinchDistance = getPinchDistance(e.touches);
                    initialZoom = currentZoom;
                    console.log('Pinch start, distance:', initialPinchDistance, 'zoom:', initialZoom);
                  }

                  if (initialPinchDistance > 0) {
                    const newDistance = getPinchDistance(e.touches);
                    const scale = newDistance / initialPinchDistance;
                    const newZoom = Math.min(4, Math.max(0.25, initialZoom * scale));

                    console.log('Pinch move, scale:', scale.toFixed(2), 'newZoom:', newZoom.toFixed(2));

                    if (Math.abs(newZoom - currentZoom) > 0.02) {
                      if (setZoom(newZoom)) {
                        currentZoom = newZoom;
                      }
                    }
                  }
                  hasMoved = true;
                } else if (e.touches.length === 1 && gestureMode !== 'pinch') {
                  const currentX = e.touches[0].pageX;
                  const currentY = e.touches[0].pageY;
                  const now = performance.now();
                  const dt = now - lastTime;

                  // Calculate total distance moved from start
                  const totalDx = Math.abs(currentX - touchStartX);
                  const totalDy = Math.abs(currentY - touchStartY);
                  const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

                  // If moved beyond tap threshold, switch to scroll mode
                  if (totalDistance > TAP_MAX_DISTANCE) {
                    hasMoved = true;
                    gestureMode = 'scroll';
                  }

                  // Only scroll if in scroll mode
                  if (gestureMode === 'scroll') {
                    const deltaX = lastX - currentX;
                    const deltaY = lastY - currentY;

                    // Track velocity with samples for better release calculation
                    if (dt > 0 && dt < 100) { // Ignore samples with too much time gap
                      const instantVelX = (deltaX / dt) * 16;
                      const instantVelY = (deltaY / dt) * 16;

                      // Add to velocity samples
                      velocitySamples.push({ vx: instantVelX, vy: instantVelY, time: now });
                      if (velocitySamples.length > MAX_SAMPLES) {
                        velocitySamples.shift();
                      }

                      // Update current velocity (for display/feedback)
                      velocityX = instantVelX;
                      velocityY = instantVelY;
                    }

                    scrollX = Math.max(0, scrollX + deltaX);
                    scrollY = Math.max(0, scrollY + deltaY);
                    doScroll();
                  }

                  lastX = currentX;
                  lastY = currentY;
                  lastTime = now;
                }
              }, { passive: true });

              overlay.addEventListener('touchend', function(e) {
                if (e.touches.length === 0) {
                  const touchEndTime = performance.now();
                  const touchDuration = touchEndTime - touchStartTime;

                  // Check if this was a tap (quick touch with minimal movement)
                  if (!hasMoved && touchDuration < TAP_MAX_DURATION && gestureMode !== 'pinch') {
                    // It's a tap - forward to canvas for cell selection
                    forwardTapToCanvas(touchStartX, touchStartY);
                  } else if (gestureMode === 'scroll') {
                    // Calculate release velocity from samples
                    const releaseVel = getReleaseVelocity();
                    const speed = Math.sqrt(releaseVel.vx * releaseVel.vx + releaseVel.vy * releaseVel.vy);

                    // Only apply momentum if moving fast enough (like a flick)
                    if (speed > MOMENTUM_VELOCITY_THRESHOLD) {
                      velocityX = releaseVel.vx;
                      velocityY = releaseVel.vy;
                      momentumId = requestAnimationFrame(momentumScroll);
                    }
                    // If slow movement, just stop where finger lifted - no momentum
                  }

                  // Reset state
                  gestureMode = null;
                  hasMoved = false;
                  initialPinchDistance = 0;
                }

                // If going from 2 fingers to 1, don't reset pinch yet
                if (e.touches.length === 1 && gestureMode === 'pinch') {
                  // Transitioning out of pinch - reset for potential scroll
                  gestureMode = null;
                  initialPinchDistance = 0;
                  touchStartX = e.touches[0].pageX;
                  touchStartY = e.touches[0].pageY;
                  lastX = touchStartX;
                  lastY = touchStartY;
                  lastTime = performance.now();
                }
              }, { passive: true });

              overlay.addEventListener('touchcancel', function(e) {
                gestureMode = null;
                hasMoved = false;
                initialPinchDistance = 0;
                if (momentumId) {
                  cancelAnimationFrame(momentumId);
                  momentumId = null;
                }
              }, { passive: true });
            }, 800);

            // Notify React Native that loading is complete
            setTimeout(() => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'loaded',
                height: document.documentElement.scrollHeight
              }));
            }, 500);

          } catch (error) {
            console.error('Failed to initialize Univer:', error);
            appEl.innerHTML = '<div class="error">Failed to load spreadsheet: ' + error.message + '</div>';
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
        })();
      </script>
    </body>
    </html>
  `, [escapedContent, theme.isDark, theme.colors.mutedForeground]);

  return (
    <View style={styles.container}>
      {loading && !hideLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            {LOADING_MESSAGES[messageIndex]}
          </Text>
        </View>
      )}
      <WebView
        source={{ html: fullHtml }}
        style={[styles.webview, { opacity: loading ? 0 : 1 }]}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // @ts-ignore - iOS specific
        allowsInlineMediaPlayback={true}
        // @ts-ignore - iOS specific
        bounces={false}
        // @ts-ignore - iOS specific - hide keyboard accessory bar
        hideKeyboardAccessoryView={true}
        // @ts-ignore - iOS specific - require user action to show keyboard
        keyboardDisplayRequiresUserAction={true}
        onLoadEnd={() => {
          setTimeout(() => {
            setLoading(false);
            onLoaded?.();
          }, 1000);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loaded') {
              setLoading(false);
              onLoaded?.();
            } else if (data.type === 'error') {
              setLoading(false);
              onLoaded?.();
              console.error('SheetsViewer error:', data.message);
            } else if (data.type === 'debug') {
              console.log('SheetsViewer debug:', JSON.stringify(data, null, 2));
            }
          } catch {
            // Ignore parse errors
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SheetsViewer;
