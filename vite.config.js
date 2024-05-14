import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '' : '/vite-webgpu',
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001
  },
}));
