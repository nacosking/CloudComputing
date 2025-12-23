import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '../Frontend',
  server: {
    host: "0.0.0.0",
    allowedHosts: true
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "../Frontend/src"),
      "@assets": path.resolve(process.cwd(), "../Frontend/src/assets"),
    },
  },
  build: {
    outDir: '../../dist'
  }
});