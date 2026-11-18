import { expect, test, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

/**
 * Unified page loading transition (cross-cutting UX).
 * Runs against the development stack with the public development fixtures (DEV-DEMO.md):
 *   $env:SYSTEM_TEST_BASE_URL='http://127.0.0.1:8097'; npx playwright test -c playwright.system.config.ts UX-unified-page-loader
 */
const shots = 'test-results/UX-unified-page-loader'
const password = process.env.WORKSPACE_DEVELOPMENT_PASSWORD ?? 'Workspace-Development-490!'

type Trace = { fullscreen: number; inline: number; workspaceAccess: number; authComplete: number; blank: number; legacyText: number }

// Samples every animation frame (persisted across the full-page navigation into the workspace) to prove which
// intermediate screens were ever painted during the transition.
async function traceTransitions(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('app_language', 'en')
    const key = 'ux-loader-trace'
    const trace = JSON.parse(sessionStorage.getItem(key) ?? 'null') ?? { fullscreen: 0, inline: 0, workspaceAccess: 0, authComplete: 0, blank: 0, legacyText: 0 }
    const sample = () => {
      const root = document.getElementById('root')
      if (root) {
        const text = document.body.innerText ?? ''
        if (root.querySelector('[data-page-loader="fullscreen"]')) trace.fullscreen++
        if (root.querySelector('[data-page-loader="inline"]')) trace.inline++
        if (/Workspace access/.test(text)) trace.workspaceAccess++
        if (/Authentication complete/.test(text)) trace.authComplete++
        if (root.childElementCount === 0) trace.blank++
        if (/^\s*Loading\.\.\.\s*$/m.test(text)) trace.legacyText++
        sessionStorage.setItem(key, JSON.stringify(trace))
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}

const readTrace = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('ux-loader-trace') ?? '{}') as Trace)

function watch(page: Page) {
  const problems: string[] = []
  page.on('console', message => {
    // Resource failures are judged by the response listener below (which permits the anonymous 401 probe).
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('response', response => {
    const path = new URL(response.url()).pathname
    // 401 on the anonymous session probe before sign-in is the expected signed-out answer.
    if (response.status() >= 400 && !(response.status() === 401 && path === '/api/v1/workspace-auth/current')) problems.push(`${response.status()} ${response.url()}`)
  })
  return problems
}

async function slowIdentity(page: Page, delayMs = 900) {
  await page.route('**/api/v1/workspace-auth/current', async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    await route.continue()
  })
  // Hold the entitlement gate briefly so the in-workspace fullscreen loader is reliably observable.
  await page.route('**/api/v1/subscription/access', async route => {
    await new Promise(resolve => setTimeout(resolve, 2_500))
    await route.continue()
  })
}

async function signIn(page: Page, email: string, screenshot: string) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const loader = page.locator('[data-page-loader="fullscreen"]')
  await expect(loader).toBeVisible({ timeout: 45_000 })
  await expect(loader).toHaveAttribute('role', 'status')
  await expect(loader.locator('.alg-loader__ring')).toBeVisible()
  await expect(loader).toContainText('Adapt-Learn-Graph')
  await page.screenshot({ path: `${shots}/${screenshot}`, animations: 'allow' })
  await waitForWorkspaceEntry(page)
  await expect(page.locator('[data-page-loader="fullscreen"]')).toHaveCount(0, { timeout: 30_000 })
}

test.describe('Unified page loading transition', () => {
  // The shared development stack can take several seconds per request; the flows below wait on real APIs.
  test.describe.configure({ timeout: 120_000 })
  test('pre-boot splash ships the same fullscreen loader markup', async ({ request }) => {
    const html = await (await request.get('/login')).text()
    expect(html).toContain('data-page-loader="fullscreen"')
    expect(html).toContain('alg-loader__ring')
    expect(html).toContain('Adapt-Learn-Graph')
  })

  test('employee sign-in enters the workspace through one fullscreen loader (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const problems = watch(page)
    await traceTransitions(page)
    await slowIdentity(page)
    await signIn(page, 'employee@workspace.dev.invalid', 'desktop-employee-transition.png')
    await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
    await page.screenshot({ path: `${shots}/desktop-employee-landed.png` })
    const trace = await readTrace(page)
    expect(trace.fullscreen).toBeGreaterThan(0)
    expect(trace.workspaceAccess).toBe(0)
    expect(trace.authComplete).toBe(0)
    expect(trace.blank).toBe(0)
    expect(trace.legacyText).toBe(0)
    expect(problems).toEqual([])
  })

  test('L&D sign-in keeps the workspace shell while page data loads inline (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const problems = watch(page)
    await traceTransitions(page)
    await slowIdentity(page)
    // L&D lands on Job positions; hold its data so the inline (in-shell) loader is observable.
    await page.route('**/organizations/*/job-positions', async route => {
      await new Promise(resolve => setTimeout(resolve, 2_500))
      await route.continue()
    })
    await signIn(page, 'ld@workspace.dev.invalid', 'mobile-ld-transition.png')
    const inline = page.locator('[data-page-loader="inline"]').first()
    await expect(inline).toBeVisible({ timeout: 15_000 })
    await expect(inline).toHaveAttribute('role', 'status')
    await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible()
    await page.screenshot({ path: `${shots}/mobile-ld-inline-loader.png` })
    await expect(page.locator('[data-page-loader]')).toHaveCount(0, { timeout: 30_000 })
    await page.screenshot({ path: `${shots}/mobile-ld-landed.png` })
    const trace = await readTrace(page)
    expect(trace.fullscreen).toBeGreaterThan(0)
    expect(trace.inline).toBeGreaterThan(0)
    expect(trace.workspaceAccess).toBe(0)
    expect(trace.authComplete).toBe(0)
    expect(trace.blank).toBe(0)
    expect(problems).toEqual([])
  })

  test('a slow workspace gate explains the wait, offers reload and still finishes (no stuck loader)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.route('**/api/v1/subscription/access', async route => {
      await new Promise(resolve => setTimeout(resolve, 11_000))
      await route.continue()
    })
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('employee@workspace.dev.invalid')
    await page.locator('input[type="password"]').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const loader = page.locator('[data-page-loader="fullscreen"]')
    await expect(loader.locator('[data-page-loader-slow]')).toContainText('Still loading', { timeout: 30_000 })
    await expect(loader.getByRole('button', { name: 'Reload page' })).toBeVisible()
    await page.screenshot({ path: `${shots}/desktop-slow-gate.png` })
    await waitForWorkspaceEntry(page)
    await expect(loader).toHaveCount(0, { timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
  })

  test('reduced motion stops decorative motion and slows the ring', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await slowIdentity(page, 3_000)
    await page.goto('/login')
    const loader = page.locator('[data-page-loader="fullscreen"]')
    await expect(loader.locator('.alg-loader__ring')).toBeVisible()
    expect(await loader.locator('.alg-loader__halo').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
    expect(await loader.locator('.alg-loader__ring').evaluate(element => getComputedStyle(element).animationDuration)).toBe('2.4s')
  })
})
