import { expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { confirmPayment, fixture, observe, purchase, registrationSession, mutate, record, text } from './subscriptionHelpers'

test.setTimeout(120000)
test.beforeEach(async ({ page }) => page.addInitScript(() => localStorage.setItem('app_language', 'en')))
test('Guest purchase preserves truthful states, ignores forged redirects and provisions once', async ({ page, context }, testInfo) => {
  const observations = observe(page)
  const account = await fixture(page.request)
  await registrationSession(page, account)
  const order = await purchase(page)
  await expect(page.getByText('Not activated', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter workspace' })).toHaveCount(0)
  await page.goto(`/guest/checkout?order=${order}&status=PAID&success=true`)
  await expect(page.getByText('Not activated', { exact: true })).toBeVisible()
  const signed = await confirmPayment(page, order)
  await expect(page.getByRole('button', { name: 'Enter workspace' })).toBeVisible({ timeout: 30000 })
  expect((await page.request.post('/api/v1/payments/payos/webhook', { data: signed })).status()).toBe(200)
  await page.reload()
  await expect(page.getByText('Subscription activated', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('guest-purchase-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByText('Đã xác nhận thanh toán', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('guest-purchase-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByRole('button', { name: 'Enter workspace' }).click()
  await expect(page).toHaveURL(/admin\/subscription/)
  await expect(page.getByText('Current subscription period', { exact: true })).toBeVisible()
  const stranger = await context.browser()!.newContext()
  const denied = await stranger.request.get(new URL(`/api/v1/subscription/orders/${order}`, page.url()).toString())
  expect(denied.status()).toBe(401)
  await stranger.close()
  expect(observations.errors).toEqual([])
  expect(observations.network).toEqual([])
})

test('Isolated API restart recovers a confirmed payment without duplicate activation', async ({ page }) => {
  await registrationSession(page, await fixture(page.request))
  const order = await purchase(page)
  const signed = await confirmPayment(page, order)
  await promisify(execFile)('docker', ['restart', 'adapt-learn-graph-subscription-test-api-1'], { timeout: 60000 })
  await expect.poll(async () => {
    try { return (await page.request.get('http://127.0.0.1:18084/actuator/health', { timeout: 2000 })).status() }
    catch { return 0 }
  }, { timeout: 60000 }).toBe(200)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Enter workspace' })).toBeVisible({ timeout: 30000 })
  expect((await page.request.post('/api/v1/payments/payos/webhook', { data: signed })).status()).toBe(200)
  await page.getByRole('button', { name: 'Enter workspace' }).click()
  await expect(page.getByText('Current subscription period', { exact: true })).toBeVisible()
  const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
  const summary = record(await (await page.request.get(`/api/v1/organizations/${text(identity.organizationId)}/subscription`)).json())
  expect(Array.isArray(summary.paymentHistory) && summary.paymentHistory.length).toBe(1)
  expect(summary.scheduled).toBeNull()
})

test('Forged payment cannot activate; confirmed-unpaid reconciliation permits one fresh replacement', async ({ page }) => {
  await registrationSession(page, await fixture(page.request))
  const original = await purchase(page)
  const forged = await page.request.post('/api/v1/payments/payos/webhook', { data: {
    data: { orderCode: 1, amount: 4900000, currency: 'VND', paymentLinkId: 'forged' }, signature: '0'.repeat(64),
  } })
  expect(forged.status()).toBe(400)
  await page.reload()
  await expect(page.getByText('Not activated', { exact: true })).toBeVisible()
  expect((await page.request.post(`/api/v1/__subscription-test/expire/${original}`)).ok()).toBeTruthy()
  await page.getByRole('button', { name: 'Reconcile payment', exact: true }).click()
  await expect(page.getByText('Unpaid — retry eligible', { exact: true })).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create payment order' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const current = record(await (await page.request.get('/api/v1/registration/subscription/current')).json())
  const replacement = text(record(current.order).orderId)
  expect(replacement).not.toBe(original)
  const conflict = await mutate(page.request, '/api/v1/registration/subscription/orders', {
    planId: record(current.order).planId, expectedVersionId: record(current.order).planVersionId,
    idempotencyKey: crypto.randomUUID(), replacesOrderId: original,
  })
  expect(conflict.status()).toBe(409)
  await page.goto(`/guest/checkout?order=${replacement}`)
  await confirmPayment(page, replacement)
  await expect(page.getByRole('button', { name: 'Enter workspace' })).toBeVisible({ timeout: 30000 })
})
