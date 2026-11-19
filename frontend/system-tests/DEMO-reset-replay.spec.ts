import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { observe, record, text } from './subscriptionHelpers'

// Destructive: /reset removes every non-seed organization, so this spec only runs against a disposable stack.
const STACK = process.env.DEMO_RESET_STACK ?? 'alg-demo'
const DEMO = path.resolve('..', 'Demo')
const ADMIN = { email: 'demo.inbox+admin@example.com', password: 'Brightpath@Demo2026', name: 'Michael Carter', phone: '+1 415 555 0123' }
// Invitations go through real SMTP one row at a time.
test.setTimeout(900_000)

test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:8099') throw new Error('Use only the disposable alg-demo stack on port 8099.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

function psql(sql: string) {
  return execFileSync('docker', ['exec', `${STACK}-postgres-1`, 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-At', '-c', sql],
    { encoding: 'utf8' }).trim()
}
function demoFile(name: string) {
  return { name, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: readFileSync(path.join(DEMO, name)) }
}
function watch(page: Page) {
  const seen = observe(page)
  page.on('console', message => {
    if (message.type() !== 'error') return
    const where = new URL(message.location().url || page.url()).pathname
    if (where === '/favicon.ico') return
    if (message.text().includes('status of 401') && ['/api/v1/registration/current', '/api/v1/workspace-auth/current'].includes(where)) return
    seen.errors.push(`${message.text()} (${where})`)
  })
  page.on('response', response => { if (response.status() >= 500) seen.errors.push(`${response.status()} ${response.url()}`) })
  return seen
}

async function openReset(page: Page) {
  const reset = page.waitForResponse(r => r.url().endsWith('/api/v1/demo/reset') && r.request().method() === 'POST')
  await page.goto('/reset')
  const response = await reset
  expect(response.status()).toBe(200)
  await expect(page.getByRole('status').filter({ hasText: 'Demo data has been reset.' })).toBeVisible()
  return record(await response.json())
}

async function combobox(page: Page, name: string, option: string) {
  await page.getByRole('combobox', { name, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

/** Steps 1-7 of the onboarding wizard with the values documented in Demo/Demo.md. */
async function onboard(page: Page) {
  await page.goto('/guest/register')
  await page.getByLabel('Business name', { exact: false }).fill('Brightpath Technologies Inc.')
  await combobox(page, 'Country', 'United States')
  await combobox(page, 'Industry', 'Software & artificial intelligence')
  await page.getByLabel('Workspace address', { exact: false }).fill('brightpath')
  await page.getByRole('button', { name: 'Import structure', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Import organization structure' })
  await page.getByTestId('org-structure-file').setInputFiles(demoFile('01_Org_Structure_Brightpath.xlsx'))
  await expect(dialog.getByRole('tree', { name: 'Imported organization structure' }).getByRole('treeitem')).toHaveCount(28, { timeout: 30_000 })
  await dialog.getByRole('button', { name: 'Apply structure', exact: true }).click()
  await expect(page.getByLabel('Imported structure counts')).toContainText('Department: 4')
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.getByLabel('Full name', { exact: false }).fill(ADMIN.name)
  await page.getByLabel('Login email', { exact: false }).fill(ADMIN.email)
  await page.getByLabel('Phone number', { exact: false }).fill(ADMIN.phone)
  await page.getByRole('checkbox', { name: /I agree/ }).check()
  await page.getByLabel(/^Password/).fill(ADMIN.password)
  await page.getByLabel(/^Confirm Password/).fill(ADMIN.password)
  const created = page.waitForResponse(r => r.url().endsWith('/api/v1/registration') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  expect((await created).status()).toBe(201)
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  await page.goto('/guest/plans')
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  await page.getByRole('dialog', { name: 'Confirm purchase terms' }).getByRole('button', { name: 'Create payment order', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enter workspace', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
  await expect(page).toHaveURL(/\/workspace\/brightpath\/admin\/subscription$/, { timeout: 30_000 })
}

async function importUsers(page: Page) {
  await page.goto('/workspace/brightpath/admin/users')
  await page.getByRole('button', { name: /^(Import Excel|Nhập Excel)$/ }).click()
  const dialog = page.getByRole('dialog', { name: /Import users from Excel/ })
  await expect(dialog.getByRole('button', { name: /Download template/ })).toBeEnabled({ timeout: 60_000 })
  await dialog.getByLabel('Choose Excel file').setInputFiles(demoFile('02_Users_Brightpath.xlsx'))
  await expect(dialog.getByText('3 valid', { exact: true })).toBeVisible({ timeout: 30_000 })
  await dialog.getByRole('button', { name: 'Import 3 valid user(s)' }).click()
  await expect(dialog.getByText(/3 invitation\(s\) sent\. 0 row\(s\) not imported\./)).toBeVisible({ timeout: 360_000 })
  await dialog.getByRole('button', { name: 'Done' }).click()
}

test('the /reset page wipes an onboarded demo organization so the same slug and admin email can onboard again', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const seen = watch(page)
  await openReset(page)

  await onboard(page)
  const organization = text(record(await (await page.request.get('/api/v1/workspace-auth/current')).json()).organizationId)
  await importUsers(page)
  // Imported users stay pending invitations until they activate, so only the administrator is an account.
  expect(psql(`SELECT count(*) FROM platform.account WHERE organization_id='${organization}'`)).toBe('1')
  expect(psql(`SELECT count(*) FROM platform.workspace_activation WHERE organization_id='${organization}'`)).toBe('3')
  await page.goto('/favicon.svg')
  await page.context().clearCookies()

  const result = await openReset(page)
  expect(result).toMatchObject({ organizationsRemoved: 1, accountsRemoved: 1, registrationsRemoved: 1, organizationsRetained: 1, warnings: [] })
  expect(Number(result.relatedRowsRemoved)).toBeGreaterThanOrEqual(3)
  expect(Number(result.graphNodesRemoved)).toBeGreaterThan(0)
  await expect(page.getByText('1 seed organization kept')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('reset-done-1440.png'), fullPage: true })
  expect(psql(`SELECT count(*) FROM platform.organization WHERE organization_id='${organization}'`)).toBe('0')
  expect(psql(`SELECT count(*) FROM platform.workspace_activation WHERE organization_id='${organization}'`)).toBe('0')
  expect(psql(`SELECT count(*) FROM platform.account WHERE normalized_identifier LIKE 'demo.inbox+%'`)).toBe('0')

  // The recycled demo starts again with the identical workspace address and administrator email.
  await onboard(page)
  await page.goto('/favicon.svg')
  await page.context().clearCookies()
  expect(await openReset(page)).toMatchObject({ organizationsRemoved: 1, accountsRemoved: 1 })
  expect(seen.errors).toEqual([])
  expect(seen.network).toEqual([])
})

test('a repeated reset is a no-op and the page fits a phone screen (390px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const seen = watch(page)
  await openReset(page)
  const again = await openReset(page)
  expect(again).toMatchObject({ organizationsRemoved: 0, accountsRemoved: 0, registrationsRemoved: 0, graphNodesRemoved: 0, filesRemoved: 0 })
  await expect(page.getByRole('link', { name: 'Start onboarding' })).toHaveAttribute('href', '/register')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('reset-done-390.png'), fullPage: true })
  expect(seen.errors).toEqual([])
})
