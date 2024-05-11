import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'build',
  },
  server: {
    port: 3001
  }
});
