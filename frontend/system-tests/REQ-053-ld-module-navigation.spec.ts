import { expect as baseExpect, test } from '@playwright/test'
const expect = baseExpect.configure({ timeout: 30_000 })
const root = '/api/v1/module-management'
const ld = { Cookie: 'baseline_demo_persona=ld' }
const expert = { Cookie: 'baseline_demo_persona=expert-chen' }
type Doc = { id: string; lockVersion: number; revisions: { state: string; decidedBy: string | null }[] }
test('REQ-053: L&D can navigate, inspect, cancel and approve without entering Expert', async ({ page, request }) => {
  test.setTimeout(240_000)
  const actor = await (await request.get(`${root}/session`, { headers: expert })).json() as { id: string }
  const occupations = await (await request.get(`${root}/catalog/Occupation`, { headers: ld })).json() as { id: string }[]
  const occupationId = occupations[0].id
  expect((await request.put(`${root}/grants`, { headers: ld, data: { expertId: actor.id, occupationId, active: true } })).status()).toBe(204)
  const skills = await (await request.get(`${root}/catalog/MicroSkill`, { headers: expert })).json() as { id: string }[]
  const title = `L&D navigation review ${Date.now()}`
  const contentResponse = await request.post(`${root}/contents`, { headers: expert, data: { title, markdown: '# Review lesson\nPractice and verify the outcome.', occupationIds: [occupationId] } })
  expect(contentResponse.status()).toBe(201)
  const content = await contentResponse.json() as { id: string }
  const created = await request.post(`${root}/modules`, { headers: expert, data: { title, moduleType: 'LESSON_AND_PRACTICE', contentId: content.id, duration: 60, price: 100000, occupationIds: [occupationId], teachings: [{ skillId: skills[0].id, teachingFocus: 'PRIMARY', difficultyLevel: 'MEDIUM' }] } })
  expect(created.status()).toBe(201)
  let doc = await created.json() as Doc
  const submitted = await request.post(`${root}/modules/${doc.id}/actions`, { headers: expert, data: { expectedVersion: doc.lockVersion, action: 'submit' } })
  expect(submitted.status()).toBe(200)
  doc = await submitted.json() as Doc
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Enter your email').fill('sarah.connor@adaptlearn.internal')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto('/ld-manager/approvals', { waitUntil: 'domcontentloaded' })
  const nav = page.getByRole('navigation', { name: 'Learning workspace' })
  await nav.getByRole('link', { name: 'Modules', exact: true }).click()
  await expect(page).toHaveURL(/\/ld-manager\/modules$/)
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  await page.getByRole('button', { name: 'Details & history', exact: true }).click()
  const details = page.getByRole('dialog', { name: 'Module details' })
  await expect(details.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(details.getByText(`Created by: ${actor.id}`, { exact: false })).toBeVisible()
  await details.getByRole('button', { name: 'Close dialog' }).click()
  await nav.getByRole('link', { name: 'Learning content', exact: true }).click()
  await expect(page).toHaveURL(/\/ld-manager\/learning-content$/)
  await expect(page.getByRole('heading', { name: 'Learning content', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create content', exact: true })).toHaveCount(0)
  await nav.getByRole('link', { name: 'Approvals & assignments', exact: true }).click()
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  await page.getByRole('button', { name: 'Approve and release', exact: true }).click()
  await page.getByRole('dialog', { name: 'Approve and release', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Approve and release', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Approve and release', exact: true }).click()
  await page.getByRole('dialog', { name: 'Approve and release', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Released', { exact: true })).toBeVisible()
  const saved = await (await page.request.get(`${root}/modules/${doc.id}`)).json() as Doc
  expect(saved.revisions.at(-1)?.state).toBe('RELEASED')
  expect(saved.revisions.at(-1)?.decidedBy).toBeTruthy()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(nav.getByRole('link', { name: 'Modules', exact: true })).toHaveAttribute('href', '/ld-manager/modules')
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  await expect(page.getByText('Released', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/REQ-053-ld-module-navigation.png', fullPage: true })
})
