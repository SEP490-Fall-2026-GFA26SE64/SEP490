import { expect as baseExpect, test } from '@playwright/test'

const expect = baseExpect.configure({ timeout: 30_000 })
const root = '/api/v1/module-management'
type CatalogItem = { module: { metadata: { id: string; status: string | null; reviewStatus: string | null }; title: string | null; contentUri: string | null; duration: number | null; price: number | null; teachings: { skillId: string; teachingFocus: string | null }[] }; authoring: unknown | null }
type CatalogPage = { items: CatalogItem[]; total: number; page: number; pageSize: number }

test('REQ-013-F02: reads existing Neo4j modules, filters, paginates and shows honest legacy details', async ({ page, request }) => {
  test.setTimeout(240_000)
  await expect.poll(() => request.get('/api/v1/system/status').then(response => response.ok()).catch(() => false), { timeout: 90_000 }).toBeTruthy()
  expect((await request.get(`${root}/module-list`)).status()).toBe(401)
  expect((await request.get(`${root}/module-list`, { headers: { Cookie: 'baseline_demo_persona=employee-a' } })).status()).toBe(403)
  await page.addInitScript(() => { if (!localStorage.getItem('app_language')) localStorage.setItem('app_language', 'en') })
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Expert', exact: true }).click()
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  const response = await page.request.get(`${root}/module-list?search=MOD-DE-J-MODEL-01`)
  expect(response.status()).toBe(200)
  const first = await response.json() as CatalogPage
  const item = first.items.find(row => row.module.metadata.id === 'MOD-DE-J-MODEL-01')
  expect(item).toBeDefined(); expect(item!.authoring).toBeNull()
  expect(item!.module.title).toBeTruthy(); expect(item!.module.teachings.length).toBeGreaterThan(0)
  const all = await (await page.request.get(`${root}/module-list`)).json() as CatalogPage
  expect(all.total).toBeGreaterThan(10); expect(all.items).toHaveLength(10)
  const second = await (await page.request.get(`${root}/module-list?page=2`)).json() as CatalogPage
  expect(second.page).toBe(2)
  expect(second.items.some(row => all.items.some(other => other.module.metadata.id === row.module.metadata.id))).toBe(false)

  await page.goto('/expert/modules', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: second.items[0].module.title ?? second.items[0].module.metadata.id, exact: true })).toBeVisible()
  const search = page.getByLabel('Search name or ID', { exact: true })
  await search.fill('MOD-DE-J-MODEL-01')
  await expect(page.getByRole('heading', { name: item!.module.title!, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'View module', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Catalog module details' })
  await expect(dialog.getByText('No edit history has been recorded for this module.')).toBeVisible()
  await expect(dialog.getByText(item!.module.contentUri!, { exact: true })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Skills taught', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click()
  const skill = item!.module.teachings[0].skillId
  await page.getByLabel('Skill', { exact: true }).selectOption(skill)
  await expect(page.getByRole('heading', { name: item!.module.title!, exact: true })).toBeVisible()
  await search.fill('no-module-with-this-id-req013')
  await expect(page.getByText(/No modules match this view/)).toBeVisible()
  await search.fill('MOD-DE-J-MODEL-01')
  await expect(page.getByRole('heading', { name: item!.module.title!, exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.getByRole('group', { name: 'Language selection' }).getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Xem module', exact: true })).toBeVisible()
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await page.screenshot({ path: 'test-results/REQ-013-neo4j-module-list.png', fullPage: true })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Quản lý module học', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Đến trang đăng nhập', exact: true })).toHaveCount(0)
})
