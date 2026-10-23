import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.describe.configure({ timeout: 600000 })

test('RQ2 real end-to-end generation, polling, isolation access and report exports', async ({ page, request }) => {
  test.setTimeout(600_000)
  expect((await request.get('/api/v1/admin/research/runs')).status()).toBe(401)
  await page.goto('/login')
  await page.getByRole('button', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/dashboard')
  await page.getByRole('link', { name: 'Research', exact: true }).click()
  await expect(page.getByText('Administrator access', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Configure RQ2')).toBeVisible()
  const sizes = process.env.RESEARCH_SMOKE === 'true' ? [1000] : [1000, 5000, 10000]
  if (sizes.length === 1) {
    await page.getByRole('checkbox', { name: '5,000', exact: true }).uncheck()
    await page.getByRole('checkbox', { name: '10,000', exact: true }).uncheck()
  }
  const pairsPerHop = Number(process.env.RESEARCH_PAIRS ?? (sizes.length === 1 ? '7' : '500'))
  const rounds = Number(process.env.RESEARCH_ROUNDS ?? (sizes.length === 1 ? '2' : '3'))
  const datasetCount = Number(process.env.RESEARCH_DATASETS ?? (sizes.length === 1 ? '2' : '5'))
  const seeds = Array.from({ length: datasetCount }, (_, index) => index + 1)
  await page.getByLabel('Datasets per graph size', { exact: true }).fill(String(datasetCount))
  await page.getByLabel('Distinct pairs per hop', { exact: true }).fill(String(pairsPerHop))
  await page.getByLabel('Measured rounds', { exact: true }).fill(String(rounds))
  const actorHeaders = { 'X-User-Id': 'admin.elena@adaptlearn.internal', 'X-User-Role': 'ADMIN' }
  const session = await (await request.get('/api/v1/admin/research/session', { headers: actorHeaders })).json()
  for (const invalid of [{ seeds: [1,1], pairsPerHop, rounds }, { seeds, pairsPerHop: 0, rounds }, { seeds, pairsPerHop: 1.5, rounds }, { seeds, pairsPerHop, rounds: 11 }, { seeds: [1,2], pairsPerHop: 10000, rounds: 10, sizes: [1000,5000,10000] }]) {
    const response = await request.post('/api/v1/admin/research/runs', { headers: { ...actorHeaders, [session.csrfHeader]: session.csrfToken }, data: { sizes, ...invalid } })
    expect(response.status()).toBe(400)
  }
  const started = page.waitForResponse(response => response.url().endsWith('/api/v1/admin/research/runs') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Generate & run benchmark' }).click()
  expect((await started).status()).toBe(202)
  await expect(page.getByRole('button', { name: 'Generate & run benchmark', exact: true })).toBeEnabled({ timeout: 480_000 })
  await expect(page.getByRole('button', { name: 'Export PDF report' })).toBeEnabled()
  await expect(page.getByText('Latency by graph size and depth')).toBeVisible()
  for (const [name, filename] of [['Export PDF report', 'report.pdf'], ['CSV', 'samples.csv'], ['JSON', 'raw.json'], ['Frozen rules', 'rules.md']]) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name, exact: true }).click()
    await (await download).saveAs(test.info().outputPath(filename))
  }
  const raw = JSON.parse(await readFile(test.info().outputPath('raw.json'), 'utf8'))
  expect(raw.status).toBe('SUCCEEDED')
  expect(raw.rulesVersion).toBe('rq2-v3')
  expect(raw.protocol).toEqual({ seeds, pairsPerHop, rounds })
  expect(raw.planReady).toBe(true)
  expect(raw.totalQueries).toBe(raw.completedQueries)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(raw.totalQueries))
  expect(raw.createdBy).toBe('admin.elena@adaptlearn.internal')
  expect(raw.results).toHaveLength(seeds.length * sizes.length * rounds)
  expect([...new Set(raw.results.map((r: { nodeCount: number }) => r.nodeCount))]).toEqual(sizes)
  expect(raw.completedQueries).toBe(raw.results.reduce((n: number, r: { trial: { attempted: number } }) => n + r.trial.attempted, 0))
  for (const result of raw.results) {
    const workloadCount = Object.values(result.trial.uniqueByHop).reduce((a, b) => Number(a) + Number(b), 0)
    expect(result.trial.warmupQueries).toBe(workloadCount)
    expect(result.trial.errors).toBe(0); expect(result.trial.timeouts).toBe(0)
    expect(result.trial.attempted).toBe(workloadCount)
    expect(result.samples).toHaveLength(Number(workloadCount))
    expect(new Set(result.samples.map((s: { hops: number; startId: string; moduleId: string }) => `${s.hops}:${s.startId}:${s.moduleId}`)).size).toBe(workloadCount)
    expect(result.trial.structure.averageDegree).toBe(2 * result.edgeCount / result.nodeCount)
    expect(result.trial.structure.maxDegree).toBeGreaterThan(0)
    const times = result.samples.map((s: { latencyMs: number }) => s.latencyMs).sort((a: number, b: number) => a - b)
    expect(result.overall.meanMs).toBeCloseTo(times.reduce((a: number, b: number) => a + b, 0) / times.length, 9)
    expect(result.overall.p95Ms).toBe(times[Math.ceil(times.length * 0.95) - 1])
    expect(result.overall.medianMs).toBe((times[Math.floor((times.length-1)/2)] + times[Math.floor(times.length/2)]) / 2)
    for (const hop of [3, 4, 5]) {
      const subset = result.samples.filter((s: { hops: number }) => s.hops === hop).map((s: { latencyMs: number }) => s.latencyMs).sort((a: number, b: number) => a - b)
      expect(result.byHop[hop].count).toBe(result.trial.uniqueByHop[hop])
      expect(result.trial.uniqueByHop[hop]).toBeLessThanOrEqual(pairsPerHop)
      expect(result.byHop[hop].meanMs).toBeCloseTo(subset.reduce((a: number, b: number) => a + b, 0) / subset.length, 9)
      expect(result.byHop[hop].p95Ms).toBe(subset[Math.ceil(subset.length * 0.95) - 1])
    }
    for (const sample of result.samples) expect(sample.returnedHops).toBe(sample.hops)
  }
  expect((await readFile(test.info().outputPath('samples.csv'), 'utf8')).trim().split('\n')).toHaveLength(raw.completedQueries + 1)
  expect(await readFile(test.info().outputPath('rules.md'), 'utf8')).toBe(raw.rulesMarkdown)
  await page.getByText('Dataset counts and generation timings', { exact: true }).click()
  for (const [index, result] of raw.results.filter((r: { trial: { round: number } }) => r.trial.round === 1).entries()) {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download dataset', exact: true }).nth(index).click()
    const file = test.info().outputPath(`dataset-${result.trial.seed}-${result.nodeCount}.json`)
    await (await download).saveAs(file)
    const graph = JSON.parse(await readFile(file, 'utf8'))
    expect(graph.nodes).toHaveLength(result.nodeCount)
    expect(graph.edges).toHaveLength(result.edgeCount)
    expect(graph.seed).toBe(result.trial.seed)
    expect(graph.sourceHash).toBe(raw.sourceHash)
    expect(graph.workload.length).toBe(result.trial.warmupQueries)
    const expected = graph.workload.map((w: { hops: number; startId: string; moduleId: string }) => `${w.hops}:${w.startId}:${w.moduleId}`).sort()
    for (const trial of raw.results.filter((r: { nodeCount: number; trial: { seed: number } }) => r.nodeCount === result.nodeCount && r.trial.seed === result.trial.seed)) {
      expect(trial.samples.map((w: { hops: number; startId: string; moduleId: string }) => `${w.hops}:${w.startId}:${w.moduleId}`).sort()).toEqual(expected)
    }
  }
  await expect(page.getByText('Variation between seeds and rounds')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: test.info().outputPath('research-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('research-mobile.png'), fullPage: true })
  await page.reload()
  await expect(page.getByText('Latency by graph size and depth')).toBeVisible()
  await expect(page.getByText('Administrator access', { exact: true })).toHaveCount(0)
})
