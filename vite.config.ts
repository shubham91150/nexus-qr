import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { viteApiPlugin } from './vite-api-plugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: true,
    // Note: API routes are now handled by viteApiPlugin
  },
  plugins: [
    react(),
    basicSsl(),
    viteApiPlugin(), // Handles /api/v1/* routes
  ],
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production for security
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
