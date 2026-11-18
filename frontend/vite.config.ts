import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react(), nodePolyfills({
    globals: { Buffer: false },
    overrides: {
      crypto: path.resolve(import.meta.dirname, './build/excelCrypto.mjs'),
      buffer: path.resolve(import.meta.dirname, './node_modules/buffer/index.js'),
    },
  })],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // The prebundled browser entry is one large module. Use the modular
      // browser implementation so the spreadsheet exporter can be split.
      'exceljs': path.resolve(import.meta.dirname, './node_modules/exceljs/lib/exceljs.bare.js'),
    },
  },

  build: {
    rolldownOptions: {
      // ExcelJS checks Buffer identity; imports and injected globals must share one implementation.
      transform: { inject: { Buffer: [path.resolve(import.meta.dirname, './node_modules/buffer/index.js'), 'Buffer'] } },
      output: {
        codeSplitting: {
          groups: [{
            name: (id: string) => {
              const dependency = id.split(/[/\\]node_modules[/\\]/).at(-1)
              if (dependency === id) return null
              const parts = dependency?.split(/[/\\]/) ?? []
              return `vendor-${parts[0]?.startsWith('@') ? parts.slice(0, 2).join('-') : parts[0]}`
            },
          }],
        },
      },
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

