import { expect, test } from '@playwright/test'

for (const actor of [
  { persona: 'employee-b', route: '/employee/target-roles', employee: true },
  { persona: 'ld', route: '/ld-manager/baseline-assessments', employee: false },
  { persona: 'admin', route: '/admin/dashboard', employee: false },
]) {
  test(`MM05 shared header responsive controls / ${actor.persona}`, async ({ page }) => {
    expect((await page.request.post('/api/v1/local-baseline-demo/session', {
      data: { persona: actor.persona },
    })).status()).toBe(204)
    await page.goto(actor.route)
    const header = page.locator('.workspace-header')
    await expect(header).toBeVisible()
    const observations: unknown[] = []
    for (const width of [320, 390, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      for (const language of ['EN', 'VI']) {
        await header.getByRole('button', { name: language, exact: true }).click()
        const layout = await header.evaluate(element => {
          const bounds = (el: Element) => {
            const r = el.getBoundingClientRect()
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
          }
          return {
            viewport: innerWidth, document: document.documentElement.scrollWidth,
            header: bounds(element),
            controls: [...element.querySelectorAll('button, a, input')]
              .filter(el => el.getClientRects().length > 0).map(bounds),
          }
        })
        observations.push({ width, language, ...layout })
        for (const control of layout.controls) {
          expect(control.left, JSON.stringify({ width, language, control })).toBeGreaterThanOrEqual(0)
          expect(control.right, JSON.stringify({ width, language, control })).toBeLessThanOrEqual(width)
          expect(control.bottom).toBeLessThanOrEqual(layout.header.bottom)
        }
        if (actor.employee) expect(layout.document).toBeLessThanOrEqual(width)
        const account = header.getByRole('button', { name: 'User actions menu', exact: true })
        await account.focus()
        await page.keyboard.press('Enter')
        await expect(account).toHaveAttribute('aria-expanded', 'true')
        const menu = page.locator('.workspace-account-dropdown')
        await expect(menu).toBeVisible()
        const accountBounds = await menu.boundingBox()
        expect(accountBounds!.x).toBeGreaterThanOrEqual(0)
        expect(accountBounds!.x + accountBounds!.width).toBeLessThanOrEqual(width)
        await account.click()
        await header.getByRole('button', { name: 'Notifications', exact: true }).click()
        const notification = page.locator('.notification-dropdown-panel')
        await expect(notification).toBeVisible()
        const notificationBounds = await notification.boundingBox()
        expect(notificationBounds!.x).toBeGreaterThanOrEqual(0)
        expect(notificationBounds!.x + notificationBounds!.width).toBeLessThanOrEqual(width)
        await header.getByRole('button', { name: 'Notifications', exact: true }).click()
        if (width === 390 && language === 'VI') {
          await page.screenshot({ path: test.info().outputPath('header-mobile-vi.png'), fullPage: true })
        }
      }
    }
    if (actor.employee) {
      const search = header.getByRole('searchbox', { name: 'Search skills and target roles directly' })
      await search.fill('Security')
      await search.press('Enter')
      await expect(page).toHaveURL(/employee\/target-roles\?search=Security/)
      await expect(header.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('href', '/employee/upskilling')
      await expect(header.getByRole('link', { name: 'My Learning', exact: true })).toHaveAttribute('href', '/employee/pathway')
    }
    await test.info().attach('responsive-matrix.json', {
      body: JSON.stringify(observations, null, 2), contentType: 'application/json',
    })
  })
}
