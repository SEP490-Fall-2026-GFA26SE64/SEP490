import { createHmac, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API = '/api/v1/registration'
const INBOX = process.env.REGISTRATION_TEST_INBOX_URL ?? 'http://127.0.0.1:8026'
const PASSWORD = 'Isolated browser test password!'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test.setTimeout(150_000)

test.beforeEach(async ({ page, baseURL }) => {
  if (!['http://127.0.0.1:8089', 'http://127.0.0.1:8092'].includes(baseURL ?? '')) throw new Error('Use an isolated registration or subscription test stack.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

function isolatedDatabase(container: string | undefined): string {
  if (container === 'adapt-learn-graph-registration-test-api-1') return 'adapt-learn-graph-registration-test-postgres-1'
  if (container === 'adapt-learn-graph-subscription-test-api-1') return 'adapt-learn-graph-subscription-test-postgres-1'
  throw new Error('Restart and expiry fixtures are restricted to the isolated test stacks.')
}

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.locator('[data-sensitive]').evaluateAll(elements => {
      for (const element of elements) element.replaceChildren(document.createTextNode('[redacted]'))
    })
    await page.locator('input').evaluateAll(elements => {
      for (const element of elements) {
        if (element instanceof HTMLInputElement) element.value = ''
      }
    })
  }
})

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Unexpected test API response')
  return value
}

async function emailCode(request: APIRequestContext, email: string): Promise<string> {
  let result = ''
  await expect.poll(async () => {
    const response = await request.get(`${INBOX}/api/v1/messages?limit=100`)
    if (!response.ok()) throw new Error(`SMTP capture API failed (${response.status()})`)
    const list = record(await response.json())
    if (!Array.isArray(list.messages)) throw new Error('SMTP capture message list is invalid')
    const found = list.messages.map(record).find(message => Array.isArray(message.To)
      && message.To.some(recipient => record(recipient).Address === email))
    if (!found) return false
    if (typeof found.ID !== 'string') throw new Error('SMTP capture message identifier is invalid')
    const message = await request.get(`${INBOX}/api/v1/message/${found.ID}`)
    if (!message.ok()) throw new Error('SMTP capture message could not be read')
    const payload = record(await message.json())
    if (typeof payload.Text !== 'string') throw new Error('SMTP capture message body is invalid')
    expect(typeof payload.HTML).toBe('string')
    expect(String(payload.HTML)).toContain('Adapt-Learn-Graph')
    expect(String(payload.HTML)).toContain('<table')
    const match = payload.Text.match(/Your verification code is: ([0-9]{6})/)
    result = match?.[1] ?? ''
    return result.length === 6
  }, { timeout: 40_000, message: 'The isolated SMTP inbox receives the registration email' }).toBe(true)
  return result
}

function totp(secret: string, time = Date.now()): string {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const character of secret) {
    const digit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character)
    if (digit < 0) throw new Error('Invalid authenticator test key')
    buffer = (buffer << 5) | digit
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)))
  const digest = createHmac('sha1', Buffer.from(bytes)).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0')
}

async function nextTotp(secret: string, previous: string): Promise<string> {
  let code = ''
  await expect.poll(() => {
    code = totp(secret)
    return code !== previous
  }, { timeout: 35_000, intervals: [500], message: 'A fresh authenticator time step becomes available' }).toBe(true)
  return code
}

