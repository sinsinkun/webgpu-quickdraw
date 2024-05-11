import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/vite-webgpu',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001
  }
});
