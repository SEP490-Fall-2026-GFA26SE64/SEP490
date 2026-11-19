import { expect, test } from '@playwright/test'

test.describe('Expert Portal: Sent Role Visibility & Configuration Workflow', () => {
  test.setTimeout(120_000)

  test('Dr. Sarah Chen sees sent role and can open authoring modal', async ({ page }) => {
    // 1. Authenticate as Domain Expert Dr. Sarah Chen
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('expert@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const continueBtn = page.getByRole('button', { name: 'Continue to workspace', exact: true })
    if (await continueBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await continueBtn.click()
    }

    await page.waitForURL(/.*\/expert\/roles/, { timeout: 15_000 })
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify page header
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Assigned Roles')

    // 4. Verify assigned role is displayed in the table
    const roleRow = page.locator('tbody tr').first()
    await expect(roleRow).toBeVisible({ timeout: 10_000 })
    const roleCode = (await roleRow.locator('td').first().innerText()).trim()

    // 5. Verify status badge
    await expect(roleRow.getByText(/PUBLISHED|DRAFT|STAGED|SUBMITTED/i)).toBeVisible()

    // 6. Click View Details (eye icon) to open Details Dialog with Publication Readiness checks
    const viewDetailsBtn = roleRow.locator('button[title*="View"], button[title*="Detail"]').first()
    if (await viewDetailsBtn.count() > 0) {
      await viewDetailsBtn.click()
      const detailsDialog = page.getByRole('dialog')
      await expect(detailsDialog).toBeVisible({ timeout: 5_000 })
      if (roleCode) {
        await expect(detailsDialog).toContainText(roleCode)
      }

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

    // 7. Click Edit/Configure button (pencil icon) to open authoring dialog if present
    const configureBtn = roleRow.locator('button[title*="Configure"], button[title*="Edit"]').first()
    if (await configureBtn.count() > 0) {
      await configureBtn.click()
      const authoringModal = page.getByRole('dialog')
      await expect(authoringModal).toBeVisible({ timeout: 5_000 })
      if (roleCode) {
        await expect(authoringModal).toContainText(roleCode)
      }

      // Assert validation status pill in authoring modal footer & submission gating
      await expect(authoringModal).toContainText('Validation')
      const submitBtn = authoringModal.getByRole('button', { name: /Submit to L&D Manager/i })
      if (await submitBtn.count() > 0) {
        await expect(submitBtn).toBeDisabled()
      }
    }
  })
})
