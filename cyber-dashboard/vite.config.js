import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    server: {
        host: true, // Listen on all network addresses (0.0.0.0)
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            }
        }
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
})
