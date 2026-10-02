import { defineConfig } from '@playwright/test'

const chromeExecutable = process.env.PLAYWRIGHT_CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

export default defineConfig({
  testDir: './system-tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.SYSTEM_TEST_BASE_URL ?? 'http://127.0.0.1:8088',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: chromeExecutable,
    },
  },
  projects: [{ name: 'system-chrome', use: { browserName: 'chromium' } }],
})
