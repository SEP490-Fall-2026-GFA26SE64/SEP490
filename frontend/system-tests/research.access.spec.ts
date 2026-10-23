import { test, expect } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })
test('portal admin opens Research directly; other roles have no menu and cannot enter the route', async ({ page, request }) => {
  expect((await request.get('/api/v1/admin/research/runs')).status()).toBe(401)
  for (const role of ['EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER']) {
    expect((await request.get('/api/v1/admin/research/runs', { headers: { 'X-User-Role': role, 'X-User-Id': 'other@portal.local' } })).status()).toBe(403)
  }
  await page.goto('/login')
  await page.getByRole('button', { name: 'Admin', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/dashboard')
  await page.getByRole('link', { name: 'Research', exact: true }).click()
  await expect(page.getByText('Configure RQ2')).toBeVisible()
  await expect(page.getByText('Administrator access', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Lock access', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Research scope')).toHaveText(/RQ1.*RQ2.*RQ3/)
  await page.reload()
  await expect(page.getByText('Configure RQ2')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('research-admin-direct.png') })
  for (const role of ['Employee', 'Expert', 'L&D Manager']) {
    await page.goto('/login')
    await page.getByRole('button', { name: role, exact: true }).click()
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login$/)
    await expect(page.getByRole('link', { name: 'Research', exact: true })).toHaveCount(0)
    await page.goto('/admin/research')
    await expect(page).not.toHaveURL(/\/admin\/research$/)
    await expect(page.getByRole('link', { name: 'Research', exact: true })).toHaveCount(0)
  }
})
