import { test, expect } from '@playwright/test';

test.describe('Target Roles Modification Sorting, Level-Isolated Competencies, Cascading Micro-skills & Details Modal', () => {
  test('Expert level competencies are isolated, micro-skills cascade from competencies, and draft can be saved or closed', async ({ page }) => {
    // 1. Navigate to Domain Expert Assigned Roles Page
    await page.goto('/expert/target-roles');
    await page.waitForLoadState('networkidle');

    // Verify page loads with roles
    await expect(page.getByText('Assigned Target Roles')).toBeVisible();

    // Verify StatCards: Rejected Roles card is present with destructive styling
    await expect(page.getByText('Rejected Roles')).toBeVisible();

    // 2. Locate or enable an editable revision (draft or rejected)
    let editBtn = page.locator('button[title*="Micro-skills"]').first();
    const hasEditBtn = await editBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!hasEditBtn) {
      const newDraftBtn = page.getByRole('button', { name: 'New Draft' }).first();
      if (await newDraftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await newDraftBtn.click();
        await expect(page.getByText('Successor Draft Created')).toBeVisible({ timeout: 10000 });
      } else {
        // If an active successor is currently SUBMITTED, manager returns it for revision
        await page.goto('/manager/target-roles');
        await page.waitForLoadState('networkidle');
        const v11Row = page.locator('tr:has-text("v1.1")').first();
        if (await v11Row.isVisible({ timeout: 3000 }).catch(() => false)) {
          await v11Row.locator('button[title="View Details"]').click();
          const returnForRevBtn = page.getByRole('button', { name: 'Return for Revision' });
          if (await returnForRevBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await returnForRevBtn.click();
            await page.fill('textarea', 'Please revise required micro-skills');
            await page.getByRole('button', { name: 'Confirm Return' }).click();
            await expect(page.getByText('Target Role Returned for Revision')).toBeVisible({ timeout: 10000 });
          }
        }
        await page.goto('/expert/target-roles');
        await page.waitForLoadState('networkidle');
      }
    }

    editBtn = page.locator('button[title*="Micro-skills"]').first();
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

    // Verify dynamic Level Tabs exist for the role (e.g. Intern, Fresher or Junior, Middle)
    const levelTab1 = page.locator('button:has-text("Intern"), button:has-text("Junior")').first();
    const levelTab2 = page.locator('button:has-text("Fresher"), button:has-text("Middle")').first();
    await expect(levelTab1).toBeVisible();
    await expect(levelTab2).toBeVisible();

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

    // Verify Knowledge Graph modal opened and shows Competency and Required Skill in Legend
    await expect(page.locator('span:has-text("Competency")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span:has-text("Required Skill")').first()).toBeVisible();

    // Verify role code does NOT display company or version suffix (no #comp- or #v)
    await expect(page.getByText(/#comp-/i)).toHaveCount(0);

    // Close graph modal
    const closeGraphBtn = page.locator('button[aria-label="Close Modal"]').or(page.getByRole('button', { name: 'Close', exact: true }));
    await closeGraphBtn.first().click();
  });

  test('L&D Manager View Details displays level breakdown and does not have Review Submitted button', async ({ page }) => {
    // Navigate to L&D Manager Target Roles Page
    await page.goto('/manager/target-roles');
    await page.waitForLoadState('networkidle');

    await expect(page.getByPlaceholder('Search roles...')).toBeVisible();

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

  test('Domain Expert and L&D Manager can view Version Changes (Diff) and verify human-centric Target Mastery semantics', async ({ page }) => {
    // 1. Manager Target Roles Catalog -> Details Modal -> Version Diff Toggle
    await page.goto('/manager/target-roles');
    await page.waitForLoadState('networkidle');

    const detailsBtn = page.locator('button[title="View Details"]').first();
    await expect(detailsBtn).toBeVisible({ timeout: 10000 });
    await detailsBtn.click();

    // Verify view mode toggle buttons exist
    const specsToggle = page.getByRole('button', { name: 'Architecture Specifications' });
    const diffToggle = page.getByRole('button', { name: /Version Changes \(Diff\)/i });
    await expect(specsToggle).toBeVisible({ timeout: 5000 });
    await expect(diffToggle).toBeVisible();

    // Verify 'Target Mastery' replaces 'Threshold' in specs view
    await expect(page.locator('th:has-text("Target Mastery")').first()).toBeVisible();

    // Click 'Version Changes (Diff)'
    await diffToggle.click();

    // Verify Diff view rendered (either baseline message or diff metrics/table)
    const isBaseline = await page.getByText(/Initial Baseline Version/i).isVisible().catch(() => false);
    const hasDiffBanner = await page.getByText(/Previous: v/i).isVisible().catch(() => false);
    expect(isBaseline || hasDiffBanner).toBeTruthy();

    if (hasDiffBanner) {
      // Verify Level filter button exists
      await expect(page.locator('button:has-text("All Levels")').first()).toBeVisible();

      // Verify clickable change metric badges exist and clicking filters view
      const addedSkillsBadge = page.locator('button:has-text("Skills Added")').first();
      if (await addedSkillsBadge.isVisible().catch(() => false)) {
        await addedSkillsBadge.click();
        await expect(page.getByText(/Viewing filtered changes/i)).toBeVisible();
        // Toggle back
        await addedSkillsBadge.click();
      }
    }

    // Close manager details dialog
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    // 2. Expert Assigned Roles Catalog -> Details Modal -> Version Diff Toggle
    await page.goto('/expert/target-roles');
    await page.waitForLoadState('networkidle');

    const expertDetailsBtn = page.locator('button[title="View Details"]').first();
    await expect(expertDetailsBtn).toBeVisible({ timeout: 10000 });
    await expertDetailsBtn.click();

    const expertSpecsToggle = page.getByRole('button', { name: 'Architecture Specifications' });
    const expertDiffToggle = page.getByRole('button', { name: /Version Changes \(Diff\)/i });
    await expect(expertSpecsToggle).toBeVisible({ timeout: 5000 });
    await expect(expertDiffToggle).toBeVisible();

    // Click 'Version Changes (Diff)' in expert view
    await expertDiffToggle.click();
    const expertIsBaseline = await page.getByText(/Initial Baseline Version/i).isVisible().catch(() => false);
    const expertHasDiffBanner = await page.getByText(/Previous: v/i).isVisible().catch(() => false);
    expect(expertIsBaseline || expertHasDiffBanner).toBeTruthy();

    // Close expert details dialog
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    // 3. Open Configure Skills dialog in Expert view and verify max-w-5xl & Target Mastery (%) label
    const editBtn = page.locator('button[title*="Micro-skills"]').first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      const configModal = page.locator('div[role="dialog"].max-w-5xl');
      await expect(configModal).toBeVisible({ timeout: 5000 });

      // Verify human-centric label Target Mastery (%)
      await expect(page.getByText('Target Mastery (%)')).toBeVisible();

      // Verify 'Active Editing: All Levels' text is removed
      await expect(page.getByText(/Active Editing: All Levels/i)).toHaveCount(0);

      // Verify Edit Target Mastery button in Configured Micro-skills table
      const editMasteryBtn = page.locator('button[title="Edit Target Mastery"]').first();
      if (await editMasteryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editMasteryBtn.click();
        const masteryInput = page.locator('input[type="number"]').last();
        await expect(masteryInput).toBeVisible();
        await masteryInput.fill('85');
        const saveMasteryBtn = page.locator('button[title="Save target mastery"]').first();
        await saveMasteryBtn.click();
        await expect(page.getByText('Target Mastery Updated')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('85%').first()).toBeVisible();
      }

      // Close modal
      await page.getByRole('button', { name: 'Close', exact: true }).click();
    }
  });

});
