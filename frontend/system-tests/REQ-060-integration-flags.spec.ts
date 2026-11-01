import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { mutate, record } from './subscriptionHelpers'

test.setTimeout(120_000)
test.use({ screenshot: 'off', trace: 'off' })
test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:8094') throw new Error('Use the isolated integration-flags test Compose stack.')
  await page.addInitScript(() => {
    if (location.origin === 'http://127.0.0.1:8094') localStorage.setItem('app_language', 'en')
  })
})

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`disabled integrations register, provision and sign in without false proof (${viewport.width}px)`, async ({ page, browser }) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    const failedRequests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() !== 'error') return
      const path = new URL(message.location().url || page.url()).pathname
      const anonymous = message.text().includes('the server responded with a status of 401')
        && ['/api/v1/registration/current', '/api/v1/workspace-auth/current'].includes(path)
      const favicon = path === '/favicon.ico' && message.text().includes('the server responded with a status of 404')
      if (!anonymous && !favicon) errors.push(`${message.text()} (${path})`)
    })
    page.on('requestfailed', request => {
      if (!request.failure()?.errorText.includes('ERR_ABORTED')) failedRequests.push(request.url())
    })
    page.on('response', response => {
      if (response.status() >= 500) failedRequests.push(`${response.status()} ${response.url()}`)
    })
    const email = `flags-${randomUUID()}@example.test`
    const password = 'Isolated integration flags password!'
    await page.goto('/guest/register')
    await page.getByLabel('Organization Legal Name', { exact: false }).fill('Integration Flags Organization')
    await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
    await page.getByLabel('Administrator Full Name', { exact: false }).fill('Isolated Flags Owner')
    await page.getByLabel('Work Email Address', { exact: false }).fill(email)
    await page.getByLabel('Password', { exact: false }).first().fill(password)
    await page.getByLabel('Confirm Password', { exact: false }).fill(password)
    const registered = page.waitForResponse(response => response.url().endsWith('/api/v1/registration')
      && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
    expect((await registered).status()).toBe(201)
    await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
    const saved = await page.request.get('/api/v1/registration/current')
    expect(saved.ok()).toBeTruthy()
    const registration = record(await saved.json())
    expect(registration.stage).toBe('COMPLETE')
    expect(registration.emailVerifiedAt).toBeNull()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
    await page.goto('/guest/plans')
    await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
    const created = page.waitForResponse(response => response.url().endsWith('/api/v1/registration/subscription/orders')
      && response.request().method() === 'POST')
    await page.getByRole('dialog', { name: 'Confirm purchase terms' })
      .getByRole('button', { name: 'Create payment order', exact: true }).click()
    expect((await created).ok()).toBeTruthy()
    await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible()
    await expect(page.getByText('No payment received', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open payOS checkout' })).toHaveCount(0)
    const orderId = new URL(page.url()).searchParams.get('order')
    expect(orderId).toBeTruthy()
    const status = await page.request.get(`/api/v1/registration/subscription/orders/${orderId}`)
    expect(status.ok()).toBeTruthy()
    const order = record(record(await status.json()).order)
    expect(order.paymentStatus).toBe('DEV_BYPASSED')
    expect(order.observedPaidAmount).toBeNull()
    expect(order.confirmedAt).toBeNull()
    expect(order.checkoutUrl).toBeNull()
    const outsider = await browser.newContext({ baseURL: 'http://127.0.0.1:8094' })
    const orderPath = `/api/v1/registration/subscription/orders/${orderId}`
    expect((await outsider.request.get(orderPath)).status()).toBe(401)
    expect((await mutate(outsider.request, '/api/v1/registration', {
      organizationName: 'Isolated outsider', adminName: 'Other Owner',
      adminEmail: `outsider-${randomUUID()}@example.test`, password,
    })).status()).toBe(201)
    expect((await outsider.request.get(orderPath)).status()).toBe(403)
    await outsider.close()
    await page.reload()
    await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath(`development-bypass-${viewport.width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/subscription$/)
    const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
    expect(identity.stage).toBe('COMPLETE')
    expect(identity.mfaVerified).toBe(false)
    await expect(page.getByRole('heading', { name: 'Organization subscription', exact: true })).toBeVisible()
    await expect(page.getByText('Used / allocated Employee seats', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Current subscription period', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Renew subscription', exact: true })).toBeEnabled()
    await page.screenshot({ path: test.info().outputPath(`development-workspace-${viewport.width}.png`), fullPage: true })
    await page.goto('about:blank')
    expect((await mutate(page.request, '/api/v1/workspace-auth/sign-out', {})).status()).toBe(204)
    expect((await mutate(page.request, '/api/v1/workspace-auth/sign-in', { email, password: 'wrong-password' })).status()).toBe(401)
    const resumed = await mutate(page.request, '/api/v1/workspace-auth/sign-in', { email, password })
    expect(resumed.ok()).toBeTruthy()
    expect(record(await resumed.json()).mfaVerified).toBe(false)
    await page.goto('/admin/subscription')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Organization subscription', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Renew subscription', exact: true })).toBeEnabled()
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
  })
}
