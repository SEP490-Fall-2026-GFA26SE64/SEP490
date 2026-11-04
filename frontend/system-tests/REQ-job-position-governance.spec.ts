import { expect, test } from '@playwright/test'

test.describe('Capstone Standard: Job Position Governance & Refactoring Verification', () => {
  test.setTimeout(120_000)

  test('L&D Manager governs Job Positions: view, search, create, assign expert, edit, and verify persistence', async ({ page }) => {
    // 1. Authenticate as L&D Manager (Sarah Connor)
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('manager@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Arrive at Job Positions Management
    await expect(page).toHaveURL(/.*\/ld-manager\/job-positions/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify Human-Centric UI, Headings & StatCards
    await expect(page.getByText('Job Positions Directory')).toBeVisible()
    await expect(page.getByText('Active SMEs Assigned')).toBeVisible()
    await expect(page.getByText('Micro-Skills Covered')).toBeVisible()

    // 4. Verify existing seeded Job Positions (Software Developers & Information Security Analysts)
    const searchInput = page.getByPlaceholder('Search job positions...')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Software Developers')
    await expect(page.getByRole('table').getByText('15-1252.00', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table').getByText('Software Developers', { exact: true })).toBeVisible()

    await searchInput.fill('Information Security')
    await expect(page.getByRole('table').getByText('15-1212.00', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table').getByText('Information Security Analysts', { exact: true })).toBeVisible()

    // Clear search filter
    await searchInput.fill('')

    // 5. Test Edge Case: Cancel Creation Modal
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const createDialog = page.getByRole('dialog')
    await expect(createDialog).toBeVisible()
    const cancelBtn = createDialog.getByRole('button', { name: 'Cancel' })
    await cancelBtn.click()
    await expect(createDialog).toBeHidden()

    // 6. Create a New Job Position
    const uniqueSuffix = Math.floor(Math.random() * 900 + 100)
    const testCode = `15-77${uniqueSuffix}.00`
    const testName = `Cloud Infrastructure Architect ${uniqueSuffix}`
    const testDesc = 'Orchestrates scalable distributed cloud infrastructure and automated pipelines.'

    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill form fields
    const codeInput = page.getByPlaceholder(/15-1252\.00/i).or(page.locator('input[placeholder*="15-"]'))
    await codeInput.fill(testCode)

    const nameInput = page.getByPlaceholder(/Software Developers/i).or(page.locator('input[placeholder*="Developers"]'))
    await nameInput.fill(testName)

    const descInput = page.getByPlaceholder(/Provide a comprehensive summary/i).or(page.locator('textarea'))
    await descInput.fill(testDesc)

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: /Create JobPosition|Create/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 })

    // 7. Verify new Job Position appears in the table
    await searchInput.fill(testCode)
    await expect(page.getByRole('table').getByText(testCode, { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table').getByText(testName, { exact: true })).toBeVisible()

    // 8. Open Edit Modal and update Job Position name
    const editBtn = page.getByRole('button', { name: 'Edit Job Position' }).first()
    await editBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const updatedName = `Senior Cloud Architect ${uniqueSuffix}`
    await nameInput.fill(updatedName)
    await page.getByRole('dialog').getByRole('button', { name: /Update JobPosition|Update|Save/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 })

    // Verify updated name in table
    await expect(page.getByRole('table').getByText(updatedName, { exact: true })).toBeVisible()

    // 9. Verify Persistence across Page Reload
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    const reloadedSearch = page.getByPlaceholder('Search job positions...')
    await reloadedSearch.fill(testCode)
    await expect(page.getByRole('table').getByText(testCode, { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table').getByText(updatedName, { exact: true })).toBeVisible()

    // 10. Check View Details & RIASEC Modal
    const viewBtn = page.getByRole('button', { name: 'View Details & RIASEC' }).first()
    await viewBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(updatedName)).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // 11. Switch Language (EN -> VI -> EN) to ensure clean i18n
    const viBtn = page.getByRole('button', { name: 'VI', exact: true })
    if (await viBtn.isVisible()) {
      await viBtn.click()
      await page.waitForTimeout(500)
      const enBtn = page.getByRole('button', { name: 'EN', exact: true })
      await expect(enBtn).toBeVisible()
      await enBtn.click()
    }

    // 12. Navigate to Target Roles and verify newly created Job Position appears in Create Role dropdown
    await page.getByRole('link', { name: 'Target Roles' }).click()
    await expect(page).toHaveURL(/.*\/ld-manager\/target-roles/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /Create Target Role|Create/i }).click()
    const targetRoleModal = page.getByRole('dialog')
    await expect(targetRoleModal).toBeVisible()

    // Open Job Position Combobox
    const jobPositionCombobox = targetRoleModal.locator('button[aria-expanded]').first()
    await expect(jobPositionCombobox).toBeVisible()
    await jobPositionCombobox.click()

    // Search or verify custom job position in dropdown options
    const searchOption = page.getByPlaceholder('Search job position...')
    if (await searchOption.isVisible().catch(() => false)) {
      await searchOption.fill(testCode)
    }

    const customOption = page.getByRole('option', { name: new RegExp(testCode) }).or(page.locator('div[role="option"]').filter({ hasText: testCode }))
    await expect(customOption).toBeVisible({ timeout: 10_000 })
    await expect(customOption).toContainText(updatedName)

    // Select the custom job position and verify alignment
    await customOption.click()
    await expect(jobPositionCombobox).toContainText(testCode)
    await expect(jobPositionCombobox).toContainText(updatedName)

    // Close modal cleanly
    await targetRoleModal.getByRole('button', { name: 'Cancel' }).click()
    await expect(targetRoleModal).toBeHidden()
  })
})
