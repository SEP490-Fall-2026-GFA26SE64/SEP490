import { defineConfig } from '@playwright/test'
// Browser component fixtures only. No backend/system acceptance is implied.
export default defineConfig({
  testDir: './system-tests', testMatch: 'REQ-001-002-ui-refresh.spec.ts', workers: 1, retries: 0, timeout: 60000,
  outputDir: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/' + (process.env.C3_BROWSER_RUN ?? 'browser-r2') + '-artifacts',
  reporter: [['list'], ['json', { outputFile: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/' + (process.env.C3_BROWSER_RUN ?? 'browser-r2') + '.json' }]],
  use: { baseURL: 'http://127.0.0.1:28188', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure',
    launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
})
