import React, { useRef, useState, useMemo } from 'react';
import { Animated, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { SheetsViewer } from '../../components/SheetsViewer';
import type { Note } from '../../services/api';

interface NoteContentProps {
  note: Note;
  htmlContent: string;
  scrollY: Animated.Value;
  scrollViewRef: React.RefObject<ScrollView | null>;
  showTitle?: boolean;
  bottomInset?: number;
  theme: {
    colors: {
      foreground: string;
      mutedForeground: string;
      border: string;
      muted: string;
      primary: string;
    };
    isDark: boolean;
  };
  onSheetLoaded?: () => void;
}

/**
 * Note content component that displays note in a WebView
 * Supports rich text formatting, code blocks with syntax highlighting,
 * and communicates scroll position to React Native
 */
export function NoteContent({
  note,
  htmlContent,
  showTitle = true,
  bottomInset = 0,
  theme,
  onSheetLoaded,
}: NoteContentProps) {
  const webViewRef = useRef<WebView>(null);
  // For diagrams, use screen height; for regular notes, use dynamic height
  const [webViewHeight, setWebViewHeight] = useState(
    note.type === 'diagram' ? Dimensions.get('window').height - 150 : 300
  );

  // Calculate hairline width for CSS (equivalent to StyleSheet.hairlineWidth)
  const cssHairlineWidth = `${StyleSheet.hairlineWidth}px`;

  // Check note type
  const isDiagram = note.type === 'diagram';
  const isSheet = note.type === 'sheets';

  // Enhanced HTML with optional title and metadata
  // Memoized to prevent expensive re-generation on every render
  const fullHtml = useMemo(() => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0${isDiagram ? ', user-scalable=yes, maximum-scale=5.0, minimum-scale=0.5' : ''}">
      <!-- noinspection HtmlUnknownTarget,JSUnresolvedLibraryURL -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" crossorigin="anonymous">
      <!-- noinspection HtmlUnknownTarget,JSUnresolvedLibraryURL -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" crossorigin="anonymous"></script>
      ${isDiagram ? '<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js" crossorigin="anonymous"></script>' : ''}
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          padding: 0 16px 16px 16px;
          color: ${theme.colors.foreground};
          margin: 0;
        }

        .note-content {
          padding-top: 12px;
          padding-bottom: 20px;
        }

        /* Lists */
        ul, ol {
          padding-left: 20px;
          margin: 8px 0;
        }

        li {
          margin: 4px 0;
        }

        /* Remove p margins inside list items (Tiptap wraps li content in p tags) */
        li > p {
          margin: 0 !important;
        }

        /* Task list checkbox styling */
        ul[data-type="taskList"],
        ul:has(> li > input[type="checkbox"]) {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 8px 0 !important;
        }

        li[data-type="taskItem"],
        li:has(> input[type="checkbox"]),
        li:has(> label > input[type="checkbox"]) {
          display: flex !important;
          align-items: center !important;
          margin: 4px 0 !important;
          list-style: none !important;
        }

        input[type="checkbox"] {
          width: 16px !important;
          height: 16px !important;
          min-width: 16px !important;
          min-height: 16px !important;
          margin: 0 8px 0 0 !important;
          flex-shrink: 0 !important;
          cursor: pointer !important;
        }

        li[data-type="taskItem"] label,
        li label:has(> input[type="checkbox"]) {
          display: contents !important;
        }

        /* Hide the empty span that Tiptap adds */
        li[data-type="taskItem"] label > span {
          display: none !important;
        }

        li[data-type="taskItem"] > div,
        li[data-type="taskItem"] > p {
          flex: 1 !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }

        /* Remove p tag margins inside task items */
        li[data-type="taskItem"] p {
          margin: 0 !important;
          line-height: 1.6 !important;
        }

        /* Code */
        code {
          background-color: ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : theme.colors.muted};
          color: ${theme.colors.foreground};
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          white-space: pre;
        }

        pre {
          background-color: ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.muted};
          /* noinspection CssInvalidPropertyValue */
          border: 1px solid ${theme.colors.border};
          border-radius: 6px;
          padding: 12px 16px;
          margin: 8px 0;
          overflow-x: auto;
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          white-space: pre;
          word-wrap: normal;
          overflow-wrap: normal;
        }

        pre code {
          background-color: transparent !important;
          padding: 0 !important;
          white-space: pre !important;
        }

        /* Override highlight.js colors for better visibility */
        pre code, pre code * {
          color: ${theme.isDark ? '#ffffff' : 'inherit'} !important;
        }

        /* noinspection CssInvalidFunction,JSUnresolvedReference,JSValidateTypes */
        ${htmlContent.match(/<style>([\s\S]*?)<\/style>/)?.[1] || ''}

        /* Override any extracted styles with our custom spacing */
        * {
          margin-top: 0;
        }

        *:first-child {
          margin-top: 0 !important;
        }

        /* Paragraphs */
        p {
          margin: 0 0 8px 0;
        }

        /* Empty paragraphs should show as spacing (Tiptap uses <p></p> for blank lines) */
        p:empty {
          min-height: 1.6em;
        }

        /* Headings */
        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          margin: 8px 0 8px 0;
        }

        h1:first-child, h2:first-child, h3:first-child {
          margin-top: 0;
        }

        h1 { font-size: 32px; line-height: 1.2; }
        h2 { font-size: 24px; line-height: 1.3; }
        h3 { font-size: 20px; line-height: 1.4; }

        /* Text formatting */
        strong, b { font-weight: bold; }
        em, i { font-style: italic; }
        u { text-decoration: underline; }

        /* Horizontal rule */
        hr {
          margin: 16px 0;
          border: none;
          /* noinspection CssInvalidPropertyValue */
          border-top: 1px solid ${theme.colors.border};
        }

        /* Blockquotes */
        blockquote {
          /* noinspection CssInvalidPropertyValue */
          border-left: 4px solid ${theme.colors.border};
          padding-left: 16px;
          margin: 12px 0;
          color: ${theme.colors.mutedForeground};
          font-style: italic;
        }

        blockquote > p {
          margin: 0 !important;
        }

        /* Highlight/Mark */
        mark {
          background-color: ${theme.isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(254, 240, 138, 0.8)'};
          padding: 2px 4px;
          border-radius: 3px;
        }

        /* Table wrapper for horizontal scroll */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 12px 0;
        }

        /* Tables */
        table {
          border-collapse: collapse;
          width: auto;
          min-width: 100%;
          table-layout: auto;
        }

        th, td {
          border: 1px solid ${theme.colors.border} !important;
          padding: 8px 12px !important;
          vertical-align: top;
          font-size: 16px !important;
          white-space: nowrap;
        }

        /* Allow text wrapping for cells with longer content */
        td p, th p {
          white-space: normal;
          min-width: 120px;
        }

        th {
          background-color: ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.muted} !important;
          font-weight: 600;
        }

        /* Force consistent font-size inside table cells */
        th *, td *,
        th p, td p,
        th span, td span {
          font-size: 16px !important;
          margin: 0 !important;
        }

        /* Remove p margins inside table cells and force inherit alignment */
        th p, td p,
        th > p, td > p,
        table th p, table td p {
          text-align: inherit !important;
        }

        .note-header {
          padding: 8px 16px 0 16px;
        }
        .note-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 32px;
          color: ${theme.colors.foreground};
        }
        .note-metadata {
          font-size: 12px;
          color: ${theme.colors.mutedForeground};
          margin-bottom: 12px;
        }
        .note-divider {
          height: ${cssHairlineWidth};
          background: ${theme.colors.border};
          margin: 0 -16px 0 -16px;
        }

        /* Images */
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 8px 0;
          border-radius: 6px;
        }

        /* Tiptap image wrapper */
        .image,
        [data-type="image"] {
          max-width: 100%;
        }

        .image img,
        [data-type="image"] img {
          max-width: 100%;
          height: auto;
          display: block;
        }

        /* Diagram-specific styles */
        ${isDiagram ? `
        body {
          overflow: visible;
          margin: 0;
          padding: 0;
        }
        .diagram-container {
          padding: 16px;
          display: block;
          width: 100%;
          overflow: visible;
        }
        .mermaid {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: top left;
        }
        .mermaid svg {
          display: block;
          width: 100%;
          height: auto;
        }
        ` : ''}
      </style>
    </head>
    <body>
      ${
        showTitle
          ? `
      <div class="note-header" id="header">
        <div class="note-title">${note.title}</div>
        <div class="note-metadata">
          Created ${new Date(note.createdAt).toLocaleDateString()}${
            note.updatedAt !== note.createdAt
              ? ` • Updated ${new Date(note.updatedAt).toLocaleDateString()}`
              : ''
          }
        </div>
        <div class="note-divider"></div>
      </div>
      `
          : ''
      }
      ${isDiagram ? `
      <div class="diagram-container">
        <div class="mermaid">
${note.content}
        </div>
      </div>
      ` : `
      <div class="note-content">${htmlContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || note.content}</div>
      `}
      <script>
        ${isDiagram ? `
        // Initialize Mermaid for diagrams
        mermaid.initialize({
          startOnLoad: true,
          theme: '${theme.isDark ? 'dark' : 'default'}',
          securityLevel: 'loose',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        });
        ` : `
        // Syntax highlighting for code blocks
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });

        // Fix tables: wrap in scrollable div and normalize styling
        document.querySelectorAll('table').forEach((table) => {
          // Wrap table in scrollable div if not already wrapped
          if (!table.parentElement.classList.contains('table-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
          }

          // Remove inline styles from table
          table.removeAttribute('style');

          // Remove colgroup widths
          table.querySelectorAll('col').forEach((col) => {
            col.removeAttribute('style');
            col.removeAttribute('width');
          });
        });

        // Fix table cell alignment and remove fixed widths
        document.querySelectorAll('th, td').forEach((cell) => {
          // Remove colwidth attribute
          cell.removeAttribute('colwidth');

          // Get alignment before removing style
          const style = cell.getAttribute('style') || '';
          const alignMatch = style.match(/text-align:\\s*(left|center|right|justify)/i);

          // Remove all inline styles (including width)
          cell.removeAttribute('style');

          // Re-apply alignment if it was set
          if (alignMatch) {
            const alignment = alignMatch[1];
            cell.style.textAlign = alignment;
            cell.querySelectorAll('p').forEach((p) => {
              p.style.textAlign = alignment;
            });
          }

          // Remove inline styles from all child elements
          cell.querySelectorAll('*').forEach((el) => {
            if (el.style) {
              el.style.fontSize = '';
              el.style.width = '';
            }
          });
        });
        `}

        // Send content height to React Native
        function sendHeight() {
          const height = document.documentElement.scrollHeight;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'height',
            height: height
          }));
        }

        // Send height when content is loaded
        if (document.readyState === 'complete') {
          setTimeout(sendHeight, 100);
        } else {
          window.addEventListener('load', () => {
            setTimeout(sendHeight, 100);
          });
        }

        // For diagrams, send height again after Mermaid renders
        ${isDiagram ? `
        if (typeof mermaid !== 'undefined') {
          mermaid.run().then(() => {
            setTimeout(sendHeight, 200);
          }).catch((error) => {
            console.error('Mermaid render error:', error);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: error.message
            }));
          });
        }
        ` : ''}
      </script>
    </body>
    </html>
  `, [
    note.id,        // Re-generate when viewing different note
    note.content,   // Re-generate when content changes
    note.type,      // Re-generate when note type changes (diagram vs regular)
    note.title,     // Re-generate when title changes
    note.createdAt, // Re-generate when metadata changes
    note.updatedAt,
    htmlContent,    // Re-generate when HTML content changes
    showTitle,      // Re-generate when title visibility changes
    isDiagram,      // Re-generate when diagram state changes
    theme.colors.foreground,      // Re-generate when theme colors change
    theme.colors.mutedForeground,
    theme.colors.border,
    theme.colors.muted,
    theme.colors.primary,
    theme.isDark,   // Re-generate when dark mode toggles
    cssHairlineWidth, // Re-generate if hairline width changes (rare)
  ]);

  // For sheets, render the SheetsViewer component
  if (isSheet) {
    return (
      <View style={[styles.sheetsContainer, {}]}>
        {note.hidden ? (
          <View style={styles.hiddenContainer}>
            <Text
              style={[styles.hiddenText, { color: theme.colors.mutedForeground }]}
            >
              [HIDDEN]
            </Text>
          </View>
        ) : (
          <SheetsViewer content={note.content} theme={theme} onLoaded={onSheetLoaded} hideLoadingOverlay />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {note.hidden ? (
        <View style={styles.hiddenContainer}>
          <Text
            style={[styles.hiddenText, { color: theme.colors.mutedForeground }]}
          >
            [HIDDEN]
          </Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: fullHtml }}
          style={[styles.webview, { height: webViewHeight }]}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // @ts-ignore - Android specific - enable zoom
          setSupportMultipleWindows={false}
          // @ts-ignore - Android specific - enable zoom controls
          builtInZoomControls={isDiagram}
          // @ts-ignore - Android specific - hide on-screen zoom buttons
          displayZoomControls={false}
          // @ts-ignore - Android specific - allow zooming
          useWebViewClient={true}
          // @ts-ignore - iOS specific prop
          allowsInlineMediaPlayback={true}
          // @ts-ignore - iOS specific prop
          bounces={true}
          // @ts-ignore - iOS specific - disable link preview
          allowsLinkPreview={false}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'height') {
                // For diagrams, keep initial screen height - don't update
                // For regular notes, use exact content height
                if (!isDiagram) {
                  setWebViewHeight(data.height);
                }
              } else if (data.type === 'error') {
                console.error('WebView error:', data.error);
              } else if (data.type === 'debug') {
                console.log('DEBUG TABLE HTML:', data.table);
              }
            } catch {
              // Ignore parse errors
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No flex needed - inside ScrollView
  },
  sheetsContainer: {
    flex: 1,
  },
  webview: {
    backgroundColor: 'transparent',
    // Height set inline based on content or screen size
  },
  hiddenContainer: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  hiddenText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
