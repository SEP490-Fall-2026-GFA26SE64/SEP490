import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'

const API = '/api/v1/registration'
const PASSWORD = 'Isolated onboarding test password!'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.setTimeout(90_000)

test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:8096') throw new Error('Use the isolated onboarding stack on port 8096.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

async function fillAccount(page: Page, email: string) {
  await page.getByLabel('Full name', { exact: false }).fill('Onboarding Test Owner')
  await page.getByLabel('Login email', { exact: false }).fill(email)
  await page.getByLabel('Phone number', { exact: false }).fill('+84 (901) 234-567')
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByLabel('Confirm Password', { exact: false }).fill(PASSWORD)
}

for (const width of [1440, 375]) {
  test(`real registration and saved contact resume at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 1050 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    const failedRequests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => {
      if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.url())
    })
    page.on('response', response => {
      if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`)
    })
    const email = `onboarding-${randomUUID()}@example.test`
    await page.goto('/guest/register')
    await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
    await expect(page.getByRole('alert')).toBeFocused()
    await expect(page.getByLabel('Business name', { exact: false })).toHaveAttribute('aria-invalid', 'true')
    await page.getByLabel('Business name', { exact: false }).fill('Customer Onboarding Test')
    await expect(page.getByText(/headcount|company size|quy mô doanh nghiệp/i)).toHaveCount(0)
    const country = page.getByRole('combobox', { name: 'Country', exact: true })
    await country.press('ArrowDown')
    const search = page.getByRole('textbox', { name: 'Search countries', exact: true })
    await search.fill('Vietnam')
    await search.press('ArrowDown')
    await expect(page.getByRole('option', { name: 'Vietnam', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(country).toBeFocused()
    await page.getByRole('combobox', { name: 'Industry', exact: true }).click()
    await page.getByRole('option', { name: 'Cloud & DevOps', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath(`business-${width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
    await fillAccount(page, email)
    await page.getByRole('link', { name: 'Terms of Use', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('placeholder')
    await expect(page.getByRole('checkbox', { name: /I agree/ })).not.toBeChecked()
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByRole('checkbox', { name: /I agree/ })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert')).toBeFocused()
    await page.getByRole('checkbox', { name: /I agree/ }).check()
    await page.getByLabel('Phone number', { exact: false }).fill('123')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('7–15')
    await page.getByLabel('Phone number', { exact: false }).fill('+84 (901) 234-567')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(country).toContainText('Vietnam')
    await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
    await expect(page.getByLabel('Login email', { exact: false })).toHaveValue(email)
    await expect(page.getByRole('checkbox', { name: /I agree/ })).toBeChecked()
    await page.screenshot({ path: testInfo.outputPath(`account-${width}.png`), fullPage: true,
      mask: [page.locator('input[autocomplete="new-password"]')] })
    const created = page.waitForResponse(response => response.url().endsWith(API) && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    const response = await created
    expect(response.status()).toBe(201)
    const saved = await response.json()
    expect(saved.stage).toBe('COMPLETE')
    expect(saved.fields).toMatchObject({ country: 'VN', industry: 'Cloud Infrastructure & DevOps',
      adminPhone: '+84901234567', headcount: null })
    await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('+84901234567', { exact: true })).toBeVisible()
    expect((await (await page.request.get(`${API}/current`)).json()).fields).toEqual(saved.fields)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(PASSWORD)
    await page.getByRole('button', { name: 'Sign out of registration', exact: true }).click()
    await page.getByLabel('Login email', { exact: false }).fill(email)
    await page.getByLabel('Password', { exact: false }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Continue securely', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
    expect((await (await page.request.get(`${API}/current`)).json()).registrationId).toBe(saved.registrationId)
    await page.getByRole('link', { name: 'Continue to subscription plans', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Choose a plan for your team', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Select / }).first()).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`plans-${width}.png`), fullPage: true })
    if (width === 1440) {
      await page.getByRole('button', { name: /^Select / }).first().click()
      await page.getByRole('button', { name: 'Create payment order', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Enter workspace', exact: true })).toBeVisible({ timeout: 45_000 })
      await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('payment-workspace.png'), fullPage: true })
      const handoff = page.waitForResponse(response => response.url().endsWith(`${API}/workspace-session`)
        && response.request().method() === 'POST')
      await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
      expect((await handoff).status()).toBe(200)
      await expect(page).toHaveURL(new RegExp(`/workspace/${saved.fields.subdomain}/admin/subscription`), { timeout: 30_000 })
    } else {
      await page.getByRole('button', { name: 'VI', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Chọn gói dành cho đội ngũ', exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath('plans-vi-mobile.png'), fullPage: true })
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
  })
}

test('Vietnamese required fields and optional empty selections', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/guest/register')
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await page.getByLabel('Tên doanh nghiệp', { exact: false }).fill('Doanh nghiệp kiểm thử')
  await expect(page.getByRole('combobox', { name: 'Quốc gia', exact: true })).toContainText('Chọn quốc gia')
  await page.getByRole('button', { name: 'Tiếp tục tạo tài khoản', exact: true }).click()
  await page.getByLabel('Họ và tên', { exact: false }).fill('Quản trị kiểm thử')
  await page.getByLabel('Email đăng nhập', { exact: false }).fill(`vi-${randomUUID()}@example.test`)
  await page.getByLabel('Số điện thoại', { exact: false }).fill('0901 234 567')
  await page.getByLabel(/^Mật khẩu/).fill(PASSWORD)
  await page.getByLabel('Xác nhận mật khẩu', { exact: false }).fill(PASSWORD)
  await page.getByRole('checkbox', { name: /Tôi đồng ý/ }).check()
  await page.screenshot({ path: testInfo.outputPath('account-vi-mobile.png'), fullPage: true,
    mask: [page.locator('input[autocomplete="new-password"]')] })
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đăng ký hoàn tất', exact: true })).toBeVisible()
  const saved = await (await page.request.get(`${API}/current`)).json()
  expect(saved.fields).toMatchObject({ country: null, industry: null, headcount: null, adminPhone: '0901234567' })
  await page.reload()
  await expect(page.getByText('0901234567', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('verification presentation fixtures and recoverable connection failure', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const view = { registrationId: null, stage: 'VERIFY_EMAIL', email: 'verification@example.test', fields: null,
    deliveryStatus: 'SENT', resendAvailableAt: null, emailVerifiedAt: null, completedAt: null }
  await page.route(`**${API}/current`, route => route.fulfill({ json: view }))
  await page.goto('/guest/register')
  await expect(page.getByRole('heading', { name: 'Verify your email', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('email-presentation.png'), fullPage: true })
  await page.unroute(`**${API}/current`)
  await page.route(`**${API}/current`, route => route.fulfill({ json: { ...view, stage: 'SETUP_MFA' } }))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Set up authenticator', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('security-presentation.png'), fullPage: true })
  await page.unroute(`**${API}/current`)
  await page.route(`**${API}/current`, route => route.fulfill({ status: 503,
    json: { code: 'SERVICE_UNAVAILABLE', message: 'Test connection failure' } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Registration is currently unavailable')
  await page.unroute(`**${API}/current`)
  await page.getByRole('button', { name: 'Retry connection', exact: true }).click()
  await expect(page.getByLabel('Business name', { exact: false })).toBeVisible()
})
