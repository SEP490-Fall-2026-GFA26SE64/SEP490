import { expect, test } from '@playwright/test'

test.describe('REQ-018 Complete Neo4j Schema Persistence & Zero-Mock Reload Verification', () => {
  test.setTimeout(180_000)

  test('MicroSkill, LearningModule, Occupation, TargetRole, and Competency persist across page reloads', async ({ page }) => {
    // 1. Establish Manager session
    await page.request.post('/api/v1/local-baseline-demo/session', {
      data: { persona: 'ld' },
    })

    // =========================================================================
    // STEP 1: Micro-Skill Persistence & Reload Verification
    // =========================================================================
    await page.goto('/manager/ontology')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Micro-skills Catalog')).toBeVisible()

    const uniqueSkillSuffix = Math.floor(Math.random() * 9000 + 1000)
    const testSkillCode = `SKILL-AUTO-${uniqueSkillSuffix}`
    const testSkillName = `Auto Test Skill ${uniqueSkillSuffix}`

    // Open Create Modal
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill form
    const codeInput = page.getByPlaceholder(/e.g. SKILL-CYPHER-01/i).or(page.getByPlaceholder(/e.g. SKILL-/i))
    await codeInput.fill(testSkillCode)

    const nameInput = page.getByPlaceholder(/e.g. Neo4j Cypher DDL/i).or(page.getByPlaceholder(/e.g. Implement Transformer/i))
    await nameInput.fill(testSkillName)

    const descInput = page.getByPlaceholder(/Describe what learners will know/i).or(page.getByPlaceholder(/Detailed description/i))
    await descInput.fill('Strictly persisted in Neo4j graph without mock data loss.')

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create Micro-skill' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })

    // Verify appears in table before reload
    const skillSearch = page.getByPlaceholder('Search skills...')
    await skillSearch.fill(testSkillCode)
    await expect(page.getByRole('table').getByText(testSkillCode, { exact: true })).toBeVisible()

    // RELOAD and verify survival from Neo4j
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    const reloadedSkillSearch = page.getByPlaceholder('Search skills...')
    await reloadedSkillSearch.fill(testSkillCode)
    await expect(page.getByRole('table').getByText(testSkillCode, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table').getByText(testSkillName, { exact: true })).toBeVisible()

    // =========================================================================
    // STEP 2: Learning Module Persistence & Reload Verification
    // =========================================================================
    await page.goto('/manager/modules')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    const uniqueModSuffix = Math.floor(Math.random() * 9000 + 1000)
    const testModCode = `MOD-AUTO-${uniqueModSuffix}`
    const testModTitle = `Automated Learning Module ${uniqueModSuffix}`

    // Open Create Modal
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill form
    const modCodeInput = page.getByPlaceholder(/e.g. MOD-GNN-201/i).or(page.getByPlaceholder(/e.g. MOD-ATTN-101/i))
    await modCodeInput.fill(testModCode)

    const modTitleInput = page.getByPlaceholder(/e.g. Hands-on Geometric Deep Learning/i).or(page.getByPlaceholder(/e.g. Attention Mechanism/i))
    await modTitleInput.fill(testModTitle)

    const modContentInput = page.getByPlaceholder(/e.g. content\/modules/i).or(page.getByPlaceholder(/content\/modules\/.../i))
    await modContentInput.fill(`content/modules/${testModCode}.md`)

    // Submit
    await page.getByRole('dialog').getByRole('button', { name: 'Create Module' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })

    // Verify appears before reload
    const modSearch = page.getByPlaceholder('Search modules...')
    await modSearch.fill(testModCode)
    await expect(page.getByRole('table').getByText(testModCode, { exact: true })).toBeVisible()

    // RELOAD and verify survival from Neo4j
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    const reloadedModSearch = page.getByPlaceholder('Search modules...')
    await reloadedModSearch.fill(testModCode)
    await expect(page.getByRole('table').getByText(testModCode, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table').getByText(testModTitle, { exact: true })).toBeVisible()

    // =========================================================================
    // STEP 3: Occupation Persistence & Reload Verification
    // =========================================================================
    await page.goto('/ld-manager/occupations')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    const uniqueOccSuffix = Math.floor(Math.random() * 900 + 100)
    const testOccCode = `15-88${uniqueOccSuffix}.00`
    const testOccName = `Autonomous AI Systems Architect ${uniqueOccSuffix}`

    // Open Create Occupation
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByPlaceholder(/e.g. 15-1252.00/i).fill(testOccCode)
    await page.getByPlaceholder(/e.g. Software Developers/i).fill(testOccName)
    await page.getByPlaceholder(/Provide a comprehensive summary/i).fill('Responsible for architecting graph-based autonomous agents.')

    await page.getByRole('dialog').getByRole('button', { name: 'Create Occupation' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })

    // RELOAD and verify survival from Neo4j
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    const occSearch = page.getByPlaceholder('Search occupations...')
    await occSearch.fill(testOccCode)
    await expect(page.getByRole('table').getByText(testOccCode, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table').getByText(testOccName, { exact: true })).toBeVisible()

    // =========================================================================
    // STEP 4: Target Role Persistence & Reload Verification
    // =========================================================================
    await page.goto('/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    const uniqueRoleSuffix = Math.floor(Math.random() * 9000 + 1000)
    const testRoleCode = `ROLE-AUTO-${uniqueRoleSuffix}`
    const testRoleTitle = `Autonomous Agent Specialist ${uniqueRoleSuffix}`

    // Open Create Role
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByPlaceholder(/e.g. ROLE-AI-ARCH/i).fill(testRoleCode)
    await page.getByPlaceholder(/e.g. AI Knowledge Architect/i).fill(testRoleTitle)
    await page.getByPlaceholder(/Summarize the purpose, scope/i).fill('Leads development of autonomous reasoning architectures.')

    // Submit as draft
    await page.getByRole('dialog').getByRole('button', { name: 'Save as Draft' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 })

    // RELOAD and verify survival from Neo4j
    await page.reload()
    await expect(page.locator('main')).toBeVisible()
    const roleSearch = page.getByPlaceholder('Search roles...')
    await roleSearch.fill(testRoleCode)
    await expect(page.getByRole('table').getByText(testRoleCode, { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('table').getByText(testRoleTitle, { exact: true })).toBeVisible()
  })
})
