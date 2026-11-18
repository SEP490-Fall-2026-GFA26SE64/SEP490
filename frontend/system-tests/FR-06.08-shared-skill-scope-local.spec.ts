import { test, expect } from '@playwright/test'
// Real local APIs; only authentication writes. Never start/resume/submit a primary-account paper.
test('local shared Skill history loads at both viewports without creating or finalizing a paper', async ({ browser, baseURL }) => {
  test.setTimeout(420000)
  expect(new URL(baseURL!).port).toBe('8088')
  const context = await browser.newContext({ baseURL })
  try {
    const csrf = await (await context.request.get('/api/v1/workspace-auth/csrf')).json()
    const signed = await context.request.post('/api/v1/workspace-auth/sign-in', { data: { email: process.env.INDIVIDUAL_TEST_EMAIL, password: process.env.INDIVIDUAL_TEST_PASSWORD }, headers: { [csrf.headerName]: csrf.token } })
    expect(signed.status()).toBe(200); const identity = await signed.json()
    const locator = new URLSearchParams({ skillId: 'c5161c56-1336-30d6-82f3-06875f572309', knowledgeLevel: 'FOUNDATION', skillVersion: '0.12.1', page: '0', size: '20' })
    const path = '/api/v1/employee/baseline-attempts/skill-scope/history?' + locator
    const response = await context.request.get(path); expect(response.status()).toBe(200)
    const before = await response.json(); expect(before.scope.skillVersion).toBe('0.12.1'); expect(before.totalAttempts).toBeGreaterThanOrEqual(before.items.length)
    const anonymous = await browser.newContext({ baseURL })
    try { expect((await anonymous.request.get(path)).status()).toBe(401) } finally { await anonymous.close() }
    const page = await context.newPage(), errors: string[] = [], writes: string[] = [], failed: string[] = [], consoleErrors: string[] = [], scopeErrors: number[] = []
    page.on('response', r => { if (r.url().includes('/baseline-attempts/skill-scope/history') && r.status() >= 400) scopeErrors.push(r.status()) })
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (r.method() !== 'GET' && !r.url().includes('/workspace-auth/')) writes.push(r.method() + ' ' + new URL(r.url()).pathname) })
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.goto(`/workspace/${identity.workspaceSlug}/employee/upskilling?tab=skills`)
    const search = page.getByRole('searchbox', { name: 'Search skills or modules', exact: true }); await search.fill('MS-CORE01')
    await page.getByRole('button', { name: 'View modules', exact: true }).first().click()
    const panel = page.getByRole('region', { name: 'Skill Assessment', exact: true })
    await expect(panel.getByText(/Attempts used:/)).toContainText(String(before.totalAttempts), { timeout: 120000 })
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      await panel.getByRole('button', { name: 'Assessment history', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Shared assessment history', exact: true }); await expect(dialog).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `test-results/shared-skill-local-${width}.png`, fullPage: true })
      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    }
    const after = await (await context.request.get(path)).json()
    expect(after.totalAttempts).toBe(before.totalAttempts); expect(after.items).toEqual(before.items); expect(after.activeAttempts).toEqual(before.activeAttempts)
    expect(writes).toEqual([]); expect(errors).toEqual([]); expect(failed).toEqual([]); expect(scopeErrors).toEqual([]); await test.info().attach('full-app-console-including-unrelated-shell-requests', { body: JSON.stringify(consoleErrors), contentType: 'application/json' })
  } finally { await context.close() }
})
