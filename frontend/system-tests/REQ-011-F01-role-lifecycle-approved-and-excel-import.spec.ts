import { expect, test } from '@playwright/test'

async function loginAndContinue(page: any, email: string, pass = 'Password123!') {
  await page.goto('/login')
  await page.getByPlaceholder(/Enter your email/i).or(page.getByLabel(/Email/i)).fill(email)
  await page.locator('input[type="password"]').fill(pass)
  await page.getByRole('button', { name: /Sign in|Đăng nhập/i, exact: true }).click()
  const continueBtn = page.getByRole('button', { name: /Continue to workspace|Tiếp tục vào không gian/i, exact: true })
  if (await continueBtn.isVisible({ timeout: 3500 }).catch(() => false)) {
    await continueBtn.click()
  }
}

test.describe('REQ-011 / REQ-008: Role Lifecycle, Clean UI & Excel Ontology Imports', () => {
  test.setTimeout(120_000)

  test('L&D Manager: Verifies Role naming, Job Zone removal, Role Levels copy, and filter options', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // 1. Authenticate as L&D Manager
    await loginAndContinue(page, 'manager@technova.com')

    // 2. Navigate to Roles page
    await page.getByRole('link', { name: 'Roles', exact: true }).click()
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. UI Refinements Audit:
    // Assert 0 raw Job Zone column in the roles table header
    await expect(page.locator('table')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('table thead')).not.toContainText('Job Zone')

    // 4. Verify PageHeader: top "+ Create" button present
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible()

    // 5. Open Create Role Dialog
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const createModal = page.getByRole('dialog')
    await expect(createModal).toBeVisible()

    // Assert "Role Levels" appears instead of "Role Member Levels"
    await expect(createModal).toContainText('Role Levels')
    await expect(createModal).not.toContainText('Role Member Levels')

    // Assert Role Levels description is present
    await expect(createModal).toContainText('Level codes are automatically generated')

    // Assert Role Scope & Summary is empty by default (not auto-filled)
    const scopeTextarea = createModal.locator('textarea')
    await expect(scopeTextarea).toHaveValue('')

    // Assert Assigned Subject Matter Expert defaults to Unassigned
    await expect(createModal).toContainText('Unassigned')

    // Assert "Create & Send to Expert" is disabled when no expert is assigned
    const sendToExpertBtn = createModal.getByRole('button', { name: /Create & Send to Expert/i })
    await expect(sendToExpertBtn).toBeDisabled()

    // Fill Code & Title to check Save as Draft without expert
    await createModal.getByPlaceholder('e.g. ROLE-AI-ARCH').fill('ROLE-DRAFT-TEST')
    await createModal.getByPlaceholder('e.g. AI Knowledge Architect').fill('Test Draft Role')
    const saveDraftBtn = createModal.getByRole('button', { name: 'Save as Draft', exact: true })
    await expect(saveDraftBtn).toBeEnabled()

    // Close create modal
    await createModal.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(createModal).not.toBeVisible()

    // 6. Verify Status filter has options
    const statusSelect = page.locator('select').filter({ hasText: /All/ })
    await expect(statusSelect).toBeVisible()
    await expect(statusSelect).toContainText('Submitted')
    await expect(statusSelect).toContainText('Published')
    await expect(statusSelect).toContainText('Staged')

    await context.close()
  })

  test('Expert: Verifies Ontology Excel import modals for Competencies and Micro-skills', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // 1. Authenticate as Expert
    await loginAndContinue(page, 'expert@technova.com')

    // 2. Navigate to Expert Ontology page
    await page.getByRole('link', { name: /Ontology/i }).click()
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Switch to Competencies tab
    await page.getByRole('tab', { name: 'Competencies' }).click()

    // Verify "Import" button on Competencies tab
    const importBtn = page.getByRole('button', { name: 'Import', exact: true })
    await expect(importBtn).toBeVisible()

    // Open Import modal
    await importBtn.click()
    const importDialog = page.getByRole('dialog')
    await expect(importDialog).toBeVisible()
    await expect(importDialog).toContainText('Import Competencies from Excel')
    await expect(importDialog.getByRole('button', { name: 'Download Template (.xlsx)' })).toBeVisible()

    // Cancel modal
    await importDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(importDialog).not.toBeVisible()

    // 4. Switch to Micro-skills tab
    await page.getByRole('tab', { name: 'Micro-skills' }).click()
    await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeVisible()

    // Open Micro-skill Import modal
    await page.getByRole('button', { name: 'Import', exact: true }).click()
    await expect(importDialog).toBeVisible()
    await expect(importDialog).toContainText('Import Micro-skills from Excel')
    await expect(importDialog).toContainText('Upload an Excel workbook with "Micro_Skills"')

    await importDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(importDialog).not.toBeVisible()

    await context.close()
  })

  test('L&D Manager: Creates a STAGED role for staffing -> visible in Org Admin user onboarding, hidden from employee upskill catalog', async ({
    browser,
  }) => {
    // 1. Authenticate as L&D Manager in manager context
    const managerContext = await browser.newContext()
    const managerPage = await managerContext.newPage()
    await loginAndContinue(managerPage, 'manager@technova.com')

    // 2. Navigate to Roles page
    await managerPage.getByRole('link', { name: 'Roles', exact: true }).click()
    await expect(managerPage.locator('main')).toBeVisible({ timeout: 15_000 })

    // 3. Open Create Role Dialog
    await managerPage.getByRole('button', { name: 'Create', exact: true }).click()
    const createModal = managerPage.getByRole('dialog')
    await expect(createModal).toBeVisible()

    const stagedCode = `ROLE-STG-${Date.now().toString().slice(-4)}`
    const stagedTitle = `Autonomous AI Systems Architect ${Date.now().toString().slice(-4)}`

    // Fill Role Code and Title
    await createModal.getByPlaceholder('e.g. ROLE-AI-ARCH').fill(stagedCode)
    await createModal.getByPlaceholder('e.g. AI Knowledge Architect').fill(stagedTitle)

    // Click "Save as Staged" (now positioned before Save as Draft)
    const saveStagedBtn = createModal.getByRole('button', { name: 'Save as Staged', exact: true })
    await expect(saveStagedBtn).toBeVisible()
    await expect(saveStagedBtn).toBeEnabled()
    await saveStagedBtn.click()

    // Confirm in the staging confirmation prompt
    const confirmStagedDialog = managerPage.getByRole('dialog').filter({ hasText: 'Stage Target Role for Workforce Staffing?' })
    await expect(confirmStagedDialog).toBeVisible()
    await confirmStagedDialog.getByRole('button', { name: 'Confirm & Save as Staged' }).click()

    // Verify modal closes and filter by Staged to assert role
    await expect(createModal).not.toBeVisible()
    const statusSelect = managerPage.locator('select').filter({ hasText: /All/ })
    await statusSelect.selectOption('staged')
    const roleRow = managerPage.locator('tr').filter({ hasText: stagedCode })
    await expect(roleRow).toBeVisible({ timeout: 10_000 })
    await expect(roleRow.getByText('STAGED', { exact: true })).toBeVisible()

    // Transfer storage to admin context so meta is available across browser contexts without cookies
    const storageState = await managerContext.storageState()
    await managerContext.close()

    // 4. Org Admin Verification: Log in as Org Admin and verify role is selectable in Create User modal
    const adminContext = await browser.newContext({
      storageState: {
        cookies: [],
        origins: storageState.origins,
      },
    })
    const adminPage = await adminContext.newPage()
    await loginAndContinue(adminPage, 'admin@technova.com')

    await adminPage.getByRole('link', { name: /Users|Người dùng/i }).click()
    await expect(adminPage.locator('main')).toBeVisible({ timeout: 15_000 })

    // Open "Create User" modal
    const createUserBtn = adminPage.getByRole('button', { name: /Create User|Tạo người dùng/i, exact: true })
    await expect(createUserBtn).toBeVisible({ timeout: 10_000 })
    await createUserBtn.click()

    const userModal = adminPage.getByRole('dialog')
    await expect(userModal).toBeVisible()

    // Target Role combobox in Section 3 - should contain the staged role!
    const targetRoleCombobox = userModal.locator('button[aria-haspopup="listbox"]').filter({ hasText: /Search & select target role/i })
    await expect(targetRoleCombobox).toBeVisible({ timeout: 5_000 })
    await targetRoleCombobox.click()

    const stagedOption = adminPage.getByRole('option', { name: new RegExp(stagedCode, 'i') }).first()
    await expect(stagedOption).toBeVisible({ timeout: 5_000 })
    await stagedOption.click()

    // Career level dropdown should now show Senior, Middle, Junior
    const levelCombobox = userModal.locator('button[aria-haspopup="listbox"]').filter({ hasText: /Select starting level|Junior|Middle|Senior/i })
    await expect(levelCombobox).toBeVisible()
    await levelCombobox.click()
    await expect(adminPage.getByRole('option', { name: /Senior/i })).toBeVisible()
    await expect(adminPage.getByRole('option', { name: /Middle/i })).toBeVisible()
    await expect(adminPage.getByRole('option', { name: /Junior/i })).toBeVisible()
    await adminPage.keyboard.press('Escape')

    // Cancel modal
    await userModal.getByRole('button', { name: /Cancel|Hủy/i }).click()
    await expect(userModal).not.toBeVisible()
    await adminContext.close()

    // 5. Employee Portal Verification: Staged role MUST NOT appear in employee upskilling browse catalog
    const empContext = await browser.newContext()
    const empPage = await empContext.newPage()
    await loginAndContinue(empPage, 'employee@technova.com')

    await empPage.getByRole('link', { name: /Upskilling|Nâng cao kỹ năng/i }).click()
    await expect(empPage.locator('main')).toBeVisible({ timeout: 15_000 })

    // Search for the staged role
    const searchInput = empPage.getByPlaceholder(/Search roles/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill(stagedCode)
      // Must not find the staged role
      await expect(empPage.locator('body')).not.toContainText(stagedTitle)
    }
    await empContext.close()
  })
})
