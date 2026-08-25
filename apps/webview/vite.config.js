import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    root: 'src',
    build: {
        outDir: '../../apps/vscode-extension/dist/webview',
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
//# sourceMappingURL=vite.config.js.map