import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Note } from '../../services/api';

interface NoteContentProps {
  note: Note;
  htmlContent: string;
  scrollY: Animated.Value;
  scrollViewRef: React.RefObject<any>;
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
  const webViewRef = useRef<any>(null);
  const [webViewHeight, setWebViewHeight] = useState(300);

  // Enhanced HTML with optional title and metadata
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <style>
        ${htmlContent.match(/<style>([\s\S]*?)<\/style>/)?.[1] || ''}

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
          height: 0.5px;
          background: ${theme.colors.border};
          margin: 0 -16px 16px -16px;
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
      ${htmlContent.match(/<body>([\s\S]*?)<\/body>/)?.[1] || note.content}
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
