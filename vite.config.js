import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '' : '/vite-webgpu',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001
  },
}));
