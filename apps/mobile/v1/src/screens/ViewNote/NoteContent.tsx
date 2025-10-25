import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PixelRatio, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Note } from '../../services/api';

interface NoteContentProps {
  note: Note;
  htmlContent: string;
  scrollY: Animated.Value;
  scrollViewRef: React.RefObject<ScrollView>;
  showTitle?: boolean;
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
}

/**
 * Note content component that displays note in a WebView
 * Supports rich text formatting, code blocks with syntax highlighting,
 * and communicates scroll position to React Native
 */
export function NoteContent({ note, htmlContent, scrollY, scrollViewRef, showTitle = true, theme }: NoteContentProps) {
  const webViewRef = useRef<WebView>(null);
  const [webViewHeight, setWebViewHeight] = useState(300);

  // Calculate hairline width for CSS (equivalent to StyleSheet.hairlineWidth)
  const hairlineWidth = StyleSheet.hairlineWidth;
  const cssHairlineWidth = `${hairlineWidth}px`;

  // Enhanced HTML with optional title and metadata
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
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
          border-top: 1px solid ${theme.colors.border};
        }

        /* Blockquotes */
        blockquote {
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
      </style>
    </head>
    <body>
      ${showTitle ? `
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
      ` : ''}
      <div class="note-content">${htmlContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || note.content}</div>
      <script>
        document.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });

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
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {note.hidden ? (
        <View style={styles.hiddenContainer}>
          <Text style={[styles.hiddenText, { color: theme.colors.mutedForeground }]}>
            [HIDDEN]
          </Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: fullHtml }}
          style={[styles.webview, { height: webViewHeight }]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={['*']}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'height') {
                setWebViewHeight(data.height);
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
  },
  webview: {
    backgroundColor: 'transparent',
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
