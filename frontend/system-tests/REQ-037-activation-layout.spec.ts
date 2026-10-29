import { expect, test } from '@playwright/test'
import { observe } from './subscriptionHelpers'

test('Activation and its alias match the workspace login frame on desktop and mobile', async ({ page, baseURL }, testInfo) => {
  if (baseURL !== 'http://127.0.0.1:8093') throw new Error('Use the isolated identity-test environment.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  const observed = observe(page)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/login')
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    const loginCard = await page.locator('.razor-card').boundingBox()
    const footer = await page.locator('.razor-footer').innerText()
    const radius = await page.getByLabel('Password', { exact: true }).evaluate(input => getComputedStyle(input).borderRadius)
    if (!loginCard) throw new Error('Login frame is not rendered')
    for (const route of ['/activate', '/active']) {
      await page.goto(route)
      await expect(page.getByRole('heading', { name: 'Activate your account', exact: true })).toBeVisible()
      await expect(page.locator('.razor-card')).toHaveCount(1)
      const card = await page.locator('.razor-card').boundingBox()
      if (!card) throw new Error('Activation frame is not rendered')
      expect(Math.abs(card.width - loginCard.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(card.x - loginCard.x)).toBeLessThanOrEqual(1)
      expect(await page.locator('.razor-footer').innerText()).toBe(footer)
      expect(await page.getByLabel('Password', { exact: true }).evaluate(input => getComputedStyle(input).borderRadius)).toBe(radius)
      await expect(page.getByRole('button', { name: 'Activate account', exact: true })).toBeDisabled()
      await expect(page.getByRole('alert')).toContainText('Open the activation link')
      if (width > 980) {
        await expect(page.locator('.razor-illustration-left')).toBeVisible()
        await expect(page.locator('.razor-illustration-right')).toBeVisible()
      } else {
        await expect(page.locator('.razor-illustration-left')).toBeHidden()
        await expect(page.locator('.razor-illustration-right')).toBeHidden()
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${width}.png`), fullPage: true })
    }
  }
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Kích hoạt tài khoản', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Về trang chủ', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('activation-mobile-vi.png'), fullPage: true })
  expect(observed.errors).toEqual([])
  expect(observed.network).toEqual([])
})
