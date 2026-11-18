import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

/**
 * FR-04.07 Monitor employee development (L&D Manager). Runs against the isolated development Compose stack:
 *   SYSTEM_TEST_BASE_URL=http://127.0.0.1:28088 npx playwright test --config=playwright.system.config.ts FR-04-07-ld-employee-development
 * Uses only the public development fixture accounts documented in DEV-DEMO.md.
 */
const password = process.env.WORKSPACE_DEVELOPMENT_PASSWORD ?? 'Workspace-Development-490!'
const ld = 'ld@workspace.dev.invalid', employee = 'employee@workspace.dev.invalid'
const shots = 'test-results/FR-04-07'

async function login(page: Page, email: string) {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await waitForWorkspaceEntry(page)
  await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
}
async function csrf(request: APIRequestContext) {
  const value = await (await request.get('/api/v1/workspace-auth/csrf')).json() as { headerName: string; token: string }
  return { [value.headerName]: value.token }
}
type Report = { employees: { accountId: string; fullName: string; email: string; departmentId: string | null; target: unknown }[] }

test.describe.configure({ mode: 'serial' })

test('FR-04.07 setup: the employee chooses a real target role through the employee API', async ({ page }) => {
  test.setTimeout(120_000)
  await login(page, employee)
  const request = page.request
  const current = await (await request.get('/api/v1/employee/target-role-selection')).json() as { selection: { selectionId: string } | null }
  if (current.selection) return
  const roles = await (await request.get('/api/v1/employee/target-roles')).json() as { id: string; levels: { id: string }[] }[]
  expect(roles.length).toBeGreaterThan(0)
  for (const role of roles) for (const level of [...role.levels].reverse()) {
    const response = await request.put('/api/v1/employee/target-role-selection', { headers: { ...(await csrf(request)), 'Idempotency-Key': crypto.randomUUID() },
      data: { roleId: role.id, levelId: level.id, expectedCurrentSelectionId: null } })
    if (response.ok()) return
  }
  throw new Error('No selectable target role/level for the development employee')
})

test('FR-04.07 an Employee cannot read the L&D development report', async ({ page }) => {
  await login(page, employee)
  expect((await page.request.get('/api/v1/ld/development/employees')).status()).toBe(403)
})

test('FR-04.07 dashboard shows numbers and charts only, from the real report', async ({ page }) => {
  test.setTimeout(120_000)
  await login(page, ld)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const report = await (await page.request.get('/api/v1/ld/development/employees')).json() as Report
  expect(report.employees.length).toBeGreaterThan(0)
  await page.goto('/ld-manager/dashboard')
  const nav = page.getByRole('navigation', { name: 'Portal feature tabs' })
  await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page', { timeout: 45_000 })
  await expect(nav.getByRole('link', { name: 'Employees', exact: true })).toHaveAttribute('href', /\/ld-manager\/employees$/)
  await expect(nav.getByRole('link', { name: 'Team Matrix' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Development dashboard' })).toBeVisible()
  const kpis = page.getByRole('region', { name: 'Key development indicators' })
  await expect(kpis.getByText(String(report.employees.length), { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('img', { name: 'Development status distribution' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Department development summary' })).toBeVisible()
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${shots}/dashboard-desktop.png`, fullPage: true })
  // Selecting a chart segment opens the matching filtered employee list.
  await page.getByRole('heading', { name: 'Development status' }).locator('xpath=ancestor::article').getByRole('button').first().click()
  await expect(page).toHaveURL(/\/ld-manager\/employees\?status=/)
  expect(errors.filter(text => !text.includes('favicon'))).toEqual([])
})

test('FR-04.07 employee list filters and opens a detailed development profile', async ({ page }) => {
  test.setTimeout(150_000)
  await login(page, ld)
  const errors: string[] = [], failed: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.url().includes('/api/v1/ld/development') && !response.ok()) failed.push(response.url() + ' ' + response.status()) })
  const report = await (await page.request.get('/api/v1/ld/development/employees')).json() as Report
  await page.goto('/ld-manager/team-matrix')
  await expect(page).toHaveURL(/\/ld-manager\/employees$/, { timeout: 45_000 })
  await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible({ timeout: 45_000 })
  const rows = page.getByTestId('ld-employee-row')
  await expect(rows).toHaveCount(Math.min(10, report.employees.length))
  await page.screenshot({ path: `${shots}/employees-desktop.png`, fullPage: true })

  await page.getByRole('textbox', { name: 'Search employees' }).fill('no-such-employee-zz')
  await expect(page.getByText('No employees match these filters')).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).first().click()
  await expect(rows).toHaveCount(Math.min(10, report.employees.length))

  const departmentId = report.employees.find(item => item.departmentId)?.departmentId
  if (departmentId) {
    await page.goto('/ld-manager/employees?department=' + encodeURIComponent(departmentId))
    await expect(rows).toHaveCount(report.employees.filter(item => item.departmentId === departmentId).length, { timeout: 45_000 })
  }

  const chosen = report.employees.find(item => item.email === employee) ?? report.employees[0]
  await page.goto('/ld-manager/employees')
  await expect(rows.first()).toBeVisible({ timeout: 45_000 })
  await rows.filter({ hasText: chosen.fullName }).first().click()
  await expect(page).toHaveURL(new RegExp('/ld-manager/employees/' + chosen.accountId))
  await expect(page.getByRole('heading', { name: chosen.fullName, level: 1 })).toBeVisible({ timeout: 30_000 })
  const detail = await (await page.request.get('/api/v1/ld/development/employees/' + chosen.accountId)).json() as { competency: { data: unknown }; employee: { target: unknown } }
  if (detail.competency.data) await expect(page.getByTestId('ld-competency-profile')).toBeVisible()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${shots}/detail-competency.png`, fullPage: true })
  for (const [tab, expected] of [['Skill gaps', /Open skill gaps|No open skill gaps|target role yet/], ['Learning pathway', /pathway/i], ['Assessment outcomes', /assessment/i], ['Achievements', /achievement/i]] as const) {
    await page.getByRole('tab', { name: new RegExp(tab) }).click()
    await expect(page.getByRole('tabpanel')).toContainText(expected)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: `${shots}/detail-${tab.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true })
  }
  await page.getByRole('link', { name: 'Back to employees' }).click()
  await expect(page).toHaveURL(/\/ld-manager\/employees$/)

  expect((await page.request.get('/api/v1/ld/development/employees/' + crypto.randomUUID())).status()).toBe(404)
  expect(failed).toEqual([])
  expect(errors.filter(text => !text.includes('favicon'))).toEqual([])
})

test('FR-04.07 mobile layout keeps list and detail usable', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, ld)
  await page.goto('/ld-manager/employees')
  await expect(page.getByTestId('ld-employee-row').first()).toBeVisible({ timeout: 45_000 })
  await page.screenshot({ path: `${shots}/employees-mobile.png`, fullPage: true })
  await page.getByTestId('ld-employee-row').first().click()
  await expect(page.getByRole('link', { name: 'Back to employees' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('tab', { name: /Competency profile/ })).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${shots}/detail-mobile.png`, fullPage: true })
  await page.goto('/ld-manager/dashboard')
  await expect(page.getByRole('heading', { name: 'Development dashboard' })).toBeVisible({ timeout: 45_000 })
  await expect(page.getByRole('region', { name: 'Key development indicators' })).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${shots}/dashboard-mobile.png`, fullPage: true })
})
