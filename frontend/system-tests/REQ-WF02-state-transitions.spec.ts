import { expect, test, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  const continueBtn = page.getByRole('button', { name: /Continue to workspace|Tiếp tục vào không gian/i })
  await expect(continueBtn).toBeVisible({ timeout: 15_000 })
  await continueBtn.click()
  await expect(page).toHaveURL(/\/workspace\//, { timeout: 15_000 })
}

/**
 * REQ-WF02 State Transition Test Suite
 *
 * TC-WF02-ST01: Comprehensive Target Role Lifecycle State Transitions
 * Validates the full target role lifecycle through all 6 state transitions:
 *   Phase 1: [Initial] -> DRAFT / SENT (L&D Manager creates role & dispatches to Domain Expert)
 *   Phase 2: DRAFT -> SUBMITTED (Domain Expert authors & submits requirements)
 *   Phase 3: SUBMITTED -> REJECTED (L&D Manager returns for revision with actionable feedback)
 *   Phase 4: REJECTED -> SUBMITTED (Domain Expert reviews feedback and resubmits)
 *   Phase 5: SUBMITTED -> PUBLISHED (L&D Manager approves and publishes to graph)
 *   Phase 6: PUBLISHED -> UNPUBLISHED (L&D Manager unpublishes; employee isolation verified)
 */

test.describe('Report 5: WF02 State Transition Test (Target Role Lifecycle)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  test('Target Role Lifecycle State Transitions: DRAFT -> SUBMITTED -> REJECTED -> SUBMITTED -> PUBLISHED -> UNPUBLISHED', async ({ page }) => {
    test.setTimeout(240_000)
    const roleSuffix = Date.now().toString().slice(-4)
    const roleCode = `ROLE-ST-${roleSuffix}`
    const roleTitle = `Lifecycle Role ${roleSuffix}`

    const filterByRoleCode = async () => {
      const searchInput = page.getByPlaceholder(/Search roles\.\.\./i)
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(roleCode)
        await page.waitForTimeout(400)
      }
    }

    // =========================================================================
    // Phase 1: [Initial] -> DRAFT / SENT (Create role and dispatch to expert)
    // =========================================================================
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    const createBtn = page.getByRole('button', { name: /Create/i }).first()
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    const createModal = page.getByRole('dialog')
    await expect(createModal).toBeVisible()

    // 1. Fill Code & Title
    const codeInput = createModal.getByPlaceholder(/e\.g\. ROLE-AI-ARCH/i)
    await expect(codeInput).toBeVisible()
    await codeInput.fill(roleCode)

    const titleInput = createModal.getByPlaceholder(/e\.g\. AI Knowledge Architect/i)
    await expect(titleInput).toBeVisible()
    await titleInput.fill(roleTitle)

    // 2. Select Job Position if not selected
    const jobPositionTrigger = createModal.locator('button').filter({ hasText: /Select Job Position|Select an option|15-1252/i }).first()
    if (await jobPositionTrigger.isVisible().catch(() => false)) {
      const triggerText = await jobPositionTrigger.innerText()
      if (!triggerText.includes('15-1252')) {
        await jobPositionTrigger.click()
        const firstOption = page.locator('[role="option"]').first()
        if (await firstOption.isVisible().catch(() => false)) {
          await firstOption.click()
        }
      }
    }

    // 3. Assign Domain Expert (Dr. Sarah Chen / expert@technova.com)
    const expertTrigger = createModal.locator('button').filter({ hasText: /Select assigned domain expert|Select expert/i }).first()
    if (await expertTrigger.isVisible().catch(() => false)) {
      await expertTrigger.click()
      const expertOption = page.locator('[role="option"]').filter({ hasText: /Dr\. Sarah Chen|expert@technova\.com|Domain Expert/i }).first()
      if (await expertOption.isVisible().catch(() => false)) {
        await expertOption.click()
      } else {
        const firstOpt = page.locator('[role="option"]').first()
        if (await firstOpt.isVisible().catch(() => false)) {
          await firstOpt.click()
        }
      }
    }

    // 4. Keep 1 level ("Senior") so single-skill mapping fully fulfills publication threshold
    const removeBtns = createModal.locator('button[title="Remove Level"]')
    if ((await removeBtns.count()) >= 2) {
      await removeBtns.last().click()
      await page.waitForTimeout(300)
    }
    const removeBtns2 = createModal.locator('button[title="Remove Level"]')
    if ((await removeBtns2.count()) >= 2) {
      await removeBtns2.last().click()
      await page.waitForTimeout(300)
    }

    // 5. Submit form: "Create & Send to Expert"
    const submitBtn = createModal.getByRole('button', { name: /Create & Send to Expert|Save as Draft/i }).last()
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()
    await expect(createModal).toHaveCount(0)

    // Verify role appears in Manager Catalog
    await expect(page.getByText(/Loading target roles/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    await filterByRoleCode()
    const roleRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(roleRow).toBeVisible({ timeout: 15_000 })
    await expect(roleRow.getByText(/DRAFT|SENT/i)).toBeVisible()

    // =========================================================================
    // Phase 2: DRAFT -> SUBMITTED (Domain Expert authors requirements & submits)
    // =========================================================================
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    await filterByRoleCode()
    const expertRoleRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(expertRoleRow).toBeVisible({ timeout: 15_000 })
    await expect(expertRoleRow.getByText(/DRAFT|SENT/i)).toBeVisible()

    // Open configuration modal
    const configBtn = expertRoleRow.locator('button[title*="Micro-skills"]').first()
    await expect(configBtn).toBeVisible()
    await configBtn.click()

    const configModal = page.locator('div[role="dialog"]')
    await expect(configModal).toBeVisible()

    // Add a competency to fulfill requirements
    const compTrigger = configModal.locator('button').filter({ hasText: /Search & select competency|Select Competency/i }).first()
    if (await compTrigger.isVisible().catch(() => false)) {
      await compTrigger.click()
      const firstComp = page.locator('[role="option"]').first()
      if (await firstComp.isVisible().catch(() => false)) {
        await firstComp.click()
        const addCompBtn = configModal.getByRole('button', { name: /Add Competency/i })
        if (await addCompBtn.isEnabled().catch(() => false)) {
          await addCompBtn.click()
        }
      }
    }

    // Select a knowledge level to enable Assign Skill
    const levelBtn = configModal.getByRole('button', { name: /Intermediate|Foundation/i }).first()
    if (await levelBtn.isVisible().catch(() => false)) {
      await levelBtn.click()
    }

    // Assign micro-skill target so skillTargets > 0
    const assignSkillBtn = configModal.getByRole('button', { name: /Assign Skill/i })
    await expect(assignSkillBtn).toBeEnabled({ timeout: 5_000 })
    await assignSkillBtn.click()

    // Save draft (persists micro-skill target and closes modal)
    const saveDraftBtn = configModal.getByRole('button', { name: /Save Draft/i })
    await expect(saveDraftBtn).toBeVisible()
    await saveDraftBtn.click()
    await expect(configModal).toHaveCount(0)

    // Re-open config modal to submit with populated skill targets
    await configBtn.click()
    const submitModal = page.locator('div[role="dialog"]')
    await expect(submitModal).toBeVisible()

    // Submit to L&D Manager
    const submitToLdBtn = submitModal.getByRole('button', { name: /Submit to L&D Manager/i })
    await expect(submitToLdBtn).toBeEnabled({ timeout: 10_000 })
    await submitToLdBtn.click()
    await expect(submitModal).toHaveCount(0)

    // Verify SUBMITTED state on expert view
    await expect(expertRoleRow.getByText(/SUBMITTED/i)).toBeVisible()

    // =========================================================================
    // Phase 3: SUBMITTED -> REJECTED (L&D Manager requests revision with feedback)
    // =========================================================================
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    await filterByRoleCode()
    const managerSubmittedRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(managerSubmittedRow).toBeVisible({ timeout: 15_000 })
    await expect(managerSubmittedRow.getByText(/SUBMITTED/i)).toBeVisible()

    // Open View Details
    const viewDetailsBtn = managerSubmittedRow.locator('button[title="View Details"]')
    await expect(viewDetailsBtn).toBeVisible()
    await viewDetailsBtn.click()

    const detailsModal = page.getByRole('dialog')
    await expect(detailsModal).toBeVisible()

    // Click "Return for Revision"
    const returnRevisionBtn = detailsModal.getByRole('button', { name: /Return for Revision/i })
    await expect(returnRevisionBtn).toBeVisible()
    await returnRevisionBtn.click()

    // Fill revision feedback in dialog
    const rejectDialog = page.getByRole('dialog').filter({ hasText: /Return for Revision/i }).last()
    await expect(rejectDialog).toBeVisible()

    const feedbackTextarea = rejectDialog.locator('textarea')
    await expect(feedbackTextarea).toBeVisible()
    await feedbackTextarea.fill('Please calibrate intermediate proficiency thresholds for Level 1.')

    const confirmRejectBtn = rejectDialog.getByRole('button', { name: /Confirm Return/i })
    await expect(confirmRejectBtn).toBeVisible()
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/target-roles') && res.request().method() === 'PUT').catch(() => null),
      confirmRejectBtn.click(),
    ])
    await expect(rejectDialog).toHaveCount(0)
    await page.waitForTimeout(800)

    // Close details modal if still visible
    if (await detailsModal.isVisible().catch(() => false)) {
      const closeBtn = detailsModal.getByRole('button', { name: /Close/i }).first()
      await closeBtn.click().catch(() => {})
    }

    // Verify REJECTED / REVISION state on Manager view
    const managerRejectedRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(managerRejectedRow).toBeVisible()
    await expect(managerRejectedRow.getByText(/REVISION|REJECTED|FEEDBACK/i).first()).toBeVisible()

    // =========================================================================
    // Phase 4: REJECTED -> SUBMITTED (Expert reviews feedback and resubmits)
    // =========================================================================
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    await filterByRoleCode()
    const expertRevisionRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(expertRevisionRow).toBeVisible({ timeout: 15_000 })
    await expect(expertRevisionRow.getByText(/REVISION|REJECTED|FEEDBACK/i).first()).toBeVisible()

    // Expert re-opens configuration modal
    const reviseConfigBtn = expertRevisionRow.locator('button[title*="Micro-skills"]').first()
    await expect(reviseConfigBtn).toBeVisible()
    await reviseConfigBtn.click()

    const reviseModal = page.locator('div[role="dialog"]')
    await expect(reviseModal).toBeVisible()

    // Verify revision feedback banner is rendered
    await expect(reviseModal.getByText(/calibrate intermediate proficiency/i)).toBeVisible()

    // Resubmit to L&D Manager
    const resubmitBtn = reviseModal.getByRole('button', { name: /Re-submit to L&D Manager|Submit to L&D Manager/i })
    await expect(resubmitBtn).toBeEnabled()
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/target-roles') && res.request().method() === 'PUT').catch(() => null),
      resubmitBtn.click(),
    ])
    await expect(reviseModal).toHaveCount(0)
    await page.waitForTimeout(800)

    // Verify state transitioned back to SUBMITTED
    await expect(expertRevisionRow.getByText(/SUBMITTED/i)).toBeVisible()

    // =========================================================================
    // Phase 5: SUBMITTED -> PUBLISHED (L&D Manager approves and publishes)
    // =========================================================================
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    await filterByRoleCode()
    const managerApproveRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(managerApproveRow).toBeVisible({ timeout: 15_000 })

    const approveViewBtn = managerApproveRow.locator('button[title="View Details"]')
    await approveViewBtn.click()

    const approveDetailsModal = page.getByRole('dialog')
    await expect(approveDetailsModal).toBeVisible()

    const approveAndPublishBtn = approveDetailsModal.getByRole('button', { name: /Approve & Publish/i })
    await expect(approveAndPublishBtn).toBeVisible()
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/target-roles') && res.request().method() === 'PUT').catch(() => null),
      approveAndPublishBtn.click(),
    ])
    await expect(approveDetailsModal).toHaveCount(0)
    await page.waitForTimeout(800)

    // Verify PUBLISHED state in manager table
    const publishedRow = page.locator('table tbody tr').filter({ hasText: roleCode }).first()
    await expect(publishedRow.getByText(/PUBLISHED/i)).toBeVisible({ timeout: 15_000 })

    // =========================================================================
    // Phase 6: PUBLISHED -> UNPUBLISHED (L&D Manager unpublishes role)
    // =========================================================================
    const unpublishBtn = publishedRow.locator('button[title="Unpublish Target Role"], button[aria-label="Unpublish Target Role"]')
    await expect(unpublishBtn).toBeVisible()
    await unpublishBtn.click()

    const unpublishDialog = page.getByRole('dialog').filter({ hasText: /Unpublish Target Role/i }).last()
    await expect(unpublishDialog).toBeVisible()

    const confirmUnpublishBtn = unpublishDialog.getByRole('button', { name: /Unpublish Target Role/i })
    await expect(confirmUnpublishBtn).toBeVisible()
    await confirmUnpublishBtn.click()
    await expect(unpublishDialog).toHaveCount(0)

    // Verify state transitions to UNPUBLISHED in manager view
    await expect(publishedRow.getByText(/UNPUBLISHED/i)).toBeVisible()

    // Verify employee isolation: Unpublished role is NOT visible to employees
    await loginAs(page, 'employee@technova.com')
    await page.goto('/workspace/workspace-development/employee/target-roles')
    await expect(page.locator('main')).toBeVisible()

    const employeeRoleCard = page.locator('div, tr, article').filter({ hasText: roleCode })
    await expect(employeeRoleCard).toHaveCount(0)
  })
})
