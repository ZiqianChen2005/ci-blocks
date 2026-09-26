import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const 根package = JSON.parse(
    readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'),
);

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
    define: {
        __CIB_VERSION__: JSON.stringify(根package.version),
    },
});