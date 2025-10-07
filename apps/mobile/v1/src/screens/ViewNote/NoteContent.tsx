import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import type { Note } from '../../services/api';

interface NoteContentProps {
  note: Note;
  htmlContent: string;
  scrollY: Animated.Value;
  scrollViewRef: React.RefObject<any>;
  theme: {
    colors: {
      foreground: string;
      mutedForeground: string;
      border: string;
    };
  };
}
export function NoteContent({ note, htmlContent, scrollY, scrollViewRef, theme }: NoteContentProps) {
  const { height } = useWindowDimensions();
  const [webViewHeight, setWebViewHeight] = useState(height);

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          {note.title}
        </Text>

        <View style={styles.metadata}>
          <Text style={[styles.date, { color: theme.colors.mutedForeground }]}>
            Created {new Date(note.createdAt).toLocaleDateString()}
            {note.updatedAt !== note.createdAt &&
              ` • Updated ${new Date(note.updatedAt).toLocaleDateString()}`}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.colors.border, marginHorizontal: -16 }]} />
      </Animated.View>

      <View style={styles.contentContainer}>
        {note.hidden ? (
          <View style={styles.hiddenContainer}>
            <Text style={[styles.hiddenText, { color: theme.colors.mutedForeground }]}>
              [HIDDEN]
            </Text>
          </View>
        ) : (
          <View style={{ height: webViewHeight }}>
            <WebView
              source={{ html: htmlContent }}
              style={styles.webView}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
              startInLoadingState={false}
              javaScriptEnabled={true}
              injectedJavaScript={`
                setTimeout(function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'height',
                    height: document.documentElement.scrollHeight
                  }));
                }, 100);
                true;
              `}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'height' && data.height) {
                    setWebViewHeight(Math.max(data.height, 200));
                  }
                } catch {
                  // Ignore parse errors
                }
              }}
            />
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 32,
  },
  metadata: {
    gap: 4,
  },
  date: {
    fontSize: 12,
  },
  divider: {
    height: 0.5,
    marginTop: 12,
  },
  contentContainer: {
    paddingTop: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  hiddenContainer: {
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  hiddenText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
