import { expect, test, type Page } from '@playwright/test'

test.use({ trace: 'off', video: 'off', screenshot: 'off' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

async function landing(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Connect the skills.See the path forward.')
  await readableBrand(page)
}

async function readableBrand(page: Page) {
  const foreground = await page.locator('[data-motion]').evaluate(element => getComputedStyle(element).color)
  await expect(page.locator('header').getByText('Adapt-Learn-Graph', { exact: true })).toHaveCSS('color', foreground)
}

async function revealSections(page: Page) {
  for (const element of await page.locator('[data-landing-reveal]').all()) {
    await element.scrollIntoViewIfNeeded()
    await expect(element).toHaveCSS('opacity', '1')
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

test('desktop landing routes all guest actions correctly without altering enterprise sign-in', async ({ page }, testInfo) => {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') requests.push(request.url())
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const path of ['/', '/home', '/guest']) {
    await landing(page, path)
    await expect(page).toHaveURL(/\/$/)
  }
  await revealSections(page)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('landing-desktop.png'), fullPage: true })
  await page.getByRole('link', { name: 'Register your organization', exact: true }).first().click()
  await expect(page).toHaveURL(/\/guest\/register$/)
  await expect(page.getByRole('heading', { name: 'Register your organization' })).toBeVisible()
  await expect(page.getByLabel('Organization Legal Name', { exact: false })).toBeVisible()
  await landing(page)
  await page.getByRole('link', { name: 'Resume registration', exact: true }).first().click()
  await expect(page).toHaveURL(/\/guest\/resume$/)
  await expect(page.getByRole('heading', { name: 'Resume your registration' })).toBeVisible()
  await landing(page)
  await page.getByRole('link', { name: 'Workspace sign in', exact: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Enterprise Sign In' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign Up as Guest', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Resume organization registration securely' })).toHaveCount(0)
  for (const role of ['Employee', 'Expert', 'L&D Manager', 'Admin']) {
    await expect(page.getByRole('button', { name: role, exact: true })).toBeVisible()
  }
  await page.screenshot({ path: testInfo.outputPath('enterprise-signin-no-guest-links.png'), fullPage: true, mask: [page.locator('input[type="password"]')] })
  await page.getByRole('link', { name: 'Adapt-Learn-Graph', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  expect(errors).toEqual([])
  expect(requests).toEqual([])
})

test('mobile and landscape navigation, FAQ and Vietnamese content remain usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await landing(page)
  const menu = page.getByRole('button', { name: 'Toggle navigation' })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('navigation').getByRole('link', { name: 'Questions', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await menu.click()
  await page.getByRole('navigation').getByRole('link', { name: 'Questions', exact: true }).click()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  const question = page.getByRole('button', { name: 'Does registration activate a workspace?' })
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(question).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('region', { name: 'Does registration activate a workspace?' })).toContainText('not activated by this step')
  const box = await question.boundingBox()
  const header = await page.locator('header').boundingBox()
  expect(box && header && box.y >= header.y + header.height).toBe(true)
  await revealSections(page)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('landing-mobile.png'), fullPage: true })
  await menu.click()
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kết nối kỹ năng.')
  await page.getByRole('button', { name: 'Mở hoặc đóng điều hướng' }).click()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('landing-mobile-vi.png'), fullPage: true })
  await page.setViewportSize({ width: 812, height: 375 })
  await page.getByRole('button', { name: 'Mở hoặc đóng điều hướng' }).click()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Bắt đầu ngay' })).toBeVisible()
  await noOverflow(page)
  await page.getByRole('navigation').getByRole('link', { name: 'Bắt đầu ngay' }).click()
  await expect(page).toHaveURL(/\/guest\/register$/)
})

test('reduced motion keeps all content visible and keyboard entry accessible', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await landing(page)
  await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'reduced')
  for (const element of await page.locator('[data-landing-reveal]').all()) {
    await expect(element).toHaveCSS('opacity', '1')
    await expect(element).toHaveCSS('transform', 'none')
  }
  const pathStates = await page.locator('[data-graph-path]').evaluateAll(paths => paths.map(path => ({
    opacity: getComputedStyle(path).opacity, dash: getComputedStyle(path).strokeDasharray,
  })))
  expect(pathStates).toHaveLength(4)
  expect(pathStates.every(path => path.opacity === '1' && !path.dash.startsWith('0px'))).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await readableBrand(page)
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('landing-dark-reduced-motion.png'), fullPage: true })
})
