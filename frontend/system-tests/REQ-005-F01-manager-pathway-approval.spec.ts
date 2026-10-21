import { expect, test } from '@playwright/test'

test.describe('REQ-005-F01 Manager Pathway Approval Queue Flow', () => {
  test('manager reviews pathway approval queue and validates state handling', async ({ page }) => {
    await page.goto('/ld-manager/approvals')

    // Page container presence
    await expect(page.locator('main')).toBeVisible()

    // Assert that the page does not contain raw developer spec dumps
    await expect(page.getByText('Neo4j Graph Engine')).toHaveCount(0)
    await expect(page.getByText('PostgreSQL Tenant Isolation')).toHaveCount(0)

    // Check either approval cards or empty state are cleanly displayed
    const hasCards = (await page.locator('.space-y-4 .border, table tbody tr').count()) > 0
    const hasEmptyState = (await page.locator('[data-testid="empty-state"], h3:has-text("No"), p:has-text("No")').count()) > 0

    expect(hasCards || hasEmptyState).toBeTruthy()
  })
})
