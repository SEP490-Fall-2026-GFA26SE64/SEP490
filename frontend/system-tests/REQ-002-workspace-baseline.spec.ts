import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { confirmPayment, fixture, mutate, observe, purchase, record, registrationSession, text } from './subscriptionHelpers'

type Member = { email: string; password: string }
type Tenant = { manager: Member; employee: Member; occupationId: string; roleId: string; organizationId: string }
let ready: Tenant
let unready: Tenant
let completedAttempt = ''
test.describe.configure({ mode: 'serial' })
test.setTimeout(180000)

async function provision(page: Page, complete: boolean): Promise<Tenant> {
  await registrationSession(page, await fixture(page.request))
  const order = await purchase(page)
  await confirmPayment(page, order)
  await page.getByRole('button', { name: 'Enter workspace', exact: true }).click({ timeout: 30000 })
  await expect(page).toHaveURL(/\/admin\/subscription$/)
  const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
  const response = await page.request.post(`/api/v1/__subscription-test/baseline/${text(identity.organizationId)}?ready=${complete}`)
  expect(response.status(), await response.text()).toBe(200)
  const value = record(await response.json())
  const member = (key: string): Member => {
    const account = record(value[key])
    return { email: text(account.email), password: text(account.password) }
  }
  return { manager: member('manager'), employee: member('employee'), occupationId: text(value.occupationId),
    roleId: text(value.roleId), organizationId: text(value.organizationId) }
}
async function login(page: Page, member: Member) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(member.email)
  await page.getByLabel('Password', { exact: true }).fill(member.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Authentication complete.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to workspace' }).click()
}
async function command(request: APIRequestContext, path: string, data: unknown, method = 'POST', key = crypto.randomUUID()) {
  const csrf = record(await (await request.get('/api/v1/workspace-auth/csrf')).json())
  return request.fetch(path, { method, data, headers: { [text(csrf.headerName)]: text(csrf.token), 'Idempotency-Key': key } })
}
async function successful(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  expect(response.status(), await response.text()).toBe(200)
  return record(await response.json())
}

test.beforeAll(async ({ browser, baseURL }) => {
  test.setTimeout(180000)
  if (baseURL !== 'http://127.0.0.1:8093') throw new Error('Only run against the isolated identity-test stack.')
  for (const complete of [true, false]) {
    const context = await browser.newContext({ baseURL })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    const tenant = await provision(page, complete)
    if (complete) ready = tenant
    else unready = tenant
    await context.close()
  }
})
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

