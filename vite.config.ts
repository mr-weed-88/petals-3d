import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { bannerPlugin } from './scripts/banner.js'

export default defineConfig({
    plugins: [react(), tailwindcss(), bannerPlugin()],
    server: {
        port: 3000,
    },
    build: {
        sourcemap: false,
        // Vite 8 bundles Rolldown and no longer ships esbuild, so its
        // minifier is oxc. `minify: 'esbuild'` fails to resolve here.
        minify: 'oxc',
        target: 'es2017',
        outDir: 'dist',
    },
})
