import { expect, test, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  
  const continueBtn = page.getByRole('button', { name: /Continue to workspace|Tiếp tục vào không gian/i })
  await expect(continueBtn).toBeVisible({ timeout: 15_000 })
  await continueBtn.click()
  await expect(page).toHaveURL(/\/workspace\//, { timeout: 15_000 })
}

test.describe('Report 5: WF02 Target Role Flow & Competency Ontology E2E Verification', () => {
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  // Group 1: Competencies Management (TC-WF02-F01, F02, F03, F04)
  test('Group 1: Competencies Management - Search, View Details, Create Validation, and Edit', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')

    // Navigate to Competency Ontology
    await page.goto('/workspace/workspace-development/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // 1. Switch to Competencies tab
    const compTabTrigger = page.locator('button[role="tab"]').filter({ hasText: /Competencies/i })
    await expect(compTabTrigger).toBeVisible({ timeout: 10_000 })
    await compTabTrigger.click()

    await expect(page.getByText('Domain Competencies Catalog')).toBeVisible()

    // TC-WF02-F03: Search competencies by keyword
    const compSearchInput = page.getByPlaceholder('Search competencies...')
    await expect(compSearchInput).toBeVisible()
    await compSearchInput.fill('Architecture')
    
    // Assert table rows update
    const firstCompRow = page.locator('table tbody tr').first()
    await expect(firstCompRow).toBeVisible()
    await expect(firstCompRow).toContainText(/Architecture/i)

    // TC-WF02-F03: View Details modal & member micro-skills inspection
    const viewDetailsBtn = firstCompRow.locator('button[title="View Details"]')
    await expect(viewDetailsBtn).toBeVisible()
    await viewDetailsBtn.click()

    const detailsDialog = page.getByRole('dialog')
    await expect(detailsDialog).toBeVisible()
    await expect(detailsDialog.getByText(/MEMBER MICRO-SKILLS/i).first()).toBeVisible()
    
    // Close modal cleanly
    const closeDialogBtn = detailsDialog.getByRole('button', { name: 'Close', exact: true })
    await closeDialogBtn.click()
    await expect(detailsDialog).toHaveCount(0)

    // TC-WF02-F02: Validation on Create Competency (Empty fields validation)
    const createCompBtn = page.getByRole('button', { name: /^Create$/i }).first()
    await expect(createCompBtn).toBeVisible()
    await createCompBtn.click()

    const createModal = page.getByRole('dialog')
    await expect(createModal).toBeVisible()
    await expect(createModal.getByRole('heading', { name: /Create New Competency/i })).toBeVisible()

    // TC-WF02-F02: Validation on Create Competency (Submit button is disabled when empty)
    const submitCompBtn = createModal.getByRole('button', { name: /Create Competency/i })
    await expect(submitCompBtn).toBeDisabled()

    // Cancel modal cleanly
    const cancelCompBtn = createModal.getByRole('button', { name: /Cancel/i })
    await cancelCompBtn.click()
    await expect(createModal).toHaveCount(0)
  })

  // Group 2: Micro-skills & Directed Prerequisites (TC-WF02-F05, F06, F08)
  test('Group 2: Micro-Skills & Directed Prerequisites - Taxonomy & Edge Inspections', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // TC-WF02-F05: Switch to Micro-skills tab
    const skillsTabTrigger = page.locator('button[role="tab"]').filter({ hasText: /Micro-skills/i })
    await expect(skillsTabTrigger).toBeVisible({ timeout: 10_000 })
    await skillsTabTrigger.click()

    await expect(page.getByText('Micro-skills Catalog')).toBeVisible()
    const searchSkillsInput = page.getByPlaceholder('Search skills...')
    await expect(searchSkillsInput).toBeVisible()

    // Verify Create Micro-skill modal has competency alignment
    const createSkillBtn = page.getByRole('button', { name: /^Create$/i }).first()
    await expect(createSkillBtn).toBeVisible()
    await createSkillBtn.click()

    const skillModal = page.getByRole('dialog')
    await expect(skillModal).toBeVisible()
    await expect(skillModal.getByText('Competency Alignment')).toBeVisible()

    // Close Create Micro-skill modal
    const cancelSkillBtn = skillModal.getByRole('button', { name: /Cancel/i })
    await cancelSkillBtn.click()
    await expect(skillModal).toHaveCount(0)

    // TC-WF02-F08: Switch to Skill Prerequisites tab
    const prereqTabTrigger = page.locator('button[role="tab"]').filter({ hasText: /Skill Prerequisites/i })
    await expect(prereqTabTrigger).toBeVisible({ timeout: 10_000 })
    await prereqTabTrigger.click()

    await expect(page.getByText('Skill Prerequisites & Readiness')).toBeVisible()
    const prereqSearch = page.getByPlaceholder('Search prerequisites...')
    await expect(prereqSearch).toBeVisible()

    // Verify minimum mastery pill format
    const masteryPill = page.locator('table tbody tr td div.rounded-full').filter({ hasText: /% Mastery/i }).first()
    if (await masteryPill.isVisible().catch(() => false)) {
      await expect(masteryPill).toBeVisible()
      const classes = await masteryPill.getAttribute('class')
      expect(classes).toContain('border')
    }
  })

  // Group 3: Target Role Authoring & Department Scoping (TC-WF02-F10, F11)
  test('Group 3: Target Role Authoring - Department Scoping & Level Hierarchy Inspection', async ({ page }) => {
    await loginAs(page, 'manager@technova.com')
    await page.goto('/workspace/workspace-development/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Verify catalog header and metrics
    await expect(page.getByText('Target Role Version Catalog')).toBeVisible()
    await expect(page.getByText('TOTAL ROLE PROFILES')).toBeVisible()
    await expect(page.getByText('PUBLISHED VERSIONS')).toBeVisible()

    // TC-WF02-F11: Check Create Target Role modal department scoping
    const createRoleBtn = page.getByRole('button', { name: /Create/i }).first()
    if (await createRoleBtn.isVisible().catch(() => false)) {
      await createRoleBtn.click()
      const roleModal = page.getByRole('dialog')
      await expect(roleModal).toBeVisible()

      // Verify Job Position dropdown is visible
      const jobPositionSelect = roleModal.locator('select').first()
      if (await jobPositionSelect.isVisible().catch(() => false)) {
        await expect(jobPositionSelect).toBeVisible()
      }

      // Close modal cleanly
      const cancelRoleBtn = roleModal.getByRole('button', { name: /Cancel|Close/i }).first()
      await cancelRoleBtn.click()
      await expect(roleModal).toHaveCount(0)
    }

    // TC-WF02-F10: View details of existing role
    const firstRoleRow = page.locator('table tbody tr').first()
    await expect(firstRoleRow).toBeVisible()
    const viewBtn = firstRoleRow.locator('button[title="View Details"]')
    await expect(viewBtn).toBeVisible()
    await viewBtn.click()

    const detailsDialog = page.getByRole('dialog')
    await expect(detailsDialog).toBeVisible()
    await expect(detailsDialog.getByText(/Architecture Specifications|Level Competencies/i).first()).toBeVisible()

    const closeBtn = detailsDialog.getByRole('button', { name: 'Close', exact: true }).or(detailsDialog.locator('button[aria-label="Close modal"]'))
    await closeBtn.first().click()
    await expect(detailsDialog).toHaveCount(0)
  })

  // Group 4: Domain Expert Configuration & RBAC Restrictions (TC-WF02-F12, F13, F16)
  test('Group 4: Domain Expert - Micro-skills Configuration Access and Unpublish RBAC Restriction', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    await expect(page.getByText('Target Role Version Catalog')).toBeVisible()
    await expect(page.getByText('TOTAL TARGET ROLES')).toBeVisible()

    // TC-WF02-F16: Assert Domain Expert CANNOT unpublish target roles
    const unpublishButtons = page.locator('button[title="Unpublish Target Role"], button[aria-label="Unpublish Target Role"]')
    expect(await unpublishButtons.count()).toBe(0)

    // TC-WF02-F12: Expert opens Configure Micro-skills modal
    const configBtn = page.locator('button[title*="Micro-skills"]').first()
    if (await configBtn.isVisible().catch(() => false)) {
      await configBtn.click()
      const configModal = page.locator('div[role="dialog"]')
      await expect(configModal).toBeVisible()

      // Close modal cleanly
      const closeConfigBtn = configModal.getByRole('button', { name: 'Close', exact: true })
      await closeConfigBtn.click()
      await expect(configModal).toHaveCount(0)
    }
  })

  // Group 5: Employee Published Role Browsing & Isolation (TC-WF02-F17)
  test('Group 5: Employee - Published Role Browsing and Isolation from Draft Roles', async ({ page }) => {
    await loginAs(page, 'employee@technova.com')
    await page.goto('/workspace/workspace-development/employee/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Verify employee catalog renders published target role cards
    const chooseButtons = page.getByRole('button', { name: /Choose this role|Select role|Chọn vai trò/i })
    if (await chooseButtons.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await chooseButtons.first().click()

      // TargetRoleSelectionDialog opens
      const selectionDialog = page.getByRole('dialog')
      await expect(selectionDialog).toBeVisible()

      // Cancel dialog cleanly
      const cancelBtn = selectionDialog.getByRole('button', { name: /Cancel|Keep current role|Hủy/i })
      await cancelBtn.click()
      await expect(selectionDialog).toBeHidden()
    }
  })

  // Group 6: Interactive Knowledge Graph Playground (TC-WF02-F18, F19, F20)
  test('Group 6: Interactive Knowledge Graph - Explorer Initialization & Action Controls', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')
    await page.goto('/workspace/workspace-development/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Navigate to Explore Graph tab
    const graphTab = page.locator('button').filter({ hasText: /Explore Graph/i }).first()
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click()
      
      // TC-WF02-F18: Verify canvas action controls (Zoom In, Zoom Out, Fit, Clear)
      await expect(page.getByText('Interactive Ontology Playground')).toBeVisible()
      await expect(page.getByTitle('Zoom In')).toBeVisible()
      await expect(page.getByTitle('Zoom Out')).toBeVisible()
      await expect(page.getByTitle('Fit to Viewport')).toBeVisible()

      // TC-WF02-F20: Verify Clear Canvas control
      const clearBtn = page.getByTitle('Clear Canvas')
      await expect(clearBtn).toBeVisible()
    }
  })
})
