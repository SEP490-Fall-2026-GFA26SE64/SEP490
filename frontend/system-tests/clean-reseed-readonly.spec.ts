import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
// Data-reset acceptance only: auth writes permitted; no role selection, learning or examination writes.
test('clean demo Employee can browse Skill levels and Roles with empty achievements', async ({ browser, baseURL }) => {
 test.setTimeout(300000)
 const password = JSON.parse(readFileSync('../local/clean-reseed-20261117/preserved-login.private.json', 'utf8')).password
 const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
 try {
  const csrf = await (await context.request.get('/api/v1/workspace-auth/csrf')).json()
  const login = await context.request.post('/api/v1/workspace-auth/sign-in', { data: { email: 'employee@workspace.dev.invalid', password }, headers: { [csrf.headerName]: csrf.token } })
  console.log('Employee sign-in response', login.status()); expect(login.status()).toBe(200); const identity = await login.json(); const root = `/workspace/${identity.workspaceSlug}`
  const selection = await (await context.request.get('/api/v1/employee/target-role-selection')).json(); expect(selection.selection).toBeNull()
  const denied = await context.request.get('/api/v1/assessment-policies/SKILL_ASSESSMENT/scopes'); expect(denied.status()).toBe(403)
  const page = await context.newPage(), writes: string[] = [], errors: string[] = [], domainErrors: string[] = [], consoleErrors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('request', r => { if (r.method() !== 'GET' && !r.url().includes('/workspace-auth/')) writes.push(r.method() + ' ' + new URL(r.url()).pathname) })
  page.on('response', r => { if (r.status() >= 400 && /baseline-attempts|knowledge-profile|module-management\/skills\//.test(r.url())) domainErrors.push(r.status() + ' ' + new URL(r.url()).pathname) })
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto(root + '/employee/upskilling?tab=skills'); console.log('Opened Skills page')
  await page.getByRole('searchbox', { name: 'Search skills or modules', exact: true }).fill('MS-CORE01')
  await page.getByRole('button', { name: 'View modules', exact: true }).first().click(); console.log('Opened Skill modules')
  const panel = page.getByRole('region', { name: 'Skill Assessment', exact: true })
  await expect(panel.getByText(/Attempts used:/)).toContainText('0 / 3', { timeout: 120000 })
  for (const level of ['Foundation', 'Intermediate', 'Advanced']) {
   await page.getByRole('tab', { name: new RegExp('^' + level) }).click()
   await expect(panel.getByText(/Attempts used:/)).toContainText('0 / 3', { timeout: 60000 })
   await expect(panel.getByRole('button', { name: 'Take Skill Assessment' })).toBeDisabled()
  }
  console.log('Verified assessment eligibility across three levels')
  for (const width of [1440, 390]) {
   await page.setViewportSize({ width, height: 1000 })
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
   await page.screenshot({ path: test.info().outputPath(`clean-reseed-skills-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Back to skills', exact: true }).click()
  await page.getByRole('tab', { name: 'Roles', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Choose Role', exact: true }).first()).toBeVisible({ timeout: 60000 })
  await page.goto(root + '/employee/my-skills')
  await expect(page.getByRole('heading', { name: 'My Skills', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No achieved skills yet', exact: true })).toBeVisible({ timeout: 60000 })
  await expect(page.getByRole('list', { name: 'Achieved skills' })).toHaveCount(0)
  const after = await (await context.request.get('/api/v1/employee/target-role-selection')).json(); expect(after.selection).toBeNull()
  expect(writes).toEqual([]); expect(errors).toEqual([]); expect(domainErrors).toEqual([])
  await test.info().attach('full-app-console', { body: JSON.stringify(consoleErrors), contentType: 'application/json' })
  writeFileSync(test.info().outputPath('observations.json'), JSON.stringify({ writes, pageErrors: errors, domainErrors, consoleErrors }, null, 2))
 } finally { await context.close() }
})
