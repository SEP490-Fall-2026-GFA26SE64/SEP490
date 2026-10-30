import { randomUUID } from 'node:crypto'
import { expect, test, type Browser, type BrowserContext, type Page, type APIRequestContext } from '@playwright/test'
import * as XLSX from 'xlsx'
import type { BankSession, BankView } from '../src/shared/api/questionBankApi'
const root = '/api/v1/question-bank'
const contexts: BrowserContext[] = []
const password = 'question-bank-test-password' // isolated synthetic fixture, never a development account
const content = (prompt: string) => ({ prompt, options: ['Choice one', 'Choice two', 'Choice three', 'Choice four'], correctAnswer: 0, skillId: 'QB-TEST-SQL', skillName: null, difficulty: 'EASY', explanation: 'Choice one satisfies the fixture condition.' })
async function command(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.get('/api/v1/workspace-auth/csrf')
  expect(response.ok()).toBeTruthy()
  const csrf = await response.json() as { headerName: string; token: string }
  return request.post(root + path, { data, headers: { [csrf.headerName]: csrf.token } })
}
async function login(browser: Browser, baseURL: string, role: string, org = 'a') {
  const context = await browser.newContext({ baseURL }); contexts.push(context)
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(`${role}${org}@question-bank.test`)
  await page.getByLabel('Password', { exact: true }).fill(password)
  const signed = page.waitForResponse(r => r.url().endsWith('/workspace-auth/sign-in') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  expect((await signed).status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Continue to workspace', exact: true })).toBeVisible()
  if (role !== 'employee') {
    // Open the protected bank after real sign-in; unrelated prototype home catalog calls
    // are outside this suite. The role/entitlement boundary still runs on this route.
    await page.goto(role === 'ld' ? '/ld-manager/question-bank' : '/expert/assessment-bank')
    await expect(page.getByText('Total Bank Items', { exact: true })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('link', { name: 'Assessment Bank', exact: true })).toHaveAttribute('href', role === 'ld' ? '/ld-manager/question-bank' : '/expert/assessment-bank')
  }
  return { context, page }
}
async function question(page: Page, code: string) {
  const response = await page.request.get(root); expect(response.status()).toBe(200)
  const bank = await response.json() as BankView
  const q = bank.questions.find(q => q.code === code); expect(q).toBeTruthy(); return q!
}
async function act(page: Page, code: string, action: string, extra: Record<string, unknown> = {}) {
  const q = await question(page, code)
  const response = await command(page.request, '/commands', { id: q.id, expectedRevision: q.revision, action, reason: 'Isolated acceptance test', ...extra })
  expect(response.status()).toBe(200); return response
}
async function filter(page: Page, code: string) { await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(code) }
const row = (page: Page, code: string) => page.getByTestId('question-row').filter({ hasText: code })
async function markViewed(page: Page, code: string) {
  await filter(page, code); await row(page, code).getByRole('button', { name: 'Details & history' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark this version reviewed' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Approve & publish' })).toBeEnabled()
}
async function publish(page: Page) {
  const committed = page.waitForResponse(r => r.url().endsWith('/question-bank/commands') && r.request().method() === 'POST', { timeout: 30000 })
  await page.getByRole('dialog').getByRole('button', { name: 'Approve & publish' }).click()
  expect((await committed).status()).toBe(200)
}
test.afterEach(async () => { for (const context of contexts.splice(0)) await context.close().catch(() => undefined) })
test.beforeEach(({ baseURL }) => { test.skip(baseURL !== 'http://localhost:8098', 'Requires dedicated Question Bank fixture stack') })

test('real question authoring, review, version history, retirement and isolated permissions', async ({ browser, baseURL }) => {
  test.setTimeout(300000)
  const expert = await login(browser, baseURL!, 'expert')
  const errors: string[] = []; expert.page.on('pageerror', e => errors.push(e.message))
  const code = 'QB-' + randomUUID().slice(0, 8).toUpperCase()
  const beforeCancel = (await (await expert.page.request.get(root)).json() as BankView).questions.length
  await expert.page.getByRole('button', { name: 'Create', exact: true }).click()
  await expert.page.getByRole('dialog').getByLabel('Question code', { exact: true }).fill(code + '-CANCEL')
  await expert.page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(expert.page.getByRole('dialog')).toHaveCount(0)
  expect((await (await expert.page.request.get(root)).json() as BankView).questions.length).toBe(beforeCancel)
  await expert.page.getByRole('button', { name: 'Create', exact: true }).click()
  let dialog = expert.page.getByRole('dialog')
  await dialog.getByLabel('Question code', { exact: true }).fill(code)
  await dialog.getByLabel('Question prompt', { exact: true }).fill('Real persisted draft ' + code)
  await dialog.getByLabel('MicroSkill', { exact: true }).selectOption('QB-TEST-SQL')
  await dialog.getByRole('button', { name: 'Save draft' }).click()
  await expect(dialog).toHaveCount(0)
  await expert.page.reload(); await filter(expert.page, code)
  await expect(row(expert.page, code)).toContainText('Real persisted draft')
  await row(expert.page, code).getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(expert.page.getByRole('alert')).toBeVisible()
  await row(expert.page, code).getByRole('button', { name: 'Edit draft' }).click()
  dialog = expert.page.getByRole('dialog')
  for (const [i, letter] of ['A', 'B', 'C', 'D'].entries()) await dialog.getByLabel('Option ' + letter, { exact: true }).fill('Distinct choice ' + i)
  await dialog.getByLabel('Correct answer', { exact: true }).selectOption('0')
  await dialog.getByLabel('Difficulty', { exact: true }).selectOption('MEDIUM')
  await dialog.getByLabel('Answer explanation', { exact: true }).fill('Explanation retained for reviewed content')
  await dialog.getByRole('button', { name: 'Save draft' }).click(); await expect(dialog).toHaveCount(0)
  await row(expert.page, code).getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(row(expert.page, code)).toContainText('Awaiting review')
  const first = await question(expert.page, code)
  const manager = await login(browser, baseURL!, 'ld')
  await markViewed(manager.page, code)
  await publish(manager.page)
  await expect.poll(async () => (await question(expert.page, code)).versions.at(-1)?.state).toBe('PUBLISHED')
  const published = await question(expert.page, code)
  expect(published.versions[0].reviewedBy).toBeTruthy(); expect(published.versions[0].reviewedAt).toBeTruthy()
  expect(published.createdBy).toBe(first.createdBy)
  await manager.context.close()
  await act(expert.page, code, 'SUCCESSOR')
  const successor = await question(expert.page, code)
  expect(successor.versions).toHaveLength(2); expect(successor.versions[0]).toMatchObject({ state: 'PUBLISHED', id: published.versions[0].id, content: published.versions[0].content })
  await act(expert.page, code, 'SUBMIT')
  const ld = await login(browser, baseURL!, 'ld')
  await filter(ld.page, code)
  await row(ld.page, code).getByRole('button', { name: 'Details & history' }).click()
  await ld.page.getByRole('dialog').getByRole('button', { name: 'Return with reason' }).click()
  const returnReason = 'Clarify the explanation before resubmission.'
  await ld.page.getByLabel('Reason', { exact: true }).fill(returnReason)
  const returnedResponse = ld.page.waitForResponse(r => r.url().endsWith('/question-bank/commands') && r.request().method() === 'POST', { timeout: 30000 })
  await ld.page.getByRole('button', { name: 'Confirm', exact: true }).click()
  expect((await returnedResponse).status()).toBe(200)
  const returnedVersion = (await question(expert.page, code)).versions.at(-1)!
  expect(returnedVersion).toMatchObject({ id: successor.versions[1].id, state: 'DRAFT', reason: returnReason })
  await expect(ld.page.getByRole('dialog')).toHaveCount(1)
  await expect(ld.page.getByRole('dialog')).toContainText(returnReason)
  await ld.page.getByRole('dialog').getByLabel('Version', { exact: true }).scrollIntoViewIfNeeded()
  await ld.page.screenshot({ path: '/tmp/question-bank-review-history.png', fullPage: true })
  await ld.page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await act(expert.page, code, 'SUBMIT'); await act(expert.page, code, 'WITHDRAW')
  expect((await question(expert.page, code)).versions.at(-1)?.state).toBe('DRAFT')
  const peer = await login(browser, baseURL!, 'peer')
  await filter(peer.page, code)
  await expect(row(peer.page, code).getByRole('button', { name: 'Edit draft' })).toHaveCount(0)
  const protectedQuestion = await question(peer.page, code)
  expect((await command(peer.page.request, '/questions', { id: protectedQuestion.id, expectedRevision: protectedQuestion.revision, code, content: content('Unauthorized edit') })).status()).toBe(403)
  await peer.context.close()
  const foreign = await login(browser, baseURL!, 'expert', 'b')
  const foreignBank = await (await foreign.page.request.get(root)).json() as BankView
  expect(foreignBank.questions.some(q => q.id === protectedQuestion.id)).toBe(false)
  expect((await command(foreign.page.request, '/commands', { id: protectedQuestion.id, expectedRevision: protectedQuestion.revision, action: 'SUCCESSOR' })).status()).toBe(404)
  await foreign.context.close()
  const employee = await login(browser, baseURL!, 'employee')
  const denied = await employee.page.request.get(root); expect(denied.status()).toBe(403)
  expect(await denied.text()).not.toContain('correctAnswer')
  await employee.context.close()
  await act(expert.page, code, 'REQUEST_RETIRE'); await act(ld.page, code, 'CONFIRM_AVAILABILITY')
  expect((await question(expert.page, code)).retired).toBe(true)
  await act(expert.page, code, 'REQUEST_REACTIVATE'); await act(ld.page, code, 'CONFIRM_AVAILABILITY')
  expect((await question(expert.page, code)).retired).toBe(false)
  const staff = await (await ld.page.request.get(root + '/session')).json() as BankSession
  const peerId = staff.experts.find(p => p.name.includes('peer'))!.id
  await ld.page.reload(); await filter(ld.page, code)
  await row(ld.page, code).getByRole('button', { name: 'Assign Expert', exact: true }).click()
  await ld.page.getByRole('dialog').getByLabel('Responsible Expert', { exact: true }).selectOption(peerId)
  await ld.page.getByRole('dialog').getByLabel('Reason', { exact: true }).fill('Transfer responsibility to the peer Expert.')
  const assignment = ld.page.waitForResponse(r => r.url().endsWith('/question-bank/commands') && r.request().method() === 'POST', { timeout: 30000 })
  await ld.page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  expect((await assignment).status()).toBe(200)
  expect((await question(expert.page, code)).owner).toBe(peerId)
  expect((await actStatus(expert.page, code, 'SUBMIT'))).toBe(403)
  await expert.page.reload(); await filter(expert.page, code)
  await expect(row(expert.page, code)).toContainText('Test A peer')
  await expect(row(expert.page, code).getByRole('button', { name: 'Edit draft' })).toHaveCount(0)
  await ld.context.close()
  expect(errors).toEqual([])
  await expert.context.close()
})
async function actStatus(page: Page, code: string, action: string) { const q = await question(page, code); return (await command(page.request, '/commands', { id: q.id, expectedRevision: q.revision, action })).status() }

const flat = (code: string, prompt: string) => ({ code, prompt, optionA: 'One', optionB: 'Two', optionC: 'Three', optionD: 'Four', correctAnswer: 'A', skillId: 'QB-TEST-SQL', difficulty: 'EASY', explanation: 'One is correct.' })
async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  const received = page.waitForResponse(r => r.url().endsWith('/imports/preview') && r.request().method() === 'POST', { timeout: 30000 })
  await page.getByRole('dialog').getByLabel('Select file', { exact: true }).setInputFiles(file)
  expect((await received).status()).toBe(200)
}
test('Excel and JSON import validates ownership, atomic errors, duplicate warnings and successor confirmation', async ({ browser, baseURL }) => {
  test.setTimeout(300000)
  const expert = await login(browser, baseURL!, 'expert'), code = 'IMP-' + randomUUID().slice(0, 8).toUpperCase()
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([flat(code, 'Imported through Excel ' + code)]), 'Questions')
  await expert.page.getByRole('button', { name: 'Import', exact: true }).click()
  const dialog = expert.page.getByRole('dialog')
  await upload(expert.page, { name: 'questions.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer })
  await expect(dialog.getByText(code, { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirm import' }).click(); await expect(dialog).toHaveCount(0)
  expect((await question(expert.page, code)).versions.at(-1)?.state).toBe('DRAFT')
  const peer = await login(browser, baseURL!, 'peer')
  const before = (await (await peer.page.request.get(root)).json() as BankView).questions.length
  await peer.page.getByRole('button', { name: 'Import', exact: true }).click()
  const invalid = peer.page.getByRole('dialog')
  await upload(peer.page, { name: 'questions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([flat(code + '-NEW', 'New row must roll back'), flat(code, 'Other owner')])) })
  await expect(invalid.getByRole('alert')).toContainText('responsible Expert')
  await expect(invalid.getByRole('button', { name: 'Confirm import' })).toBeDisabled()
  expect((await (await peer.page.request.get(root)).json() as BankView).questions.length).toBe(before)
  await peer.context.close()
  await act(expert.page, code, 'SUBMIT')
  const ld = await login(browser, baseURL!, 'ld'); await markViewed(ld.page, code)
  await publish(ld.page)
  await expect.poll(async () => (await question(expert.page, code)).versions.at(-1)?.state).toBe('PUBLISHED')
  await ld.context.close()
  await expert.page.getByRole('button', { name: 'Import', exact: true }).click()
  const successor = expert.page.getByRole('dialog')
  await upload(expert.page, { name: 'successor.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([flat(code, 'Updated import ' + code)])) })
  await expect(successor.getByText(/creates successor/)).toBeVisible()
  await expect(successor.getByRole('button', { name: 'Confirm import' })).toBeDisabled()
  await successor.getByRole('checkbox', { name: 'I reviewed and accept the warnings.' }).check()
  await successor.getByRole('checkbox', { name: 'Create new drafts for my existing question codes listed above.' }).check()
  await successor.getByRole('button', { name: 'Confirm import' }).click(); await expect(successor).toHaveCount(0)
  const result = await question(expert.page, code); expect(result.versions).toHaveLength(2); expect(result.versions[0].state).toBe('PUBLISHED'); expect(result.versions[1].state).toBe('DRAFT')
  const preview = await command(expert.page.request, '/imports/preview', { rows: [{ code, content: content('Blocked duplicate draft') }] })
  const payload = await preview.json() as { errors: string[] }; expect(payload.errors.join()).toContain('draft')
  await expert.context.close()
})

test('bulk approval rejects a stale batch atomically then publishes reviewed exact versions', async ({ browser, baseURL }) => {
  test.setTimeout(240000)
  const expert = await login(browser, baseURL!, 'expert'), ld = await login(browser, baseURL!, 'ld')
  const codes = ['BULK-A-', 'BULK-B-'].map(prefix => prefix + randomUUID().slice(0, 6).toUpperCase())
  for (const code of codes) { expect((await command(expert.page.request, '/questions', { code, content: content('Bulk ' + code), acknowledgeDuplicates: true })).status()).toBe(200); await act(expert.page, code, 'SUBMIT') }
  for (const code of codes) await act(ld.page, code, 'VIEW')
  const stale = await Promise.all(codes.map(code => question(ld.page, code)))
  await act(expert.page, codes[1], 'WITHDRAW')
  expect((await command(ld.page.request, '/approve', { questions: stale.map(q => ({ id: q.id, expectedRevision: q.revision, action: 'APPROVE' })) })).status()).toBe(409)
  expect((await question(expert.page, codes[0])).versions.at(-1)?.state).toBe('SUBMITTED')
  await act(expert.page, codes[1], 'SUBMIT'); await act(ld.page, codes[1], 'VIEW')
  await ld.page.reload()
  for (const code of codes) { await filter(ld.page, code); await ld.page.getByRole('checkbox', { name: 'Select ' + code, exact: true }).check() }
  await ld.page.getByRole('button', { name: 'Approve selected (2)', exact: true }).click()
  for (const code of codes) await expect.poll(async () => (await question(expert.page, code)).versions.at(-1)?.state).toBe('PUBLISHED')
  const noCsrf = await expert.page.request.post(root + '/questions', { data: { code: 'FORGED', content: content('No CSRF') } }); expect(noCsrf.status()).toBe(403)
  await ld.context.close(); await expert.context.close()
})

test('guided empty/error recovery, Vietnamese mobile layout and durable notifications', async ({ browser, baseURL, request }) => {
  test.setTimeout(180000)
  const foreign = await login(browser, baseURL!, 'peer', 'b')
  await expect(foreign.page.getByText('No questions match this view', { exact: true })).toBeVisible()
  await foreign.page.route('**/api/v1/question-bank/session', route => route.abort())
  await foreign.page.reload(); await expect(foreign.page.getByRole('alert')).toBeVisible()
  await foreign.page.unroute('**/api/v1/question-bank/session')
  await foreign.page.getByRole('button', { name: 'Reload latest data' }).click()
  await expect(foreign.page.getByText('No questions match this view', { exact: true })).toBeVisible()
  await foreign.page.setViewportSize({ width: 390, height: 844 })
  await foreign.page.getByRole('button', { name: 'VI', exact: true }).first().click()
  await expect(foreign.page.getByRole('heading', { name: 'Ngân hàng câu hỏi', exact: true })).toBeVisible()
  expect(await foreign.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await foreign.page.screenshot({ path: '/tmp/question-bank-mobile.png', fullPage: true })
  await foreign.page.getByRole('button', { name: 'Mở thanh điều hướng', exact: true }).click()
  await foreign.page.getByRole('link', { name: 'Ngân hàng câu hỏi', exact: true }).click()
  await foreign.page.getByRole('button', { name: 'Tạo câu hỏi', exact: true }).click()
  const mobileForm = foreign.page.getByRole('dialog')
  await mobileForm.getByLabel('Lựa chọn D', { exact: true }).fill('Lựa chọn trên màn hình nhỏ')
  await expect(mobileForm.getByRole('button', { name: 'Lưu nháp', exact: true })).toBeInViewport()
  expect(await foreign.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await foreign.page.screenshot({ path: '/tmp/question-bank-mobile-form.png', fullPage: true })
  await mobileForm.getByRole('button', { name: 'Huỷ', exact: true }).click()
  await expect(mobileForm).toHaveCount(0)
  await foreign.page.setViewportSize({ width: 1280, height: 800 })
  await expect(foreign.page.getByRole('button', { name: 'Thu gọn thanh điều hướng', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await foreign.context.close()
  const expert = await login(browser, baseURL!, 'expert')
  const notifications = await (await expert.page.request.get(root + '/notifications')).json() as { id: string; title: string; body: string; readAt: string | null }[]
  expect(notifications.length).toBeGreaterThan(0)
  expect((await command(expert.page.request, '/notifications/' + notifications[0].id + '/read', {})).ok()).toBeTruthy()
  const after = await (await expert.page.request.get(root + '/notifications')).json() as { id: string; readAt: string | null }[]
  expect(after.find(n => n.id === notifications[0].id)?.readAt).toBeTruthy()
  await expect.poll(async () => { const res = await request.get('http://127.0.0.1:28425/api/v1/messages'); const data = await res.json() as { total: number }; return data.total }, { timeout: 60000 }).toBeGreaterThan(0)
  await expert.page.screenshot({ path: '/tmp/question-bank-desktop.png', fullPage: true })
  await expert.context.close()
})
