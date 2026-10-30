import { defineConfig } from '@playwright/test'
import base from './playwright.ui-refresh.config'
export default defineConfig({ ...base, testMatch: 'REQ-001-002-preview-reflow.spec.ts',
  outputDir: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/reflow-r1-artifacts',
  reporter: [['list'], ['json', { outputFile: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/reflow-r1.json' }]],
})
