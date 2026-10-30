import { defineConfig } from '@playwright/test'
import base from './playwright.role-baseline.config'
const artifacts = process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run02'
const run = process.env.C3_POSTREPAIR_RUN ?? 'postrepair'
export default defineConfig({ ...base, testMatch: 'REQ-001-002-postrepair-readonly.spec.ts', timeout: 120000,
  outputDir: artifacts + '/' + run + '-artifacts',
  reporter: [['list'], ['json', { outputFile: artifacts + '/' + run + '.json' }]],
})
