import { expect, test } from '@playwright/test'
import { fixture, mutate, observe, record, text, workspaceLogin } from './subscriptionHelpers'

test.setTimeout(120000)
test.beforeEach(async ({ page }) => page.addInitScript(() => localStorage.setItem('app_language', 'en')))
test('Platform plan editor saves immutable versions with keyboard and mobile access', async ({ page }, testInfo) => {
  const observed = observe(page)
  const account = await fixture(page.request, true)
  await workspaceLogin(page, account)
  const response = await page.request.get('/api/v1/platform/subscription-plans')
  const plans: unknown = await response.json()
  if (!Array.isArray(plans)) throw new Error('Invalid plans')
  const original = record(plans[0])
  const terms = record(original.terms)
  const name = text(terms.name)
  const button = page.getByRole('button', { name: `Edit ${name}`, exact: true })
  await button.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Edit subscription plan' })
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused()
  await dialog.getByLabel('Description', { exact: true }).fill('Locally verified versioned plan description')
  await dialog.getByRole('button', { name: 'Save new version' }).click()
  await expect(dialog).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Locally verified versioned plan description', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('plan-administration-mobile.png'), fullPage: true })
  const stale = await mutate(page.request, `/api/v1/platform/subscription-plans/${text(original.planId)}`, {
    expectedVersionId: original.versionId, ...terms,
  }, 'PUT')
  expect(stale.status()).toBe(409)
  const updatedList: unknown = await (await page.request.get('/api/v1/platform/subscription-plans')).json()
  if (!Array.isArray(updatedList)) throw new Error('Invalid updated plans')
  const updated = updatedList.map(record).find(item => item.planId === original.planId)
  if (!updated) throw new Error('Missing plan')
  expect((await mutate(page.request, `/api/v1/platform/subscription-plans/${text(original.planId)}`, {
    expectedVersionId: updated.versionId, ...terms,
  }, 'PUT')).ok()).toBeTruthy()
  expect(observed.errors).toEqual([])
})
