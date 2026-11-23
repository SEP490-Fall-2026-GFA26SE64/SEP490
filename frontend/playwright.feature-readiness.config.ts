import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './system-tests', testMatch: 'FR-06.08-policy-readiness.spec.ts', workers: 1, retries: 0,
  reporter: 'list', outputDir: 'test-results/feature-readiness',
  use: { baseURL: 'http://127.0.0.1:5187', headless: true, trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187 --strictPort', url: 'http://127.0.0.1:5187/system-tests/support/individual-skill.html', reuseExistingServer: false },
})
