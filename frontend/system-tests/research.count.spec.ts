import { test, expect } from '@playwright/test'

// UI fixture only: captures the submitted contract; never starts a research benchmark.
test('RQ2 dataset count generates sequential seeds and validates integer limits', async ({ page }) => {
  test.setTimeout(180_000)
  let submitted: unknown
  await page.route('**/api/v1/admin/research/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/catalog')) return route.fulfill({ json: { sourceVersion: '0.9.0', sourceHash: 'ui-fixture', nodeCounts: { Occupation: 6, TargetRole: 48, Level: 144, Competency: 472, MicroSkill: 79, LearningModule: 84 }, edgeCounts: { TEACHES: 181 }, sizes: [1000,5000,10000], defaultSeeds: [1,2,3,4,5], defaultPairsPerHop: 500, maxPairsPerHop: 10000, defaultRounds: 3, maxRounds: 10, maxSeeds: 10, maxTotalQueries: 1000000, rulesVersion: 'rq2-v3' } })
    if (path.endsWith('/session')) return route.fulfill({ json: { username: 'ui-fixture', csrfHeader: 'X-CSRF-TOKEN', csrfToken: 'fixture-token' } })
    if (path.endsWith('/runs') && route.request().method() === 'GET') return route.fulfill({ json: [] })
    if (path.endsWith('/runs') && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON()
      return route.fulfill({ status: 409, json: { message: 'UI payload verified; no benchmark started.' } })
    }
    return route.fulfill({ status: 404, json: { message: 'Unexpected UI fixture request' } })
  })
  await page.addInitScript(() => { localStorage.setItem('auth_user', 'ui-fixture'); localStorage.setItem('active_actor', 'admin') })
  await page.goto('/admin/research')
  const count = page.getByLabel('Datasets per graph size', { exact: true })
  await expect(count).toHaveValue('5')
  await expect(count).toHaveAttribute('type', 'number')
  await expect(count).toHaveAttribute('min', '1')
  await expect(count).toHaveAttribute('max', '10')
  await expect(page.getByLabel('Dataset seeds', { exact: true })).toHaveCount(0)
  const button = page.getByRole('button', { name: 'Generate & run benchmark', exact: true })
  await expect(button).toBeEnabled()
  for (const value of ['0', '11', '2.5', '']) {
    await count.fill(value)
    await button.click()
    expect(submitted).toBeUndefined()
    expect(await count.evaluate(el => (el as HTMLInputElement).checkValidity())).toBe(false)
  }
  await count.fill('3')
  await page.getByRole('checkbox', { name: '5,000', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: '10,000', exact: true }).uncheck()
  await expect(page.getByText('13,500', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: test.info().outputPath('dataset-count-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('dataset-count-mobile.png'), fullPage: true })
  await button.click()
  await expect(page.getByRole('alert')).toContainText('UI payload verified')
  expect(submitted).toEqual({ seeds: [1,2,3], sizes: [1000], pairsPerHop: 500, rounds: 3 })
})
