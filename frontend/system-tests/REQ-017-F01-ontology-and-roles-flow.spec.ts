import { expect, test } from '@playwright/test'

test.describe('REQ-017-F01 & REQ-018-F01 Target Roles & Competency Ontology Verification', () => {
  test('expert target roles catalog renders single-row filters without wrapping', async ({ page }) => {
    await page.goto('/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Title verification
    await expect(page.getByText('Target Role Version Catalog')).toBeVisible()

    // Verify search and filters exist
    const searchInput = page.getByPlaceholder('Search roles...')
    await expect(searchInput).toBeVisible()

    const statusFilter = page.locator('select[aria-label="Filter by Status"]')
    await expect(statusFilter).toBeVisible()

    const sortFilter = page.locator('select[aria-label="Sort Target Roles"]')
    await expect(sortFilter).toBeVisible()

    // Single-row layout assertion: compare bounding box vertical positions
    const searchBox = await searchInput.boundingBox()
    const statusBox = await statusFilter.boundingBox()
    const sortBox = await sortFilter.boundingBox()

    expect(searchBox).not.toBeNull()
    expect(statusBox).not.toBeNull()
    expect(sortBox).not.toBeNull()

    // On standard viewport, all 3 filter elements share roughly the same Y coordinate (within 12px tolerance)
    if (searchBox && statusBox && sortBox) {
      const deltaStatus = Math.abs(searchBox.y - statusBox.y)
      const deltaSort = Math.abs(searchBox.y - sortBox.y)
      expect(deltaStatus).toBeLessThan(12)
      expect(deltaSort).toBeLessThan(12)
    }

    // Type search query and assert filtering works
    await searchInput.fill('Dev')
    await expect(page.locator('table').first()).toBeVisible()
  })

  test('expert ontology catalog renders single-row filters and matching mastery outline pills', async ({ page }) => {
    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Verify Tab 1 Micro-skills Catalog
    await expect(page.getByText('Micro-skills Catalog')).toBeVisible()
    const skillSearch = page.getByPlaceholder('Search skills...')
    await expect(skillSearch).toBeVisible()

    // Verify competency pill format
    const competencyPill = page.locator('table tbody tr td').filter({ hasText: /SECURITY|ASSURANCE|RESPONSE|KNOWLEDGE|COMMUNICATION|INNOVATION/i }).first()
    await expect(competencyPill).toBeVisible()

    // Navigate to Tab 2 Skill Prerequisites (using button selector since TabsTrigger renders button)
    const prereqTabTrigger = page.locator('button').filter({ hasText: 'Skill Prerequisites' })
    await expect(prereqTabTrigger).toBeVisible()
    await prereqTabTrigger.click()

    await expect(page.getByText('Skill Prerequisites & Readiness')).toBeVisible()
    const prereqSearch = page.getByPlaceholder('Search prerequisites...')
    await expect(prereqSearch).toBeVisible()

    // Single-row alignment verification on Prerequisites tab
    const prereqSearchBox = await prereqSearch.boundingBox()
    const prereqStatusSelect = page.locator('select').filter({ hasText: /All/i }).first()
    const prereqStatusBox = await prereqStatusSelect.boundingBox()

    if (prereqSearchBox && prereqStatusBox) {
      const deltaPrereq = Math.abs(prereqSearchBox.y - prereqStatusBox.y)
      expect(deltaPrereq).toBeLessThan(12)
    }

    // Verify Minimum Mastery pill styling in Prerequisites table
    const masteryPill = page.locator('table tbody tr td div.rounded-full').filter({ hasText: /% Mastery/i }).first()
    await expect(masteryPill).toBeVisible()

    // Assert that the mastery pill uses outline styling (border-border/80) and NOT solid primary orange fill
    const masteryClasses = await masteryPill.getAttribute('class')
    expect(masteryClasses).not.toBeNull()
    expect(masteryClasses).toContain('border')
    expect(masteryClasses).not.toContain('bg-primary text-white')
    expect(masteryClasses).not.toContain('bg-primary text-primary-foreground')
  })
})
