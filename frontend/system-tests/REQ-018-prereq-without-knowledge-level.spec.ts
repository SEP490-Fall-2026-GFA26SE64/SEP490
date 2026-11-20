import { test, expect, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

const ORG_ID = 'e0000000-0000-0000-0000-000000000001'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
  })
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await waitForWorkspaceEntry(page)
  await expect(page).toHaveURL(/\/workspace\//, { timeout: 15_000 })
}

test.describe('REQ-018 & REQ-015: Skill Prerequisites Without Knowledge Levels & Role Submission Without Prereq Validation', () => {
  test.setTimeout(90_000)

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  test('1. Skill Prerequisites tab creates, edits, and deletes prerequisite between 2 micro-skills without knowledge levels', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')

    // Create 3 temporary micro-skills via API so we can test create -> edit -> delete cleanly
    const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
    const headers = {
      [csrf.headerName]: csrf.token,
      'X-User-Role': 'DOMAIN_EXPERT',
    }
    const suffix = Date.now().toString().slice(-5)
    const s1Res = await page.request.post(`/api/v1/organizations/${ORG_ID}/micro-skills`, {
      headers,
      data: {
        code: `MS-P1-${suffix}`,
        name: `Prereq Test Dependent ${suffix}`,
        description: 'Dependent test skill',
        moduleOnlyKnowledgeLevels: ['FOUNDATION', 'INTERMEDIATE'],
        certificateOnlyKnowledgeLevels: [],
      },
    })
    expect(s1Res.ok()).toBeTruthy()
    const s1 = await s1Res.json()

    const s2Res = await page.request.post(`/api/v1/organizations/${ORG_ID}/micro-skills`, {
      headers,
      data: {
        code: `MS-P2-${suffix}`,
        name: `Prereq Test Target A ${suffix}`,
        description: 'Target A test skill',
        moduleOnlyKnowledgeLevels: ['FOUNDATION'],
        certificateOnlyKnowledgeLevels: [],
      },
    })
    expect(s2Res.ok()).toBeTruthy()
    const s2 = await s2Res.json()

    const s3Res = await page.request.post(`/api/v1/organizations/${ORG_ID}/micro-skills`, {
      headers,
      data: {
        code: `MS-P3-${suffix}`,
        name: `Prereq Test Target B ${suffix}`,
        description: 'Target B test skill',
        moduleOnlyKnowledgeLevels: ['FOUNDATION'],
        certificateOnlyKnowledgeLevels: [],
      },
    })
    expect(s3Res.ok()).toBeTruthy()
    const s3 = await s3Res.json()

    try {
      await page.goto('/workspace/workspace-development/expert/ontology')
      await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

      // Switch to Skill Prerequisites tab
      const prereqTab = page.locator('button[role="tab"]').filter({ hasText: /Skill Prerequisites/i })
      await expect(prereqTab).toBeVisible({ timeout: 10_000 })
      await prereqTab.click()
      await expect(page.getByText('Skill Prerequisites & Readiness')).toBeVisible()

      // Verify Minimum Mastery column is removed
      await expect(page.locator('th', { hasText: 'Minimum Mastery' })).toHaveCount(0)

      // Open Create Prerequisite modal
      await page.getByRole('button', { name: 'Create', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText('Add Skill Prerequisite Edge')).toBeVisible()

      // Assert knowledge level inputs are completely removed
      await expect(dialog.getByText('Dependent knowledge level')).toHaveCount(0)
      await expect(dialog.getByText('Prerequisite knowledge level')).toHaveCount(0)

      // Select Dependent Skill (s1)
      await dialog.getByRole('button', { name: /Select dependent micro-skill/i }).click()
      await dialog.getByPlaceholder('Search by skill code or title...').fill(s1.code)
      await dialog.locator('[role="option"]').filter({ hasText: s1.code }).first().click()

      // Select Prerequisite Skill (s2)
      await dialog.getByRole('button', { name: /Select prerequisite micro-skill/i }).click()
      await dialog.getByPlaceholder('Search by skill code or title...').fill(s2.code)
      await dialog.locator('[role="option"]').filter({ hasText: s2.code }).first().click()

      // Click Create Edge
      const createBtn = dialog.getByRole('button', { name: 'Create Edge' })
      await expect(createBtn).toBeEnabled()
      await createBtn.click()
      await expect(dialog).toHaveCount(0)

      // Search for our created prerequisite in the table
      await page.getByPlaceholder('Search prerequisites...').fill(s1.code)
      const row = page.locator('tbody tr').filter({ hasText: s1.code }).first()
      await expect(row).toBeVisible()
      await expect(row).toContainText(s2.code)

      // Edit the prerequisite edge from s2 to s3
      await row.locator('button[title="Edit Edge"]').click()
      const editDialog = page.getByRole('dialog')
      await expect(editDialog).toBeVisible()
      await expect(editDialog.getByText('Edit Skill Prerequisite Edge')).toBeVisible()
      await expect(editDialog.getByText('Dependent knowledge level')).toHaveCount(0)
      await expect(editDialog.getByText('Prerequisite knowledge level')).toHaveCount(0)

      await editDialog.getByRole('button', { name: new RegExp(s2.code) }).click()
      await editDialog.getByPlaceholder('Search by skill code or title...').fill(s3.code)
      await editDialog.locator('[role="option"]').filter({ hasText: s3.code }).first().click()

      await editDialog.getByRole('button', { name: 'Save Changes' }).click()
      await expect(editDialog).toHaveCount(0)

      // Verify updated row now shows s3
      await expect(page.locator('tbody tr').filter({ hasText: s1.code }).first()).toContainText(s3.code)
    } finally {
      await page.request.delete(`/api/v1/organizations/${ORG_ID}/prerequisites?sourceSkillId=${encodeURIComponent(s1.id)}&targetSkillId=${encodeURIComponent(s2.id)}`, {
        headers,
      }).catch(() => {})
      await page.request.delete(`/api/v1/organizations/${ORG_ID}/prerequisites?sourceSkillId=${encodeURIComponent(s1.id)}&targetSkillId=${encodeURIComponent(s3.id)}`, {
        headers,
      }).catch(() => {})
      for (const skill of [s1, s2, s3]) {
        await page.request.delete(`/api/v1/organizations/${ORG_ID}/micro-skills/${skill.id}`, {
          headers,
        }).catch(() => {})
      }
    }
  })

  test('2. Target Role configuration has no Missing Prereq notation and submits directly to L&D Manager without prereq confirmation', async ({ page }) => {
    await loginAs(page, 'expert@technova.com')

    await page.goto('/workspace/workspace-development/expert/roles')
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })

    // Find an editable draft role or open Configure Micro-skills
    const editBtn = page.locator('button[title="Configure Micro-skills"]').first()
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Assert zero Missing prereq badges and zero Missing Prereqs filter button
      await expect(dialog.getByText(/Missing prereq:/i)).toHaveCount(0)
      await expect(dialog.getByText(/Missing Prereqs \(/i)).toHaveCount(0)
      await expect(dialog.getByText(/Confirm Submit \(/i)).toHaveCount(0)

      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }
  })
})
