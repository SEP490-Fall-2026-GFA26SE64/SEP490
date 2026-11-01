import { test, expect as baseExpect, type Page } from '@playwright/test'
import type { BankView } from '../src/shared/api/questionBankApi'
const expect = baseExpect.configure({ timeout: 30_000 })
// Browser UI contract fixtures only; not evidence of real persistence or server authorization.
async function fixture(page: Page, role: 'LD_MANAGER' | 'EMPLOYEE') {
  const actor = '00000000-0000-0000-0000-000000000001', org = '00000000-0000-0000-0000-000000000002'
  const bank: BankView = { id: 'bank', name: 'Organization bank', history: [], questions: [{ id: 'question', code: 'Q-UI-TEST', createdBy: 'expert', createdAt: '2026-11-01T00:00:00Z', owner: 'expert', revision: 1, retired: false, request: null, versions: [{ id: 'version', number: 1, state: 'SUBMITTED', editedBy: 'expert', editedAt: '2026-11-01T00:00:00Z', submittedBy: 'expert', submittedAt: '2026-11-01T00:00:00Z', reviewedBy: null, reviewedAt: null, reason: null, viewed: {}, content: { prompt: 'Which clause filters rows?', options: ['WHERE', 'SELECT', 'GROUP BY', 'ORDER BY'], correctAnswer: 0, skillId: 'skill', skillName: 'SQL', difficulty: 'EASY', explanation: 'WHERE filters rows.' } }] }] }
  const calls: string[] = []
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    calls.push(route.request().method() + ' ' + path)
    let json: unknown
    if (path.endsWith('/workspace-auth/current')) json = { accountId: actor, organizationId: org, email: 'ui@example.test', fullName: 'UI contract user', roles: [role], stage: 'COMPLETE', workspaceReady: true }
    else if (path.endsWith('/subscription/access')) json = {}
    else if (path.endsWith('/module-management/session')) json = { id: actor, organizationId: org, roles: [role] }
    else if (path.endsWith('/module-list') || path.endsWith('/module-management/modules')) json = { items: [], total: 0, page: 1, pageSize: 10 }
    else if (path.includes('/module-management/catalog/') || path.endsWith('/contents') || path.endsWith('/grants')) json = []
    else if (path.endsWith('/question-bank/session')) json = { actor: { id: actor, organization: org, role }, skills: [{ id: 'skill', name: 'SQL' }], experts: [{ id: 'expert', name: 'Expert' }], people: [{ id: 'expert', name: 'Expert' }], maxImportRows: 500, maxImportBytes: 10485760 }
    else if (path.endsWith('/question-bank')) json = bank
    else if (path.endsWith('/notifications')) json = []
    else if (path.endsWith('/employee/pathway')) json = { status: null, archived: false, baseline: null, context: null, modules: [], dependencies: [] }
    else return route.fulfill({ status: 404, json: { message: 'Unexpected UI contract request' } })
    await route.fulfill({ json })
  })
  return calls
}
test('L&D module aliases, content, approvals and Question Bank keep the manager workspace', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const calls = await fixture(page, 'LD_MANAGER')
  await page.goto('/manager/modules')
  await expect(page).toHaveURL(/\/ld-manager\/modules$/)
  await expect(page.getByRole('heading', { name: 'Learning modules', exact: true })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Learning workspace' })
  await nav.getByRole('link', { name: 'Learning content', exact: true }).click()
  await expect(page).toHaveURL(/\/ld-manager\/learning-content$/)
  await expect(page.getByRole('heading', { name: 'Learning content', exact: true })).toBeVisible()
  await nav.getByRole('link', { name: 'Approvals & assignments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Learning approvals', exact: true })).toBeVisible()
  await page.goto('/ld-manager/question-bank')
  await page.getByRole('checkbox', { name: 'Select Q-UI-TEST' }).check()
  await page.getByRole('button', { name: 'Approve selected (1)' }).click()
  const feedback = page.getByRole('dialog')
  await expect(feedback.getByText('Q-UI-TEST', { exact: true })).toBeVisible()
  await expect(feedback.getByText(/Open Details & history/)).toBeVisible()
  expect(calls.some(call => call.endsWith('/question-bank/approve'))).toBe(false)
  await page.screenshot({ path: 'test-results/merged-ui-review-feedback.png', fullPage: true })
  expect(errors).toEqual([])
})
test('mobile Employee keeps guided empty pathway and cannot enter the staff Question Bank', async ({ page }) => {
  test.setTimeout(120_000)
  const calls = await fixture(page, 'EMPLOYEE')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/employee/pathway')
  await expect(page.getByTestId('empty-initial-pathway')).toBeVisible()
  await expect(page.getByText('R4 - Learning content practice')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy()
  await page.screenshot({ path: 'test-results/merged-ui-employee-mobile.png', fullPage: true })
  await page.goto('/expert/assessment-bank')
  await expect(page.getByRole('alert')).toContainText('Your authenticated role cannot enter this workspace.')
  expect(calls.some(call => call.endsWith('/question-bank'))).toBe(false)
})
