import { createHash } from 'node:crypto'
import { expect as baseExpect, test, type APIRequestContext, type Page } from '@playwright/test'

// Local Compose shares a small Docker VM; wait for observable results, never fixed sleeps.
const expect = baseExpect.configure({ timeout: 20_000 })
const root = '/api/v1/module-management'
const personas: Record<string, string> = { 'expert-a': 'expert-chen', 'expert-b': 'expert-vance', 'ld-reviewer': 'ld', 'module-learner': 'employee-a' }
const headers = (user: string) => ({ Cookie: `baseline_demo_persona=${personas[user]}` })
function accountId(user: string) {
  const bytes = createHash('md5').update(`LOCAL_BASELINE_DEMO:${personas[user]}`).digest()
  bytes[6] = (bytes[6] & 0x0f) | 0x30; bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
type Doc = { id: string; lockVersion: number; createdBy: string; archived: boolean; releasedRevision: number | null; revisions: { number: number; state: string; editedBy: string; payload: { title: string; content: { markdown: string } } }[]; history: { actorId: string; action: string }[] }
async function signIn(page: Page, path: string, user: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  const email = user === 'ld-reviewer' ? 'sarah.connor@adaptlearn.internal'
    : user === 'expert-b' ? 'expert-vance@adaptlearn.internal' : 'expert-chen@adaptlearn.internal'
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Learning workspace' })).toBeVisible()
  await expect(page.getByLabel('Account', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0)
}
async function action(request: APIRequestContext, doc: Doc, operation: string, actor: string, feedback?: string): Promise<Doc> {
  const response = await request.post(`${root}/modules/${doc.id}/actions`, { headers: headers(actor), data: { expectedVersion: doc.lockVersion, action: operation, feedback } })
  expect(response.status(), await response.text()).toBe(200)
  return response.json() as Promise<Doc>
}

test('REQ-013/016: real-stack authoring, shared edit history, review, pin preservation, archive and restore', async ({ page, request }) => {
  test.setTimeout(360_000)
  await expect.poll(() => request.get('/api/v1/system/status').then(response => response.ok()).catch(() => false), { timeout: 90_000, intervals: [1000, 3000, 5000] }).toBeTruthy()
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  expect((await request.get(`${root}/session`)).status()).toBe(401)
  const choices = await request.get(`${root}/catalog/Occupation`, { headers: headers('ld-reviewer') })
  expect(choices.ok(), await choices.text()).toBeTruthy()
  const occupations = await choices.json() as { id: string; name: string }[]
  expect(occupations.length).toBeGreaterThan(0)
  const occupation = occupations[0]
  for (const expertId of ['expert-a', 'expert-b']) {
    expect((await request.put(`${root}/grants`, { headers: headers('ld-reviewer'), data: { expertId: accountId(expertId), occupationId: occupation.id, active: true } })).status()).toBe(204)
  }
  const catalog = await request.get(`${root}/catalog/MicroSkill`, { headers: headers('expert-a') })
  const skills = await catalog.json() as { id: string; name: string }[]
  expect(skills.length).toBeGreaterThan(0)
  const skill = skills[0]
  const title = `REQ-013 learning package ${Date.now()}`
  await signIn(page, '/expert/learning-content', 'expert-a')
  await page.getByRole('button', { name: 'Create content', exact: true }).click()
  const studio = page.getByRole('dialog', { name: 'Create content', exact: true })
  await studio.getByLabel('Title', { exact: true }).fill(title)
  await studio.getByLabel('Occupations', { exact: true }).selectOption(occupation.id)
  await studio.getByLabel('Lesson text (Markdown)', { exact: true }).fill('# A complete lesson\nPractice safely, verify the result and reflect on your work.\n[video](https://example.org/lesson.mp4)')
  await studio.getByRole('button', { name: 'Save content', exact: true }).click()
  await expect(studio).not.toBeVisible()
  await page.getByRole('navigation', { name: 'Learning workspace' }).getByRole('link', { name: 'Modules', exact: true }).click()
  await page.getByRole('button', { name: 'Create module', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Module editor' })
  await editor.getByLabel('Title', { exact: true }).fill(title)
  await editor.getByLabel('Occupations (hold Ctrl / Cmd to select several)', { exact: true }).selectOption(occupation.id)
  await editor.getByLabel('Learning content', { exact: true }).selectOption({ label: title })
  await editor.getByLabel('Duration (minutes)', { exact: true }).fill('120')
  await editor.getByLabel('Package price (VND)', { exact: true }).fill('150000')
  await editor.getByRole('button', { name: 'Add skill', exact: true }).click()
  await editor.getByLabel('Skill', { exact: true }).selectOption(skill.id)
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await page.getByLabel('Search name or ID', { exact: true }).fill(title)
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  let result = await request.get(`${root}/modules?search=${encodeURIComponent(title)}`, { headers: headers('expert-a') })
  let doc = (await result.json() as { items: Doc[] }).items[0]
  expect(doc.createdBy).toBe(accountId('expert-a'))
  const contents = await (await request.get(`${root}/contents`, { headers: headers('expert-a') })).json() as { id: string; title: string }[]
  const contentId = contents.find(c => c.title === title)!.id
  const input = { title, moduleType: 'LESSON_AND_PRACTICE', contentId, duration: 120, price: 150000, occupationIds: [occupation.id], teachings: [{ skillId: skill.id, teachingFocus: 'PRIMARY', difficultyLevel: 'LOW' }] }
  const invalid = await request.post(`${root}/modules`, { headers: headers('expert-a'), data: { ...input, teachings: [] } })
  expect(invalid.status()).toBe(400)
  let response = await request.put(`${root}/modules/${doc.id}`, { headers: headers('expert-b'), data: { expectedVersion: doc.lockVersion, value: { ...input, title: `${title} revised` } } })
  expect(response.status()).toBe(200)
  const stale = await request.put(`${root}/modules/${doc.id}`, { headers: headers('expert-a'), data: { expectedVersion: doc.lockVersion, value: input } })
  expect(stale.status()).toBe(409)
  doc = await response.json() as Doc
  expect(doc.createdBy).toBe(accountId('expert-a')); expect(doc.revisions.at(-1)!.editedBy).toBe(accountId('expert-b'))
  doc = await action(request, doc, 'submit', 'expert-b')
  expect((await request.post(`${root}/modules/${doc.id}/actions`, { headers: headers('expert-a'), data: { expectedVersion: doc.lockVersion, action: 'approve' } })).status()).toBe(403)
  doc = await action(request, doc, 'return', 'ld-reviewer', 'Please review the exercise.')
  doc = await action(request, doc, 'submit', 'expert-b')
  doc = await action(request, doc, 'approve', 'ld-reviewer')
  expect(doc.revisions.at(-1)!.state).toBe('RELEASED')
  response = await request.post(`${root}/learning/${doc.id}/start`, { headers: headers('module-learner') })
  expect(response.status()).toBe(200); const pinned = await response.json() as { number: number }
  const originalRevision = pinned.number
  response = await request.put(`${root}/modules/${doc.id}`, { headers: headers('expert-a'), data: { expectedVersion: doc.lockVersion, value: { ...input, title: `${title} new release` } } })
  expect(response.status()).toBe(200); doc = await response.json() as Doc
  doc = await action(request, doc, 'submit', 'expert-a'); doc = await action(request, doc, 'approve', 'ld-reviewer')
  expect(doc.releasedRevision).not.toBe(originalRevision)
  response = await request.get(`${root}/learning/${doc.id}`, { headers: headers('module-learner') })
  expect((await response.json() as { number: number }).number).toBe(originalRevision)
  // Provide another PRIMARY option before removing this provider.
  response = await request.post(`${root}/modules`, { headers: headers('expert-a'), data: { ...input, title: `${title} alternative` } })
  expect(response.status()).toBe(201); let alternative = await response.json() as Doc
  alternative = await action(request, alternative, 'submit', 'expert-a'); await action(request, alternative, 'approve', 'ld-reviewer')
  doc = await action(request, doc, 'request-archive', 'expert-b'); doc = await action(request, doc, 'approve-archive', 'ld-reviewer')
  expect(doc.archived).toBe(true)
  response = await request.get(`${root}/learning/${doc.id}`, { headers: headers('module-learner') })
  expect(response.status()).toBe(200); expect((await response.json() as { number: number }).number).toBe(originalRevision)
  doc = await action(request, doc, 'restore', 'expert-a'); expect(doc.revisions.at(-1)!.state).toBe('DRAFT')
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  await page.getByRole('button', { name: 'Details & history', exact: true }).click()
  const details = page.getByRole('dialog', { name: 'Module details' })
  await expect(details.getByText('Change history', { exact: true })).toBeVisible()
  await expect(details.getByText(`Created by: ${accountId('expert-a')}`)).toBeVisible()
  await expect(details.getByText(`Edited by: ${accountId('expert-b')}`, { exact: false }).first()).toBeVisible()
  await details.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: `${title} new release`, exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: 'test-results/REQ-013-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Create module', exact: true }).click()
  await page.getByRole('dialog', { name: 'Module editor' }).getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await page.getByRole('dialog').count()).toBe(0)
  await page.getByRole('group', { name: 'Language selection' }).getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quản lý module học', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo module', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Chỉnh sửa module' }).getByLabel('Tên module', { exact: true })).toBeVisible()
  await page.getByRole('dialog', { name: 'Chỉnh sửa module' }).getByRole('button', { name: 'Hủy', exact: true }).click()
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: 'test-results/REQ-013-mobile-vi.png', fullPage: true })
})

