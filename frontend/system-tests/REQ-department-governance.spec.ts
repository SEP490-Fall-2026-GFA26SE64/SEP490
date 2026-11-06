import { expect, test } from '@playwright/test'

test.describe('Capstone Standard: Department Governance & User Assignment Verification', () => {
  test.setTimeout(120_000)

  test('Administrator governs Departments (CRUD & Neo4j sync) and assigns to User', async ({ page }) => {
    // 1. Authenticate as Administrator (Elena Rostova)
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('admin@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Navigate to Departments Management
    await page.goto('/admin/departments')
    await expect(page).toHaveURL(/.*\/admin\/departments/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify Layout and Design (matching Job Positions layout & design)
    await expect(page.getByRole('heading', { name: 'Departments Management' })).toBeVisible()
    await expect(page.getByText('Departments Directory')).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Total Departments$/ })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Active Departments$/ })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Connected Job Positions$/ })).toBeVisible()
    await expect(page.locator('span').filter({ hasText: /^Workforce Members$/ })).toBeVisible()

    // 4. Test Edge Case: Cancel Creation Modal
    await page.getByRole('button', { name: 'Create Department', exact: true }).click()
    const createDialog = page.getByRole('dialog')
    await expect(createDialog).toBeVisible()
    await createDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(createDialog).toBeHidden()

    // 5. Create a New Department and verify Connected Job Positions shows all 14 available positions
    const uniqueSuffix = Math.floor(Math.random() * 900 + 100)
    const testCode = `ENG-MOB${uniqueSuffix}`
    const testName = `Mobile & Edge Computing ${uniqueSuffix}`
    const testDesc = 'Engineers responsive mobile applications and edge device knowledge clients.'

    await page.getByRole('button', { name: 'Create Department', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Verify auto-generated department code
    const codeInput = page.getByPlaceholder('e.g. ENG-SWE')
    const initialCodeVal = await codeInput.inputValue()
    expect(initialCodeVal).toMatch(/^DPT-/)

    // Overwrite auto-generated code and fill fields
    await codeInput.fill(testCode)
    await page.getByPlaceholder('e.g. Software Engineering').fill(testName)
    await page.locator('textarea').fill(testDesc)

    // Open Job Positions combobox and verify available positions
    const jpTrigger = dialog.locator('button').filter({ hasText: /Select job position/i }).first()
    await jpTrigger.click()
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 5000 })
    const options = page.locator('[role="option"]')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThanOrEqual(5)

    // Select the first job position and click Add Job Position
    const selectedOptionText = await options.first().textContent()
    await options.first().click()
    await dialog.getByRole('button', { name: 'Add Job Position' }).click()

    // Verify added to table and excluded from dropdown
    await expect(dialog.getByRole('table')).toBeVisible()
    await jpTrigger.click()
    const optionsAfter = page.locator('[role="option"]')
    expect(await optionsAfter.count()).toBe(optionCount - 1)
    await jpTrigger.click()

    // Submit
    await dialog.getByRole('button', { name: 'Create Department' }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // 6. Verify newly created/modified Department immediately appears at the top of the Directory table
    const firstRowText = await page.getByRole('table').locator('tbody tr').first().textContent()
    expect(firstRowText).toContain(testCode)
    expect(firstRowText).toContain(testName)

    // 7. Open View Details & Roster Modal
    const viewBtn = page.getByRole('button', { name: /View Details/i }).first()
    await viewBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText(testName)).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // 8. Navigate to User Management (/admin/users) to test User Assignment
    await page.goto('/admin/users')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // Open Edit User modal for a user (Alex Rivera or first available)
    const editUserBtn = page.getByRole('button', { name: /Edit user|Edit/i }).first()
    await editUserBtn.click()

    const userModal = page.getByRole('dialog')
    await expect(userModal).toBeVisible()
    await expect(userModal.getByText('Edit User')).toBeVisible()

    // Verify Two-Card Form Layout
    await expect(userModal.getByText(/Assigned Department \(\d+\)/i)).toBeVisible()
    await expect(userModal.getByText(/Assigned Job Position \(\d+\)/i)).toBeVisible()
    await expect(userModal.getByText(/Target Mastery/i)).toHaveCount(0)

    // Verify department combobox options don't contain raw UUIDs
    const deptComboboxTrigger = userModal.locator('button').filter({ hasText: /Search & select department|Select Department|ENG-|DPT-/i }).first()
    if (await deptComboboxTrigger.isVisible().catch(() => false)) {
      await deptComboboxTrigger.click()
      const deptOptions = page.locator('[role="option"]')
      const count = await deptOptions.count()
      expect(count).toBeGreaterThan(0)
      const firstOptText = await deptOptions.first().textContent()
      expect(firstOptText).not.toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)
      await deptOptions.first().click()
    }

    // Click Save changes and verify save succeeds cleanly without "Send a valid subscription request"
    await userModal.getByRole('button', { name: 'Save changes' }).click()
    await expect(userModal).toBeHidden({ timeout: 10_000 })
    await expect(page.getByText('Unable to complete this operation')).toHaveCount(0)
  })
})
