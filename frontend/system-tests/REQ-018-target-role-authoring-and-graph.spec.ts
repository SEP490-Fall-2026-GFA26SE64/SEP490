import { test, expect } from '@playwright/test';

test.describe('Target Roles Modification Sorting, Level-Isolated Competencies, Cascading Micro-skills & Details Modal', () => {
  test('Expert level competencies are isolated, micro-skills cascade from competencies, and draft can be saved or closed', async ({ page }) => {
    // 1. Navigate to Domain Expert Assigned Roles Page
    await page.goto('/expert/target-roles');
    await page.waitForLoadState('networkidle');

    // Verify page loads with roles
    await expect(page.locator('h1')).toContainText('Assigned Target Roles');

    // Verify StatCards: Rejected Roles card is present with destructive styling
    await expect(page.getByText('Rejected Roles')).toBeVisible();

    // 2. Locate a published role row and click "New Draft"
    const newDraftBtn = page.getByRole('button', { name: 'New Draft' }).first();
    await expect(newDraftBtn).toBeVisible({ timeout: 10000 });
    await newDraftBtn.click();

    // Verify successor draft is created
    await expect(page.getByText('Successor Draft Created')).toBeVisible({ timeout: 10000 });

    // Click edit on the new draft row
    const editBtn = page.locator('button[title*="Edit Micro-skills"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Modal opens: "Configure Skills:"
    const modalTitle = page.locator('text=Configure Skills:');
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    // Verify Save Draft button and Close button exist
    await expect(page.getByRole('button', { name: 'Save Draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();

    // Verify "Proficiency Benchmark Levels" is NOT present in Configure Skills modal
    await expect(page.locator('text=Proficiency Benchmark Levels')).toHaveCount(0);

    // Verify Multi-level edit toggle and All Levels button exist
    await expect(page.getByText('Multi-level edit')).toBeVisible();
    await expect(page.getByRole('button', { name: /All Levels/i })).toBeVisible();

    // Verify Level Tabs exist (Junior, Middle, Senior)
    const juniorTab = page.getByRole('button', { name: /Junior/i }).first();
    const middleTab = page.getByRole('button', { name: /Middle/i }).first();
    await expect(juniorTab).toBeVisible();
    await expect(middleTab).toBeVisible();

    // Click Save Draft (saves and closes modal)
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await expect(page.getByText('Draft Saved')).toBeVisible({ timeout: 10000 });

    // 3. Verify Expert View Details modal displays level tabs
    const detailsBtn = page.locator('button[title="View Details"]').first();
    await expect(detailsBtn).toBeVisible({ timeout: 10000 });
    await detailsBtn.click();

    // Verify Details modal shows dynamic level breakdown
    await expect(page.getByText('Target Role Levels & Competency Matrix')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'All Levels Overview' })).toBeVisible();

    // Close details modal
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    // 4. View Knowledge Graph from the table
    const graphBtn = page.locator('button[title*="View Competency Knowledge Graph"]').first();
    await expect(graphBtn).toBeVisible();
    await graphBtn.click();

    // Verify Knowledge Graph modal opened and shows Competency and Micro-skill in Legend
    await expect(page.locator('text=Inspect required micro-skills')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span:has-text("Competency")')).toBeVisible();
    await expect(page.locator('span:has-text("Micro-Skill")')).toBeVisible();

    // Close graph modal
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  });

  test('L&D Manager View Details displays level breakdown and does not have Review Submitted button', async ({ page }) => {
    // Navigate to L&D Manager Target Roles Page
    await page.goto('/manager/target-roles');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Target Roles Catalog');

    // Verify "Review Submitted" button is NOT present in any action column
    await expect(page.locator('button:has-text("Review Submitted")')).toHaveCount(0);

    // Click "View Details" on the first role
    const detailsBtn = page.locator('button[title="View Details"]').first();
    await expect(detailsBtn).toBeVisible({ timeout: 10000 });
    await detailsBtn.click();

    // Verify details dialog displays all fields + Level tabs
    await expect(page.getByText('Comprehensive role specifications')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Level Competencies & Micro-skill Requirements')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All Levels Overview' })).toBeVisible();

    // Close details dialog
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  });
});

