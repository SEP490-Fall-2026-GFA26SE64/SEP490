import { defineConfig } from '@playwright/test'
const baseURL = process.env.SYSTEM_TEST_BASE_URL ?? 'http://127.0.0.1:28088'
if (baseURL !== 'http://127.0.0.1:28088') throw new Error('This fixture suite permits only its isolated stack on port 28088')
export default defineConfig({
 testDir: './system-tests', testMatch: ['REQ-001-002-role-baseline.spec.ts', 'REQ-001-002-header-responsive.spec.ts'],
 workers: 1, fullyParallel: false, retries: 0, timeout: 90000,
 outputDir: process.env.C3_ARTIFACT_DIR ? process.env.C3_ARTIFACT_DIR + '/system-artifacts' : '../../../.tools/cluster3/20261024/run01/system-artifacts',
 reporter: [['list'], ['json', { outputFile: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/system.json' }]],
 use: { baseURL, headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure',
 launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
 // Deliberately no webServer/globalSetup/teardown: never starts or resets a shared stack.
})
