import { expect, test, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  const res = await page.request.post('/api/v1/workspace-auth/sign-in', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
  return await res.json()
}

test.describe('Competency Department & Job Position Auto-Assignment & Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await loginAs(page, 'expert@technova.com')
  })

  test('competencies catalog provides Department and Job Position filters, shows badges and deduplicated items', async ({ page }) => {
    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Switch to Competencies tab
    const compTabTrigger = page.getByRole('tab', { name: /competencies/i })
    await expect(compTabTrigger).toBeVisible()
    await compTabTrigger.click()

    // Assert Domain Competencies Catalog header is visible
    await expect(page.getByText('Domain Competencies Catalog')).toBeVisible()

    // Assert Search and Filter Controls exist
    const searchInput = page.getByPlaceholder('Search competencies...')
    await expect(searchInput).toBeVisible()

    // Filter controls for Department and Job Position
    const deptCombobox = page.getByText(/All Departments/i).first()
    await expect(deptCombobox).toBeVisible()
    await deptCombobox.click()
    const deptOptions = await page.locator('[role="option"]').allTextContents()
    for (const opt of deptOptions) {
      expect(opt).not.toMatch(/\(\d+\)$/)
    }
    // Close dropdown by clicking header or body
    await page.getByText('Domain Competencies Catalog').click()

    const jobPosCombobox = page.getByText(/All Job Positions/i).first()
    await expect(jobPosCombobox).toBeVisible()
    await jobPosCombobox.click()
    const jpOptions = await page.locator('[role="option"]').allTextContents()
    for (const opt of jpOptions) {
      expect(opt).not.toMatch(/\(\d+\)$/)
    }
    await page.getByText('Domain Competencies Catalog').click()

    // Assert deduplication: search for 'Senior Test execution and defect evidence'
    await searchInput.fill('Senior Test execution and defect evidence')
    await page.waitForTimeout(500)

    // The table should show COMP-TEXEC-S01 and not show duplicates S04, S05, S07, S08, S09, S10
    const texecS01 = page.locator('td', { hasText: 'COMP-TEXEC-S01' })
    await expect(texecS01).toBeVisible()

    const texecS04 = page.locator('td', { hasText: 'COMP-TEXEC-S04' })
    await expect(texecS04).toHaveCount(0)

    const texecS10 = page.locator('td', { hasText: 'COMP-TEXEC-S10' })
    await expect(texecS10).toHaveCount(0)

    // Clear search
    await searchInput.clear()

    // Verify badges do not leak O*NET code prefixes like '15-1253.00 - '
    const jpBadges = page.locator('table tbody tr span:has-text("Software Quality Assurance")')
    if (await jpBadges.count() > 0) {
      const firstBadgeText = await jpBadges.first().textContent()
      expect(firstBadgeText).not.toMatch(/^\d{2}-\d{4}\.\d{2}/)
    }

    // Verify Create Competency modal shows read-only Department & Job Position scope indicators
    const createBtn = page.getByRole('button', { name: /Create/i }).first()
    if (await createBtn.isVisible()) {
      await createBtn.click()

      // The modal title or scope indicator should appear
      await expect(page.getByText('Assigned Scope (Auto-Assigned from Domain Expert)')).toBeVisible()
      await expect(page.getByText('Read-only')).toBeVisible()
      await expect(page.getByText('Department', { exact: true })).toBeVisible()
      await expect(page.getByText('Job Position', { exact: true })).toBeVisible()

      // Verify the job position displayed does not leak code prefix
      const modalScopeJp = page.getByRole('dialog').getByText('Job Position', { exact: true }).locator('..').locator('.font-semibold')
      if (await modalScopeJp.count() > 0) {
        const text = await modalScopeJp.first().textContent()
        expect(text).not.toMatch(/^\d{2}-\d{4}\.\d{2}\s*-/)
      }

      // Close modal
      const cancelBtn = page.getByRole('button', { name: /Cancel/i })
      await cancelBtn.click()
    }
  })

  test('expert configure target role modal includes Department and Job Position filters', async ({ page }) => {
    await page.goto('/expert/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Find first available role to configure
    const configBtn = page.getByRole('button', { name: /Configure Skills|Edit/i }).first()
    if (await configBtn.isVisible()) {
      await configBtn.click()

      // In the modal, verify the department and job position filters are rendered
      await expect(page.getByText('Department', { exact: true })).toBeVisible()
      await expect(page.getByText('Job Position', { exact: true })).toBeVisible()

      // Click Job Position filter dropdown in the modal to inspect options
      const jpFilter = page.getByRole('dialog').getByText(/All Job Positions/i).first()
      if (await jpFilter.isVisible()) {
        await jpFilter.click()
        await page.waitForTimeout(300)

        // Read all option texts
        const options = await page.locator('[role="option"]').allTextContents()
        expect(options.length).toBeGreaterThan(0)
        for (const opt of options) {
          // Never contain code prefix like '15-1212.00 - '
          expect(opt).not.toMatch(/^\d{2}-\d{4}\.\d{2}\s*-/)
          // Never contain 'Unassigned Position'
          expect(opt).not.toContain('Unassigned Position')
          // Never contain count suffix in parentheses like '(12)'
          expect(opt).not.toMatch(/\(\d+\)$/)
        }
      }
    }
  })
})

