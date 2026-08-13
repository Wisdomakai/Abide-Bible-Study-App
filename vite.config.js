import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  plugins: [
    react({ include: /\.[jt]sx?$/ }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Ardent — Bible Study Journal',
        short_name: 'Ardent',
        description: 'A private, shared Bible study journal.',
        theme_color: '#4B3F9E',
        background_color: '#4B3F9E',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          // The file is genuinely 1024²; declaring 512 makes installability checks fail.
          { src: '/icon-512.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,ico,webmanifest}'],
        globIgnores: ['admin/**'],
      },
    }),
  ],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: ['.web.js', '.js', '.jsx', '.json'],
  },
  esbuild: {
    loader: 'jsx',
    include: /(?:App|src\/.*)\.[jt]sx?$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      resolveExtensions: ['.web.js', '.web.jsx', '.js', '.jsx', '.json'],
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
});
