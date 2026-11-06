import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
        host: true, // Listen on all addresses (0.0.0.0)
        allowedHosts: ['all'], // Allow all hosts (Vite 6/new versions specificity)
    }
})
