/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Đường dẫn tương đối để deploy được trên mọi hosting tĩnh (Constitution §II)
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Chunk 3D (three + r3f) được lazy-load riêng; bundle ban đầu ≤ 500 KB gzip (NFR-001-03)
    chunkSizeWarningLimit: 1400,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'supabase/**/*.test.ts'],
  },
});
