import { expect, test } from '@playwright/test'
import { previewFixture } from './support/ui-refresh.fixture'
for (const lang of ['en', 'vi']) test(`MM05 continuation reading offset survives 150% zoom/mobile/landscape/expand ${lang}`, async ({ page }) => {
  await page.route('http://127.0.0.1:28188/api/**', route => route.abort())
  await page.addInitScript(language => localStorage.setItem('app_language', language), lang)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/system-tests/support/ui-refresh.html')
  await page.getByRole('button', { name: 'Open fixture preview' }).click()
  const region = page.getByRole('region')
  await expect(region.locator('p').first()).toContainText('[0]')
  await page.getByRole('button', { name: lang === 'en' ? 'Next' : 'Tiếp', exact: true }).click()
  const full = previewFixture.sample[0].prompt + Object.entries(previewFixture.sample[0].options).map(([k,v]) => k + '. ' + v).join('')
  const before = (await region.locator('p').allTextContents()).join('')
  const originalOffset = full.indexOf(before)
  expect(originalOffset).toBeGreaterThan(0)
  const zoomIn = page.getByRole('button', { name: lang === 'en' ? 'Increase text size' : 'Phóng to chữ' })
  for (let n = 0; n < 5; n++) await zoomIn.click()
  await expect(zoomIn).toBeDisabled()
  for (const [width, height] of [[320, 640], [844, 390]]) {
    await page.setViewportSize({ width, height })
    await expect.poll(async () => {
      const text = (await region.locator('p').allTextContents()).join(''), start = full.indexOf(text)
      return text.length > 0 && start >= 0 && start <= originalOffset && originalOffset < start + text.length
    }).toBe(true)
    const bounds = await region.evaluate(e => ({ h:e.clientHeight, sh:e.scrollHeight, w:e.clientWidth, sw:e.scrollWidth }))
    expect(bounds.h).toBeGreaterThan(0); expect(bounds.sh).toBeLessThanOrEqual(bounds.h + 1); expect(bounds.sw).toBeLessThanOrEqual(bounds.w + 1)
  }
  await page.getByRole('button', { name: lang === 'en' ? 'Expand preview' : 'Mở rộng cửa sổ', exact: true }).click()
  await expect.poll(async () => {
    const text = (await region.locator('p').allTextContents()).join(''), start = full.indexOf(text)
    return text.length > 0 && start <= originalOffset && originalOffset < start + text.length
  }).toBe(true)
  await page.screenshot({ path: test.info().outputPath('reflow-150-landscape.png') })
})
