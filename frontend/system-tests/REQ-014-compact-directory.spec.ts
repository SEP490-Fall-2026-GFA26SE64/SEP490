import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import type { BankSession, BankView, BankContent } from '../src/shared/api/questionBankApi'
const route = '/workspace/workspace-development/expert/assessment-bank'
const assets = '../documents/testing/system/assets/assessment-bank-compact-r3-20261110'
async function login(page: Page, email = 'expert@technova.com') {
 const request = page.context().request
 const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in', { data: { email, password: process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!' }, headers: { [csrf.headerName]: csrf.token } })).status()).toBe(200)
}
async function capture(page: Page, name: string) { const folder = assets + '/' + page.viewportSize()!.width; mkdirSync(folder, { recursive: true }); await page.screenshot({ path: folder + '/' + name + '.png', fullPage: false }) }

test('real directory is compact and preserves page, filters and focus around the side panel', async ({ page }) => {
 test.setTimeout(180000)
 await page.setViewportSize({ width: 1440, height: 1000 })
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
 await login(page)
 await page.goto(route)
 const rows = page.getByTestId('question-row')
 await expect(rows.first()).toBeVisible({ timeout: 45000 })
 const bounds = await rows.first().boundingBox(); expect(bounds!.height).toBeLessThanOrEqual(112)
 await expect(rows.first().getByRole('button', { name: 'Edit draft', exact: true })).toHaveCount(0)
 await page.getByRole('button', { name: 'Next page', exact: true }).click()
 const view = rows.first().getByRole('button', { name: /^View question / })
 const name = await view.getAttribute('aria-label')
 await capture(page, 'real-directory')
 await view.click()
 const panel = page.getByRole('dialog')
 await panel.getByRole('tab', { name: 'History & versions', exact: true }).click()
 await expect(panel.getByRole('combobox', { name: 'Version', exact: true })).toBeVisible()
 const box = await panel.boundingBox(); expect(box!.x + box!.width).toBeCloseTo(1440, 0)
 const scrollAtOpen = await page.evaluate(() => scrollY)
 await capture(page, 'real-panel')
 await panel.getByRole('button', { name: 'Close', exact: true }).click()
 await expect(rows.first().getByRole('button', { name: name!, exact: true })).toBeFocused()
 expect(Math.abs(await page.evaluate(() => scrollY) - scrollAtOpen)).toBeLessThanOrEqual(2)
 const code = name!.replace('View question ', '')
 await page.getByRole('textbox', { name: 'Search questions', exact: true }).fill(code)
 await rows.first().getByRole('button', { name: name!, exact: true }).click()
 await page.keyboard.press('Escape')
 await expect(page.getByRole('textbox', { name: 'Search questions', exact: true })).toHaveValue(code)
 await expect(rows).toHaveCount(1)
 expect(errors).toEqual([])
})

for (const width of [1440, 768, 390]) {
 test(`compact presentation and permitted overflow actions at ${width}px`, async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width, height: 900 })
  await login(page)
  const session: BankSession = { actor: { id: 'expert', organization: 'fixture', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'Design accessible user interfaces' }], experts: [{ id: 'expert', name: 'Alex' }], people: [{ id: 'expert', name: 'Alex' }], maxImportRows: 500, maxImportBytes: 10485760 }
  const content: BankContent = { prompt: 'Which approach ensures all interactive controls remain accessible through a logical keyboard navigation order, including a visible focus indicator?', options: ['Logical tab order', 'Hover only', 'Hide focus', 'Disable keyboard'], correctAnswer: 0, skillId: 'skill', skillName: 'Design accessible user interfaces', knowledgeLevel: 'FOUNDATION', mandatory: false, explanation: 'Logical keyboard order supports accessible navigation.' }
  const bank: BankView = { id: 'bank', name: 'Fixture', history: [], questions: Array.from({ length: 21 }, (_, i) => ({ id: 'q' + i, code: 'Q-' + (i + 1), createdBy: 'expert', createdAt: null, owner: i === 1 ? 'peer' : 'expert', revision: 1, retired: false, request: null, versions: [{ id: 'v' + i, number: 1, state: 'DRAFT', content, editedBy: null, editedAt: null, submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }] })) }
  await page.route('**/api/v1/question-bank**', r => r.fulfill({ json: r.request().url().endsWith('/session') ? session : r.request().url().endsWith('/notifications') ? [] : bank }))
  await page.goto(route)
  const row = page.getByTestId('question-row').first()
  await expect(row).toBeVisible({ timeout: 45000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (width >= 1280) expect((await row.boundingBox())!.height).toBeLessThanOrEqual(112)
  await capture(page, 'directory')
  const trigger = row.getByRole('button', { name: 'Actions for Q-1', exact: true })
  await trigger.focus(); await page.keyboard.press('Enter')
  const tools = page.getByRole('dialog', { name: 'Actions for Q-1', exact: true })
  await expect(tools.getByRole('button', { name: 'Edit draft', exact: true })).toBeVisible()
  await expect(tools.getByRole('button', { name: 'Submit', exact: true })).toBeVisible()
  await capture(page, 'actions')
  await page.keyboard.press('Escape')
  const view = row.getByRole('button', { name: 'View details Q-1', exact: true })
  await view.click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Foundation', { exact: true })).toBeVisible()
  await capture(page, 'panel')
  await page.keyboard.press('Escape')
  await expect(view).toBeFocused()
  const peer = page.getByTestId('question-row').nth(1)
  await expect(peer.getByRole('button', { name: 'Actions for Q-2', exact: true })).toHaveCount(0)
  await expect(peer.getByRole('button', { name: 'Edit draft Q-2', exact: true })).toHaveCount(0)
  await expect(peer.getByRole('button', { name: 'View details Q-2', exact: true })).toBeVisible()
  await login(page, 'manager@technova.com')
  session.actor = { ...session.actor, id: 'ld', role: 'LD_MANAGER' }
  bank.questions[0].versions[0].state = 'SUBMITTED'
  await page.goto('/workspace/workspace-development/ld-manager/question-bank')
  await page.getByRole('checkbox', { name: 'Select Q-1', exact: true }).check()
  await expect(page.getByRole('button', { name: 'Approve selected (1)', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Actions for Q-1', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Actions for Q-1', exact: true }).getByRole('button', { name: 'Reassign Expert', exact: true })).toBeVisible()
 })
}