test('real manager session configures baseline and real employee persists answers/results', async ({ page }, info) => {
  const observed = observe(page)
  await login(page, ready.manager)
  const manager = `/api/v1/ld/adaptive-baseline-blueprints/occupations/${ready.occupationId}`
  expect((await page.request.get('/api/v1/employee/target-roles')).status()).toBe(403)
  const draft = await successful(await command(page.request, manager + '/working', {
    expectedRevision: 0, expectedWorkingRevisionId: null,
    configuration: { name: 'Authenticated synthetic baseline', occupationBounds: { maxQuestions: 9, timeLimitSeconds: 540 } },
  }, 'PUT'))
  await page.goto(`/ld-manager/baseline-assessments/${ready.occupationId}?draft=${text(draft.workingRevisionId)}`)
  await expect(page.getByLabel('Baseline name', { exact: true })).toHaveValue('Authenticated synthetic baseline')
  await successful(await command(page.request, manager + '/finalize', {
    workingRevisionId: draft.workingRevisionId, expectedWorkingRevision: draft.revision,
    expectedActivationRevision: 0, expectedCurrent: null,
  }))
  await mutate(page.request, '/api/v1/workspace-auth/sign-out', {})
  await login(page, ready.employee)
  expect((await page.request.get(manager)).status()).toBe(403)
  const choose = { roleId: ready.roleId, expectedCurrentSelectionId: null }
  const key = crypto.randomUUID()
  const selection = await successful(await command(page.request, '/api/v1/employee/target-role-selection', choose, 'PUT', key))
  expect(await successful(await command(page.request, '/api/v1/employee/target-role-selection', choose, 'PUT', key))).toEqual(selection)
  await page.goto('/employee/upskilling?tab=roles')
  await expect(page.getByText('Synthetic target role', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  let attempt = await successful(await command(page.request, '/api/v1/employee/baseline-attempts', { entry: 'SELECTED_ROLE' }))
  completedAttempt = text(attempt.id)
  await page.goto(`/employee/baseline-assessment/${completedAttempt}`)
  await expect(page.getByText('Synthetic question - choose option A', { exact: true })).toBeVisible()
  await page.reload()
  expect((await successful(await page.request.get(`/api/v1/employee/baseline-attempts/${completedAttempt}`))).id).toBe(completedAttempt)
  for (let index = 0; index < 9 && attempt.state === 'IN_PROGRESS'; index++) {
    if (!Array.isArray(attempt.items)) throw new Error('Invalid attempt items')
    const item = record(attempt.items.at(-1))
    attempt = await successful(await command(page.request, `/api/v1/employee/baseline-attempts/${completedAttempt}/answers`, {
      expectedRevision: attempt.revision, position: item.position, itemVersionId: item.itemVersionId, selectedOptionId: 'a',
    }))
  }
  expect(attempt.state).not.toBe('IN_PROGRESS')
  const result = await successful(await page.request.get(`/api/v1/employee/baseline-attempts/${completedAttempt}/result`))
  expect(JSON.stringify(result)).not.toContain('protected_key')
  const mastery = await page.request.get('/api/v1/employee/target-role-selection/mastery')
  expect(mastery.status()).toBe(200)
  expect(await mastery.json()).toHaveLength(1)
  await page.goto('/employee/my-mastery')
  await expect(page.getByText('Baseline fixture occupation', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: info.outputPath('authenticated-baseline-result.png'), fullPage: true })
  expect(observed.errors).toEqual([])
  expect(observed.network).toEqual([])
})

test('tenant isolation, CSRF and no-resource readiness never start a false-success attempt', async ({ page }, info) => {
  const observed = observe(page)
  expect((await page.request.get('/api/v1/employee/baseline-attempts/history')).status()).toBe(401)
  await login(page, ready.employee)
  await page.goto('/employee/upskilling?tab=roles')
  await expect(page.getByText('Synthetic target role', { exact: true }).first()).toBeVisible({ timeout: 15000 })
  await mutate(page.request, '/api/v1/workspace-auth/sign-out', {})
  await login(page, unready.employee)
  expect((await page.request.get(`/api/v1/employee/baseline-attempts/${completedAttempt}/result`)).status()).toBe(404)
  const missingCsrf = await page.request.post('/api/v1/employee/baseline-attempts', {
    headers: { 'Idempotency-Key': crypto.randomUUID() }, data: { entry: 'SELECTED_ROLE' },
  })
  expect(missingCsrf.status()).toBe(403)
  const blocked = await command(page.request, '/api/v1/employee/baseline-attempts', { entry: 'SELECTED_ROLE' })
  expect(blocked.status()).toBe(409)
  expect(record(await blocked.json()).code).toBe('SELECTION_UNAVAILABLE')
  expect(await (await page.request.get('/api/v1/employee/baseline-attempts/history')).json()).toEqual([])
  await page.goto('/employee/upskilling?tab=roles')
  await expect(page.getByText(/Baseline is not ready/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Loading roles and baseline status…', { exact: true })).toHaveCount(0, { timeout: 15000 })
  await expect(page.getByText('Synthetic target role', { exact: true })).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  const header = await page.locator('.workspace-header').boundingBox()
  const tabs = await page.getByRole('tablist', { name: 'Upskilling' }).boundingBox()
  if (!header || !tabs) throw new Error('Missing workspace header or tabs')
  expect(tabs.y).toBeGreaterThanOrEqual(header.y + header.height)
  await page.screenshot({ path: info.outputPath('baseline-readiness-mobile.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await mutate(page.request, '/api/v1/workspace-auth/sign-out', {})
  await login(page, unready.manager)
  const foreign = `/api/v1/ld/adaptive-baseline-blueprints/occupations/${ready.occupationId}`
  expect((await page.request.get(foreign)).status()).toBe(403)
  await page.goto('/ld-manager/baseline-assessments')
  await expect(page.getByText(/Baseline is not ready/)).toBeVisible({ timeout: 15000 })
  expect(observed.errors).toEqual([])
  expect(observed.network).toEqual([])
})