test('REQ-013: cancel/delete an unused draft and submit/approve through the UI', async ({ page, request }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  const occupations = await (await request.get(`${root}/catalog/Occupation`, { headers: headers('ld-reviewer') })).json() as { id: string }[]
  const occupationId = occupations[0].id
  await request.put(`${root}/grants`, { headers: headers('ld-reviewer'), data: { expertId: accountId('expert-a'), occupationId, active: true } })
  const skills = await (await request.get(`${root}/catalog/MicroSkill`, { headers: headers('expert-a') })).json() as { id: string }[]
  const contentResponse = await request.post(`${root}/contents`, { headers: headers('expert-a'), data: { title: 'Draft lifecycle lesson', markdown: '# Practice\nVerify the result.', occupationIds: [occupationId] } })
  expect(contentResponse.status()).toBe(201)
  const content = await contentResponse.json() as { id: string }
  const input = { title: `Draft to delete ${Date.now()}`, moduleType: 'LESSON_AND_PRACTICE', contentId: content.id, duration: 60, price: 100000, occupationIds: [occupationId], teachings: [{ skillId: skills[0].id, teachingFocus: 'PRIMARY', difficultyLevel: 'MEDIUM' }] }
  let response = await request.post(`${root}/modules`, { headers: headers('expert-a'), data: input })
  expect(response.status()).toBe(201); const draft = await response.json() as Doc
  await signIn(page, '/expert/modules', 'expert-a')
  await page.getByLabel('Search name or ID', { exact: true }).fill(draft.id)
  await expect(page.getByRole('button', { name: 'Delete draft', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete draft', exact: true }).click()
  await page.getByRole('dialog', { name: 'Delete draft', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await request.get(`${root}/modules/${draft.id}`, { headers: headers('expert-a') })).status()).toBe(200)
  await page.getByRole('button', { name: 'Delete draft', exact: true }).click()
  const deleted = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes(draft.id))
  await page.getByRole('dialog', { name: 'Delete draft', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  expect((await deleted).status()).toBe(204)
  await expect(page.getByText(/No modules match this view/)).toBeVisible({ timeout: 20_000 })
  expect((await request.get(`${root}/modules/${draft.id}`, { headers: headers('expert-a') })).status()).toBe(404)
  response = await request.post(`${root}/modules`, { headers: headers('expert-a'), data: { ...input, title: `UI reviewed module ${Date.now()}` } })
  expect(response.status()).toBe(201); const review = await response.json() as Doc
  await page.getByLabel('Search name or ID', { exact: true }).fill(review.id)
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
  await page.getByRole('dialog', { name: 'Submit for review', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible({ timeout: 15_000 })
  await signIn(page, '/ld-manager/approvals', 'ld-reviewer')
  await page.getByLabel('Search name or ID', { exact: true }).fill(review.id)
  await expect(page.getByRole('button', { name: 'Approve and release', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Approve and release', exact: true }).click()
  await page.getByRole('dialog', { name: 'Approve and release', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Released', { exact: true })).toBeVisible({ timeout: 15_000 })
  expect((await request.delete(`${root}/modules/${review.id}?expectedVersion=1`, { headers: headers('expert-a') })).status()).toBe(409)
  const retired = await request.post('/api/v1/organizations/comp-technova/modules', { data: {} })
  expect(retired.status()).toBe(410)
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: 'test-results/REQ-013-desktop-review.png', fullPage: true })
})

test('REQ-013: one main login survives reload; logout removes module access', async ({ page, request }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await signIn(page, '/expert/modules', 'expert-a')
  let response = await page.request.get(`${root}/session`)
  expect(response.status()).toBe(200)
  expect((await response.json() as { id: string }).id).toBe(accountId('expert-a'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('navigation', { name: 'Learning workspace' })).toBeVisible()
  expect((await page.request.get(`${root}/session`)).status()).toBe(200)
  await page.screenshot({ path: 'test-results/REQ-013-shared-login.png', fullPage: true })
  await page.getByRole('button', { name: 'User actions menu' }).click()
  await page.getByRole('button', { name: 'Log Out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/expert/modules', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to login', exact: true })).toBeVisible()
  expect((await page.request.get(`${root}/session`)).status()).toBe(401)
  expect((await request.get(`${root}/session`, { headers: { Authorization: 'Basic ZXhwZXJ0LWE6bW9kdWxlLWxvY2FsLW9ubHk=' } })).status()).toBe(401)
})
