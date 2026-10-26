import { expect, test } from '@playwright/test'

test.describe('REQ-019-F01 Expert Pathway Review & Adaptive Curation Flow', () => {
  test('expert navigates queue, reviews parallel modules, tests regeneration and approval', async ({ page }) => {
    // 1. Navigate to Expert Pathway Review Queue
    await page.goto('/expert/pathway-review')
    await expect(page.locator('main')).toBeVisible()

    // 2. Inspect Initial State & UX Semantics
    await expect(page.getByText('Initial Learning Pathway Queue')).toBeVisible()
    await expect(page.getByText('Awaiting Review', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Excluded Modules', { exact: true }).first()).toBeVisible()

    // Ensure status option does NOT contain REGENERATED_PENDING_REVIEW
    const statusSelect = page.locator('select[aria-label="Filter by Status"]')
    await expect(statusSelect).toBeVisible()
    const optionsText = await statusSelect.innerText()
    expect(optionsText).not.toContain('Regenerated - Re-Review')
    expect(optionsText).toContain('Awaiting Review')

    // Verify all table rows display AWAITING REVIEW or APPROVED (never REGENERATED)
    await expect(page.locator('table')).toBeVisible()
    const badges = page.locator('table tbody tr td div.rounded-full')
    const allBadgeTexts = await badges.allInnerTexts()
    for (const text of allBadgeTexts) {
      expect(text.trim()).not.toBe('REGENERATED')
    }

    // 3. Navigate into Pathway Detail Review Page
    const firstReviewBtn = page.locator('table tbody tr button:has-text("Review"), table tbody tr button:has-text("Inspect")').first()
    await expect(firstReviewBtn).toBeVisible()
    await firstReviewBtn.click()

    // Expect navigation to detail page
    await page.waitForURL(/\/expert\/pathway-review\/.+/)
    await expect(page.getByText('Pathway Learning Modules')).toBeVisible()
    await expect(page.getByText('Excluded Modules')).toBeVisible()
    await expect(page.getByText('Add Existing Catalog Module')).toBeVisible()

    // Verify the status badge is AWAITING REVIEW
    const headerStatusBadge = page.locator('div:has(> h1) div.rounded-full').filter({ hasText: /AWAITING REVIEW|APPROVED/i }).first()
    await expect(headerStatusBadge).toBeVisible()

    // 4. Assert NO "Active Regeneration Instructions & Constraints" banner is displayed
    await expect(page.getByText('Active Regeneration Instructions & Constraints')).toHaveCount(0)
    await expect(page.getByText('Expert requested adaptive replanning with updated prerequisite alignment.')).toHaveCount(0)

    // 5. Test Exclude Action (Moving module from Pathway to Excluded table)
    const initialPathwayCount = await page.locator('button[title="Move to Excluded table"]').count()
    if (initialPathwayCount > 0) {
      await page.locator('button[title="Move to Excluded table"]').first().click()
      // Toast notification confirms module exclusion
      await expect(page.getByText('Module Excluded')).toBeVisible({ timeout: 5000 })
    }

    // 6. Test Pathway Regeneration Flow with Loading State & Lock
    const regenBtn = page.getByRole('button', { name: /Regenerate Pathway/i })
    await expect(regenBtn).toBeVisible()
    await regenBtn.click()

    // Dialog opens with title "Request Pathway Regeneration"
    await expect(page.getByRole('heading', { name: /Request Pathway Regeneration/i })).toBeVisible()
    const instructionsInput = page.getByPlaceholder(/Emphasize foundational graph indexing/i)
    await instructionsInput.fill('Prioritize Neo4j query performance and indexing.')

    // Submit regeneration
    const confirmRegenBtn = page.getByRole('button', { name: /Start Regeneration/i })
    await confirmRegenBtn.click()

    // Verify dialog closes and regenerating state appears
    await expect(page.getByText('Regenerating Pathway...')).toBeVisible({ timeout: 3000 })

    // Wait for regeneration simulation to complete
    await expect(page.getByText('Pathway Regenerated Successfully')).toBeVisible({ timeout: 10000 })

    // CRITICAL REQUIREMENT: Status badge must STILL be AWAITING REVIEW, never REGENERATED
    await expect(page.getByText('REGENERATED', { exact: true })).toHaveCount(0)
    await expect(page.locator('div.rounded-full').filter({ hasText: 'AWAITING REVIEW' }).first()).toBeVisible()

    // CRITICAL REQUIREMENT: Active Regeneration Instructions banner must NOT exist
    await expect(page.getByText('Active Regeneration Instructions & Constraints')).toHaveCount(0)

    // 7. Approve Pathway for Learning
    const approveBtn = page.getByRole('button', { name: /Approve for Learning/i })
    await expect(approveBtn).toBeVisible()
    await approveBtn.click()

    // Toast confirms approval
    await expect(page.getByText('Pathway Approved for Learning')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('div.rounded-full').filter({ hasText: 'APPROVED' }).first()).toBeVisible()
  })
})
