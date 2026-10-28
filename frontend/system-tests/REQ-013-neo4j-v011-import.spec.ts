import { expect as baseExpect, test } from '@playwright/test'

const expect = baseExpect.configure({ timeout: 30_000 })
type Module = { metadata: { id: string; version: string; reviewStatus: string; reviewedBy: string | null }; title: string; duration: number; price: number; teachings: { teachingFocus: string; difficultyLevel: string }[] }

test('REQ-013/016: imported v0.11 catalog shows populated fields and new focused modules', async ({ page, request }) => {
  test.setTimeout(180_000)
  await expect.poll(() => request.get('/api/v1/system/status').then(response => response.ok()).catch(() => false), { timeout: 90_000 }).toBeTruthy()
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Expert', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  const root = '/api/v1/module-management/module-list'
  const all = await (await page.request.get(root)).json() as { total: number }
  expect(all.total).toBeGreaterThanOrEqual(246)
  for (const id of ['MOD-DE-J-MODEL-01', 'MOD-FOCUS-CORE01-HIGH']) {
    const response = await page.request.get(`${root}?search=${id}`)
    expect(response.status()).toBe(200)
    const result = await response.json() as { items: { module: Module; authoring: unknown | null }[] }
    const item = result.items.find(entry => entry.module.metadata.id === id)!
    expect(item).toBeDefined(); expect(item.authoring).toBeNull()
    expect(item.module.metadata.version).toBe('0.11.0')
    expect(item.module.metadata.reviewStatus).toBe('NEEDS_EXPERT_REVIEW')
    expect(item.module.metadata.reviewedBy).toBeNull()
    expect(item.module.duration).toBeGreaterThan(0); expect(item.module.price).toBeGreaterThan(0)
    expect(item.module.teachings.filter(teaching => teaching.teachingFocus === 'PRIMARY')).toHaveLength(1)
    expect(item.module.teachings.every(teaching => ['LOW', 'MEDIUM', 'HIGH'].includes(teaching.difficultyLevel))).toBe(true)
    await page.goto('/expert/modules', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Search name or ID', { exact: true }).fill(id)
    await expect(page.getByRole('heading', { name: item.module.title, exact: true })).toBeVisible()
    await expect(page.getByText('Catalog version 0.11.0', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'View module', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Catalog module details' })
    await expect(dialog.getByText('Primary', { exact: true })).toBeVisible()
    await expect(dialog.getByText(id, { exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click()
  }
  await page.screenshot({ path: 'test-results/REQ-013-neo4j-v011-import.png', fullPage: true })
})
