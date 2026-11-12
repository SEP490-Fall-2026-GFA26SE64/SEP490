import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { BankSession, BankView, BankContent } from '../src/shared/api/questionBankApi'
const api = '/api/v1/question-bank'
const managerRoute = '/workspace/workspace-development/ld-manager/question-bank'
const expertRoute = '/workspace/workspace-development/expert/assessment-bank'
const assets = process.env.BANK_UI_ASSETS_DIR ?? '../documents/testing/system/assets/assessment-bank-details-r4-20261110'
let errors: string[] = []
test.beforeEach(({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)) })
test.afterEach(() => expect(errors).toEqual([]))
async function login(page: Page, manager: boolean) {
 const request = page.context().request
 const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in', { data: { email: manager ? 'manager@technova.com' : 'expert@technova.com', password: process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!' }, headers: { [csrf.headerName]: csrf.token } })).status()).toBe(200)
}
async function capture(page: Page, name: string) { const folder = assets + '/' + page.viewportSize()!.width; mkdirSync(folder, { recursive: true }); await page.screenshot({ path: folder + '/' + name + '.png' }) }
async function fixture(page: Page, manager = true) {
 const session: BankSession = { actor: { id: manager ? 'ld' : 'expert', organization: 'fixture', role: manager ? 'LD_MANAGER' : 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'Design accessible interfaces' }], experts: [{ id: 'expert', name: 'Alex Owner' }, { id: 'jamie', name: 'Jamie Rivera' }], people: [{ id: 'expert', name: 'Alex Owner' }, { id: 'creator', name: 'Casey Creator' }, { id: 'editor', name: 'Taylor Editor' }, { id: 'ld', name: 'Lee Manager' }], maxImportRows: 500, maxImportBytes: 10485760 }
 const content: BankContent = { prompt: 'How should a product team preserve keyboard access when an answer contains detailed guidance?\n' + 'Explain a logical navigation order and visible focus. '.repeat(6), options: ['Reference-' + 'X'.repeat(160) + '\n' + 'Keep every interactive control reachable with a visible focus indicator. '.repeat(12), 'Use hover only.', 'Hide focus indicators.', 'Disable keyboard input.'], correctAnswer: 0, skillId: 'skill', skillName: 'Design accessible interfaces', knowledgeLevel: 'INTERMEDIATE', mandatory: true, explanation: null }
 const historical = { ...content, prompt: 'Earlier recorded question content', options: ['Old A', 'Old B', 'Old correct answer', 'Old D'], correctAnswer: 2, mandatory: false }
 const version = { id: 'v1', number: 1, state: 'PUBLISHED' as const, content: historical, editedBy: 'creator', editedAt: '2026-10-29T09:00:00Z', submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }
 const bank: BankView = { id: 'fixture', name: 'Fixture', questions: [{ id: 'q', code: 'Q-12345678-ABCD-1234-5678-123456789ABC', owner: 'expert', createdBy: 'creator', createdAt: '2026-10-29T09:00:00Z', revision: 1, retired: false, request: null, versions: [version, { ...version, id: 'v2', number: 2, state: manager ? 'SUBMITTED' : 'DRAFT', content, editedBy: 'editor', editedAt: '2026-11-01T09:00:00Z', submittedBy: manager ? 'expert' : null, submittedAt: manager ? '2026-11-02T09:00:00Z' : null }] }], history: [
  { id: 'created', question: 'q', version: 'v1', action: 'CREATED', actor: 'creator', at: '2026-10-29T09:00:00Z', reason: null, snapshot: historical },
  { id: 'approved', question: 'q', version: 'v1', action: 'APPROVED', actor: 'ld', at: '2026-10-30T09:00:00Z', reason: null, snapshot: historical },
  { id: 'edited', question: 'q', version: 'v2', action: 'EDITED', actor: 'editor', at: '2026-11-01T09:00:00Z', reason: null, snapshot: content },
  { id: 'submitted', question: 'q', version: 'v2', action: 'SUBMITTED', actor: 'expert', at: '2026-11-02T09:00:00Z', reason: null, snapshot: content },
  { id: 'assigned', question: 'q', version: 'v2', action: 'ASSIGNED', actor: 'ld', at: '2026-11-03T09:00:00Z', reason: 'Coverage responsibility confirmed.', snapshot: null },
 ] }
 const controls = { bank, session, commands: [] as string[], failNext: false }
 await page.route('**/api/v1/question-bank**', async route => {
  const path = new URL(route.request().url()).pathname
  if (path.endsWith('/session')) return route.fulfill({ json: session })
  if (path.endsWith('/notifications')) return route.fulfill({ json: [] })
  if (path.endsWith('/commands')) {
   const command = route.request().postDataJSON(); const q = bank.questions[0]; const v = q.versions.at(-1)!
   controls.commands.push(command.action)
   expect(command.expectedRevision).toBe(q.revision)
   if (controls.failNext) { controls.failNext = false; return route.fulfill({ status: 409, json: { message: 'Question changed. Reload the latest data.' } }) }
   if (command.action === 'VIEW') v.viewed = { [session.actor.id]: v.id }
   else if (command.action === 'SUBMIT') { expect(command.reason).toBe(''); expect(command.owner).toBeNull(); v.state = 'SUBMITTED' }
   else if (command.action === 'APPROVE') { expect(v.viewed[session.actor.id]).toBe(v.id); expect(command.reason).toBe(''); expect(command.owner).toBeNull(); v.state = 'PUBLISHED' }
   else if (['WITHDRAW', 'RETURN'].includes(command.action)) { expect(command.reason.trim()).not.toBe(''); v.state = 'DRAFT'; v.reason = command.reason }
   else if (command.action === 'SUCCESSOR') q.versions.push({ ...v, id: 'v3', number: 3, state: 'DRAFT', viewed: {} })
   else if (command.action === 'ASSIGN') { expect(command.reason.trim()).not.toBe(''); q.owner = command.owner }
   else if (command.action === 'REQUEST_RETIRE') q.request = 'RETIRE'
   else if (command.action === 'REQUEST_REACTIVATE') q.request = 'REACTIVATE'
   else if (command.action === 'CONFIRM_AVAILABILITY') { q.retired = q.request === 'RETIRE'; q.request = null }
   else if (command.action === 'REJECT_AVAILABILITY') q.request = null
   else throw new Error('Unexpected command: ' + command.action)
   if (command.action !== 'VIEW') q.revision++
  }
  return route.fulfill({ json: bank })
 })
 return controls
}
async function open(page: Page, manager = true, retired = false) {
 await page.goto(manager ? managerRoute : expertRoute)
 if (retired) await page.getByRole('combobox', { name: 'Filter status', exact: true }).selectOption('RETIRED')
 await page.getByTestId('question-row').getByRole('button', { name: /^View details / }).click({ timeout: 45000 })
 return page.getByRole('dialog', { name: 'Question details', exact: true })
}
for (const width of [1440, 768, 390]) test(`two-tab detail hierarchy, historical snapshots and fixed footer at ${width}px`, async ({ page }) => {
 test.setTimeout(240000)
 await page.setViewportSize({ width, height: 900 }); await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
 await login(page, true); const data = await fixture(page); const panel = await open(page)
 for (const name of ['Question overview', 'Responsibility', 'Question content', 'Assessment configuration']) await expect(panel.getByRole('region', { name, exact: true })).toHaveCount(1)
 const overview = panel.getByRole('region', { name: 'Question overview' })
 expect(await overview.locator('dl').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2)
 await overview.getByRole('button', { name: 'Copy ID ' + data.bank.questions[0].code, exact: true }).click()
 await expect(page.getByText('Copied to clipboard!', { exact: true })).toBeVisible()
 expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(data.bank.questions[0].code)
 await expect(page.getByText('Copied to clipboard!', { exact: true })).toHaveCount(0, { timeout: 7000 })
 const responsibility = panel.getByRole('region', { name: 'Responsibility', exact: true })
 await expect(responsibility.getByText('Responsible Expert', { exact: true })).toBeVisible(); await expect(responsibility.getByText('Alex Owner', { exact: true })).toBeVisible(); await expect(responsibility.getByText('Expert', { exact: true })).toBeVisible()
 const content = panel.getByRole('region', { name: 'Question content', exact: true })
 await expect(content.getByRole('listitem')).toHaveCount(4)
 await expect(content.getByText('Correct answer', { exact: true })).toHaveCount(1)
 await expect(content.getByText('No explanation provided for this question.', { exact: true })).toHaveCount(1)
 const tabsTop = (await panel.getByRole('tablist').boundingBox())!.y
 await capture(page, 'content-top')
 await panel.getByRole('region', { name: 'Assessment configuration' }).scrollIntoViewIfNeeded()
 await expect(panel.getByText('Baseline uses its own selection policy. This mandatory setting does not apply to Baseline.', { exact: true })).toBeVisible()
 const footer = panel.getByRole('button', { name: 'Close', exact: true }); const box = await footer.boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(900)
 expect((await panel.getByRole('tablist').boundingBox())!.y).toBeCloseTo(tabsTop, 0)
 expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
 expect(await panel.locator('div.overflow-y-auto').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
 await capture(page, 'content-bottom')
 await panel.getByRole('tab', { name: 'Question content', exact: true }).focus(); await page.keyboard.press('ArrowRight')
 await expect(panel.getByRole('tab', { name: 'History & versions', exact: true })).toHaveAttribute('aria-selected', 'true')
 const versions = panel.getByRole('region', { name: 'Version information', exact: true })
 await expect(versions.getByRole('combobox', { name: 'Version' })).toHaveValue('v2')
 await expect(versions.getByRole('combobox', { name: 'Version' }).locator('option:checked')).toHaveText('v2 · Latest')
 await expect(versions.getByText(/^Selected version:/)).toHaveCount(0)
 expect(await versions.getByRole('heading').evaluate(element => getComputedStyle(element).fontSize)).toBe('15.5px')
 expect(await versions.locator('dt').first().evaluate(element => getComputedStyle(element).fontSize)).toBe('11.625px')
 expect(await versions.locator('dd').first().evaluate(element => getComputedStyle(element).fontSize)).toBe('13.5625px')
 await expect(versions.getByRole('combobox', { name: 'Version' }).getByRole('option')).toHaveCount(2)
 await expect(versions.getByText('Casey Creator', { exact: false })).toBeVisible(); await expect(versions.getByText('Taylor Editor', { exact: false })).toBeVisible()
 const timeline = panel.getByRole('list', { name: 'Activity history' })
 const events = timeline.locator(':scope > li'); await expect(events).toHaveCount(5)
 await expect(events.first()).toContainText('Question created'); await expect(events.last()).toContainText('Responsibility updated')
 await expect(events.last().getByText('Performed by', { exact: true })).toHaveCount(1)
 await expect(events.last().getByText('Lee Manager', { exact: true })).toHaveCount(1)
 await expect(events.last().getByText('This question · v2', { exact: true })).toHaveCount(1)
 await expect(events.last().getByText('Historical recipient unavailable', { exact: true })).toHaveCount(1)
 await expect(events.last().getByText('Alex Owner', { exact: true })).toHaveCount(0)
 expect(await events.first().getByText('Question created', { exact: true }).evaluate(element => getComputedStyle(element).fontSize)).toBe('13.5625px')
 expect(await events.first().locator('time').evaluate(element => getComputedStyle(element).fontSize)).toBe('11.625px')
 await expect(events.last().getByRole('button', { name: 'View question snapshot' })).toHaveCount(0)
 const snapshot = events.first().getByRole('button', { name: 'View question snapshot', exact: true })
 await snapshot.scrollIntoViewIfNeeded(); await snapshot.focus(); await page.keyboard.press('Enter')
 await expect(snapshot).toHaveAttribute('aria-expanded', 'true')
 await expect(events.first().getByText('Exact question content saved with this event.', { exact: true })).toBeVisible()
 await expect(events.first().getByText('Earlier recorded question content', { exact: true })).toBeVisible()
 expect(await events.first().getByText('Earlier recorded question content', { exact: true }).evaluate(element => getComputedStyle(element).fontSize)).toBe('13.5625px')
 await capture(page, 'history-snapshot')
 await snapshot.click(); await expect(snapshot).toHaveAttribute('aria-expanded', 'false')
 await panel.getByRole('combobox', { name: 'Version', exact: true }).selectOption('v1')
 await expect(panel.getByRole('combobox', { name: 'Version' }).locator('option:checked')).toHaveText('v1 · Historical')
 await panel.getByRole('tab', { name: 'Question content', exact: true }).click()
 await expect(panel.getByRole('region', { name: 'Question content', exact: true }).getByText('Earlier recorded question content', { exact: true })).toBeVisible()
 await expect(panel.getByText('Actions apply to the latest question version.', { exact: true })).toBeVisible()
 await expect(panel.getByRole('button', { name: 'Mark this version reviewed' })).toHaveCount(0)
 await footer.click(); await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Expert drawer actions preserve confirmations, required reasons and peer restrictions', async ({ page }) => {
 test.setTimeout(240000); await page.setViewportSize({ width: 1440, height: 1000 }); await login(page, false)
 const data = await fixture(page, false); let panel = await open(page, false)
 await panel.getByRole('button', { name: 'Edit draft', exact: true }).click()
 await page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Edit draft question', exact: true }) }).getByRole('button', { name: 'Cancel', exact: true }).click()
 await panel.getByRole('button', { name: 'Submit for review', exact: true }).click()
 const confirm = page.getByRole('dialog', { name: 'Confirm question action', exact: true })
 await expect(confirm.getByRole('textbox')).toHaveCount(0); await confirm.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(data.commands).toEqual([])
 await panel.getByRole('button', { name: 'Submit for review', exact: true }).click(); data.failNext = true
 await confirm.getByRole('button', { name: 'Confirm submission', exact: true }).click(); await expect(confirm.getByRole('alert')).toContainText('Question changed.')
 await capture(page, 'submission-conflict')
 await confirm.getByRole('button', { name: 'Confirm submission', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 await panel.getByRole('button', { name: 'Withdraw', exact: true }).click(); await expect(confirm.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
 await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Improve wording before review'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 data.bank.questions[0].versions.at(-1)!.state = 'PUBLISHED'; panel = await open(page, false)
 await panel.getByRole('button', { name: 'Create successor', exact: true }).click(); await expect(panel.getByRole('button', { name: 'Edit draft', exact: true })).toBeVisible()
 await panel.getByRole('button', { name: 'Request retirement', exact: true }).click(); await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Retirement review request'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 data.bank.questions[0].retired = true; data.bank.questions[0].request = null; panel = await open(page, false, true)
 await expect(panel.getByRole('button', { name: 'Submit for review', exact: true })).toHaveCount(0)
 await panel.getByRole('button', { name: 'Request reactivation', exact: true }).click(); await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Reactivation review request'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 data.bank.questions[0].owner = 'jamie'; panel = await open(page, false, true)
 for (const name of ['Edit draft', 'Submit for review', 'Withdraw', 'Create successor', 'Reassign Expert', 'Approve & publish']) await expect(panel.getByRole('button', { name, exact: true })).toHaveCount(0)
 expect(data.commands).toEqual(['SUBMIT', 'SUBMIT', 'WITHDRAW', 'SUCCESSOR', 'REQUEST_RETIRE', 'REQUEST_REACTIVATE'])
})

test('L&D drawer preserves exact review guard, approval/return and availability decisions', async ({ page }) => {
 test.setTimeout(240000); await page.setViewportSize({ width: 1440, height: 1000 }); await login(page, true)
 const data = await fixture(page); let panel = await open(page)
 await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeDisabled()
 await panel.getByRole('button', { name: 'Mark this version reviewed', exact: true }).click(); await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toBeEnabled()
 await panel.getByRole('button', { name: 'Approve & publish', exact: true }).click()
 const confirm = page.getByRole('dialog', { name: 'Confirm question action', exact: true })
 await expect(confirm.getByRole('textbox')).toHaveCount(0); await confirm.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(data.commands).toEqual(['VIEW'])
 await panel.getByRole('button', { name: 'Approve & publish', exact: true }).click(); await confirm.getByRole('button', { name: 'Confirm approval', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 await expect(panel.getByRole('button', { name: 'Approve & publish', exact: true })).toHaveCount(0)
 data.bank.questions[0].versions.at(-1)!.state = 'SUBMITTED'; panel = await open(page)
 await panel.getByRole('button', { name: 'Return with reason', exact: true }).click(); await expect(confirm.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
 await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Clarify the expected answer'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 await expect(panel.getByText('Clarify the expected answer', { exact: true })).toBeVisible()
 await panel.getByRole('button', { name: 'Reassign Expert', exact: true }).click()
 const assign = page.getByRole('dialog', { name: 'Assign responsible Expert', exact: true })
 await assign.getByRole('textbox', { name: 'Search experts', exact: true }).fill('Jamie'); await assign.getByRole('radio', { name: 'Jamie Rivera', exact: true }).check(); await assign.getByRole('textbox', { name: 'Assignment reason', exact: true }).fill('Coverage transfer'); await assign.getByRole('button', { name: 'Confirm assignment', exact: true }).click(); await expect(assign).toHaveCount(0, { timeout: 45000 })
 await expect(panel.getByRole('region', { name: 'Responsibility', exact: true })).toContainText('Jamie Rivera')
 data.bank.questions[0].request = 'RETIRE'; panel = await open(page)
 await panel.getByRole('button', { name: 'Return availability request', exact: true }).click(); await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Keep available'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 data.bank.questions[0].request = 'RETIRE'; panel = await open(page)
 await panel.getByRole('button', { name: 'Confirm availability request', exact: true }).click(); await confirm.getByRole('textbox', { name: 'Reason', exact: true }).fill('Retirement approved'); await confirm.getByRole('button', { name: 'Confirm', exact: true }).click(); await expect(confirm).toHaveCount(0, { timeout: 45000 })
 expect(data.bank.questions[0].retired).toBe(true)
 expect(data.commands).toEqual(['VIEW', 'APPROVE', 'RETURN', 'ASSIGN', 'REJECT_AVAILABILITY', 'CONFIRM_AVAILABILITY'])
 await capture(page, 'manager-retired')
})

test('real authenticated question details and history remain readable without fixture APIs', async ({ page }) => {
 test.setTimeout(180000); await page.setViewportSize({ width: 1440, height: 1000 }); await login(page, true)
 const response = await page.context().request.get(api); expect(response.status()).toBe(200)
 const bank = await response.json() as BankView; expect(bank.questions.length).toBeGreaterThan(0)
 await page.goto(managerRoute); await page.getByTestId('question-row').first().getByRole('button', { name: /^View details / }).click({ timeout: 45000 })
 const panel = page.getByRole('dialog', { name: 'Question details', exact: true })
 await expect(panel.getByRole('region', { name: 'Assessment configuration' })).toHaveCount(1)
 await capture(page, 'real-content')
 await panel.getByRole('tab', { name: 'History & versions', exact: true }).click(); await expect(panel.getByRole('region', { name: 'Version information', exact: true })).toBeVisible(); await capture(page, 'real-history')
 await panel.getByRole('button', { name: 'Close', exact: true }).click()
})
