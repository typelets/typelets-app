import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Monaco Editor - large code editor bundle
            'monaco-editor': ['monaco-editor', '@monaco-editor/react'],

            // Tiptap core - rich text editor core
            'tiptap-core': ['@tiptap/react', '@tiptap/core', '@tiptap/starter-kit'],

            // Tiptap extensions - split from core for better caching
            'tiptap-extensions': [
              '@tiptap/extension-code-block-lowlight',
              '@tiptap/extension-color',
              '@tiptap/extension-dropcursor',
              '@tiptap/extension-highlight',
              '@tiptap/extension-horizontal-rule',
              '@tiptap/extension-image',
              '@tiptap/extension-link',
              '@tiptap/extension-task-item',
              '@tiptap/extension-task-list',
              '@tiptap/extension-text-style',
              '@tiptap/extension-underline',
            ],

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