async function signup(page: Page, email: string, slug?: string) {
  await page.goto('/guest/register')
  await page.getByLabel('Organization Legal Name', { exact: false }).fill('Browser Test Organization')
  if (slug) await page.getByLabel('Workspace URL Slug', { exact: true }).fill(slug)
  await expect(page.getByLabel('Administrator Full Name', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.getByLabel('Administrator Full Name', { exact: false }).fill('Browser Test Owner')
  await page.getByLabel('Work Email Address', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).first().fill(PASSWORD)
  await page.getByLabel('Confirm Password', { exact: false }).fill(PASSWORD)
}

async function verifyAndEnroll(page: Page, request: APIRequestContext, email: string) {
  await page.getByRole('button', { name: 'Save and verify email' }).click()
  await expect(page.getByRole('heading', { name: 'Verify your email', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Verify your email', exact: true })).toBeVisible()
  await page.getByLabel('Email verification code', { exact: false }).fill(await emailCode(request, email))
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Set up your authenticator', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click()
  const secret = await page.locator('[data-sensitive] code').innerText()
  const usedCode = totp(secret)
  await page.getByLabel('Authenticator code', { exact: false }).fill(usedCode)
  await page.getByRole('button', { name: 'Confirm authenticator' }).click()
  await expect(page.getByRole('heading', { name: 'Save your recovery codes' })).toBeVisible()
  const recoveryCodes = await page.locator('[data-sensitive] li').allTextContents()
  expect(recoveryCodes.length).toBe(10)
  expect(new Set(recoveryCodes).size).toBe(10)
  await page.getByRole('button', { name: 'I have saved my recovery codes' }).click()
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  return { secret, usedCode, recoveryCodes }
}

async function signIn(page: Page, email: string, heading = 'Verify your authenticator') {
  await page.goto('/guest/resume')
  await page.getByLabel('Work Email Address', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Continue securely' }).click()
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
}

test('desktop registration persists fields, requires MFA, and recovers without preserving old sessions', async ({ page, request, browser }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const browserErrors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(request.url())
  })
  const email = `desktop-${randomUUID()}@example.test`
  const slug = `browser-${randomUUID().slice(0, 8)}`
  await signup(page, email, slug)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await page.getByLabel('Industry / Technology Domain').selectOption('Cloud Infrastructure & DevOps')
  await page.getByLabel('Estimated Engineering Headcount').selectOption('51 - 200 employees')
  await page.screenshot({ path: testInfo.outputPath('registration-organization-step.png'), fullPage: true })
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('registration-desktop-form.png'), fullPage: true,
    mask: [page.locator('input[type="password"]')] })
  const factors = await verifyAndEnroll(page, request, email)
  await page.reload()
  await expect(page.getByText(slug, { exact: true })).toBeVisible()
  await expect(page.getByText('Cloud Infrastructure & DevOps', { exact: true })).toBeVisible()
  const saved = record(await (await page.request.get(`${API}/current`)).json())
  expect(record(saved.fields).headcount).toBe('51 - 200 employees')
  expect(saved.registrationId).toBeTruthy()
  await page.getByRole('button', { name: 'Sign out of registration' }).click()
  await signIn(page, email)
  const freshCode = await nextTotp(factors.secret, factors.usedCode)
  await page.getByLabel('Authenticator code', { exact: false }).fill(freshCode)
  await page.getByRole('button', { name: 'Verify and resume' }).click()
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  expect(record(await (await page.request.get(`${API}/current`)).json()).registrationId).toBe(saved.registrationId)

  const recoveryContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const recoveryPage = await recoveryContext.newPage()
  try {
    await signIn(recoveryPage, email)
    await recoveryPage.getByRole('button', { name: 'Use a recovery code', exact: true }).click()
    await recoveryPage.getByLabel('Recovery code', { exact: false }).fill(factors.recoveryCodes[0])
    await recoveryPage.getByRole('button', { name: 'Recover and replace authenticator' }).click()
    await expect(recoveryPage.getByRole('heading', { name: 'Set up your authenticator', exact: true })).toBeVisible()
    expect((await page.request.get(`${API}/current`)).status()).toBe(401)
    await recoveryPage.getByRole('button', { name: 'Set up authenticator', exact: true }).click()
    const replacement = await recoveryPage.locator('[data-sensitive] code').innerText()
    await recoveryPage.getByLabel('Authenticator code', { exact: false }).fill(totp(replacement))
    await recoveryPage.getByRole('button', { name: 'Confirm authenticator' }).click()
    await recoveryPage.getByRole('button', { name: 'I have saved my recovery codes' }).click()
    await expect(recoveryPage.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
    await recoveryPage.screenshot({ path: testInfo.outputPath('registration-desktop-complete.png'), fullPage: true })
  } finally {
    await recoveryPage.locator('[data-sensitive]').evaluateAll(elements => {
      for (const element of elements) element.replaceChildren(document.createTextNode('[redacted]'))
    })
    await recoveryContext.close()
  }
  expect(browserErrors).toEqual([])
  expect(failedRequests).toEqual([])
})

test('mobile registration generates a slug, preserves nullable fields and never enters a workspace', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const email = `mobile-${randomUUID()}@example.test`
  await signup(page, email)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByLabel('Workspace URL Slug', { exact: true })).not.toHaveAttribute('required')
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await verifyAndEnroll(page, request, email)
  const state = record(await (await page.request.get(`${API}/current`)).json())
  const fields = record(state.fields)
  expect(fields.industry).toBeNull()
  expect(fields.headcount).toBeNull()
  expect(fields.subdomain).toMatch(/^browser-test-organization-[a-z0-9]{6}$/)
  await expect(page.getByRole('link', { name: /enter workspace/i })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const heading = await page.getByRole('heading', { name: 'Registration complete', exact: true }).boundingBox()
  const header = await page.locator('header').boundingBox()
  expect(heading && header && heading.y >= header.y + header.height).toBe(true)
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Đăng ký hoàn tất', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Tiếp tục chọn gói', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('registration-mobile-complete.png'), fullPage: true })
})

