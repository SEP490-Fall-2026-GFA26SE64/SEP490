import { createHmac } from 'node:crypto'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const SUBSCRIPTION_INBOX = process.env.REGISTRATION_TEST_INBOX_URL ?? 'http://127.0.0.1:8029'
export interface Account { accountId: string; registrationId: string; email: string; password: string; totpSecret: string }
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid test response')
  return value as Record<string, unknown>
}
export function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid response text')
  return value
}
export async function fixture(request: APIRequestContext, platform = false): Promise<Account> {
  const response = await request.post(`/api/v1/__subscription-test/registrant?platform=${platform}`)
  expect(response.ok()).toBeTruthy()
  const data = record(await response.json())
  return { accountId: text(data.accountId), registrationId: text(data.registrationId), email: text(data.email), password: text(data.password), totpSecret: text(data.totpSecret) }
}
export function totp(secret: string): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const hash = createHmac('sha1', Buffer.from(secret, 'base64')).update(counter).digest()
  const offset = hash[hash.length - 1] & 15
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0')
}
export async function mutate(request: APIRequestContext, path: string, data: unknown, method = 'POST') {
  const base = path === '/api/v1/registration' || path.startsWith('/api/v1/registration/')
    ? '/api/v1/registration' : '/api/v1/workspace-auth'
  const csrf = record(await (await request.get(`${base}/csrf`)).json())
  return request.fetch(path, { method, data, headers: { [text(csrf.headerName)]: text(csrf.token) } })
}
export async function registrationSession(page: Page, account: Account) {
  expect((await mutate(page.request, '/api/v1/registration/sign-in', { email: account.email, password: account.password })).ok()).toBeTruthy()
  const response = await mutate(page.request, '/api/v1/registration/totp/verify', { code: totp(account.totpSecret) })
  expect(response.ok()).toBeTruthy()
}
export async function workspaceLogin(page: Page, account: Account) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  let stage = ''
  await expect.poll(async () => {
    const response = await page.request.get('/api/v1/workspace-auth/current')
    if (response.status() === 401) return ''
    expect(response.ok()).toBeTruthy()
    stage = text(record(await response.json()).stage)
    return stage
  }).toMatch(/^(COMPLETE|CHALLENGE_MFA)$/)
  if (stage === 'CHALLENGE_MFA') {
    await page.getByLabel('Authenticator code', { exact: true }).fill(totp(account.totpSecret))
    await page.getByRole('button', { name: 'Verify', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Continue to workspace' }).click()
}
export async function purchase(page: Page) {
  await page.goto('/guest/plans')
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Confirm purchase terms' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Create payment order' }).click()
  await expect(page).toHaveURL(/guest\/checkout\?order=/)
  const orderId = new URL(page.url()).searchParams.get('order')
  if (!orderId) throw new Error('No order id')
  await expect(page.getByRole('link', { name: 'Open payOS checkout' })).toBeVisible({ timeout: 30000 })
  return orderId
}
export async function confirmPayment(page: Page, orderId: string) {
  const signed = await page.request.post(`/api/v1/__subscription-test/pay/${orderId}`)
  expect(signed.ok()).toBeTruthy()
  const payload: unknown = await signed.json()
  const response = await page.request.post('/api/v1/payments/payos/webhook', { data: payload })
  expect(response.status()).toBe(200)
  return payload
}
export async function activationLink(request: APIRequestContext, email: string): Promise<string> {
  let link = ''
  await expect.poll(async () => {
    const inbox = record(await (await request.get(`${SUBSCRIPTION_INBOX}/api/v1/messages?limit=100`)).json())
    if (!Array.isArray(inbox.messages)) throw new Error('Invalid isolated inbox')
    for (const message of inbox.messages.map(record)) {
      if (!Array.isArray(message.To) || !message.To.some(to => record(to).Address === email)) continue
      const data = record(await (await request.get(`${SUBSCRIPTION_INBOX}/api/v1/message/${text(message.ID)}`)).json())
      link = text(data.Text).match(/http:\/\/127\.0\.0\.1:(?:8092|8093)\/activate#token=[a-f0-9]+/)?.[0] ?? ''
    }
    return !!link
  }, { timeout: 30000, message: 'Isolated SMTP capture receives the activation link' }).toBe(true)
  return link
}
export async function paymentEmails(request: APIRequestContext, email: string) {
  const response = await request.get(`${SUBSCRIPTION_INBOX}/api/v1/messages?limit=100`)
  expect(response.ok()).toBeTruthy()
  const result = record(await response.json())
  if (!Array.isArray(result.messages)) throw new Error('Invalid SMTP capture response')
  return result.messages.map(record).filter(message => message.Subject === 'Payment received - Adapt-Learn-Graph'
    && Array.isArray(message.To) && message.To.some(to => record(to).Address === email))
}

export function observe(page: Page) {
  const errors: string[] = []
  const network: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => { if (!request.failure()?.errorText.includes('ERR_ABORTED')) network.push(request.url()) })
  return { errors, network }
}
