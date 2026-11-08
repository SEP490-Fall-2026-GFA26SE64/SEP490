import { expect, test } from '@playwright/test'

test.describe('Department Isolation & Automatic Job Position Assignment', () => {
  test.setTimeout(120_000)

  test('L&D Manager sees only their department job positions, and created positions auto-assign to that department', async ({ page }) => {
    // 1. Intercept subscription members API so Sarah Connor belongs to "Empty Department"
    await page.route('**/api/v1/organizations/*/subscription/members', async (route) => {
      try {
        const response = await route.fetch()
        const text = await response.text()
        const members = JSON.parse(text)
        const updated = members.map((m: any) => {
          if (m.email === 'manager@technova.com') {
            return {
              ...m,
              departmentId: 'dept-test-empty',
              departmentName: 'Empty Department',
            }
          }
          return m
        })
        await route.fulfill({ json: updated })
      } catch {
        await route.continue().catch(() => {})
      }
    })

    // 2. Authenticate as L&D Manager (Sarah Connor)
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('manager@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    await expect(page).toHaveURL(/.*\/ld-manager\/job-positions/)
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })

    // Setup localStorage department with 0 job positions
    await page.evaluate(() => {
      const emptyDept = {
        id: 'dept-test-empty',
        code: 'DPT-EMPTY',
        name: 'Empty Department',
        description: 'Testing department with no job positions',
        headOfDepartment: 'Sarah Connor',
        headEmail: 'manager@technova.com',
        status: 'active',
        linkedJobPositions: [],
        organizationId: 'e0000000-0000-0000-0000-000000000001',
        createdAt: '2026-11-04',
      }
      localStorage.setItem('adaptlearn_departments_v2_e0000000-0000-0000-0000-000000000001', JSON.stringify([emptyDept]))
      localStorage.setItem('alg_employee_assignment_manager@technova.com', JSON.stringify({
        departmentId: emptyDept.id,
        departmentName: emptyDept.name,
      }))
      window.dispatchEvent(new Event('departments_updated'))
    })

    // Reload page to let managerDepartment resolve to Empty Department
    await page.reload()
    await expect(page.locator('main')).toBeVisible()

    // 3. Verify that an empty department sees 0 Job Positions (NOT leaking the catalog!)
    await expect(page.getByText('0 Job Positions', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('No job positions found', { exact: true })).toBeVisible()
    await expect(page.getByText(/Empty Department/i).first()).toBeVisible()

    // 4. Create a Job Position while in this department
    const uniqueSuffix = Math.floor(Math.random() * 900 + 100)
    const newCode = `15-88${uniqueSuffix}.00`
    const newName = `Isolated Specialist ${uniqueSuffix}`

    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Check that the dialog shows it will auto-assign to Empty Department
    await expect(dialog.getByText(/Empty Department/i).first()).toBeVisible()

    const codeInput = dialog.locator('input[placeholder*="15-"]')
    await codeInput.fill(newCode)
    const nameInput = dialog.locator('input[placeholder*="Developers"]')
    await nameInput.fill(newName)
    const descInput = dialog.locator('textarea')
    await descInput.fill('Department isolated specialist role')

    await dialog.getByRole('button', { name: /Create JobPosition|Create/i }).click()
    await expect(dialog).toBeHidden({ timeout: 10_000 })

    // 5. Verify the newly created job position is immediately visible in this department
    await expect(page.getByText('1 Job Positions', { exact: true })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('table').getByText(newCode, { exact: true })).toBeVisible()
    await expect(page.getByRole('table').getByText(newName, { exact: true })).toBeVisible()

    // 6. Verify departmentStore in localStorage now contains this linked job position
    const isLinked = await page.evaluate((code) => {
      const raw = localStorage.getItem('adaptlearn_departments_v2_e0000000-0000-0000-0000-000000000001')
      if (!raw) return false
      const depts = JSON.parse(raw)
      const emptyDept = depts.find((d: any) => d.id === 'dept-test-empty')
      return emptyDept && emptyDept.linkedJobPositions && emptyDept.linkedJobPositions.includes(code)
    }, newCode)

    expect(isLinked).toBe(true)
  })
})
