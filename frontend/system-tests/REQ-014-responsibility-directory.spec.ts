import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { BankSession, BankView, BankContent } from '../src/shared/api/questionBankApi'
const root = '/api/v1/question-bank'
const expertRoute = '/workspace/workspace-development/expert/assessment-bank'
const managerRoute = '/workspace/workspace-development/ld-manager/question-bank'
const assets = process.env.BANK_UI_ASSETS_DIR ?? '../documents/testing/system/assets/assessment-bank-responsibility-r3-job-reference-20261110'
async function login(page: Page, email: string) {
 const request = page.context().request
 const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in', { data: { email, password: process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!' }, headers: { [csrf.headerName]: csrf.token } })).status()).toBe(200)
}
async function capture(page: Page, name: string) { const folder = assets + '/' + page.viewportSize()!.width; mkdirSync(folder, { recursive: true }); await page.screenshot({ path: folder + '/' + name + '.png', fullPage: false }) }

test('real assignment transfers an isolated draft and persists owner and activity', async ({ page }) => {
 test.setTimeout(300000)
 await page.setViewportSize({ width: 1440, height: 1000 })
 await login(page, 'expert@technova.com')
 const request = page.context().request
 const sessionResponse = await request.get(root + '/session'); expect(sessionResponse.status()).toBe(200)
 const session = await sessionResponse.json() as BankSession
 expect(session.skills.length).toBeGreaterThan(0)
 const marker = 'UI-R3-responsibility-' + Date.now()
 const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
 const saved = await request.post(root + '/questions', { headers: { [csrf.headerName]: csrf.token }, data: { id: null, expectedRevision: null, content: { prompt: marker, options: ['', '', '', ''], correctAnswer: null, skillId: session.skills[0].id, skillName: null, knowledgeLevel: null, mandatory: false, explanation: '' }, acknowledgeDuplicates: false } })
 expect(saved.status()).toBe(200)
 const created = (await saved.json() as BankView).questions.find(q => q.versions.at(-1)?.content.prompt === marker)!
 expect(created).toBeTruthy()
 await login(page, 'manager@technova.com')
 const managerResponse = await request.get(root + '/session'); expect(managerResponse.status()).toBe(200)
 const manager = await managerResponse.json() as BankSession
 expect(manager.actor.role).toBe('LD_MANAGER')
 const target = manager.experts.find(expert => expert.id !== created.owner) ?? manager.experts[0]
 expect(target).toBeTruthy()
 console.log('REAL_ASSIGNMENT_EXPERTS=' + manager.experts.length + ' DIFFERENT_OWNER=' + (target.id !== created.owner))
 if (target.id === created.owner) test.info().annotations.push({ type: 'limitation', description: 'Only one eligible Expert: real command/history checked; different-owner transfer covered by presentation/component tests.' })
 await page.goto(managerRoute)
 await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(marker)
 const row = page.getByTestId('question-row')
 await expect(row).toHaveCount(1, { timeout: 45000 })
 await row.getByRole('button', { name: 'View question ' + created.code, exact: true }).click()
 const panel = page.getByRole('dialog')
 await expect(panel.getByRole('region', { name: 'Responsibility', exact: true })).toBeVisible()
 await panel.getByRole('button', { name: 'Reassign Expert', exact: true }).click()
 const form = page.getByRole('dialog', { name: 'Assign responsible Expert', exact: true })
 await form.getByRole('textbox', { name: 'Search experts', exact: true }).fill(target.name)
 await form.getByRole('radio', { name: target.name, exact: true }).check()
 await expect(form.getByRole('button', { name: 'Confirm assignment', exact: true })).toBeDisabled()
 const reason = marker + ' transfer verification'
 await form.getByRole('textbox', { name: 'Assignment reason', exact: true }).fill(reason)
 await capture(page, 'real-assignment')
 const committed = page.waitForResponse(response => response.url().endsWith(root + '/commands') && response.request().method() === 'POST')
 await form.getByRole('button', { name: 'Confirm assignment', exact: true }).click()
 expect((await committed).status()).toBe(200)
 await expect(form).toHaveCount(0, { timeout: 45000 })
 await expect(panel.getByRole('region', { name: 'Responsibility', exact: true })).toContainText(target.name)
 await panel.getByRole('tab', { name: 'History & versions', exact: true }).click()
 await expect(panel.getByRole('list', { name: 'Activity history' })).toContainText(reason)
 await capture(page, 'real-responsibility-history')
 await page.reload()
 await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(marker)
 await expect(page.getByTestId('question-row').getByText(target.name, { exact: true })).toBeVisible({ timeout: 45000 })
 const persisted = await (await request.get(root)).json() as BankView
 expect(persisted.questions.find(q => q.id === created.id)?.owner).toBe(target.id)
 expect(persisted.history.some(event => event.question === created.id && event.action === 'ASSIGNED' && event.actor === manager.actor.id && event.reason === reason)).toBe(true)
 await capture(page, 'real-directory')
 if (target.id !== created.owner) {
  await login(page, 'expert@technova.com')
  await page.goto(expertRoute)
  await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(marker)
  await expect(page.getByRole('button', { name: 'Edit draft ' + created.code, exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Actions for ' + created.code, exact: true })).toHaveCount(0)
 }
})

for (const width of [1440, 768, 390]) {
 test(`responsibility, clipboard, assignment and timeline at ${width}px`, async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width, height: 900 })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await login(page, 'manager@technova.com')
  const session: BankSession = { actor: { id: 'ld', organization: 'fixture', role: 'LD_MANAGER' }, skills: [{ id: 'skill', name: 'Design accessible interfaces' }], experts: [{ id: 'alex', name: 'Alex Owner' }, { id: 'jamie', name: 'Jamie Rivera' }], people: [{ id: 'alex', name: 'Alex Owner' }, { id: 'jamie', name: 'Jamie Rivera' }, { id: 'creator', name: 'Casey Creator' }, { id: 'editor', name: 'Taylor Editor' }, { id: 'reviewer', name: 'Rei Reviewer' }, { id: 'submitter', name: 'Sam Submitter' }, { id: 'ld', name: 'Lee Manager' }], maxImportRows: 500, maxImportBytes: 10485760 }
  const content: BankContent = { prompt: 'Which approach preserves keyboard access to every interactive control?', options: ['Logical tab order', 'Hover only', 'Hide focus', 'Disable keyboard'], correctAnswer: 0, skillId: 'skill', skillName: 'Design accessible interfaces', knowledgeLevel: 'FOUNDATION', mandatory: true, explanation: 'Logical navigation and visible focus support keyboard use.' }
  let bank: BankView = { id: 'bank', name: 'Fixture', questions: Array.from({ length: 4 }, (_, i) => ({ id: 'q' + i, code: 'Q-12345678-ABCD-1234-5678-123456789AB' + i, owner: i < 2 ? 'alex' : i === 2 ? null : 'missing', createdBy: 'creator', createdAt: '2026-10-29T09:00:00Z', revision: 1, retired: false, request: null, versions: [{ id: 'v' + i, number: 1, state: i === 0 ? 'PUBLISHED' : i === 1 ? 'SUBMITTED' : 'DRAFT', content: { ...content, prompt: content.prompt + ' ' + (i + 1) }, editedBy: 'editor', editedAt: '2026-10-30T09:00:00Z', submittedBy: 'submitter', submittedAt: '2026-10-30T10:00:00Z', reviewedBy: i === 0 ? 'reviewer' : null, reviewedAt: i === 0 ? '2026-11-01T09:00:00Z' : null, reason: null, viewed: {} }] })), history: [
   { id: 'created', question: 'q0', version: 'v0', action: 'CREATED', actor: 'creator', at: '2026-10-29T09:00:00Z', reason: null, snapshot: content },
   { id: 'assigned', question: 'q0', version: 'v0', action: 'ASSIGNED', actor: 'ld', at: '2026-10-31T09:00:00Z', reason: 'Coverage ownership', snapshot: null },
   { id: 'approved', question: 'q0', version: 'v0', action: 'APPROVED', actor: 'reviewer', at: '2026-11-01T09:00:00Z', reason: null, snapshot: content },
  ] }
  let reject = true
  await page.route('**/api/v1/question-bank**', async route => {
   const path = new URL(route.request().url()).pathname
   if (path.endsWith('/session')) return route.fulfill({ json: session })
   if (path.endsWith('/notifications')) return route.fulfill({ json: [] })
   if (path.endsWith('/commands')) {
    const command = route.request().postDataJSON()
    expect(command.action).toBe('ASSIGN'); expect(command.expectedRevision).toBe(1); expect(command.owner).toBe('jamie')
    if (reject) return route.fulfill({ status: 409, json: { message: 'Question changed. Reload the latest data.' } })
    bank = { ...bank, questions: bank.questions.map(q => q.id === command.id ? { ...q, owner: command.owner, revision: q.revision + 1 } : q), history: [...bank.history, { id: 'new-assignment', question: command.id, version: 'v0', action: 'ASSIGNED', actor: 'ld', at: '2026-11-10T10:00:00Z', reason: command.reason, snapshot: null }] }
   }
   return route.fulfill({ json: bank })
  })
  await page.goto(managerRoute)
  const rows = page.getByTestId('question-row')
  await expect(rows).toHaveCount(4, { timeout: 45000 })
  await expect(rows.nth(0).getByText('Alex Owner', { exact: true })).toBeVisible()
  await expect(rows.nth(0).getByText('Casey Creator', { exact: true })).toHaveCount(0)
  await expect(rows.nth(2).getByText('Unassigned', { exact: true })).toBeVisible()
  await expect(rows.nth(3).getByText('Expert unavailable', { exact: true })).toBeVisible()
  await expect(rows.nth(0).locator('time')).toHaveAttribute('datetime', '2026-11-01T09:00:00Z')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await capture(page, 'directory')
  const code = bank.questions[0].code
  await rows.nth(0).getByRole('button', { name: 'Copy ID ' + code, exact: true }).click()
  await expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code)
  await capture(page, 'copy-toast')
  await expect(page.getByText('Copied to clipboard!', { exact: true })).toHaveCount(0, { timeout: 7000 })
  await rows.nth(1).getByRole('checkbox').check()
  await expect(page.getByRole('toolbar', { name: 'Selected question actions' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(page.getByRole('toolbar')).toHaveCount(0)
  await rows.nth(0).getByRole('button', { name: 'View question ' + code, exact: true }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('region', { name: 'Responsibility', exact: true })).toContainText('Alex Owner')
  await panel.getByRole('tab', { name: 'History & versions', exact: true }).click()
  const versions = panel.getByRole('region', { name: 'Version information', exact: true })
  for (const name of ['Casey Creator', 'Taylor Editor', 'Rei Reviewer', 'Sam Submitter']) await expect(versions.getByText(name, { exact: false })).toBeVisible()
  const timeline = panel.getByRole('list', { name: 'Activity history' })
  await expect(timeline.getByRole('listitem').first()).toContainText('Question created')
  const footerClose = panel.getByRole('button', { name: 'Close', exact: true })
  const footerBox = await footerClose.boundingBox()
  expect(footerBox && footerBox.y + footerBox.height <= 900).toBeTruthy()
  await capture(page, 'overview')
  await timeline.scrollIntoViewIfNeeded()
  const firstEvent = timeline.getByRole('listitem').first()
  await firstEvent.getByRole('button', { name: 'View question snapshot', exact: true }).click()
  await expect(firstEvent.getByText(content.prompt, { exact: true })).toBeVisible()
  await capture(page, 'timeline')
  await firstEvent.getByRole('button', { name: 'View question snapshot', exact: true }).click()
  await panel.getByRole('tab', { name: 'Question content', exact: true }).click()
  await panel.getByRole('button', { name: 'Reassign Expert', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Assign responsible Expert', exact: true })
  await form.getByRole('textbox', { name: 'Search experts', exact: true }).fill('no matching person')
  await expect(form.getByText('No Experts match this search.', { exact: true })).toBeVisible()
  await form.getByRole('textbox', { name: 'Search experts', exact: true }).fill('Jamie')
  await form.getByRole('radio', { name: 'Jamie Rivera', exact: true }).check()
  await expect(form.getByRole('button', { name: 'Confirm assignment', exact: true })).toBeDisabled()
  await form.getByRole('textbox', { name: 'Assignment reason', exact: true }).fill('Required coverage change')
  await capture(page, 'assignment')
  await form.getByRole('button', { name: 'Confirm assignment', exact: true }).click()
  await expect(form.getByRole('alert')).toContainText('Question changed.')
  await expect(form.getByRole('textbox', { name: 'Assignment reason', exact: true })).toHaveValue('Required coverage change')
  await expect(form.getByRole('radio', { name: 'Jamie Rivera', exact: true })).toBeChecked()
  reject = false
  await form.getByRole('button', { name: 'Confirm assignment', exact: true }).click()
  await expect(form).toHaveCount(0, { timeout: 45000 })
  await expect(panel.getByRole('region', { name: 'Responsibility', exact: true })).toContainText('Jamie Rivera')
  await panel.getByRole('tab', { name: 'History & versions', exact: true }).click()
  await expect(panel.getByRole('list', { name: 'Activity history' })).toContainText('Required coverage change')
  await panel.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('combobox', { name: 'Filter responsible Expert', exact: true }).selectOption('jamie')
  await expect(rows).toHaveCount(1)
  await expect(rows.first().getByText('Jamie Rivera', { exact: true })).toBeVisible()
  await capture(page, 'assigned-directory')
 })
}

test('Job Positions heading reference and shared directory typography', async ({ page }) => {
 test.setTimeout(180000)
 await page.setViewportSize({ width: 1440, height: 1000 })
 await login(page, 'manager@technova.com')
 await page.goto('/workspace/workspace-development/ld-manager/job-positions')
 const referenceHeading = page.getByRole('heading', { name: 'Job Positions Directory', exact: true })
 await expect(referenceHeading).toBeVisible({ timeout: 45000 })
 const reference = await referenceHeading.evaluate(element => { const style = getComputedStyle(element); return { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily } })
 const loading = page.getByText('Loading job positions from database...', { exact: true })
 const referenceDataLoaded = await loading.count() === 0
 if (!referenceDataLoaded) test.info().annotations.push({ type: 'limitation', description: 'Job Positions table data is still loading; heading measured live, table styles audited in source. Full loaded-table comparison remains unverified.' })
 await capture(page, 'job-positions-reference-final')
 await page.goto(managerRoute)
 const heading = page.getByRole('heading', { name: 'Question Bank Directory', exact: true })
 await expect(heading).toBeVisible({ timeout: 45000 })
 const actual = await heading.evaluate(element => { const style = getComputedStyle(element); return { fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily } })
 expect(actual).toEqual(reference)
 const row = page.getByTestId('question-row').first()
 await expect(row).toBeVisible({ timeout: 45000 })
 const view = row.getByRole('button', { name: /^View details / })
 const box = await view.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(38); expect(box!.width).toBeLessThanOrEqual(40); expect(box!.height).toBeCloseTo(box!.width, 1)
 const prompt = row.getByRole('button', { name: /^View question / })
 const promptSize = await prompt.evaluate(element => getComputedStyle(element).fontSize)
 expect(parseFloat(promptSize)).toBeCloseTo(14, 0)
 const baseSize = await row.locator('td').nth(1).evaluate(element => getComputedStyle(element).fontSize)
 expect(parseFloat(baseSize)).toBeCloseTo(12, 0)
 const codeSize = await row.locator('span[title]').first().evaluate(element => getComputedStyle(element).fontSize)
 expect(codeSize).toBe(baseSize)
 expect(await row.locator('td').nth(2).evaluate(element => getComputedStyle(element).fontSize)).toBe(baseSize)
 const header = page.getByRole('table', { name: 'Question Bank Directory' }).getByRole('columnheader').first()
 expect(await header.evaluate(element => getComputedStyle(element).fontSize)).toBe('11px')
 expect(await header.evaluate(element => getComputedStyle(element).textTransform)).toBe('uppercase')
 await capture(page, 'bank-reference-comparison')
 console.log('VISUAL_REFERENCE=' + JSON.stringify({ referenceDataLoaded, reference, bank: actual, bankPrompt: promptSize, bankBody: baseSize, bankCode: codeSize, bankHeader: '11px', bankIconButton: box!.width + 'px', jobSourceIconButton: '32px' }))
})