test('loading, connection failure and invalid input are explicit and preserve entered values', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route(`**${API}/current`, async route => {
    await new Promise(resolve => setTimeout(resolve, 500))
    await route.abort('connectionfailed')
  })

  await page.goto('/guest/register')
  await expect(page.getByText('Checking your saved registration...')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Registration is currently unavailable')
  await page.unroute(`**${API}/current`)
  await page.getByRole('button', { name: 'Retry connection' }).click()
  await signup(page, `invalid-${randomUUID()}@example.test`, 'admin')
  await page.getByRole('button', { name: 'Save and verify email' }).click()
  await expect(page.getByRole('alert')).toContainText('excluding reserved names')
  await expect(page.getByLabel('Organization Legal Name', { exact: false })).toHaveValue('Browser Test Organization')
  await expect(page.getByLabel('Workspace URL Slug', { exact: true })).toHaveValue('admin')
  await expect(page.getByRole('alert')).toBeFocused()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('registration-mobile-validation.png'), fullPage: true,
    mask: [page.locator('input[type="password"]')] })
})

test('API restart preserves the full session and exact saved registration', async ({ page, request }) => {
  const container = process.env.REGISTRATION_TEST_API_CONTAINER
  test.skip(!container, 'Set REGISTRATION_TEST_API_CONTAINER for the isolated restart acceptance check')
  isolatedDatabase(container)
  if (!container) throw new Error('An isolated API container is required.')
  const email = `restart-${randomUUID()}@example.test`
  await signup(page, email)
  await verifyAndEnroll(page, request, email)
  const before = record(await (await page.request.get(`${API}/current`)).json())
  expect(before.stage).toBe('COMPLETE')
  expect(typeof before.registrationId).toBe('string')
  await promisify(execFile)('docker', ['restart', container], { timeout: 60_000 })
  await expect.poll(async () => {
    const response = await request.get('/api/v1/system/status', { failOnStatusCode: false })
    return response.status()
  }, { timeout: 60_000, intervals: [1000, 2000] }).toBe(200)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  const after = record(await (await page.request.get(`${API}/current`)).json())
  expect(after).toEqual(before)
})

test('expired email proof and expired session show actionable errors without granting access', async ({ page, request }) => {
  test.skip(!process.env.REGISTRATION_TEST_API_CONTAINER, 'Requires the isolated registration-test database')
  const postgres = isolatedDatabase(process.env.REGISTRATION_TEST_API_CONTAINER)
  const reuse = process.env.REGISTRATION_TEST_EXPIRY_EMAIL
  const email = reuse ?? `expiry-${randomUUID()}@example.test`
  if (!/^expiry-[a-f0-9-]{36}@example\.test$/.test(email)) throw new Error('Only a synthetic expiry fixture may be reused')
  if (reuse) {
    await signIn(page, email, 'Verify your email')
  } else {
    await signup(page, email)
    await page.getByRole('button', { name: 'Save and verify email' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Verify your email', exact: true })).toBeVisible()
  const code = await emailCode(request, email)
  const sql = async (statement: string) => promisify(execFile)('docker', [
    'exec', postgres, 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
    '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-c', statement,
  ], { timeout: 15_000 })
  const expired = await sql(`UPDATE platform.registration_email_verification
    SET expires_at = now() - interval '1 second'
    WHERE account_id = (SELECT account_id FROM platform.account WHERE normalized_identifier = '${email}')`)
  expect(expired.stdout).toContain('UPDATE 1')
  await page.getByLabel('Email verification code', { exact: false }).fill(code)
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(/expired/i)
  expect(record(await (await page.request.get(`${API}/current`)).json()).stage).toBe('VERIFY_EMAIL')
  const now = Date.now()
  const sessionExpiry = await sql(`UPDATE platform.registration_session
    SET last_access_time = ${now - 601_000}, expiry_time = ${now - 1000}
    WHERE principal_name = (SELECT account_id::text FROM platform.account WHERE normalized_identifier = '${email}')`)
  expect(sessionExpiry.stdout).toContain('UPDATE 1')
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resume your registration', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText(/sign in/i)
  await expect(page.getByLabel('Password', { exact: false })).toHaveValue('')
})
