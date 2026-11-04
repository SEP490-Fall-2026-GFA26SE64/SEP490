import { randomUUID } from 'node:crypto'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { mutate, record, text } from './subscriptionHelpers'

const BASE = 'http://127.0.0.1:8096'
const TECHNOVA = { organizationId: 'e0000000-0000-0000-0000-000000000001', email: 'admin@technova.com', password: 'Password123!' }
const VIEWPORTS = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)
test.use({ screenshot: 'off', trace: 'off' })

interface Tenant { slug: string; organizationId: string; email: string; password: string; copiedNodes: number }
let tenantB: Tenant
let slugA: string

test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== BASE) throw new Error('Use the isolated multi-organization Compose stack.')
  await page.addInitScript(() => { if (location.origin === 'http://127.0.0.1:8096') localStorage.setItem('app_language', 'en') })
})

function watch(page: Page) {
  const errors: string[] = []
  const api: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const path = new URL(message.location().url || page.url()).pathname
    const anonymous = message.text().includes('status of 401') && ['/api/v1/registration/current', '/api/v1/workspace-auth/current'].includes(path)
    if (!anonymous && path !== '/favicon.ico') errors.push(`${message.text()} (${path}) on ${new URL(page.url()).pathname}`)
  })
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/')) api.push(`${request.method()} ${url.pathname}`) })
  page.on('response', response => { if (response.status() >= 500) errors.push(`${response.status()} ${response.url()}`) })
  return { errors, api }
}

async function signIn(browser: Browser, account: { email: string; password: string }, viewport = VIEWPORTS[0]): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE, viewport })
  await context.addInitScript(() => localStorage.setItem('app_language', 'en'))
  const page = await context.newPage()
  expect((await mutate(page.request, '/api/v1/workspace-auth/sign-in', { email: account.email, password: account.password })).ok()).toBeTruthy()
  return { context, page }
}

