import { test, expect } from '@playwright/test'

// Visual fixtures only. These timings are NOT research measurements.
const metric = { count: 1000, meanMs: 2.5, p95Ms: 4.2, minMs: 0.5, maxMs: 12 }
const run = {
  id: '00000000-0000-0000-0000-000000000042', createdBy: 'visual-fixture', status: 'SUCCEEDED',
  createdAt: '2026-10-21T08:00:00Z', finishedAt: '2026-10-21T08:01:00Z', seed: 42,
  sizes: [1000, 5000, 10000], sourceHash: 'fixture-source-hash', sourceVersion: '0.9.0', rulesVersion: 'rq2-v1',
  iterations: 1000, warmup: 30, completedQueries: 3000, phase: 'Completed', failure: null,
  environment: { deployment: 'VISUAL TEST FIXTURE — not measured', query: 'Test query' },
  results: [1000, 5000, 10000].map(nodeCount => ({ nodeCount, edgeCount: nodeCount * 5,
    nodeCounts: { MicroSkill: 79, LearningModule: 85 }, edgeCounts: { TEACHES: 181 },
    generationMs: 123, importMs: 456, overall: metric,
    byHop: { 3: { ...metric, count: 334 }, 4: { ...metric, count: 333 }, 5: { ...metric, count: 333 } },
  })),
}
test.describe.configure({ timeout: 120000 })

test('Research layout, downloads, mobile overflow and failed state (fixtures)', async ({ page }) => {
  test.setTimeout(120_000)
  let failed = false
  await page.route('**/api/v1/admin/research/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/session')) return route.fulfill({ json: { username: 'visual-fixture', csrfToken: 'fixture', csrfHeader: 'X-XSRF-TOKEN' } })
    if (path.endsWith('/catalog')) return route.fulfill({ json: { sourceVersion: '0.9.0', sourceHash: 'fixture', nodeCounts: { Occupation: 5, TargetRole: 48, Level: 144, Competency: 472, MicroSkill: 79, LearningModule: 85 }, edgeCounts: { TEACHES: 181 }, sizes: [1000, 5000, 10000], iterations: 1000, minIterations: 3, maxIterations: 100000, warmup: 30, rulesVersion: 'rq2-v1' } })
    if (path.endsWith('/runs')) return route.fulfill({ json: [{ ...run, status: failed ? 'FAILED' : 'SUCCEEDED', failure: failed ? 'Fixture: database disconnected' : null }] })
    if (path.endsWith('.md')) return route.fulfill({ contentType: 'text/markdown', body: '# Fixture rules' })
    return route.fulfill({ status: 404, json: { message: 'Unexpected fixture request' } })
  })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => { localStorage.setItem('auth_user', 'visual-fixture'); localStorage.setItem('active_actor', 'admin') })
  await page.goto('/admin/research')
  await expect(page.getByRole('link', { name: 'Research', exact: true })).toBeVisible()
  await expect(page.getByText('Administrator access', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Research scope')).toHaveText(/RQ1.*RQ2.*RQ3/)
  await expect(page.getByRole('button', { name: 'Export PDF report' })).toBeEnabled()
  await expect(page.getByText('Latency by graph size and depth')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('research-desktop.png'), fullPage: true })
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Research rules', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('rq2-rules.md')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.screenshot({ path: test.info().outputPath('research-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  failed = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText('Fixture: database disconnected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export PDF report' })).toBeDisabled()
})
