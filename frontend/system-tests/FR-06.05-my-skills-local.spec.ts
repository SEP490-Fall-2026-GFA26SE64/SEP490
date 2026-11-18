import { test, expect as baseExpect } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const expect = baseExpect.configure({ timeout: 40000 })
// Read-only acceptance on the existing local account. Never awards achievement or starts an exam.
test('My Skills shows actual own official Skill levels with menu/Profile navigation', async ({ browser, baseURL }) => {
  test.setTimeout(240000)
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  try {
    const csrf = await (await context.request.get('/api/v1/workspace-auth/csrf')).json()
    const login = await context.request.post('/api/v1/workspace-auth/sign-in', { data: { email: process.env.INDIVIDUAL_TEST_EMAIL, password: process.env.INDIVIDUAL_TEST_PASSWORD }, headers: { [csrf.headerName]: csrf.token } })
    expect(login.status()).toBe(200)
    const identity = await login.json()
    const before: any[] = []
    for (let p = 0; p <= 250; p++) {
      const response = await context.request.get(`/api/v1/employee/knowledge-profile?page=${p}`)
      expect(response.status()).toBe(200)
      const data = await response.json(); before.push(...data.items)
      if (!data.hasMore) break
      expect(p).toBeLessThan(250)
    }
    const evidence = before.filter(e => e.kind === 'EVIDENCE')
    const expected = new Map<string, any>()
    for (const e of evidence) expected.set(JSON.stringify([e.skillId, e.skillVersion, e.knowledgeLevel]), e)
    const groups = new Set(evidence.map(e => JSON.stringify([e.skillId, e.skillVersion])))
    const page = await context.newPage(), writes: string[] = [], errors: string[] = [], failed: string[] = [], consoleErrors: { text: string; url: string }[] = []
    page.on('request', r => { if (r.method() !== 'GET' && !r.url().includes('/workspace-auth/')) writes.push(r.method() + ' ' + new URL(r.url()).pathname) })
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), url: m.location().url }) })
    await page.addInitScript(() => { localStorage.setItem('app_language', 'en'); localStorage.setItem('sidebar_collapsed_employee', 'false') })
    const root = `/workspace/${identity.workspaceSlug}`
    await page.goto(root + '/employee/my-skills', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'My Skills', exact: true })).toBeVisible()
    if (groups.size) {
      await expect(page.getByRole('list', { name: 'Achieved skills' }).getByRole('listitem')).toHaveCount(groups.size, { timeout: 40000 })
      for (const e of expected.values()) {
        const level = e.knowledgeLevel.charAt(0) + e.knowledgeLevel.slice(1).toLowerCase()
        await expect(page.getByRole('button', { name: `${e.skillName || e.skillId} · ${level} · ${e.skillVersion}`, exact: true })).toBeVisible()
      }
      const first = expected.values().next().value
      const level = first.knowledgeLevel.charAt(0) + first.knowledgeLevel.slice(1).toLowerCase()
      await page.getByRole('button', { name: `${first.skillName || first.skillId} · ${level} · ${first.skillVersion}`, exact: true }).click()
      await expect(page.getByRole('dialog', { name: 'Achievement details' })).toBeVisible()
      await expect(page.getByRole('dialog').getByText('Achieved', { exact: true })).toBeVisible()
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
    } else await expect(page.getByText('No achieved skills yet')).toBeVisible({ timeout: 40000 })
    await expect(page.getByRole('link', { name: 'My Skills', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.screenshot({ path: 'test-results/my-skills-local-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/my-skills-local-mobile.png', fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(root + '/profile', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'My achieved skills', exact: true }).click()
    await expect(page).toHaveURL(/\/employee\/my-skills$/)
    await expect(page.getByRole('heading', { name: 'My Skills', exact: true })).toBeVisible()
    await page.reload({ waitUntil: 'domcontentloaded' })
    if (groups.size) await expect(page.getByRole('list', { name: 'Achieved skills' }).getByRole('listitem')).toHaveCount(groups.size, { timeout: 40000 })
    const anon = await browser.newContext({ baseURL })
    try { expect((await anon.request.get('/api/v1/employee/knowledge-profile?page=0')).status()).toBe(401) } finally { await anon.close() }
    if (process.env.INDIVIDUAL_EXPERT_EMAIL) {
      const staff = await browser.newContext({ baseURL })
      try {
        const proof = await (await staff.request.get('/api/v1/workspace-auth/csrf')).json()
        expect((await staff.request.post('/api/v1/workspace-auth/sign-in', { data: { email: process.env.INDIVIDUAL_EXPERT_EMAIL, password: process.env.INDIVIDUAL_TEST_PASSWORD }, headers: { [proof.headerName]: proof.token } })).status()).toBe(200)
        expect((await staff.request.get('/api/v1/employee/knowledge-profile?page=0')).status()).toBe(403)
      } finally { await staff.close() }
    }
    const baselineUrls = new Set([new URL('/favicon.ico', baseURL).href, new URL(`/api/v1/organizations/${identity.organizationId}/subscription/member-references`, baseURL).href])
    if (identity.organizationId !== 'e0000000-0000-0000-0000-000000000001') baselineUrls.add(new URL('/api/v1/organizations/e0000000-0000-0000-0000-000000000001/micro-skills', baseURL).href)
    const knownCompatibility = consoleErrors.filter(e => e.url === new URL('/api/v1/module-management/notifications/unobserved', baseURL).href && e.text.includes('404 (Not Found)'))
    const unexpected = consoleErrors.filter(e => !baselineUrls.has(e.url) && !knownCompatibility.includes(e))
    writeFileSync('test-results/my-skills-local-summary.json', JSON.stringify({ totalProfileRecords: before.length, officialEvidence: evidence.length, achievedSkillVersions: groups.size, achievedLevels: expected.size, sourceKinds: [...new Set(evidence.map(e => e.sourceKind))], writes, errors, failed, consoleErrors, unexpected }, null, 2))
    expect(writes).toEqual([]); expect(errors).toEqual([]); expect(failed).toEqual([]); expect(unexpected).toEqual([])
  } finally { await context.close() }
})
