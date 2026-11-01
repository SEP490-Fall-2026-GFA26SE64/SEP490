import { execFileSync } from 'node:child_process'
import { expect as baseExpect, test, type Page } from '@playwright/test'
const expect = baseExpect.configure({ timeout: 30_000 })
const root = '/api/v1/module-management'
const ld = { Cookie: 'baseline_demo_persona=ld' }
const expert = { Cookie: 'baseline_demo_persona=expert-chen' }
type Doc = { id: string; createdBy: string | null; lockVersion: number; intake: { source: { contentUri: string }; acceptedBy: string }; revisions: { state: string; payload: { content: { markdown: string } } }[] }
async function login(page: Page, email: string, path: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await page.goto(path, { waitUntil: 'domcontentloaded' })
}
test('REQ-013/053: assign one imported module, receive, edit, submit and approve with source attribution', async ({ page, request }) => {
  test.setTimeout(360_000)
  await expect.poll(() => request.get('/api/v1/system/status').then(response => response.ok()).catch(() => false), { timeout: 90_000 }).toBeTruthy()
  const occupations = await (await request.get(`${root}/catalog/Occupation`, { headers: ld })).json() as { id: string }[]
  const occupationId = occupations[0].id
  const actor = await (await request.get(`${root}/session`, { headers: expert })).json() as { id: string }
  expect((await request.put(`${root}/grants`, { headers: ld, data: { expertId: actor.id, occupationId, active: true } })).status()).toBe(204)
  const skills = await (await request.get(`${root}/catalog/MicroSkill`, { headers: expert })).json() as { id: string }[]
  const id = `MOD-INTAKE-E2E-${Date.now()}`
  const title = `Imported intake ${id}`
  // Database fixture only: a new real graph node, never overwrite a seeded catalog module.
  const cypher = `CREATE (m:LearningModule {id:${JSON.stringify(id)},title:${JSON.stringify(title)},version:'0.11.0',status:'ACTIVE',reviewStatus:'NEEDS_EXPERT_REVIEW',moduleType:'LESSON_AND_PRACTICE',contentUri:'content/modules/MOD-FOCUS-SEC01-HIGH.md',contentType:'text/markdown',contentVersion:'1.0',duration:60,price:100000}) WITH m MATCH (s:MicroSkill {id:${JSON.stringify(skills[0].id)}}) CREATE (m)-[:TEACHES {id:${JSON.stringify(`EDGE-${id}`)},version:'0.11.0',status:'ACTIVE',reviewStatus:'NEEDS_EXPERT_REVIEW',teachingFocus:'PRIMARY',difficultyLevel:'HIGH'}]->(s);`
  execFileSync('docker', ['exec', '-i', 'module-authoring-test-neo4j-1', 'sh', '-c', 'exec cypher-shell -u neo4j -p "${NEO4J_AUTH#*/}"'], { input: cypher, stdio: ['pipe', 'pipe', 'pipe'] })
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await login(page, 'sarah.connor@adaptlearn.internal', '/ld-manager/modules')
  await page.getByLabel('Search name or ID', { exact: true }).fill(id)
  await expect(page.getByText('Not received', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve and release', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Assign for intake', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'Assign for intake', exact: true })
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Assign for intake', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Assign for intake', exact: true })
  await dialog.getByLabel('Responsible occupations', { exact: true }).selectOption(occupationId)
  await dialog.getByRole('button', { name: 'Assign', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Awaiting Expert intake', { exact: true })).toBeVisible()
  expect((await request.post(`${root}/catalog-modules/${id}/accept`, { headers: { Cookie: 'baseline_demo_persona=employee-a' } })).status()).toBe(403)
  await login(page, 'expert-chen@adaptlearn.internal', '/expert/modules')
  await page.getByLabel('Search name or ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Receive for editing', exact: true }).click()
  await page.getByRole('dialog', { name: 'Receive for editing', exact: true }).getByRole('button', { name: 'Receive module', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Module editor' })
  await expect(editor.getByLabel('Title', { exact: true })).toHaveValue(title)
  await editor.getByLabel('Title', { exact: true }).fill(`${title} reviewed`)
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await expect(page.getByText(`Working revision: ${title} reviewed`, { exact: true })).toBeVisible()
  let doc = await (await page.request.get(`${root}/modules/${id}`)).json() as Doc
  expect(doc.createdBy).toBeNull(); expect(doc.intake.acceptedBy).toBe(actor.id)
  expect(doc.intake.source.contentUri).toBe('content/modules/MOD-FOCUS-SEC01-HIGH.md')
  expect(doc.revisions[0].payload.content.markdown).toContain('Primary task')
  expect((await request.post(`${root}/catalog-modules/${id}/accept`, { headers: expert })).status()).toBe(409)
  await expect(page.getByRole('button', { name: 'Delete draft', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Details & history', exact: true }).click()
  const details = page.getByRole('dialog', { name: 'Module details' })
  await expect(details.getByText('Created by: Original creator unknown', { exact: true })).toBeVisible()
  await expect(details.getByText(`Received by: ${actor.id}`, { exact: false })).toBeVisible()
  await details.getByRole('button', { name: 'Close dialog' }).click()
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
  await page.getByRole('dialog', { name: 'Submit for review', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
  await login(page, 'sarah.connor@adaptlearn.internal', '/ld-manager/approvals')
  await page.getByLabel('Search name or ID', { exact: true }).fill(id)
  await page.getByRole('button', { name: 'Approve and release', exact: true }).click()
  const decision = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/modules/${id}/actions`), { timeout: 90_000 })
  await page.getByRole('dialog', { name: 'Approve and release', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  expect((await decision).status()).toBe(200)
  await expect(page.getByText('Released', { exact: true })).toBeVisible({ timeout: 90_000 })
  doc = await (await page.request.get(`${root}/modules/${id}`)).json() as Doc
  expect(doc.revisions.at(-1)?.state).toBe('RELEASED'); expect(doc.createdBy).toBeNull()
  const graph = await (await page.request.get(`${root}/module-list?search=${id}`)).json() as { items: { module: { metadata: { id: string; reviewStatus: string }; title: string } }[] }
  expect(graph.items[0].module.metadata.id).toBe(id); expect(graph.items[0].module.metadata.reviewStatus).toBe('APPROVED')
  expect(graph.items[0].module.title).toBe(`${title} reviewed`)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByLabel('Search name or ID', { exact: true }).fill(id)
  await expect(page.getByText('Released', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Details & history', exact: true }).click()
  const persisted = page.getByRole('dialog', { name: 'Module details' })
  await expect(persisted.getByText('Created by: Original creator unknown', { exact: true })).toBeVisible()
  await persisted.getByRole('button', { name: 'View original catalog record', exact: true }).click()
  const original = page.getByRole('dialog', { name: 'Catalog module details' })
  await expect(original.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await expect(original.getByText(`EDGE-${id}`, { exact: true })).toBeVisible()
  await original.getByRole('button', { name: 'Close dialog' }).click()
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.screenshot({ path: 'test-results/REQ-013-module-intake.png', fullPage: true })
})
