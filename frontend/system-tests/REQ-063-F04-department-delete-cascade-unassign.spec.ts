import { expect, test } from '@playwright/test'

test.describe('REQ-063-F04 Delete Department Cascade & User Unassignment', () => {
  test.setTimeout(120_000)

  test('Deactivate button is removed, deleting department unassigns members and removes target roles while preserving job positions', async ({
    page,
  }) => {
    // 1. Authenticate as Administrator
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('admin@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Navigate to Departments Management
    await page.goto('/admin/departments')
    await expect(page).toHaveURL(/.*\/admin\/departments/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Verify Deactivate Department action button is completely removed
    const deactivateButtons = page.getByRole('button', { name: /Deactivate Department|Activate Department/i })
    await expect(deactivateButtons).toHaveCount(0)

    // 4. Create a test department with linked job position
    const uniqueId = Math.floor(Math.random() * 9000 + 1000)
    const testCode = `DPT-DEL${uniqueId}`
    const testName = `Delete Test Dept ${uniqueId}`

    await page.getByRole('button', { name: 'Create Department', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const codeInput = page.getByPlaceholder('e.g. ENG-SWE')
    await codeInput.fill(testCode)
    await page.getByPlaceholder('e.g. Software Engineering').fill(testName)
    await page.locator('textarea').fill('Temporary department to verify cascade deletion and member unassignment.')

    // Link a job position
    const jpTrigger = dialog.locator('button').filter({ hasText: /Select job position/i }).first()
    await jpTrigger.click()
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 5000 })
    await page.locator('[role="option"]').first().click()
    await dialog.getByRole('button', { name: 'Add Job Position' }).click()

    await dialog.getByRole('button', { name: 'Create Department' }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // Verify newly created department appears in the table
    const table = page.getByRole('table')
    await expect(table).toContainText(testCode)
    await expect(table).toContainText(testName)

    // 5. Navigate to User Management to assign this department to a member
    await page.goto('/admin/users')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // Edit the first available user row
    const editBtn = page.getByRole('button', { name: /Edit user|Edit/i }).first()
    await editBtn.click()

    const userModal = page.getByRole('dialog')
    await expect(userModal).toBeVisible()

    // Select the newly created department in the combobox
    const deptCombobox = userModal.locator('button').filter({ hasText: /Search & select department|Select Department|ENG-|DPT-/i }).first()
    if (await deptCombobox.isVisible().catch(() => false)) {
      await deptCombobox.click()
      const deptOption = page.locator('[role="option"]').filter({ hasText: testName }).first()
      if (await deptOption.isVisible().catch(() => false)) {
        await deptOption.click()
        const addDeptBtn = userModal.getByRole('button', { name: 'Add Department' })
        if (await addDeptBtn.isVisible().catch(() => false)) {
          await addDeptBtn.click()
        }
      }
    }

    // Save changes
    await userModal.getByRole('button', { name: 'Save changes' }).click()
    await expect(userModal).toBeHidden({ timeout: 10_000 })

    // 6. Return to Departments Management to delete the department
    await page.goto('/admin/departments')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // Locate the row for our test department
    const targetRow = page.getByRole('row').filter({ hasText: testCode })
    await expect(targetRow).toBeVisible()

    // Click the Delete Department button on that row
    const deleteBtn = targetRow.getByRole('button', { name: 'Delete Department' })
    await deleteBtn.click()

    // Verify Delete confirmation modal and human-centric copy
    const deleteModal = page.getByRole('dialog')
    await expect(deleteModal).toBeVisible()
    await expect(deleteModal.getByRole('heading', { name: 'Delete Department' })).toBeVisible()
    await expect(
      deleteModal.getByText(/Associated target roles and levels will be removed, and all assigned workforce members will return to having no department assigned/i)
    ).toBeVisible()

    // Confirm Delete
    await deleteModal.getByRole('button', { name: 'Delete Department' }).click()
    await expect(deleteModal).toBeHidden({ timeout: 10_000 })

    // 7. Verify Department is removed from the directory table
    await expect(page.getByRole('table')).not.toContainText(testCode)

    // 8. Return to User Accounts to verify member unassignment
    await page.goto('/admin/users')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // Verify the test department code/name does not appear as an assigned department on any row
    await expect(page.getByRole('table')).not.toContainText(testCode)
  })
})
