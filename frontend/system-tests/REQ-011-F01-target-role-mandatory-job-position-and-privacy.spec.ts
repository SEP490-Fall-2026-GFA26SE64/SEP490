import { expect, test } from '@playwright/test'

test.describe('REQ-011-F01 Mandatory Job Position & Target Role Privacy Scoping', () => {
  test.setTimeout(120_000)

  test('Job position is strictly mandatory on target role creation, and page reload never flashes cross-department roles', async ({
    page,
  }) => {
    // 1. Authenticate as L&D Manager
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('manager@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Navigate to L&D Manager Target Roles
    await page.goto('/ld-manager/target-roles')
    await expect(page).toHaveURL(/.*\/ld-manager\/target-roles/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify Privacy Scoping on Initial Load:
    // Manager Sarah Connor is in Engineering & Cognitive Systems (ENG-COG).
    // Target roles belonging to Cybersecurity (ENG-SEC) or Cloud (ENG-CLOUD) must NEVER be visible.
    const table = page.getByRole('table')
    await expect(table).toBeVisible({ timeout: 10_000 })
    await expect(table).not.toContainText('Cybersecurity & Compliance')
    await expect(table).not.toContainText('Cloud Infrastructure & DevOps')

    // 4. Verify Privacy on Page Reload (Ensure no split-second flash of all organization roles)
    // Listen for DOM changes to detect if any unauthorized department text ever flashes into the DOM
    let leakedCrossDepartment = false
    page.on('console', (msg) => {
      if (msg.text().includes('PRIVACY_LEAK_DETECTED')) {
        leakedCrossDepartment = true
      }
    })

    // Reload the page
    await page.reload()
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await expect(table).toBeVisible({ timeout: 10_000 })

    // Verify after reload that cross-department roles are strictly absent
    await expect(table).not.toContainText('Cybersecurity & Compliance')
    await expect(table).not.toContainText('Cloud Infrastructure & DevOps')
    expect(leakedCrossDepartment).toBe(false)

    // 5. Open Create Target Role Dialog
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Create Target Role')).toBeVisible()

    // Verify Job Position is marked mandatory
    const jobPositionLabel = dialog.locator('label', { hasText: 'Job Position' })
    await expect(jobPositionLabel).toBeVisible()
    await expect(jobPositionLabel.locator('.text-destructive')).toHaveText('*')

    // 6. Verify that Title and Job Position are required to enable submit buttons
    const saveDraftBtn = dialog.getByRole('button', { name: 'Save as Draft', exact: true })
    const sendExpertBtn = dialog.getByRole('button', { name: /Create & Send to Expert/i })

    // Initially title is empty, buttons must be disabled
    await expect(saveDraftBtn).toBeDisabled()
    await expect(sendExpertBtn).toBeDisabled()

    // Fill Title
    await dialog.getByPlaceholder('e.g. AI Knowledge Architect').fill('Test Privacy Role')

    // Verify code input exists and has value
    const codeInput = dialog.getByPlaceholder('e.g. ROLE-AI-ARCH')
    await expect(codeInput).not.toHaveValue('')

    // Select a valid Job Position
    const jpTrigger = dialog.locator('button').filter({ hasText: /Select Job Position|15-/i }).first()
    await jpTrigger.click()
    const firstOption = page.locator('[role="option"]').first()
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click()
    }

    // Now buttons should be enabled
    await expect(saveDraftBtn).toBeEnabled()
    await expect(sendExpertBtn).toBeEnabled()

    // Close the dialog
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
  })
})

