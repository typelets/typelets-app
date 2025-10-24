import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Build plugins array conditionally
  const plugins = [react(), tailwindcss()];

  // Add Sentry plugin in production builds when DSN is configured
  if (mode === 'production' && env.VITE_SENTRY_DSN) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG || 'bata-labs',
        project: env.SENTRY_PROJECT || 'typelets',
        authToken: env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        sourcemaps: {
          assets: './dist/**',
          filesToDeleteAfterUpload: './dist/**/*.map',
        },
        release: {
          name: `typelets@${env.VITE_APP_VERSION || '0.0.0'}`,
          deploy: {
            env: mode,
          },
        },
      })
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: true, // Generate source maps for production
      rollupOptions: {
        output: {
          manualChunks: {
            // Monaco Editor - large code editor bundle
            'monaco-editor': ['monaco-editor', '@monaco-editor/react'],

            // Clerk authentication
            'clerk': ['@clerk/clerk-react'],

            // Radix UI components
            'radix-ui': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-slot',
              '@radix-ui/react-tabs',
            ],

            // React Query
            'react-query': ['@tanstack/react-query'],

            // Syntax highlighting
            'syntax-highlight': ['highlight.js', 'lowlight'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});