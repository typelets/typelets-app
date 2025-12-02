import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
}

/**
 * SheetsViewer - Read-only spreadsheet viewer for mobile
 * Uses Univer library via WebView to render spreadsheets exactly as they appear on web
 */
export function SheetsViewer({ content, theme }: SheetsViewerProps) {
  const [loading, setLoading] = useState(true);

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
                    zoomSlider: true     // Keep zoom controls
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

            // After Univer renders, disable pointer events on canvas and add touch scroll
            setTimeout(() => {
              // Find and disable the canvas
              const canvas = document.querySelector('canvas');
              if (canvas) {
                canvas.style.pointerEvents = 'none';
              }

              // Prevent keyboard from appearing on footer button clicks
              const footer = document.querySelector('footer');
              if (footer) {
                footer.addEventListener('click', (e) => {
                  // Blur any focused element to dismiss keyboard
                  if (document.activeElement && document.activeElement !== document.body) {
                    document.activeElement.blur();
                  }
                }, true);
              }




              // Create touch overlay for scrolling (only covers the sheet area, not status bar)
              const overlay = document.createElement('div');
              overlay.id = 'touch-overlay';
              overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:80px;z-index:50;';
              appEl.style.position = 'relative';
              appEl.appendChild(overlay);

              let startX = 0;
              let startY = 0;
              let scrollX = 0;
              let scrollY = 0;
              let velocityX = 0;
              let velocityY = 0;
              let lastTime = 0;
              let momentumId = null;

              // Pinch zoom state
              let initialPinchDistance = 0;
              let currentZoom = 1;

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
                if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
                  momentumId = null;
                  return;
                }

                velocityX *= 0.95;
                velocityY *= 0.95;
                scrollX = Math.max(0, scrollX + velocityX);
                scrollY = Math.max(0, scrollY + velocityY);
                doScroll();
                momentumId = requestAnimationFrame(momentumScroll);
              }

              function getPinchDistance(touches) {
                const dx = touches[0].pageX - touches[1].pageX;
                const dy = touches[0].pageY - touches[1].pageY;
                return Math.sqrt(dx * dx + dy * dy);
              }

              overlay.addEventListener('touchstart', function(e) {
                if (momentumId) {
                  cancelAnimationFrame(momentumId);
                  momentumId = null;
                }

                if (e.touches.length === 1) {
                  startX = e.touches[0].pageX;
                  startY = e.touches[0].pageY;
                  lastTime = Date.now();
                  velocityX = 0;
                  velocityY = 0;
                } else if (e.touches.length === 2) {
                  initialPinchDistance = getPinchDistance(e.touches);
                }
              }, { passive: true });

              overlay.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1) {
                  const currentX = e.touches[0].pageX;
                  const currentY = e.touches[0].pageY;
                  const now = Date.now();
                  const dt = Math.max(1, now - lastTime);

                  const deltaX = (startX - currentX) * 1.5;
                  const deltaY = (startY - currentY) * 1.5;

                  velocityX = deltaX * (16 / dt);
                  velocityY = deltaY * (16 / dt);

                  scrollX = Math.max(0, scrollX + deltaX);
                  scrollY = Math.max(0, scrollY + deltaY);
                  doScroll();

                  startX = currentX;
                  startY = currentY;
                  lastTime = now;
                } else if (e.touches.length === 2 && initialPinchDistance > 0) {
                  const newDistance = getPinchDistance(e.touches);
                  const scale = newDistance / initialPinchDistance;
                  const newZoom = Math.min(2, Math.max(0.5, currentZoom * scale));

                  try {
                    univerAPI.executeCommand('sheet.operation.set-zoom-ratio', {
                      unitId: unitId,
                      zoomRatio: newZoom
                    });
                  } catch(e) {}

                  initialPinchDistance = newDistance;
                  currentZoom = newZoom;
                }
              }, { passive: true });

              overlay.addEventListener('touchend', function(e) {
                if (e.touches.length === 0 && (Math.abs(velocityX) > 1 || Math.abs(velocityY) > 1)) {
                  momentumId = requestAnimationFrame(momentumScroll);
                }
                initialPinchDistance = 0;
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
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.mutedForeground} />
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
          setTimeout(() => setLoading(false), 1000);
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loaded') {
              setLoading(false);
            } else if (data.type === 'error') {
              setLoading(false);
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingBottom: 60, // Account for header
  },
});

export default SheetsViewer;