test('a Guest copies a picked catalog subtree into a new workspace served under its own slug', async ({ page }) => {
  const seen = watch(page)
  const email = `tenant-b-${randomUUID()}@example.test`
  const password = 'Isolated tenant B password!'
  const organizationName = `Tenant B ${randomUUID().slice(0, 8)}`

  await page.goto('/guest/register')
  await page.getByLabel('Organization Legal Name', { exact: false }).fill(organizationName)
  await expect(page.getByTestId('catalog-graph')).toBeVisible()
  const role = page.getByRole('list', { name: 'Platform catalog items' }).getByRole('listitem').filter({ hasText: 'Target role' }).first()
  await role.getByRole('button', { name: /^Add / }).click()
  const summary = page.getByTestId('catalog-closure-summary')
  await expect(summary).toHaveText(/\d+ items and \d+ relationships will be copied/)
  const copiedNodes = Number((await summary.textContent())!.match(/^(\d+) items/)![1])
  expect(copiedNodes).toBeGreaterThan(1)
  expect((await page.request.post('/api/v1/registration/catalog-closure', { data: { nodeIds: [] } })).status()).toBe(403)
  await page.screenshot({ path: test.info().outputPath('registration-catalog-picker-1440.png'), fullPage: true })

  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.getByLabel('Administrator Full Name', { exact: false }).fill('Tenant B Owner')
  await page.getByLabel('Work Email Address', { exact: false }).fill(email)
  await page.getByLabel('Password', { exact: false }).first().fill(password)
  await page.getByLabel('Confirm Password', { exact: false }).fill(password)
  const registered = page.waitForResponse(response => response.url().endsWith('/api/v1/registration') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click()
  const registration = await registered
  expect(registration.status()).toBe(201)
  expect(JSON.parse(registration.request().postData() ?? '{}').catalogSelection).toHaveLength(1)
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()

  await page.goto('/guest/plans')
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  await page.getByRole('dialog', { name: 'Confirm purchase terms' }).getByRole('button', { name: 'Create payment order', exact: true }).click()
  await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible()
  // The workspace becomes READY only after the catalog copy succeeds.
  await expect(page.getByRole('button', { name: 'Enter workspace', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
  await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+\/admin\/subscription$/, { timeout: 30_000 })

  const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
  const slug = text(identity.workspaceSlug)
  expect(slug).toMatch(/^[a-z0-9][a-z0-9-]+[a-z0-9]$/)
    await expect(page).toHaveURL(`${BASE}/workspace/${slug}/admin/subscription`)
  await expect(page.getByRole('heading', { name: 'Organization subscription', exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('tenant-b-workspace-1440.png'), fullPage: true })
  tenantB = { slug, organizationId: text(identity.organizationId), email, password, copiedNodes }
  test.info().annotations.push({ type: 'tenant-b', description: JSON.stringify({ slug, organizationId: tenantB.organizationId, copiedNodes }) })

  // In-app navigation stays inside the workspace prefix.
  const links = await page.locator('a[href^="/"]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href') ?? ''))
  expect(links.length).toBeGreaterThan(0)
  expect(links.filter(href => href !== `/workspace/${slug}` && !href.startsWith(`/workspace/${slug}/`))).toEqual([])
  expect(seen.errors).toEqual([])
})

for (const viewport of VIEWPORTS) {
  test(`workspaces stay isolated by slug and organization (${viewport.width}px)`, async ({ browser }) => {
    expect(tenantB, 'tenant B registration must run first').toBeTruthy()

    const technova = await signIn(browser, TECHNOVA, viewport)
    const seenA = watch(technova.page)
    slugA = text(record(await (await technova.page.request.get('/api/v1/workspace-auth/current')).json()).workspaceSlug)
    expect(slugA).not.toBe(tenantB.slug)
    await technova.page.goto('/admin/subscription?tab=history#top')
    await expect(technova.page).toHaveURL(`${BASE}/workspace/${slugA}/admin/subscription?tab=history#top`)
    await expect(technova.page.getByRole('heading', { name: 'Organization subscription', exact: true })).toBeVisible()

    seenA.api.length = 0
    await technova.page.goto(`/workspace/${tenantB.slug}/admin/subscription`)
    await expect(technova.page.getByRole('heading', { name: 'Workspace not found' })).toBeVisible()
    await expect(technova.page.getByText('Organization subscription', { exact: true })).toHaveCount(0)
    expect(seenA.api.filter(call => !call.endsWith('/api/v1/workspace-auth/current'))).toEqual([])
    await technova.page.screenshot({ path: test.info().outputPath(`foreign-workspace-not-found-${viewport.width}.png`), fullPage: true })
    await technova.page.getByRole('link', { name: 'Go to your workspace' }).click()
    await expect(technova.page).toHaveURL(`${BASE}/workspace/${slugA}/admin/subscription`)

    await technova.page.goto('/workspace/no-such-workspace/admin/users')
    await expect(technova.page.getByRole('heading', { name: 'Workspace not found' })).toBeVisible()

    for (const path of [`/api/v1/organizations/${tenantB.organizationId}/subscription`, `/api/v1/organizations/${tenantB.organizationId}/job-positions`,
      `/api/v1/organizations/${tenantB.organizationId}/micro-skills`]) {
      expect((await technova.page.request.get(path)).status(), path).toBe(403)
    }
    expect((await technova.page.request.get('/api/v1/organizations/comp-technova/job-positions')).status()).toBe(400)

    const b = await signIn(browser, tenantB, viewport)
    const seenB = watch(b.page)
    await b.page.goto(`/workspace/${slugA}/admin/users`)
    await expect(b.page.getByRole('heading', { name: 'Workspace not found' })).toBeVisible()
    expect(seenB.api.filter(call => !call.endsWith('/api/v1/workspace-auth/current'))).toEqual([])
    expect((await b.page.request.get(`/api/v1/organizations/${TECHNOVA.organizationId}/subscription`)).status()).toBe(403)
    await b.page.goto(`/workspace/${tenantB.slug}/admin/users`)
    await expect(b.page.getByText(tenantB.email)).toBeVisible()
    await expect(b.page.getByText(TECHNOVA.email)).toHaveCount(0)
    await b.page.screenshot({ path: test.info().outputPath(`tenant-b-users-${viewport.width}.png`), fullPage: true })

    expect(seenA.errors).toEqual([])
    expect(seenB.errors).toEqual([])
    await technova.context.close()
    await b.context.close()
  })
}

test('a signed-out deep link signs in and returns only to the same workspace path', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE })
  await context.addInitScript(() => localStorage.setItem('app_language', 'en'))
  const page = await context.newPage()
  await page.goto(`/workspace/${slugA}/admin/users?tab=invites`)
  await expect(page).toHaveURL(`${BASE}/login?next=${encodeURIComponent(`/workspace/${slugA}/admin/users?tab=invites`)}`)
  await page.getByLabel('Email', { exact: true }).fill(TECHNOVA.email)
  await page.getByLabel('Password', { exact: true }).fill(TECHNOVA.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()
  await expect(page).toHaveURL(`${BASE}/workspace/${slugA}/admin/users?tab=invites`)

  expect((await mutate(page.request, '/api/v1/workspace-auth/sign-out', {})).status()).toBe(204)
  await page.goto(`/login?next=${encodeURIComponent(`/workspace/${tenantB.slug}/admin/users`)}`)
  await page.getByLabel('Email', { exact: true }).fill(TECHNOVA.email)
  await page.getByLabel('Password', { exact: true }).fill(TECHNOVA.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()
  await expect(page).toHaveURL(`${BASE}/workspace/${slugA}/admin/subscription`)
  await context.close()
})

for (const [email, home] of [['admin@technova.com', '/admin/subscription'], ['expert@technova.com', '/expert/target-roles'],
  ['manager@technova.com', '/ld-manager/job-positions'], ['employee@technova.com', '/employee/overview']] as const) {
  test(`${email} signs in to its workspace home and every navigation link stays in the workspace`, async ({ browser }) => {
    expect(slugA, 'the isolation test resolves the seeded workspace slug').toBeTruthy()
    const context = await browser.newContext({ baseURL: BASE })
    await context.addInitScript(() => localStorage.setItem('app_language', 'en'))
    const page = await context.newPage()
    const seen = watch(page)
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(TECHNOVA.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/workspace/${slugA}${home}`))
    await page.waitForLoadState('networkidle')
    const links = [...new Set(await page.locator('a[href^="/"]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href') ?? '')))]
    expect(links.filter(href => !href.startsWith(`/workspace/${slugA}`))).toEqual([])
    for (const href of links.slice(0, 25)) {
      await page.goto(href)
      await page.waitForLoadState('networkidle')
      expect(page.url(), href).toContain(`/workspace/${slugA}/`)
      await expect(page.getByRole('heading', { name: /Workspace not found|Workspace access/ }), href).toHaveCount(0)
    }
    // Known pre-existing seed state: the Compose seed services create two legacy TechNova question banks (409 by design).
    expect(seen.errors.filter(error => !/status of 409 .*\(\/api\/v1\/question-bank(\/notifications)?\)/.test(error))).toEqual([])
    await context.close()
  })
}
