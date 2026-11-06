import { expect, test } from '@playwright/test'
import { fixture, mutate, observe, record, text, workspaceLogin } from './subscriptionHelpers'

test.setTimeout(120000)
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

test('Directory shows real loading/data state and an explicit recoverable read failure', async ({ page }) => {
  const platform = await fixture(page.request, true)
  let release: (() => void) | undefined
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/v1/platform/workspaces', async route => { await gate; await route.continue() })
  await workspaceLogin(page, platform)
  await page.goto('/platform-admin/organizations')
  await expect(page.getByRole('status')).toHaveText('Loading…')
  const response = await page.request.get('/api/v1/platform/workspaces')
  expect(response.ok()).toBeTruthy()
  const rows: unknown = await response.json()
  if (!Array.isArray(rows)) throw new Error('Invalid real directory')
  const expectDirectory = async () => {
    if (rows.length === 0) await expect(page.getByText('No provisioned workspaces.')).toBeVisible()
    else await expect(page.getByRole('main').getByRole('group')).toHaveCount(rows.length)
  }
  release?.()
  await expectDirectory()
  await page.unroute('**/api/v1/platform/workspaces')
  await page.route('**/api/v1/platform/workspaces', route => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Controlled directory read failure.' }),
  }))
  await page.reload()
  await expect(page.getByText('Controlled directory read failure.')).toBeVisible()
  await page.unroute('**/api/v1/platform/workspaces')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expectDirectory()
})

for (const viewport of [{ width: 1366, height: 900 }, { width: 375, height: 812 }]) {
  test(`Read-only organizations and persisted confirmed workspace actions (${viewport.width}px)`, async ({ page, browser }, testInfo) => {
    await page.setViewportSize(viewport)
    const cases: Record<string, Record<string, unknown>> = {}
    for (const coverage of ['ACTIVE', 'EXPIRED', 'NONE']) {
      const response = await page.request.post(`/api/v1/__subscription-test/organization-directory?coverage=${coverage}`)
      expect(response.ok(), await response.text()).toBeTruthy()
      cases[coverage] = record(await response.json())
    }
    const platform = await fixture(page.request, true)
    await workspaceLogin(page, platform)
    const observed = observe(page)
    const consoleErrors: string[] = []
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
    await page.goto('/platform-admin/organizations')
    await expect(page).toHaveURL(/platform-admin\/organizations/)
    await expect(page.getByRole('heading', { name: 'Workspace administration', exact: true })).toBeVisible()
    const card = page.getByRole('group', { name: text(cases.ACTIVE.organizationName), exact: true })
    const expired = page.getByRole('group', { name: text(cases.EXPIRED.organizationName), exact: true })
    const absent = page.getByRole('group', { name: text(cases.NONE.organizationName), exact: true })
    await expect(card.getByText(text(cases.ACTIVE.email), { exact: true })).toBeVisible()
    await expect(card.getByText('Current Directory Administrator')).toBeVisible()
    await expect(card.getByText('Active administrator', { exact: true })).toBeVisible()
    await expect(card.getByText('Starter', { exact: true })).toBeVisible()
    await expect(card.locator('time')).toHaveCount(2)
    await expect(expired.getByText('Expired', { exact: true })).toBeVisible()
    await expect(expired.getByText('Inactive administrator', { exact: true })).toBeVisible()
    await expect(expired.locator('time')).toHaveCount(0)
    await expect(absent.getByText('No subscription', { exact: true })).toBeVisible()
    await expect(absent.getByText('No administrator assigned.')).toBeVisible()
    await expect(absent.getByText('Setup failed', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /edit organization/i })).toHaveCount(0)
    await expect(page.getByRole('textbox')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    const list = async () => {
      const response = await page.request.get('/api/v1/platform/workspaces')
      expect(response.ok()).toBeTruthy()
      const rows: unknown = await response.json()
      if (!Array.isArray(rows)) throw new Error('Invalid real directory')
      return rows.map(record)
    }
    const organization = text(cases.ACTIVE.organizationId)
    const original = (await list()).find(row => row.organizationId === organization)
    expect(original).toBeDefined()
    await card.getByRole('button', { name: 'Suspend workspace', exact: true }).click()
    let dialog = page.getByRole('dialog', { name: 'Confirm workspace suspension' })
    await expect(dialog.getByText(text(cases.ACTIVE.organizationName), { exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    expect((await list()).find(row => row.organizationId === organization)?.status).toBe('ACTIVE')
    await card.getByRole('button', { name: 'Suspend workspace', exact: true }).click()
    dialog = page.getByRole('dialog', { name: 'Confirm workspace suspension' })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect((await list()).find(row => row.organizationId === organization)?.status).toBe('ACTIVE')
    await card.getByRole('button', { name: 'Suspend workspace', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm suspension', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(card.getByText('Suspended', { exact: true })).toBeVisible()
    await page.reload()
    await expect(card.getByText('Suspended', { exact: true })).toBeVisible()
    expect((await list()).find(row => row.organizationId === organization)?.subscription).toEqual(original?.subscription)
    await page.screenshot({ path: testInfo.outputPath('organizations-suspended.png'), fullPage: true })

    await card.getByRole('button', { name: 'Reactivate', exact: true }).click()
    await page.getByRole('dialog', { name: 'Confirm workspace reactivation' })
      .getByRole('button', { name: 'Confirm reactivation', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'Suspend workspace', exact: true })).toBeVisible()
    await page.reload()
    const restored = (await list()).find(row => row.organizationId === organization)
    expect(restored?.status).toBe('ACTIVE')
    expect(restored?.subscription).toEqual(original?.subscription)
    expect(restored?.setupState).toBe(original?.setupState)
    await expect(card).toBeVisible()

    const expiredId = text(cases.EXPIRED.organizationId)
    expect((await mutate(page.request, `/api/v1/platform/workspaces/${expiredId}/suspension`, { suspended: true }, 'PUT')).ok()).toBeTruthy()
    await page.reload()
    await expired.getByRole('button', { name: 'Reactivate', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm reactivation', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(expired.getByText('Expired', { exact: true })).toBeVisible()
    expect(record((await list()).find(row => row.organizationId === expiredId)?.subscription).status).toBe('EXPIRED')
    await page.screenshot({ path: testInfo.outputPath('organizations-reactivated.png'), fullPage: true })

    const anonymous = await browser.newContext()
    const anonymousPage = await anonymous.newPage()
    const base = new URL(page.url()).origin
    expect((await anonymousPage.request.get(`${base}/api/v1/platform/workspaces`)).status()).toBe(401)
    await anonymous.close()
    const ownerContext = await browser.newContext({ baseURL: base })
    const ownerPage = await ownerContext.newPage()
    await ownerPage.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await workspaceLogin(ownerPage, {
      accountId: text(cases.ACTIVE.accountId), registrationId: text(cases.ACTIVE.registrationId),
      email: text(cases.ACTIVE.email), password: text(cases.ACTIVE.password), totpSecret: text(cases.ACTIVE.totpSecret),
    })
    expect((await ownerPage.request.get('/api/v1/platform/workspaces')).status()).toBe(403)
    expect((await mutate(ownerPage.request, `/api/v1/platform/workspaces/${expiredId}/suspension`, { suspended: true }, 'PUT')).status()).toBe(403)
    await ownerContext.close()
    expect(observed.errors).toEqual([])
    expect(observed.network).toEqual([])
    expect(consoleErrors).toEqual([])
  })
}
