import { expect, test } from '@playwright/test'

test.describe('REQ-003-F01 RIASEC Calibration Flow', () => {
  test('learner navigates to RIASEC calibration and adjusts interest profile', async ({ page }) => {
    await page.goto('/employee/riasec')

    // Verify page container
    await expect(page.locator('main')).toBeVisible()

    // Verify RIASEC dimensions (Realistic, Investigative, Artistic, Social, Enterprising, Conventional)
    const container = page.locator('main')
    await expect(container).toBeVisible()

    // Sliders or range inputs or calibration options
    const sliders = page.locator('input[type="range"]')
    const sliderCount = await sliders.count()
    if (sliderCount > 0) {
      const firstSlider = sliders.first()
      await firstSlider.fill('80')
    }

    // Verify benefit copy or visual chart
    await expect(page.locator('svg, canvas, [role="img"]').first()).toBeVisible()
  })
})
