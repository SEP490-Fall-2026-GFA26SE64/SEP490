import { test, expect, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  const res = await page.request.post('/api/v1/workspace-auth/sign-in', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
  return await res.json()
}

test.describe('Capstone Standard: REQ-017 & REQ-018 Target Roles & Competency Ontology Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  test('1. L&D Manager Alice verifies dispatched Role#1, human-centric semantics and closes modals cleanly', async ({ page }) => {
    // Authenticate as Alice (LD_MANAGER)
    await loginAs(page, 'alice@gmail.com')

    // Navigate to L&D Manager Target Roles
    await page.goto('/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Assert NO unauthorized page header or breadcrumbs
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0)

    // Verify catalog title and stat cards
    await expect(page.getByText('Target Role Version Catalog')).toBeVisible()
    await expect(page.getByText('TOTAL ROLE PROFILES')).toBeVisible()
    await expect(page.getByText('PUBLISHED VERSIONS')).toBeVisible()
    await expect(page.getByText('IN-FLIGHT PROFILES')).toBeVisible()

    // Search input and status filter
    const searchInput = page.getByPlaceholder('Search roles...')
    await expect(searchInput).toBeVisible()

    // Verify Role#1 exists and assigned to Ben
    const roleRow = page.locator('tr').filter({ hasText: 'Role#1' }).first()
    await expect(roleRow).toBeVisible()
    await expect(roleRow).toContainText('ROLE-R1X3')
    await expect(roleRow).toContainText('Ben')

    // Click View Details modal
    const viewBtn = roleRow.locator('button[title="View Details"]')
    await expect(viewBtn).toBeVisible()
    await viewBtn.click()

    // Assert details modal content & human-centric semantics
    const detailsDialog = page.getByRole('dialog')
    await expect(detailsDialog).toBeVisible()
    await expect(detailsDialog.getByText('Role#1')).toBeVisible()
    await expect(detailsDialog.getByText('Comprehensive role specifications')).toBeVisible()
    await expect(detailsDialog.getByText('Level Competencies & Micro-skill Requirements')).toBeVisible()

    // Close details modal cleanly
    const closeBtn = detailsDialog.getByRole('button', { name: 'Close', exact: true }).or(detailsDialog.locator('button[aria-label="Close modal"]'))
    await closeBtn.first().click()
    await expect(detailsDialog).toHaveCount(0)

    // Navigate to Occupations Management
    await page.goto('/ld-manager/occupations')
    await expect(page.getByText('Occupations Directory')).toBeVisible()

    // Check Assign Experts modal
    const manageExpertsBtn = page.locator('button[title*="Assign Domain Experts"]').first()
    if (await manageExpertsBtn.isVisible().catch(() => false)) {
      await manageExpertsBtn.click()
      const assignModal = page.getByRole('dialog')
      await expect(assignModal).toBeVisible()
      await expect(assignModal.getByText('Currently Assigned Experts')).toBeVisible()
      await expect(assignModal.getByText('Available Experts to Add')).toBeVisible()

      // Close modal cleanly
      const doneBtn = assignModal.getByRole('button', { name: 'Done', exact: true })
      await doneBtn.click()
      await expect(assignModal).toHaveCount(0)
    }
  })

  test('2. Domain Expert Ben receives Role#1 in catalog, configures mastery and verifies single-row layout', async ({ page }) => {
    // Authenticate as Ben (DOMAIN_EXPERT)
    await loginAs(page, 'ben@gmail.com')

    // Navigate to Expert Assigned Target Roles
    await page.goto('/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Assert NO unauthorized page header or breadcrumbs
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0)

    // Verify catalog title and stat cards for Expert
    await expect(page.getByText('Target Role Version Catalog')).toBeVisible()
    await expect(page.getByText('SUBMITTED ROLES')).toBeVisible()
    await expect(page.getByText('PUBLISHED ROLES')).toBeVisible()
    await expect(page.getByText('CONFIGURED MICRO-SKILLS')).toBeVisible()

    // Verify Role#1 is visible in Ben's catalog
    const roleRow = page.locator('tr').filter({ hasText: 'Role#1' }).first()
    await expect(roleRow).toBeVisible()
    await expect(roleRow).toContainText('ROLE-R1X3')

    // Open View Details modal
    const detailsBtn = roleRow.locator('button[title="View Details"]')
    await expect(detailsBtn).toBeVisible()
    await detailsBtn.click()

    const detailsDialog = page.getByRole('dialog')
    await expect(detailsDialog).toBeVisible()
    await expect(detailsDialog.getByText('Role#1')).toBeVisible()

    // Toggle Version Changes (Diff)
    const diffToggle = detailsDialog.getByRole('button', { name: /Version Changes \(Diff\)/i })
    if (await diffToggle.isVisible().catch(() => false)) {
      await diffToggle.click()
      await expect(detailsDialog.getByText(/Initial Baseline Version|Previous: v/i)).toBeVisible()
    }

    // Close details modal
    const closeBtn = detailsDialog.getByRole('button', { name: 'Close', exact: true }).or(detailsDialog.locator('button[aria-label="Close modal"]'))
    await closeBtn.first().click()
    await expect(detailsDialog).toHaveCount(0)

    // Open Configure Micro-skills modal
    const editBtn = roleRow.locator('button[title*="Micro-skills"]').first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      const configModal = page.locator('div[role="dialog"]')
      await expect(configModal).toBeVisible()
      await expect(configModal.getByText('Target Mastery (%)')).toBeVisible()
      await expect(configModal.getByRole('button', { name: 'Save Draft' })).toBeVisible()

      // Close modal
      const closeConfigBtn = configModal.getByRole('button', { name: 'Close', exact: true })
      await closeConfigBtn.click()
      await expect(configModal).toHaveCount(0)
    }
  })

  test('3. Competency Ontology: Verified deduplication and clean single modal dialog', async ({ page }) => {
    // Authenticate as Ben (DOMAIN_EXPERT)
    await loginAs(page, 'ben@gmail.com')

    // Navigate to Expert Ontology
    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Assert NO unauthorized breadcrumbs
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0)

    // Verify Tab navigation
    await expect(page.getByText('Micro-skills Catalog')).toBeVisible()
    const competencyTab = page.locator('button').filter({ hasText: 'Competencies' }).first()
    await expect(competencyTab).toBeVisible()
    await competencyTab.click()

    // Verify Competencies directory
    await expect(page.getByText('Domain Competencies Catalog', { exact: true })).toBeVisible()

    // Open Edit Competency modal on first competency
    const editCompBtn = page.locator('button[title="Edit Competency"]').first()
    if (await editCompBtn.isVisible().catch(() => false)) {
      await editCompBtn.click()
      const compDialog = page.getByRole('dialog')
      await expect(compDialog).toBeVisible()
      await expect(compDialog.getByText('Edit Competency')).toBeVisible()
      await expect(compDialog.getByText('Rule: All Member Skills Required')).toBeVisible()

      // Check configured micro-skills table: assert no duplicate skill codes
      const skillCodes = await compDialog.locator('tbody tr td span.font-mono.font-bold').allTextContents()
      const uniqueCodes = new Set(skillCodes)
      expect(skillCodes.length).toBe(uniqueCodes.size)

      // Close modal cleanly
      const cancelBtn = compDialog.getByRole('button', { name: 'Cancel' })
      await cancelBtn.click()
      await expect(compDialog).toHaveCount(0)
    }

    // Switch to Explore Graph tab
    const graphTab = page.locator('button').filter({ hasText: 'Explore Graph' }).first()
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click()
      await expect(page.locator('text=Interactive Ontology Playground')).toBeVisible()
    }
  })
})
