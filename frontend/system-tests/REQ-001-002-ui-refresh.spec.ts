import { expect, test, type Page } from '@playwright/test'
import { previewFixture } from './support/ui-refresh.fixture'
const fixture = '/system-tests/support/ui-refresh.html'
async function open(page: Page, language = 'en', mode = '') {
  // All data is in-memory synthetic UI input. Reject accidental backend traffic.
  await page.route('http://127.0.0.1:28188/api/**', route => route.abort('blockedbyclient'))
  await page.addInitScript(lang => localStorage.setItem('app_language', lang), language)
  await page.goto(fixture + '?mode=' + mode)
  await page.evaluate(() => { document.body.style.overflow = 'auto' })
  await page.getByRole('button', { name: 'Open fixture preview' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function assertNoClip(page: Page) {
  const layout = await page.getByRole('region').evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.clientHeight, scrollHeight: element.scrollHeight, viewport: innerHeight, bottom: element.getBoundingClientRect().bottom }))
  expect(layout.width).toBeGreaterThan(0); expect(layout.height).toBeGreaterThan(0)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1); expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height + 1)
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewport)
}
for (const [width, height] of [[1280, 900], [768, 800], [390, 844], [320, 640], [844, 390]]) {
  for (const lang of ['en', 'vi']) test(`MM05 Preview exact content / continuation / bounds ${width}x${height} ${lang}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await open(page, lang)
    const next = page.getByRole('button', { name: lang === 'en' ? 'Next' : 'Tiếp', exact: true })
    const previous = page.getByRole('button', { name: lang === 'en' ? 'Previous' : 'Trước', exact: true })
    await expect(page.locator('.assessment-preview-copy').first()).toContainText('[0]')
    await expect(previous).toBeDisabled(); await page.keyboard.press('ArrowLeft'); await expect(previous).toBeDisabled()
    const observed: string[][] = Array.from({ length: 5 }, () => [])
    let pages = 0
    while (true) {
      await assertNoClip(page)
      const question = Number((await page.getByRole('region').getAttribute('aria-label'))!.match(/\d+$/)![0]) - 1
      observed[question].push(...await page.getByRole('region').locator('p').allTextContents()); pages++
      if (await next.isDisabled()) break
      const before = await page.getByRole('region').textContent()
      if (pages % 2) await next.click(); else { await page.getByRole('button', { name: lang === 'en' ? 'Reset text size to 100%' : 'Đặt lại cỡ chữ 100%' }).focus(); await page.keyboard.press('ArrowRight') }
      await expect.poll(() => page.getByRole('region').textContent()).not.toBe(before)
      expect(pages).toBeLessThan(250)
    }
    expect(pages).toBeGreaterThan(5)
    expect(observed.map(parts => parts.join(''))).toEqual(previewFixture.sample.map(item => item.prompt + Object.entries(item.options).map(([key, text]) => key + '. ' + text).join('')))
    await page.keyboard.press('ArrowRight'); await expect(next).toBeDisabled()
    await previous.click(); await expect(next).toBeEnabled()
    await page.screenshot({ path: test.info().outputPath('preview.png') })
  })
}
test('MM05 Preview zoom 80–150/reset, question jump, expand/restore, resize, focus/Escape/scroll restoration', async ({ page }) => {
  await open(page)
  const close = page.getByRole('button', { name: 'Close preview', exact: true })
  const zoomOut = page.getByRole('button', { name: 'Decrease text size' }), zoomIn = page.getByRole('button', { name: 'Increase text size' }), reset = page.getByRole('button', { name: 'Reset text size to 100%' })
  for (let n = 0; n < 2; n++) await zoomOut.click()
  await expect(reset).toHaveText('80%'); await expect(zoomOut).toBeDisabled(); await assertNoClip(page)
  for (let n = 0; n < 7; n++) await zoomIn.click()
  await expect(reset).toHaveText('150%'); await expect(zoomIn).toBeDisabled(); await assertNoClip(page)
  await reset.click(); await expect(reset).toHaveText('100%')
  await page.getByRole('button', { name: 'Question 5', exact: true }).click(); await expect(page.getByRole('status')).toContainText('5 / 5')
  await page.getByRole('button', { name: 'Expand preview', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveClass(/assessment-preview-expanded/)
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole('status')).toContainText('5 / 5'); await assertNoClip(page)
  await page.getByRole('button', { name: 'Restore preview size', exact: true }).click(); await expect(page.getByRole('dialog')).not.toHaveClass(/assessment-preview-expanded/)
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  await close.focus(); await page.keyboard.press('Tab'); expect(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused()
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open fixture preview' })).toBeFocused(); await expect(page.locator('body')).toHaveCSS('overflow', 'auto')
})
for (const mode of ['empty', 'infeasible']) test(`AB-C05/MM05 Preview ${mode} preserves explicit feedback and closes`, async ({ page }) => {
  await open(page, 'en', mode)
  await expect(page.getByText(mode === 'empty' ? 'No sample questions were returned.' : 'Coverage needs attention', { exact: true })).toBeVisible()
  await expect(page.getByRole('region')).toHaveCount(0)
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('RB16 demo login waits for backend session before reload; shell storage never grants server identity', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let sessionStarted = false
  await page.route('http://127.0.0.1:28188/api/**', async route => {
    expect(route.request().url()).toContain('/local-baseline-demo/session')
    expect(route.request().postDataJSON()).toEqual({ persona: 'employee-a' })
    sessionStarted = true; await gate
    await route.fulfill({ status: 204, headers: { 'Set-Cookie': 'fixture_session=employee-a; Path=/; HttpOnly; SameSite=Lax' } })
  })
  await page.route('**/employee/overview', async route => { expect(sessionStarted).toBe(true); await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Isolated navigation destination</h1>' }) })
  await page.goto(fixture + '?mode=login')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect.poll(() => sessionStarted).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('active_actor'))).toBeNull()
  expect(page.url()).toContain('mode=login')
  release(); await expect(page).toHaveURL(/employee\/overview$/)
  expect(await page.evaluate(() => localStorage.getItem('active_actor'))).toBe('employee')
  expect((await page.context().cookies()).find(cookie => cookie.name === 'fixture_session')?.httpOnly).toBe(true)
})
