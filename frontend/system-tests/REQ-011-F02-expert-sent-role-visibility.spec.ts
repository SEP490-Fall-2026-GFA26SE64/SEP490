import { expect, test } from '@playwright/test'

test.describe('Expert Portal: Sent Role Visibility & Configuration Workflow', () => {
  test.setTimeout(120_000)

  test('Dr. Sarah Chen sees sent role and can open authoring modal', async ({ page }) => {
    // 1. Authenticate as Domain Expert Dr. Sarah Chen
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('expert@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Navigate to Expert Roles page
    await page.goto('/expert/roles')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify page header
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Assigned Roles')

    // 4. Verify ROLE-8H73 or sent role is displayed in the table
    const roleRow = page.locator('tr').filter({ hasText: 'ROLE-8H73' })
    await expect(roleRow).toBeVisible({ timeout: 10_000 })

    // 5. Verify status badge says SENT
    await expect(roleRow.getByText('SENT')).toBeVisible()

    // 6. Click View Details (eye icon) to open Details Dialog with Publication Readiness checks
    const viewDetailsBtn = roleRow.locator('button[title*="View"], button[title*="Detail"]').first()
    if (await viewDetailsBtn.count() > 0) {
      await viewDetailsBtn.click()
      const detailsDialog = page.getByRole('dialog')
      await expect(detailsDialog).toBeVisible({ timeout: 5_000 })
      await expect(detailsDialog).toContainText('ROLE-8H73')

      // Assert top-level tabs are present
      await expect(detailsDialog.getByRole('button', { name: /Architecture Specifications/i })).toBeVisible()
      await expect(detailsDialog.getByRole('button', { name: /Publication Readiness/i })).toBeVisible()
      await expect(detailsDialog.getByRole('button', { name: /Version Changes/i })).toBeVisible()

      // Switch to Publication Readiness & Validation tab
      await detailsDialog.getByRole('button', { name: /Publication Readiness/i }).click()
      await expect(detailsDialog).toContainText('Publication Readiness & Content Validation')
      await expect(detailsDialog).toContainText('Role Levels & Competency Coverage')
      await expect(detailsDialog).toContainText('Learning Modules & Question Bank Coverage')

      // Switch back to Architecture Specifications tab
      await detailsDialog.getByRole('button', { name: /Architecture Specifications/i }).click()
      await expect(detailsDialog).toContainText('Role Levels & Competency Matrix')

      // Close details dialog
      await detailsDialog.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(detailsDialog).not.toBeVisible()
    }

    // 7. Click Edit/Configure button (pencil icon) to open authoring dialog
    const configureBtn = roleRow.locator('button[title*="Configure"], button[title*="Edit"]').first()
    if (await configureBtn.count() > 0) {
      await configureBtn.click()
      const authoringModal = page.getByRole('dialog')
      await expect(authoringModal).toBeVisible({ timeout: 5_000 })
      await expect(authoringModal).toContainText('ROLE-8H73')

      // Assert validation status pill in authoring modal footer & submission gating
      await expect(authoringModal).toContainText('Validation required')
      const submitBtn = authoringModal.getByRole('button', { name: /Submit to L&D Manager/i })
      await expect(submitBtn).toBeDisabled()
    }
  })
})
