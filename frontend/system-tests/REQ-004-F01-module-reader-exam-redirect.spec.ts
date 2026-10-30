import { expect, test } from '@playwright/test'

test.describe('REQ-004-F01 Learning Module Reader and Exam Action Flow', () => {
  test('learner views module content and uses Take Module Exam action', async ({ page }) => {
    await page.goto('/learner/modules/mod-101')

    // Verify Module Title heading exists
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible()

    // Verify ad-hoc breadcrumbs do NOT exist (strict breadcrumb policy)
    const breadcrumbNav = page.locator('nav[aria-label="breadcrumb"], .breadcrumb')
    await expect(breadcrumbNav).toHaveCount(0)

    // Locate "Take Module Exam" button in PageHeader actions
    const examButton = page.getByRole('button', { name: /Take Module Exam/i }).first()
    await expect(examButton).toBeVisible()

    // Click Take Module Exam button
    await examButton.click()

    // Assert URL redirects to assessment with module parameter
    await expect(page).toHaveURL(/.*assessment.*module=(mod-101|MOD-CYP-101).*/i)
  })
})
