import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  server: {
    host: '127.0.0.1',
    watch: { usePolling: process.env.DEV_WATCH_POLLING === 'true', interval: 300 },
    proxy: {
      '/api': loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://127.0.0.1:18080',
    },
  },
}))

