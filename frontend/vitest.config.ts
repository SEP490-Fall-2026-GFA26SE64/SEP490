import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    // Bound jsdom workers so local Docker integration tests do not exhaust memory.
    maxWorkers: 2,
    restoreMocks: true,
    clearMocks: true,
  },
})
