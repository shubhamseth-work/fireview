import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const outDir = path.resolve(__dirname, '../../apps/vscode-extension/dist/webview');

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        firestore: 'src/firestore/index.html',
        compare: 'src/compare/index.html',
        projectCompare: 'src/project-compare/index.html',
        migration: 'src/migration/index.html',
        audit: 'src/audit/index.html',
      },
    },
  },
  resolve: {
    alias: {
      '@vistiq/core': path.resolve(__dirname, '../../packages/core/src'),
      '@vistiq/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 3000,
    cors: true,
  },
});