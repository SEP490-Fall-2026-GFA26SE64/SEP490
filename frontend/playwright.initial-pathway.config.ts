/// <reference types="node" />
import { defineConfig } from '@playwright/test'
import process from 'node:process'

const baseURL = process.env.SYSTEM_TEST_BASE_URL
const project = process.env.C3_COMPOSE_PROJECT
if (baseURL !== 'http://127.0.0.1:38088') throw new Error('C3 requires explicit isolated SYSTEM_TEST_BASE_URL=http://127.0.0.1:38088; shared8088 is forbidden')
if (!project || !/^adapt-learn-graph-c3-pathway-[a-z0-9-]+$/.test(project)) throw new Error('C3 requires the dedicated Compose project identity')
const artifacts = process.env.C3_ARTIFACT_DIR
if (!artifacts) throw new Error('C3_ARTIFACT_DIR must identify this isolated run')
export default defineConfig({
  testDir: './system-tests', testMatch: 'REQ-019-F01-expert-pathway-review-flow.spec.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 180000,
  outputDir: artifacts + '/system-artifacts',
  reporter: [['list'], ['json', { outputFile: artifacts + '/system.json' }]],
  use: { baseURL, headless: true, screenshot: 'only-on-failure', trace: 'off',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' } },
  // No automatic webServer, reset, fixture routes, cleanup or default shared URL.
})
