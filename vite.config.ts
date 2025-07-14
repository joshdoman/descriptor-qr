import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'jsqr', 'descriptor-codec-wasm'],
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [],
    }
  },
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es'
  }
});