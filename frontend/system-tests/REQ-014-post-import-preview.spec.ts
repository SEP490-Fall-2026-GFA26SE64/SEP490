import { test, expect, type Page } from '@playwright/test'
import type { BankContent, BankQuestion, BankView } from '../src/shared/api/questionBankApi'

async function setup(page: Page, fail = false) {
  const forbidden: string[] = [], errors: string[] = []
  let confirmations = 0
  page.on('pageerror', error => errors.push(error.message))
  const content: BankContent = { prompt: 'Existing unrelated question', options: ['Existing A', 'Existing B', 'Existing C', 'Existing D'], correctAnswer: 0, explanation: 'Existing answer key', skillId: 'skill', skillName: 'Testing', knowledgeLevel: 'FOUNDATION', mandatory: false }
  const question = (id: string, code: string, body: BankContent): BankQuestion => ({ id, code, owner: 'expert', createdBy: 'expert', createdAt: '2026-11-13T00:00:00Z', revision: 1, retired: false, request: null, versions: [{ id: id + '-v1', number: 1, state: 'DRAFT', content: body, editedBy: 'expert', editedAt: null, submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }] })
  const bank: BankView = { id: 'bank', name: 'Import fixture', questions: [question('old', 'Q-existing', content)], history: [] }
  const codes = ['Q-11111111-1111-4111-8111-111111111111', 'Q-22222222-2222-4222-8222-222222222222']
  const saved = codes.map((code, i) => question(`new-${i}`, code, { ...content, prompt: `Persisted imported question ${i + 1}`, options: [`Choice A ${i + 1}`, `Choice B ${i + 1}`, `Choice C ${i + 1}`, `Choice D ${i + 1}`], explanation: `Private explanation ${i + 1}` }))
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET' && !['/api/v1/question-bank/imports/preview', '/api/v1/question-bank/imports/confirm'].includes(path)) forbidden.push(path)
    if (path.endsWith('/workspace-auth/current')) return route.fulfill({ json: { accountId: 'expert', organizationId: 'org', email: 'expert@example.test', fullName: 'Expert', roles: ['DOMAIN_EXPERT'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: 'import-preview' } })
    if (path.endsWith('/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'test' } })
    if (path.endsWith('/subscription/access')) return route.fulfill({ json: {} })
    if (path.endsWith('/question-bank/session')) return route.fulfill({ json: { actor: { id: 'expert', organization: 'org', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'Testing' }], experts: [], people: [], knowledge: [{ skillId: 'skill', knowledgeLevel: 'FOUNDATION', outcomes: [] }], maxImportRows: 500, maxImportBytes: 10485760 } })
    if (path.endsWith('/question-bank/notifications')) return route.fulfill({ json: [] })
    if (path.endsWith('/question-bank/imports/preview')) return route.fulfill({ json: { id: 'batch', rows: saved.map(q => ({ code: q.code, content: { ...q.versions[0].content, prompt: 'File preview only' } })), errors: [], warnings: [], committed: false, expected: {}, expiresAt: '2027-01-01T00:00:00Z' } })
    if (path.endsWith('/question-bank/imports/confirm')) { confirmations++; return fail ? route.fulfill({ status: 409, json: { message: 'Import changed. Upload again.' } }) : route.fulfill({ json: { ...bank, questions: [...bank.questions, ...saved] } }) }
    if (path.endsWith('/question-bank')) return route.fulfill({ json: bank })
    return route.fulfill({ status: 404, json: { message: 'Outside isolated import preview fixture' } })
  })
  await page.goto('/workspace/import-preview/expert/assessment-bank')
  await page.getByRole('button', { name: 'Import questions', exact: true }).click()
  await page.getByLabel('Select file', { exact: true }).setInputFiles({ name: 'questions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ prompt: 'File prompt 1', skillId: 'skill' }, { prompt: 'File prompt 2', skillId: 'skill' }])) })
  await page.getByRole('button', { name: 'View as test taker', exact: true }).nth(1).click()
  const review = page.getByRole('dialog', { name: 'Review question preview', exact: true })
  await expect(review.getByRole('heading', { name: 'Review import · 2 questions', exact: true })).toBeVisible()
  await expect(review.getByRole('group', { name: 'File preview only', exact: true })).toBeVisible()
  await expect(review.getByRole('radio', { name: 'Choice A 2', exact: true })).toBeVisible()
  await expect(review.getByText('Private explanation 2', { exact: true })).toHaveCount(0)
  expect(confirmations).toBe(0)
  await review.getByRole('button', { name: 'Back to import review', exact: true }).click()
  await expect(review).toHaveCount(0)
  await page.getByRole('button', { name: 'Continue to confirmation', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View as test taker', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click()
  return { forbidden, errors, confirmations: () => confirmations }
}

for (const width of [1440, 390]) test(`Question import opens exact saved items in neutral Employee presentation at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  const state = await setup(page)
  const result = page.getByRole('dialog', { name: 'Imported questions', exact: true })
  await expect(result.getByRole('heading', { name: 'Import completed · 2 draft questions', exact: true })).toBeVisible()
  await expect(result.getByRole('group', { name: 'Persisted imported question 1', exact: true })).toBeVisible()
  await expect(result.getByText('Existing unrelated question', { exact: true })).toHaveCount(0)
  await expect(result.getByText('File preview only', { exact: true })).toHaveCount(0)
  await expect(result.getByText('Private explanation 1', { exact: true })).toHaveCount(0)
  await result.getByRole('radio', { name: 'Choice A 1', exact: true }).check()
  await expect(result.getByRole('radio', { name: 'Choice A 1', exact: true })).toBeChecked()
  await expect(result.getByText('Private explanation 1', { exact: true })).toHaveCount(0)
  await result.getByRole('button', { name: 'Answer key & explanation — staff only', exact: true }).click()
  await expect(result.getByText('Private explanation 1', { exact: true })).toBeVisible()
  await result.getByRole('button', { name: 'Next question', exact: true }).click()
  await expect(result.getByRole('group', { name: 'Persisted imported question 2', exact: true })).toBeVisible()
  await expect(result.getByText('Private explanation 2', { exact: true })).toHaveCount(0)
  await result.getByRole('button', { name: 'Mobile', exact: true }).click()
  expect((await result.locator('[data-question-preview-viewport="mobile"]').boundingBox())!.width).toBeLessThanOrEqual(390)
  await result.getByRole('button', { name: 'Open full preview', exact: true }).click()
  const full = page.getByRole('dialog', { name: 'View as test taker', exact: true })
  await expect(full.getByRole('group', { name: 'Persisted imported question 2', exact: true })).toBeVisible()
  await full.getByRole('button', { name: 'Close dialog', exact: true }).click()
  expect(await result.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  if (width === 1440) await page.screenshot({ path: '/tmp/sep490-post-import-questions.png' })
  await result.getByRole('button', { name: 'Back to question bank', exact: true }).click()
  await expect(result).toHaveCount(0)
  expect(state.confirmations()).toBe(1)
  expect(state.forbidden).toEqual([])
  expect(state.errors).toEqual([])
})

test('failed question confirmation preserves the import and does not show a saved-content preview', async ({ page }) => {
  await setup(page, true)
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Import changed. Upload again.')
  await expect(page.getByRole('dialog', { name: 'Imported questions', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Confirm import', exact: true })).toBeVisible()
})
