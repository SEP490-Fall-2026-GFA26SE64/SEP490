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

test.describe('Employee Upskilling & Manager Target Role Without Job Domain', () => {
  test('employee in technova sees published target roles and micro-skills', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await loginAs(page, 'employee@technova.com')

    // Navigate to employee upskilling roles tab
    await page.goto('/employee/upskilling?tab=roles')
    await expect(page.locator('main')).toBeVisible()

    // Assert "Baseline is not ready..." alert is NOT shown
    await expect(page.getByText('Baseline is not ready')).toHaveCount(0)

    // Assert that target roles are rendered
    const roleButtons = page.getByRole('button', { name: 'Role requirements' })
    await expect(roleButtons.first()).toBeVisible({ timeout: 15000 })
    const count = await roleButtons.count()
    expect(count).toBeGreaterThan(0)

    // Switch to skills tab
    const skillsTabTrigger = page.getByRole('tab', { name: 'Skills' })
    await expect(skillsTabTrigger).toBeVisible()
    await skillsTabTrigger.click()

    // Verify skills are visible
    await expect(page.locator('#upskilling-skills-panel')).toBeVisible()
    const skillSearchInput = page.getByPlaceholder('Search skills by name, topic...')
    await expect(skillSearchInput).toBeVisible()

    // Assert micro-skill cards or rows are rendered without fetch error
    await expect(page.getByText('Unable to fetch verified micro-skills')).toHaveCount(0)
  })

  test('manager target roles modal has no Job Domain field', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await loginAs(page, 'alice@gmail.com')

    await page.goto('/ld-manager/target-roles')
    await expect(page.locator('main')).toBeVisible()

    // Open Create Target Role modal
    const createBtn = page.getByRole('button', { name: 'Create', exact: true })
    await expect(createBtn).toBeVisible()
    await createBtn.click()

    await expect(page.getByRole('heading', { name: 'Create Target Role' })).toBeVisible()

    // Verify Job Domain is not in the modal
    await expect(page.getByText('Job Domain', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Job Domain')).toHaveCount(0)

    // Cancel modal
    await page.getByRole('button', { name: 'Cancel' }).click()
  })
})
