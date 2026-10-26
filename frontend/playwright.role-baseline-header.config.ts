import { defineConfig } from '@playwright/test'
import baseline from './playwright.role-baseline.config'
export default defineConfig({
  ...baseline,
  testMatch: ['REQ-001-002-role-baseline.spec.ts', 'REQ-001-002-header-responsive.spec.ts'],
  outputDir: '../../../.tools/cluster4/20261023/playwright-artifacts',
  reporter: [['list'], ['json', { outputFile: '../../../.tools/cluster4/20261023/playwright.json' }]],
})
