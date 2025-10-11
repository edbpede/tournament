// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  vite: {
    // @ts-ignore - Vite 7 plugin type incompatibility with Astro's Vite 6
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split React and related libraries into a separate chunk
            'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
            // Split i18n libraries into a separate chunk
            'i18n-vendor': ['i18next', 'react-i18next'],
            // Split UI components library into a separate chunk
            '@radix-ui': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-tabs',
            ],
          },
        },
      },
    },
  },

  integrations: [react()],
});