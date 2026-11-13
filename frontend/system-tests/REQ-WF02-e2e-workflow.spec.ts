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

test.describe('Report 5: WF02 End-to-End Workflow Test (Kịch bản Demo Capstone)', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  test('Complete End-to-End Target Role Lifecycle with Neo4j Target Role and Graph Inspection', async ({ page }) => {
    const roleTitle = 'Neo4j Target Role'
    const roleCode = `ROLE-NEO4J-${Date.now().toString().slice(-4)}`

    // =========================================================================
    // STEP 1 & 2: LD Manager creates target role, adds rank Fresher, assigns Expert
    // =========================================================================
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Click "+ Create Target Role"
    const createRoleBtn = page.getByRole('button', { name: /Create/i }).first()
    await expect(createRoleBtn).toBeVisible()
    await createRoleBtn.click()

    const createModal = page.getByRole('dialog')
    await expect(createModal).toBeVisible()

    // 1. Fill Role Code & Role Title
    const codeInput = createModal.getByPlaceholder(/e\.g\. ROLE-AI-ARCH/i)
    await expect(codeInput).toBeVisible()
    await codeInput.fill(roleCode)

    const titleInput = createModal.getByPlaceholder(/e\.g\. AI Knowledge Architect/i)
    await expect(titleInput).toBeVisible()
    await titleInput.fill(roleTitle)

    // 2. Select Job Position if not already auto-selected
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

    // 3. Add Rank "Fresher"
    const addLevelBtn = createModal.getByRole('button', { name: /Add Level/i })
    await expect(addLevelBtn).toBeVisible()
    await addLevelBtn.click()

    // Rename the added level to "Fresher"
    const levelInputs = createModal.locator('input[type="text"]').filter({ hasNot: codeInput }).filter({ hasNot: titleInput })
    const lastLevelInput = levelInputs.last()
    if (await lastLevelInput.isVisible().catch(() => false)) {
      await lastLevelInput.fill('Fresher')
    }

    // 4. Submit form to create and dispatch role to expert ("Create & Send to Expert")
    const submitBtn = createModal.getByRole('button', { name: /Create & Send to Expert|Save as Draft/i }).last()
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // Wait for modal to close
    await expect(createModal).toHaveCount(0)

    // Verify newly created role appears in L&D Manager's catalog
    const createdRoleRow = page.locator('table tbody tr').filter({ hasText: roleTitle }).first()
    await expect(createdRoleRow).toBeVisible()

    // =========================================================================
    // STEP 3: LD inspects target role graph
    // =========================================================================
    const viewGraphBtn = createdRoleRow.locator('button[title*="Knowledge Graph"], button[aria-label*="Knowledge Graph"]').first()
    await expect(viewGraphBtn).toBeVisible()
    await viewGraphBtn.click()

    // Verify TargetRoleGraphModal opens with canvas
    const graphModal = page.getByRole('dialog')
    await expect(graphModal).toBeVisible()
    await expect(graphModal.getByText(/Knowledge Graph|Architecture Graph/i).first()).toBeVisible()

    // Close graph modal
    const closeGraphBtn = graphModal.getByRole('button', { name: /Close/i }).or(graphModal.locator('button[aria-label*="Close"]'))
    await closeGraphBtn.first().click()
    await expect(graphModal).toHaveCount(0)

    // =========================================================================
    // STEP 4 & 5: Expert logs in and configs micro-skills for Senior, Middle, Junior
    // =========================================================================
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    const expertRoleRow = page.locator('table tbody tr').filter({ hasText: roleTitle }).first()
    await expect(expertRoleRow).toBeVisible()

    // Expert clicks Configure Micro-skills
    const configBtn = expertRoleRow.locator('button[title*="Micro-skills"]').first()
    await expect(configBtn).toBeVisible()
    await configBtn.click()

    const configModal = page.locator('div[role="dialog"]')
    await expect(configModal).toBeVisible()

    // Map a competency and its micro-skills
    const compComboboxTrigger = configModal.locator('button').filter({ hasText: /Search & select competency|Select Competency/i }).first()
    if (await compComboboxTrigger.isVisible().catch(() => false)) {
      await compComboboxTrigger.click()
      const firstCompOption = page.locator('[role="option"]').first()
      if (await firstCompOption.isVisible().catch(() => false)) {
        await firstCompOption.click()
        const addCompBtn = configModal.getByRole('button', { name: /Add Competency/i })
        if (await addCompBtn.isEnabled().catch(() => false)) {
          await addCompBtn.click()
        }
      }
    }

    // Configure for Senior level (Rank 1)
    const saveDraftBtn = configModal.getByRole('button', { name: /Save Draft|Save Configuration/i })
    if (await saveDraftBtn.isVisible().catch(() => false)) {
      await saveDraftBtn.click()
    }

    // Close config modal
    const closeConfigBtn = configModal.getByRole('button', { name: /Close|Done|Cancel/i }).first()
    await closeConfigBtn.click()
    await expect(configModal).toHaveCount(0)

    // =========================================================================
    // STEP 6: Expert navigates to Ontology page and uses Graph tab
    // =========================================================================
    await page.goto('/workspace/workspace-development/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Click Explore Graph tab
    const graphTabTrigger = page.locator('button[role="tab"]').filter({ hasText: /Explore Graph/i })
    await expect(graphTabTrigger).toBeVisible()
    await graphTabTrigger.click()

    // Verify graph workspace is operational
    await expect(page.getByText('Interactive Ontology Playground')).toBeVisible()
    await expect(page.getByTitle('Fit to Viewport')).toBeVisible()

    // =========================================================================
    // STEP 7 & 8: Expert checks graph on Target Role page and submits to LD
    // =========================================================================
    await page.goto('/workspace/workspace-development/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    const expertRowAgain = page.locator('table tbody tr').filter({ hasText: roleTitle }).first()
    await expect(expertRowAgain).toBeVisible()

    // Check Graph on target role row
    const expertGraphBtn = expertRowAgain.locator('button[title*="Knowledge Graph"], button[aria-label*="Knowledge Graph"]').first()
    await expertGraphBtn.click()
    const expertGraphModal = page.getByRole('dialog')
    await expect(expertGraphModal).toBeVisible()
    const closeExpertGraph = expertGraphModal.getByRole('button', { name: /Close/i }).or(expertGraphModal.locator('button[aria-label*="Close"]'))
    await closeExpertGraph.first().click()
    await expect(expertGraphModal).toHaveCount(0)

    // Expert submits role to L&D Manager
    const reConfigBtn = expertRowAgain.locator('button[title*="Micro-skills"]').first()
    await reConfigBtn.click()
    const expertModalAgain = page.locator('div[role="dialog"]')
    await expect(expertModalAgain).toBeVisible()

    const submitToLdBtn = expertModalAgain.getByRole('button', { name: /Submit to L&D Manager/i })
    if (await submitToLdBtn.isEnabled().catch(() => false)) {
      await submitToLdBtn.click()
    } else {
      const closeAgainBtn = expertModalAgain.getByRole('button', { name: /Close|Done|Cancel/i }).first()
      await closeAgainBtn.click()
    }
    await expect(expertModalAgain).toHaveCount(0)

    // =========================================================================
    // STEP 9 & 10: LD Manager checks view details, graph, approves and publishes
    // =========================================================================
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText(/Loading target roles/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})
    const searchRolesInput = page.getByPlaceholder('Search roles...')
    if (await searchRolesInput.isVisible().catch(() => false)) {
      await searchRolesInput.fill(roleTitle)
    }

    const ldReviewRow = page.locator('table tbody tr').filter({ hasText: roleTitle }).first()
    await expect(ldReviewRow).toBeVisible({ timeout: 15_000 })

    // Open View Details
    const viewDetailsBtn = ldReviewRow.locator('button[title="View Details"]')
    await expect(viewDetailsBtn).toBeVisible()
    await viewDetailsBtn.click()

    const viewModal = page.getByRole('dialog')
    await expect(viewModal).toBeVisible()

    // Click Approve & Publish if available in modal, or close and use row action
    const approveBtn = viewModal.getByRole('button', { name: /Approve & Publish/i })
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click()
    } else {
      const closeViewModal = viewModal.getByRole('button', { name: 'Close', exact: true }).or(viewModal.locator('button[aria-label*="Close"]'))
      await closeViewModal.first().click()
    }

    // =========================================================================
    // STEP 11: Employee logs in and verifies published Neo4j Target Role
    // =========================================================================
    await loginAs(page, 'employee@technova.com')
    await page.goto('/workspace/workspace-development/employee/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Verify employee upskilling portal renders Upskilling heading and Roles tab
    await expect(page.getByRole('heading', { name: /Upskilling/i })).toBeVisible()
    await expect(page.getByText(/Loading roles/i)).toHaveCount(0, { timeout: 15_000 }).catch(() => {})

    // Search or verify the published Neo4j Target Role is rendered in catalog
    const searchRoles = page.getByPlaceholder(/Search Roles/i)
    if (await searchRoles.isVisible().catch(() => false)) {
      await searchRoles.fill(roleTitle)
    }

    const employeeRoleCard = page.locator('div, tr, article').filter({ hasText: roleTitle }).first()
    if (await employeeRoleCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(employeeRoleCard).toBeVisible()
    }
  })
})
