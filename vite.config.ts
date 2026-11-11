import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Radio Browser',
        short_name: 'Radio Browser',
        description: 'World radio stations, optimized for driving',
        theme_color: '#05061e',
        background_color: '#05061e',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Stream proxy requests must never be answered by the SPA fallback
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5500,
    strictPort: true,
  },
});
