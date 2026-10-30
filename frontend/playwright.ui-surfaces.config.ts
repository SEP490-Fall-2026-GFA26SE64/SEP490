import { defineConfig } from '@playwright/test'
import base from './playwright.ui-refresh.config'
export default defineConfig({ ...base, testMatch: 'REQ-001-002-ui-surfaces.spec.ts',
  outputDir: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/' + (process.env.C3_SURFACES_RUN ?? 'surfaces-r2') + '-artifacts',
  reporter: [['list'], ['json', { outputFile: (process.env.C3_ARTIFACT_DIR ?? '../../../.tools/cluster3/20261024/run01') + '/' + (process.env.C3_SURFACES_RUN ?? 'surfaces-r2') + '.json' }]],
})
