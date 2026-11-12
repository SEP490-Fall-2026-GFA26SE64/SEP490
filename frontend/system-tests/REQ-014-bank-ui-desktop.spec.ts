import { test, expect, type Page } from '@playwright/test'
import type { BankSession, BankView } from '../src/shared/api/questionBankApi'
import { mkdirSync } from 'node:fs'
import * as XLSX from 'xlsx'

const root = '/api/v1/question-bank'
const artifacts = 'documents/testing/system/assets/assessment-bank-ui-refinement-final-20261110'
async function signIn(page: Page, email = 'expert@technova.com') {
  const request = page.context().request
  const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
  expect((await request.post('/api/v1/workspace-auth/sign-in', {
    data: { email, password: process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!' },
    headers: { [csrf.headerName]: csrf.token },
  })).status()).toBe(200)
}
async function capture(page: Page, name: string) {
  const folder = '../' + artifacts + (test.info().title.includes('real draft') ? '/real-api' : '/' + page.viewportSize()!.width)
  mkdirSync(folder, { recursive: true })
  await page.screenshot({ path: folder + '/' + name + '.png', fullPage: name.includes('directory') })
}

test('desktop real draft save and staged import persist without publication', async ({ page }) => {
  test.setTimeout(300000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await signIn(page)
  const sessionResponse = await page.request.get(root + '/session', { timeout: 60000 })
  expect(sessionResponse.status(), 'Real Question Bank session must be available').toBe(200)
  const session = await sessionResponse.json() as BankSession
  // Replay the real session snapshot to avoid duplicate expensive catalog reads in React StrictMode.
  // Draft/import writes and persisted-bank assertions below remain real API calls.
  await page.route('**/api/v1/question-bank/session', route => route.fulfill({ json: session }))
  const skill = session.skills[0]
  expect(skill).toBeTruthy()
  await page.goto('/workspace/workspace-development/expert/assessment-bank')
  await expect(page.getByRole('table', { name: 'Question Bank Directory' })).toBeVisible({ timeout: 45000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await capture(page, 'directory')
  await page.getByRole('button', { name: 'Create question', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const marker = 'UI-R2-' + Date.now()
  await dialog.getByLabel('Question prompt', { exact: true }).fill(marker + ' incomplete draft')
  await dialog.getByLabel('MicroSkill', { exact: true }).selectOption(skill.id)
  await expect(dialog.getByRole('complementary', { name: 'Question preview' })).toContainText(marker)
  await page.keyboard.press('Tab')
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await capture(page, 'draft-editor')
  await dialog.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(dialog).toHaveCount(0, { timeout: 45000 })
  let bank = await (await page.request.get(root)).json() as BankView
  const saved = bank.questions.find(q => q.versions.at(-1)?.content.prompt === marker + ' incomplete draft')!
  expect(saved).toBeTruthy()
  expect(saved.versions.at(-1)?.state).toBe('DRAFT')
  expect(saved.versions.at(-1)?.content.correctAnswer).toBeNull()
  expect(saved.versions.at(-1)?.content.knowledgeLevel).toBeNull()
  await page.getByRole('button', { name: 'Import questions', exact: true }).click()
  await capture(page, 'import-upload')
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ prompt: marker + ' imported draft', skillId: skill.id, optionA: 'One', optionB: 'Two', optionC: 'Three', optionD: 'Four', correctAnswer: 'A', knowledgeLevel: '', mandatory: 'false', explanation: '' }]), 'Questions')
  await dialog.getByLabel('Select file', { exact: true }).setInputFiles({ name: 'ui-r2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) })
  await expect(dialog.getByRole('heading', { name: 'Review your questions' })).toBeVisible({ timeout: 45000 })
  await expect(dialog.getByRole('button', { name: 'Confirm import', exact: true })).toHaveCount(0, { timeout: 45000 })
  const ack = dialog.getByRole('checkbox')
  if (await ack.count()) await ack.check()
  await capture(page, 'import-review')
  await dialog.getByRole('button', { name: 'Continue to confirmation' }).click()
  await expect(dialog.getByRole('heading', { name: 'Ready to create drafts' })).toBeVisible({ timeout: 45000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(dialog.getByRole('list', { name: 'Import progress' })).toBeVisible()
  const stepperBounds = await dialog.getByRole('list', { name: 'Import progress' }).boundingBox()
  expect(stepperBounds && stepperBounds.y >= 0 && stepperBounds.y + stepperBounds.height < 900).toBeTruthy()
  await capture(page, 'import-confirm')
  await dialog.getByRole('button', { name: 'Confirm import', exact: true }).click()
  await expect(dialog).toHaveCount(0, { timeout: 45000 })
  await page.reload()
  await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(marker)
  await expect(page.getByTestId('question-row')).toHaveCount(2)
  bank = await (await page.request.get(root)).json() as BankView
  expect(bank.questions.filter(q => q.versions.at(-1)?.content.prompt.startsWith(marker)).every(q => q.versions.at(-1)?.state === 'DRAFT')).toBe(true)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByRole('textbox', { name: 'Search questions' })).toHaveValue('')
  expect(errors).toEqual([])
})

for (const width of [1440, 768, 390]) {
test(`presentation at ${width}px: live preview, draft and import controls, errors and manager actions`, async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width, height: 900 })
  await signIn(page)
  const session: BankSession = { actor: { id: 'expert', organization: 'ui-fixture', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'Design accessible user interfaces' }], knowledge: [{ skillId: 'skill', knowledgeLevel: 'FOUNDATION', outcomes: [] }], experts: [{ id: 'expert', name: 'Alex Morgan' }], people: [{ id: 'expert', name: 'Alex Morgan' }], maxImportBytes: 10485760, maxImportRows: 500 }
  const content = { prompt: 'Which approach ensures a keyboard user can reach and activate every interactive control?', options: ['Provide a visible focus indicator and logical tab order', 'Use hover interactions for every action', 'Remove the focus outline', 'Make all elements keyboard shortcuts'], skillId: 'skill', skillName: 'Design accessible user interfaces', correctAnswer: 0, knowledgeLevel: 'FOUNDATION', mandatory: false, explanation: 'A visible focus indicator and logical tab order help keyboard users understand and operate the interface.' }
  let bank: BankView = { id: 'ui-bank', name: 'UI fixture', history: [], questions: [{ id: 'q', code: 'QB-UI-001', owner: 'expert', createdBy: 'expert', createdAt: null, revision: 1, retired: false, request: null, versions: [{ id: 'v', number: 1, state: 'DRAFT', content, editedBy: null, editedAt: null, submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }] }] }
  await page.route('**/api/v1/question-bank**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/session')) return route.fulfill({ json: session })
    if (path.endsWith('/notifications')) return route.fulfill({ json: [] })
    if (path.endsWith('/questions')) { const data = route.request().postDataJSON(); bank = { ...bank, questions: [...bank.questions, { ...bank.questions[0], id: 'saved', code: 'QB-UI-002', versions: [{ ...bank.questions[0].versions[0], content: data.content }] }] }; return route.fulfill({ json: bank }) }
    if (path.endsWith('/imports/confirm')) return route.fulfill({ json: bank })
    if (path.endsWith('/preview')) return route.fallback()
    return route.fulfill({ json: bank })
  })
  let warnings = false
  await page.route('**/api/v1/question-bank/imports/preview', route => route.fulfill({ json: { id: 'ui-preview', rows: [{ code: 'PREVIEW-1', content: { prompt: 'Preview question', skillId: 'skill', options: [], correctAnswer: null, knowledgeLevel: null, mandatory: false } }], errors: warnings ? [] : ['Row 1: invalid skillId'], warnings: warnings ? ['Missing correct answer'] : [], expiresAt: new Date(Date.now() + 600000).toISOString(), committed: false, expected: {} } }))
  await page.goto('/workspace/workspace-development/expert/assessment-bank')
  await expect(page.getByRole('table', { name: 'Question Bank Directory' })).toBeVisible({ timeout: 45000 })
  await capture(page, 'directory')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Create question', exact: true }).click()
  const editor = page.getByRole('dialog')
  await editor.getByLabel('Question prompt', { exact: true }).fill(' ')
  await editor.getByLabel('Question prompt', { exact: true }).press('Tab')
  await expect(editor.getByText('Enter a question prompt to save a draft.', { exact: true })).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled()
  await editor.getByLabel('Question prompt', { exact: true }).fill(content.prompt)
  await editor.getByLabel('Option A', { exact: true }).fill(content.options[0])
  await editor.getByRole('radio', { name: 'Correct answer A', exact: true }).check()
  await editor.getByRole('radio', { name: 'Correct answer A', exact: true }).press('ArrowDown')
  await expect(editor.getByRole('radio', { name: 'Correct answer B', exact: true })).toBeChecked()
  await editor.getByRole('radio', { name: 'Correct answer B', exact: true }).press('ArrowUp')
  await editor.getByLabel('MicroSkill', { exact: true }).selectOption('skill')
  if (width < 1024) {
    await expect(editor.getByRole('button', { name: 'Live preview', exact: true })).toHaveAttribute('aria-expanded', 'false')
    await editor.getByRole('button', { name: 'Live preview', exact: true }).click()
  }
  await expect(editor.getByRole('complementary', { name: 'Question preview' })).toContainText(content.prompt)
  await page.keyboard.press('Tab')
  expect(await editor.evaluate(el => el.contains(document.activeElement))).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const footer = await editor.getByRole('button', { name: 'Save draft', exact: true }).boundingBox()
  expect(footer && footer.y + footer.height <= 900).toBeTruthy()
  await capture(page, 'draft-editor')
  await editor.getByLabel('Answer explanation', { exact: true }).scrollIntoViewIfNeeded()
  const lastField = await editor.getByLabel('Answer explanation', { exact: true }).boundingBox()
  expect(lastField && footer && lastField.y + lastField.height <= footer.y).toBeTruthy()
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(editor).toHaveCount(0, { timeout: 45000 })
  await page.getByRole('button', { name: 'Import questions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await capture(page, 'import-upload')
  const file = { name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ prompt: 'Preview question', skillId: 'skill' }])) }
  const dropped = await page.evaluateHandle(() => { const data = new DataTransfer(); data.items.add(new File([JSON.stringify([{ prompt: 'Preview question', skillId: 'skill' }])], 'test.json', { type: 'application/json' })); return data })
  await dialog.getByText('Drag and drop your file here').dispatchEvent('drop', { dataTransfer: dropped })
  await expect(dialog.getByRole('heading', { name: 'Resolve errors before continuing' })).toBeVisible({ timeout: 45000 })
  await expect(dialog.getByRole('alert')).toContainText('JSON item 1: invalid skillId')
  await expect(dialog.getByRole('button', { name: 'Continue to confirmation' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  warnings = true
  await dialog.getByLabel('Select file', { exact: true }).setInputFiles(file)
  await expect(dialog.getByRole('heading', { name: 'Warnings to review' })).toBeVisible({ timeout: 45000 })
  await expect(dialog.getByRole('button', { name: 'Continue to confirmation' })).toBeDisabled()
  await capture(page, 'import-review')
  await dialog.getByRole('checkbox').check()
  await expect(dialog.getByRole('button', { name: 'Continue to confirmation' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Continue to confirmation' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(dialog.getByRole('list', { name: 'Import progress' })).toBeVisible()
  const stepperBounds = await dialog.getByRole('list', { name: 'Import progress' }).boundingBox()
  expect(stepperBounds && stepperBounds.y >= 0 && stepperBounds.y + stepperBounds.height < 900).toBeTruthy()
  await capture(page, 'import-confirm')
  await dialog.getByRole('button', { name: 'Confirm import', exact: true }).click()
  await expect(dialog).toHaveCount(0, { timeout: 45000 })
  await page.getByRole('textbox', { name: 'Search questions' }).fill('no-results-' + Date.now())
  await expect(page.getByText('No questions match this view', { exact: true })).toBeVisible({ timeout: 45000 })
  await signIn(page, 'manager@technova.com')
  session.actor = { ...session.actor, id: 'ld', role: 'LD_MANAGER' }
  await page.goto('/workspace/workspace-development/ld-manager/question-bank')
  await expect(page.getByRole('table', { name: 'Question Bank Directory' })).toBeVisible({ timeout: 45000 })
  await expect(page.getByRole('button', { name: 'Create question', exact: true })).toHaveCount(0, { timeout: 45000 })
  await expect(page.getByRole('button', { name: 'Import questions', exact: true })).toHaveCount(0, { timeout: 45000 })
  await capture(page, 'manager-directory')
})

}
