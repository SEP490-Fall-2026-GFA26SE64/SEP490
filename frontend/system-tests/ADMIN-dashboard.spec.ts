import { expect, test, type Page, type Response } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

/**
 * FR-03.05 Organization Administrator dashboard at /admin/dashboard (real APIs, no mock data).
 * Runs against a Compose development stack on 8088:
 *   npm run test:system:f02 -- ADMIN-dashboard
 */
const shots = 'test-results/ADMIN-dashboard'

async function login(page: Page, email: string) {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await waitForWorkspaceEntry(page)
  await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
}

function watch(page: Page) {
  const problems: string[] = []
  page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`) })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('response', response => { if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`) })
  return problems
}

const api = (suffix: RegExp) => (response: Response) =>
  response.request().method() === 'GET' && suffix.test(new URL(response.url()).pathname)

type ApiMember = { active: boolean; accountActive: boolean }
type ApiInvitation = { state: string }
type ApiSummary = { usedSeats: number; allocatedSeats: number; current: { terms: { name: string } } | null }

async function openDashboard(page: Page) {
  const responses = Promise.all([
    page.waitForResponse(api(/\/organizations\/[^/]+\/subscription$/)),
    page.waitForResponse(api(/\/subscription\/members$/)),
    page.waitForResponse(api(/\/subscription\/activations$/)),
    page.waitForResponse(api(/\/organizations\/[^/]+\/departments$/)),
    page.waitForResponse(api(/\/organizations\/[^/]+\/job-positions$/)),
    page.waitForResponse(api(/\/organizations\/[^/]+\/target-roles$/)),
  ])
  await page.getByRole('navigation', { name: 'Portal feature tabs' }).getByRole('link', { name: 'Dashboard', exact: true }).click()
  const [summary, members, invitations, departments, jobPositions, targetRoles] = await responses
  for (const response of [summary, members, invitations, departments, jobPositions, targetRoles]) expect(response.status()).toBe(200)
  return {
    summary: await summary.json() as ApiSummary,
    members: await members.json() as ApiMember[],
    invitations: await invitations.json() as ApiInvitation[],
    departments: (await departments.json() as unknown[]).length,
    jobPositions: (await jobPositions.json() as unknown[]).length,
    targetRoles: await targetRoles.json() as { status: string }[],
  }
}

test.describe.configure({ mode: 'serial' })

test('organization administrator opens the Dashboard tab and sees real workspace figures', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, 'admin@technova.com')
  const problems = watch(page)
  const data = await openDashboard(page)

  await expect(page).toHaveURL(/\/admin\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expect(page.getByText('System Console')).toHaveCount(0)

  const active = data.members.filter(member => member.active && member.accountActive).length
  await expect(page.getByTestId('kpi-members')).toContainText(String(active))
  await expect(page.getByTestId('kpi-members')).toContainText(`${data.members.length} total`)
  await expect(page.getByTestId('kpi-seats')).toContainText(`${data.summary.usedSeats} / ${data.summary.allocatedSeats}`)
  if (data.summary.current) await expect(page.getByTestId('kpi-subscription')).toContainText(data.summary.current.terms.name)
  const published = data.targetRoles.filter(role => ['ACTIVE', 'PUBLISHED'].includes(role.status.toUpperCase())).length
  const targetRoleCard = page.getByTestId('kpi-target-roles')
  await expect(targetRoleCard.getByRole('heading', { name: String(published), exact: true })).toBeVisible()
  await expect(targetRoleCard).toContainText(`${data.targetRoles.length} target roles in total`)

  const pending = data.invitations.filter(invitation => invitation.state === 'PENDING').length
  const attention = page.getByTestId('dashboard-attention')
  await expect(attention.getByRole('link', { name: /Invitations awaiting activation/ })).toContainText(String(pending))
  await expect(page.getByTestId('structure-departments')).toContainText(String(data.departments))
  await expect(page.getByTestId('structure-job-positions')).toContainText(String(data.jobPositions))
  await expect(page.getByTestId('dashboard-roles')).toBeVisible()
  await page.screenshot({ path: `${shots}/desktop.png`, fullPage: true })

  await attention.getByRole('link', { name: /Invitations awaiting activation/ }).click()
  await expect(page).toHaveURL(/\/admin\/users$/)
  expect(problems).toEqual([])
})

test('organization administrator dashboard fits a mobile viewport', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'admin@technova.com')
  const problems = watch(page)
  // A full reload on the Vite dev stack re-fetches source modules, so allow for slow first paint.
  await page.goto('/admin/dashboard', { timeout: 90_000 })
  await expect(page.getByTestId('kpi-seats')).toContainText(/\d+ \/ \d+/, { timeout: 60_000 })
  await expect(page.getByTestId('kpi-members')).toContainText(/\d+ total/, { timeout: 60_000 })
  await expect(page.getByTestId('kpi-target-roles')).toContainText(/target roles in total/, { timeout: 60_000 })
  await expect(page.getByTestId('structure-departments')).toContainText(/\d/, { timeout: 60_000 })
  await expect(page.getByTestId('structure-job-positions')).toContainText(/\d/, { timeout: 60_000 })
  await expect(page.getByTestId('dashboard-attention').getByRole('link', { name: /Invitations awaiting activation/ })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('dashboard-structure')).not.toContainText('Loading', { timeout: 60_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.screenshot({ path: `${shots}/mobile.png`, fullPage: true })
  expect(problems).toEqual([])
})

test('employees cannot open the administrator dashboard', async ({ page }) => {
  test.setTimeout(120_000)
  await login(page, 'employee@technova.com')
  await page.goto('/admin/dashboard')
  await expect(page.getByText('Your authenticated role cannot enter this workspace.')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('kpi-members')).toHaveCount(0)
  await page.screenshot({ path: `${shots}/employee-denied.png`, fullPage: true })
})
