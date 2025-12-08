import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

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
  bottomInset?: number;
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

export function SheetsViewer({ content, theme, onLoaded, hideLoadingOverlay, bottomInset = 0 }: SheetsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const webViewRef = useRef<WebViewType>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetIds, setSheetIds] = useState<string[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  // Parse sheet names and IDs from content on mount
  useEffect(() => {
    try {
      const data = JSON.parse(content);
      const sheets = data.sheets || {};
      const sheetOrder = data.sheetOrder || Object.keys(sheets);
      const names = sheetOrder.map((id: string) => sheets[id]?.name || 'Sheet');
      setSheetNames(names);
      setSheetIds(sheetOrder);
    } catch {
      setSheetNames(['Sheet1']);
      setSheetIds(['sheet1']);
    }
  }, [content]);

  // Switch sheet in WebView
  const switchSheet = (index: number) => {
    if (index === activeSheetIndex) return;
    setActiveSheetIndex(index);
    const sheetId = sheetIds[index];
    if (!sheetId) return;

    webViewRef.current?.injectJavaScript(`
      (function() {
        try {
          window.univerAPI?.executeCommand('sheet.command.set-worksheet-activate', {
            unitId: window.workbook?.getId(),
            subUnitId: '${sheetId}'
          });
        } catch(e) {}
      })();
      true;
    `);
  };

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
          background-color: ${theme.isDark ? '#1b1c1f' : '#ffffff'};
        }
        body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: ${theme.isDark ? '#1b1c1f' : '#ffffff'};
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
        /* Hide toolbar and formula bar completely in read-only mode */
        .univer-toolbar,
        .univer-formula-bar,
        [class*="toolbar"],
        [class*="Toolbar"],
        [class*="formula-bar"],
        [class*="formulaBar"],
        [class*="FormulaBar"] {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          overflow: hidden !important;
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
        /* Hide Univer's footer completely - we use our own native sheet selector */
        footer,
        .univer-sheet-bar,
        [class*="sheet-bar"],
        [class*="sheetbar"] {
          display: none !important;
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
                  header: false,         // Hide top header/toolbar completely
                  toolbar: false,        // Disable toolbar
                  footer: {
                    sheetBar: false,     // We use our own native sheet tabs
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

            // Store globally for sheet switching from React Native
            window.univerAPI = univerAPI;
            window.workbook = workbook;

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

              // Create touch overlay for hybrid gesture handling
              const overlay = document.createElement('div');
              overlay.id = 'touch-overlay';
              overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;z-index:50;';
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
              const TAP_MAX_DURATION = 300;
              const TAP_MAX_DISTANCE = 10;

              // iOS-like scroll physics
              const DECELERATION = 0.97;
              const MIN_VELOCITY = 0.5;
              const MOMENTUM_VELOCITY_THRESHOLD = 2.5;

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

              function getReleaseVelocity() {
                if (velocitySamples.length < 2) return { vx: 0, vy: 0 };
                let totalWeight = 0;
                let vx = 0;
                let vy = 0;
                for (let i = 0; i < velocitySamples.length; i++) {
                  const weight = (i + 1);
                  vx += velocitySamples[i].vx * weight;
                  vy += velocitySamples[i].vy * weight;
                  totalWeight += weight;
                }
                return { vx: vx / totalWeight, vy: vy / totalWeight };
              }

              function getPinchDistance(touches) {
                const dx = touches[0].pageX - touches[1].pageX;
                const dy = touches[0].pageY - touches[1].pageY;
                return Math.sqrt(dx * dx + dy * dy);
              }

              function forwardTapToCanvas(x, y) {
                overlay.style.pointerEvents = 'none';
                const elementAtPoint = document.elementFromPoint(x, y);
                if (elementAtPoint) {
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
                  elementAtPoint.dispatchEvent(new TouchEvent('touchstart', {
                    bubbles: true, cancelable: true,
                    touches: [touchObj], targetTouches: [touchObj], changedTouches: [touchObj]
                  }));
                  setTimeout(() => {
                    elementAtPoint.dispatchEvent(new TouchEvent('touchend', {
                      bubbles: true, cancelable: true,
                      touches: [], targetTouches: [], changedTouches: [touchObj]
                    }));
                    elementAtPoint.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
                    elementAtPoint.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
                    elementAtPoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
                  }, 10);
                }
                setTimeout(() => { overlay.style.pointerEvents = 'auto'; }, 100);
              }

              let initialZoom = 1;
              function setZoom(zoomRatio) {
                try {
                  univerAPI.executeCommand('sheet.operation.set-zoom-ratio', { unitId: unitId, zoomRatio: zoomRatio });
                  return true;
                } catch(e) {}
                return false;
              }

              overlay.addEventListener('touchstart', function(e) {
                if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
                if (e.touches.length === 2) {
                  gestureMode = 'pinch';
                  hasMoved = true;
                  initialPinchDistance = getPinchDistance(e.touches);
                  initialZoom = currentZoom;
                } else if (e.touches.length === 1 && gestureMode !== 'pinch') {
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
                  velocitySamples = [];
                }
              }, { passive: true });

              overlay.addEventListener('touchmove', function(e) {
                if (e.touches.length === 2) {
                  if (gestureMode !== 'pinch') {
                    gestureMode = 'pinch';
                    initialPinchDistance = getPinchDistance(e.touches);
                    initialZoom = currentZoom;
                  }
                  if (initialPinchDistance > 0) {
                    const newDistance = getPinchDistance(e.touches);
                    const scale = newDistance / initialPinchDistance;
                    const newZoom = Math.min(4, Math.max(0.25, initialZoom * scale));
                    if (Math.abs(newZoom - currentZoom) > 0.02) {
                      if (setZoom(newZoom)) { currentZoom = newZoom; }
                    }
                  }
                  hasMoved = true;
                } else if (e.touches.length === 1 && gestureMode !== 'pinch') {
                  const currentX = e.touches[0].pageX;
                  const currentY = e.touches[0].pageY;
                  const now = performance.now();
                  const dt = now - lastTime;
                  const totalDistance = Math.sqrt(Math.pow(currentX - touchStartX, 2) + Math.pow(currentY - touchStartY, 2));
                  if (totalDistance > TAP_MAX_DISTANCE) {
                    hasMoved = true;
                    gestureMode = 'scroll';
                  }
                  if (gestureMode === 'scroll') {
                    const deltaX = lastX - currentX;
                    const deltaY = lastY - currentY;
                    if (dt > 0 && dt < 100) {
                      velocitySamples.push({ vx: (deltaX / dt) * 16, vy: (deltaY / dt) * 16, time: now });
                      if (velocitySamples.length > MAX_SAMPLES) velocitySamples.shift();
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
                  const touchDuration = performance.now() - touchStartTime;
                  if (!hasMoved && touchDuration < TAP_MAX_DURATION && gestureMode !== 'pinch') {
                    forwardTapToCanvas(touchStartX, touchStartY);
                  } else if (gestureMode === 'scroll') {
                    const releaseVel = getReleaseVelocity();
                    const speed = Math.sqrt(releaseVel.vx * releaseVel.vx + releaseVel.vy * releaseVel.vy);
                    if (speed > MOMENTUM_VELOCITY_THRESHOLD) {
                      velocityX = releaseVel.vx;
                      velocityY = releaseVel.vy;
                      momentumId = requestAnimationFrame(momentumScroll);
                    }
                  }
                  gestureMode = null;
                  hasMoved = false;
                  initialPinchDistance = 0;
                }
                if (e.touches.length === 1 && gestureMode === 'pinch') {
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
                if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
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
  `, [escapedContent, theme.isDark, theme.colors.mutedForeground, bottomInset]);

  const hasMultipleSheets = sheetNames.length > 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.isDark ? '#1b1c1f' : '#ffffff' }]}>
      {/* Sheet tabs - shadcn/ui style - only show when multiple sheets exist */}
      {hasMultipleSheets && !loading && (
        <View style={[styles.tabsWrapper, { backgroundColor: theme.colors.muted }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {sheetNames.map((name, index) => {
              const isActive = index === activeSheetIndex;
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.tab,
                    isActive && [
                      styles.tabActive,
                      { backgroundColor: theme.isDark ? '#1b1c1f' : '#ffffff' },
                    ],
                  ]}
                  onPress={() => switchSheet(index)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? theme.colors.foreground : theme.colors.mutedForeground },
                      isActive && styles.tabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading && !hideLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
          <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
            {LOADING_MESSAGES[messageIndex]}
          </Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
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
  tabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '600',
  },
});

export default SheetsViewer;
