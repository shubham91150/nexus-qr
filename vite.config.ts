import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: true,
    // Proxy API calls to Vercel functions in development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  plugins: [react(), basicSsl()],
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
