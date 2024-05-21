import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/webgpu-simplified',
  build: {
    outDir: 'vite-build',
  },
  server: {
    port: 3001
  },
});
