import { test, expect } from '@playwright/test'
import { writeFileSync } from 'node:fs'
// Local read-only acceptance: sign-in plus real catalog/search; never submits learning or exam progress.
test('local real Employee module search and responsive level badges', async ({ browser, baseURL }) => {
  test.setTimeout(300000)
  expect(new URL(baseURL!).port).toBe('8088')
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  try {
    const csrf = await (await context.request.get('/api/v1/workspace-auth/csrf')).json()
    const login = await context.request.post('/api/v1/workspace-auth/sign-in', { data: { email: process.env.INDIVIDUAL_TEST_EMAIL ?? 'employee@workspace.dev.invalid', password: process.env.INDIVIDUAL_TEST_PASSWORD ?? 'Workspace-Development-490!' }, headers: { [csrf.headerName]: csrf.token } })
    expect(login.status()).toBe(200)
    const identity = await login.json()
    const path = '/api/v1/module-management/skills/modules'
    const all = await context.request.get(path + '?page=0')
    expect(all.status()).toBe(200)
    const data = await all.json()
    expect(data.items.length).toBeGreaterThan(0); expect(data.items.length).toBeLessThanOrEqual(20)
    const item = data.items.find((row: any) => row.module.knowledgeLevel)
    expect(item).toBeTruthy()
    const filter = new URLSearchParams({ search: item.module.moduleId, skillId: item.skillId, knowledgeLevel: item.module.knowledgeLevel, page: '0' })
    const narrowed = await context.request.get(path + '?' + filter)
    expect(narrowed.status()).toBe(200)
    expect((await narrowed.json()).items.every((row: any) => row.skillId === item.skillId && row.module.knowledgeLevel === item.module.knowledgeLevel)).toBe(true)
    expect((await context.request.get(path + '?knowledgeLevel=INVALID')).status()).toBe(400)
    expect((await context.request.get(path + '?page=-1')).status()).toBe(400)
    const missing = await context.request.get(path + '?skillId=foreign-or-unknown-skill')
    expect((await missing.json()).items).toEqual([])
    const anonymous = await browser.newContext({ baseURL })
    try { expect((await anonymous.request.get(path)).status()).toBe(401) } finally { await anonymous.close() }
    if (process.env.INDIVIDUAL_EXPERT_EMAIL) {
      const expert = await browser.newContext({ baseURL })
      try {
        const proof = await (await expert.request.get('/api/v1/workspace-auth/csrf')).json()
        const signedIn = await expert.request.post('/api/v1/workspace-auth/sign-in', { data: { email: process.env.INDIVIDUAL_EXPERT_EMAIL, password: process.env.INDIVIDUAL_TEST_PASSWORD }, headers: { [proof.headerName]: proof.token } })
        expect(signedIn.status()).toBe(200)
        expect((await expert.request.get(path)).status()).toBe(403)
      } finally { await expert.close() }
    }
    const reads = await Promise.all([
      context.request.get(path + '?skillId=' + encodeURIComponent(item.skillId)),
      context.request.get('/api/v1/employee/knowledge-profile?kind=ALL&page=0&skillId=' + encodeURIComponent(item.skillId)),
      context.request.get('/api/v1/module-management/skills/' + encodeURIComponent(item.skillId) + '/modules'),
    ])
    expect(reads.map(r => r.status())).toEqual([200, 200, 200])
    const page = await context.newPage(), errors: string[] = [], failed: string[] = [], consoleErrors: { text: string; url: string }[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), url: m.location().url }) })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.goto(`/workspace/${identity.workspaceSlug}/employee/upskilling?tab=skills`)
    await expect(page.getByRole('heading', { name: 'Learning library', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Skills', exact: true })).toHaveCount(0)
    const firstSkillAction = page.getByRole('button', { name: 'View modules', exact: true }).first()
    await expect(firstSkillAction).toBeVisible()
    const measure = (button: HTMLElement) => {
      const style = getComputedStyle(button), card = button.closest('[data-catalog-card]')!
      const body = getComputedStyle(card.children[0]), footer = getComputedStyle(card.children[1])
      return { buttonHeight: button.getBoundingClientRect().height, fontSize: style.fontSize, background: style.backgroundColor, bodyPadding: body.padding, bodyMinHeight: body.minHeight, footerPadding: footer.padding, footerMinHeight: footer.minHeight }
    }
    expect(await firstSkillAction.evaluate(button => getComputedStyle(button.closest('[data-catalog-card]')!.children[1]).borderTopWidth)).toBe('0px')
    const skillVisual = await firstSkillAction.evaluate(measure)
    await page.screenshot({ path: 'test-results/skill-card-match-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/skill-card-match-mobile.png', fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole('tab', { name: 'Roles', exact: true }).click()
    const roleAction = page.locator('[data-catalog-card] button.bg-primary').first()
    await expect(roleAction).toBeVisible({ timeout: 30000 })
    expect(parseFloat(await roleAction.evaluate(button => getComputedStyle(button.closest('[data-catalog-card]')!.children[1]).borderTopWidth))).toBeGreaterThan(0)
    const roleVisual = await roleAction.evaluate(measure)
    expect(skillVisual).toEqual(roleVisual)
    writeFileSync('test-results/skill-role-card-style.json', JSON.stringify({ skillVisual, roleVisual }, null, 2))
    await page.screenshot({ path: 'test-results/role-card-match-desktop.png', fullPage: true })
    await test.info().attach('shared-skill-role-card-visuals', { body: JSON.stringify({ skillVisual, roleVisual }), contentType: 'application/json' })
    await page.getByRole('tab', { name: 'Skills', exact: true }).click()
    await page.getByRole('button', { name: 'Modules', exact: true }).click()
    await page.getByRole('searchbox', { name: 'Search skills or modules', exact: true }).fill(item.module.moduleId)
    await expect(page.getByRole('heading', { name: item.module.title, exact: true })).toBeVisible({ timeout: 60000 })
    const level = item.module.knowledgeLevel.charAt(0) + item.module.knowledgeLevel.slice(1).toLowerCase()
    await expect(page.getByRole('region', { name: 'Modules', exact: true }).getByText(level, { exact: true })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Learning modules' })).toBeVisible()
    await page.getByRole('button', { name: 'Card view' }).click()
    await expect(page.getByRole('table', { name: 'Learning modules' })).toHaveCount(0)
    await page.getByRole('button', { name: 'List view' }).click()
    await page.screenshot({ path: 'test-results/individual-skill-search-local-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/individual-skill-search-local-mobile.png', fullPage: true })
    await page.reload()
    await expect(page.getByRole('group', { name: 'Result type', exact: true })).toBeVisible()
    // Existing page-shell requests are outside this search slice: record exact known failures,
    // while treating any failure on the new search or the actor's own catalog as unexpected.
    const baselineUrls = new Set([
      new URL('/favicon.ico', baseURL).href,
      new URL(`/api/v1/organizations/${identity.organizationId}/subscription/member-references`, baseURL).href,
    ])
    if (identity.organizationId !== 'e0000000-0000-0000-0000-000000000001') baselineUrls.add(new URL('/api/v1/organizations/e0000000-0000-0000-0000-000000000001/micro-skills', baseURL).href)
    const unexpectedConsole = consoleErrors.filter(error => !baselineUrls.has(error.url))
    writeFileSync('test-results/individual-skill-search-local-summary.json', JSON.stringify({ totalItems: data.totalItems, moduleId: item.module.moduleId, skillId: item.skillId, knowledgeLevel: item.module.knowledgeLevel, pageErrors: errors, failedRequests: failed, consoleErrors, unexpectedConsole, concurrentReads: reads.map(r => r.status()) }, null, 2))
    expect(errors).toEqual([]); expect(failed).toEqual([]); expect(unexpectedConsole).toEqual([])
    await test.info().attach('real-browser-console', { body: JSON.stringify(consoleErrors), contentType: 'application/json' })
    await test.info().attach('real-read-only-search-summary', { body: JSON.stringify({ totalItems: data.totalItems, moduleId: item.module.moduleId, skillId: item.skillId, knowledgeLevel: item.module.knowledgeLevel }), contentType: 'application/json' })
  } finally { await context.close() }
})
