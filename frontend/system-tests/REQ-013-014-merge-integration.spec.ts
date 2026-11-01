import { test, expect as baseExpect, type APIRequestContext, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import type { ModuleDocument, ModuleContent } from '../src/shared/api/moduleAuthoringApi'
import type { BankView } from '../src/shared/api/questionBankApi'

const expect = baseExpect.configure({ timeout: 30_000 })
const modules = '/api/v1/module-management'
const bank = '/api/v1/question-bank'
const password = 'question-bank-test-password'
const email = (role: string, org = 'a') => `${role}${org}@question-bank.test`
async function mutate(request: APIRequestContext, path: string, data: unknown, method = 'POST') {
  const token = await request.get('/api/v1/workspace-auth/csrf')
  expect(token.ok()).toBeTruthy()
  const csrf = await token.json() as { headerName: string; token: string }
  return request.fetch(path, { method, data, headers: { [csrf.headerName]: csrf.token } })
}
async function apiLogin(request: APIRequestContext, role: string, org = 'a') {
  expect((await mutate(request, '/api/v1/workspace-auth/sign-in', { email: email(role, org), password })).status()).toBe(200)
}
async function open(page: Page, path: string) {
  await page.goto(path)
  await expect(page.getByRole('button', { name: 'User actions menu' })).toBeVisible()
}
test.beforeAll(async ({ request, baseURL }) => {
  if (!['http://localhost:8098', 'http://localhost:8099'].includes(baseURL ?? '')) return
  test.setTimeout(240_000)
  await expect.poll(async () => {
    try { return (await request.get('/api/v1/workspace-auth/csrf', { timeout: 10_000 })).status() }
    catch { return 0 }
  }, { timeout: 180_000, intervals: [1000, 3000, 5000] }).toBe(200)
})
test.beforeEach(async ({ page, baseURL }) => {
  test.skip(!['http://localhost:8098', 'http://localhost:8099'].includes(baseURL ?? ''), 'Only the disposable QuestionBankTestRuntime fixture is allowed')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

test('merged module ownership, L&D routes/review and Question Bank automatic codes persist', async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email('expert'))
  await page.getByLabel('Password', { exact: true }).fill(password)
  const signed = page.waitForResponse(response => response.url().endsWith('/workspace-auth/sign-in') && response.request().method() === 'POST', { timeout: 90_000 })
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  expect((await signed).status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Continue to workspace' })).toBeVisible()
  const title = `Merged module ${randomUUID().slice(0, 8)}`
  const contentResponse = await mutate(page.request, `${modules}/contents/lessons`, {
    title, lessons: [{ id: 'intro', title: 'Introduction', type: 'TEXT', body: '<p>Read the SQL example and explain the result before continuing.</p>', bodyFormat: 'HTML', durationSeconds: 60, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null }],
  })
  expect(contentResponse.status(), await contentResponse.text()).toBe(201)
  const content = await contentResponse.json() as ModuleContent
  const created = await mutate(page.request, `${modules}/modules`, { title, moduleType: 'LESSON_AND_PRACTICE', contentId: content.id, duration: 1, price: 1000, teachings: [{ skillId: 'QB-TEST-SQL', teachingFocus: 'PRIMARY', difficultyLevel: 'MEDIUM' }] })
  expect(created.status(), await created.text()).toBe(201)
  let document = await created.json() as ModuleDocument
  await open(page, `/expert/modules?search=${document.id}`)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Module editor' })
  await editor.getByLabel('Title', { exact: true }).fill(`${title} edited`)
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click()
  await page.getByRole('dialog', { name: 'Submit for review' }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible()

  const manager = await browser.newContext({ baseURL })
  await manager.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await apiLogin(manager.request, 'ld')
  const review = await manager.newPage()
  await open(review, '/ld-manager/approvals')
  await review.getByRole('navigation', { name: 'Learning workspace' }).getByRole('link', { name: 'Modules', exact: true }).click()
  await expect(review).toHaveURL(/\/ld-manager\/modules$/)
  await review.getByLabel('Search name or ID', { exact: true }).fill(document.id)
  await review.getByRole('button', { name: 'Details & history' }).click()
  const details = review.getByRole('dialog', { name: 'Module details' })
  await expect(details.getByText('Introduction', { exact: false }).first()).toBeVisible()
  await details.getByRole('button', { name: 'Close dialog' }).click()
  await review.getByRole('button', { name: 'Approve and release', exact: true }).click()
  await review.getByRole('dialog', { name: 'Approve and release', exact: true }).getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(review.getByText('Released', { exact: true })).toBeVisible()
  await review.reload()
  await expect(review.getByText('Released', { exact: true })).toBeVisible()
  document = await (await review.request.get(`${modules}/modules/${document.id}`)).json() as ModuleDocument
  expect(document.revisions.at(-1)?.state).toBe('RELEASED')
  expect(document.revisions.at(-1)?.decidedBy).toBeTruthy()

  const prompt = `Which SQL clause filters rows? ${randomUUID()}`
  const questionResponse = await mutate(page.request, `${bank}/questions`, { id: null, expectedRevision: null, content: { prompt, options: ['WHERE', 'ORDER BY', 'GROUP BY', 'SELECT'], correctAnswer: 0, skillId: 'QB-TEST-SQL', difficulty: 'EASY', explanation: 'WHERE filters rows before grouping.' }, acknowledgeDuplicates: false })
  expect(questionResponse.status(), await questionResponse.text()).toBe(200)
  const view = await questionResponse.json() as BankView
  const question = view.questions.find(q => q.versions.at(-1)?.content.prompt === prompt)!
  expect(question.code).toMatch(/^Q-[0-9A-F-]{36}$/)
  await open(page, '/expert/assessment-bank')
  await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(question.code)
  await page.getByTestId('question-row').filter({ hasText: question.code }).getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByText('Question updated.', { exact: true })).toBeVisible()
  await open(review, '/ld-manager/question-bank')
  await review.getByRole('textbox', { name: 'Search questions', exact: true }).fill(question.code)
  await review.getByTestId('question-row').filter({ hasText: question.code }).getByRole('button', { name: 'Details & history' }).click()
  await review.getByRole('dialog').getByRole('button', { name: 'Mark this version reviewed' }).click()
  await review.getByRole('dialog').getByRole('button', { name: 'Approve & publish' }).click()
  await expect.poll(async () => {
    const saved = await (await review.request.get(bank)).json() as BankView
    return saved.questions.find(q => q.id === question.id)?.versions.at(-1)?.state
  }).toBe('PUBLISHED')
  await review.reload()
  await expect(review.getByText('Total Bank Items', { exact: true })).toBeVisible()
  await review.screenshot({ path: 'test-results/merged-bank-manager.png', fullPage: true })
  await expect(page.getByLabel('Question code', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
  await manager.close()
})

test('peer Expert is read-only, foreign organization and Employee cannot bypass staff permissions', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const expert = await browser.newContext({ baseURL })
  const peer = await browser.newContext({ baseURL })
  const foreign = await browser.newContext({ baseURL })
  const employee = await browser.newContext({ baseURL })
  for (const [context, role, org] of [[expert, 'expert', 'a'], [peer, 'peer', 'a'], [foreign, 'expert', 'b'], [employee, 'employee', 'a']] as const) {
    await context.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await apiLogin(context.request, role, org)
  }
  const title = `Merged ownership ${randomUUID().slice(0, 8)}`
  const contentResponse = await mutate(expert.request, `${modules}/contents/lessons`, {
    title, lessons: [{ id: 'ownership', title: 'Ownership lesson', type: 'TEXT', body: '<p>Ownership isolation test lesson.</p>', bodyFormat: 'HTML', durationSeconds: 60, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null }],
  })
  expect(contentResponse.status()).toBe(201)
  const content = await contentResponse.json() as ModuleContent
  const created = await mutate(expert.request, `${modules}/modules`, { title, moduleType: 'LESSON_AND_PRACTICE', contentId: content.id, duration: 1, price: 1000, teachings: [{ skillId: 'QB-TEST-SQL', teachingFocus: 'PRIMARY', difficultyLevel: 'MEDIUM' }] })
  expect(created.status(), await created.text()).toBe(201)
  const document = await created.json() as ModuleDocument
  const page = await peer.newPage()
  await open(page, `/expert/modules?search=${document.id}`)
  await expect(page.getByRole('button', { name: 'Details & history' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Submit for review', exact: true })).toHaveCount(0)
  expect((await mutate(peer.request, `${modules}/modules/${document.id}`, { expectedVersion: document.lockVersion, value: document.revisions.at(-1)?.payload }, 'PUT')).status()).toBe(403)
  expect((await foreign.request.get(`${modules}/modules/${document.id}`)).status()).toBe(404)
  expect((await employee.request.get(bank)).status()).toBe(403)
  expect((await employee.request.get(`${modules}/modules`)).status()).toBe(403)
  const learner = await employee.newPage()
  await open(learner, '/employee/pathway')
  await expect(learner.getByTestId('empty-initial-pathway')).toBeVisible()
  await expect(learner.getByText('R4 - Learning content practice')).toHaveCount(0)
  await learner.screenshot({ path: 'test-results/merged-employee-empty.png', fullPage: true })
  for (const context of [expert, peer, foreign, employee]) await context.close()
})

test('mobile L&D navigation preserves workspace, bilingual Question Bank and viewport', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await apiLogin(page.request, 'ld')
  await open(page, '/manager/modules')
  await expect(page).toHaveURL(/\/ld-manager\/modules$/)
  const nav = page.getByRole('navigation', { name: 'Learning workspace' })
  await nav.getByRole('link', { name: 'Learning content', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Learning content', exact: true })).toBeVisible()
  await open(page, '/ld-manager/question-bank')
  await expect(page.getByText('Total Bank Items', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ngân hàng câu hỏi', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy()
  await page.screenshot({ path: 'test-results/merged-mobile-bank-vi.png', fullPage: true })
})
