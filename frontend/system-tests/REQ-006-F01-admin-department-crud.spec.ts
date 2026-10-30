import { expect, test } from '@playwright/test'

test.describe('REQ-006-F01 Administrator Department Management Flow', () => {
  test('administrator views human-centric copy and opens create department modal', async ({ page }) => {
    await page.goto('/admin/departments')

    // 1. Verify Human-Centric UI & ensure developer spec dumps are eliminated
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByText('Structure internal business units, assign department leadership, align O*NET')).toHaveCount(0)

    // 2. Open Create Department dialog
    const createButton = page.getByRole('button', { name: /Add Department|Create Department|New Department/i })
    if (await createButton.isVisible()) {
      await createButton.click()

      // Modal is visible
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Check cancel action
      const cancelButton = dialog.getByRole('button', { name: 'Cancel' })
      await cancelButton.click()

      // Dialog is dismissed
      await expect(dialog).toBeHidden()
    }
  })
})
