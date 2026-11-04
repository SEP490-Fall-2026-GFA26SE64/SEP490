import { test, expect as baseExpect, type Page } from '@playwright/test'
import type { BankView } from '../src/shared/api/questionBankApi'
const expect = baseExpect.configure({ timeout: 30_000 })
// Browser UI contract fixtures only; not evidence of real persistence or server authorization.
async function fixture(page: Page, role: 'LD_MANAGER' | 'EMPLOYEE' | 'DOMAIN_EXPERT') {
  const actor = '00000000-0000-0000-0000-000000000001', org = '00000000-0000-0000-0000-000000000002'
  const bank: BankView = { id: 'bank', name: 'Organization bank', history: [], questions: [{ id: 'question', code: 'Q-UI-TEST', createdBy: 'expert', createdAt: '2026-11-01T00:00:00Z', owner: 'expert', revision: 1, retired: false, request: null, versions: [{ id: 'version', number: 1, state: 'SUBMITTED', editedBy: 'expert', editedAt: '2026-11-01T00:00:00Z', submittedBy: 'expert', submittedAt: '2026-11-01T00:00:00Z', reviewedBy: null, reviewedAt: null, reason: null, viewed: {}, content: { prompt: 'Which clause filters rows?', options: ['WHERE', 'SELECT', 'GROUP BY', 'ORDER BY'], correctAnswer: 0, skillId: 'skill', skillName: 'SQL', difficulty: 'EASY', explanation: 'WHERE filters rows.' } }] }] }
  const calls: string[] = []
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    calls.push(route.request().method() + ' ' + path)
    let json: unknown
    if (path.endsWith('/workspace-auth/current')) json = { accountId: actor, organizationId: org, email: 'ui@example.test', fullName: 'UI contract user', roles: [role], stage: 'COMPLETE', workspaceReady: true }
    else if (path.endsWith('/subscription/access')) json = {}
    else if (path.includes('/organizations/') && (path.endsWith('/target-roles') || path.endsWith('/members'))) json = []
    else if (path.endsWith('/module-management/session')) json = { id: actor, organizationId: org, roles: [role === 'DOMAIN_EXPERT' ? 'EXPERT' : role] }
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
test('L&D catalog, approvals and Question Bank keep separate manager actions', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const calls = await fixture(page, 'LD_MANAGER')
  await page.goto('/manager/modules')
  await expect(page).toHaveURL(/\/ld-manager\/modules$/)
  await expect(page.getByRole('heading', { name: 'Learning modules', exact: true })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Learning workspace' })
  await expect(nav.getByRole('link', { name: 'Learning content', exact: true })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Modules', exact: true })).toHaveAttribute('aria-current', 'page')
  const queueRequest = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/module-management/modules'))
  await nav.getByRole('link', { name: 'Approvals', exact: true }).click()
  expect(new URL((await queueRequest).url()).searchParams.get('pendingOnly')).toBe('true')
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
test('main Target Role editor omits retired fields and cancellation makes no role write', async ({ page }) => {
  test.setTimeout(120_000)
  const calls = await fixture(page, 'LD_MANAGER')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/ld-manager/target-roles')
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create Target Role' })).toBeVisible()
  await expect(dialog.getByText('Role Mastery Levels', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Job Domain', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Role Seniority Levels', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/latest-main-target-role-fields.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(calls.some(call => call.startsWith('POST ') && call.endsWith('/target-roles'))).toBe(false)
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

test('L&D catalog assignment is in details and approval actions stay in the pending queue', async ({ page }) => {
  test.setTimeout(120_000)
  await fixture(page, 'LD_MANAGER')
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  const metadata = { id: 'submitted', version: '1.0', status: 'DRAFT', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }
  const content = { id: 'content', title: 'Lessons', markdown: '# Lesson', contentType: 'text/markdown', contentVersion: '1.0', jobPositionIds: [], createdBy: 'expert', createdAt: '2026-11-01T00:00:00Z' }
  const payload = { metadata, title: 'Submitted module', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'module-content:content', contentType: 'text/markdown', contentVersion: '1.0', duration: 5, price: 1000, teachings: [], content }
  const doc = { id: 'submitted', organizationId: 'org', jobPositionIds: [], createdBy: 'expert', createdAt: '2026-11-01T00:00:00Z', lockVersion: 1, everReleased: false, archived: false, releasedRevision: null, history: [], revisions: [{ number: 1, state: 'SUBMITTED', payload, editedBy: 'expert', editedAt: '2026-11-01T00:00:00Z', decidedBy: null, decidedAt: null, feedback: null }] }
  const unmanaged = { ...payload, metadata: { ...metadata, id: 'catalog-only', status: 'ACTIVE' }, title: 'Catalog intake module' }
  const writes: string[] = []; let pendingRequested = false
  await page.route('**/api/v1/module-management/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    if (route.request().method() !== 'GET') writes.push(path)
    if (path.endsWith('/module-list')) return route.fulfill({ json: { items: [{ module: unmanaged, authoring: null, intake: null }, { module: payload, authoring: doc }], total: 2, page: 1, pageSize: 10 } })
    if (path.endsWith('/modules')) { pendingRequested = url.searchParams.get('pendingOnly') === 'true'; return route.fulfill({ json: { items: [doc], total: 1, page: 1, pageSize: 10 } }) }
    if (path.endsWith('/catalog/Expert')) return route.fulfill({ json: [{ id: 'expert', name: 'Expert A' }] })
    if (path.endsWith('/catalog/JobPosition')) return route.fulfill({ json: [{ id: 'jobPosition', name: 'Software Developers' }] })
    return route.fallback()
  })
  await page.goto('/ld-manager/modules')
  const nav = page.getByRole('navigation', { name: 'Learning workspace' })
  await expect(nav.getByRole('link', { name: 'Learning content', exact: true })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Modules', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Submitted module', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve and release', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Assign for intake', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'View module', exact: true }).first().click()
  await page.getByRole('dialog', { name: 'Catalog module details' }).getByRole('button', { name: 'Assign for intake' }).click()
  const assignment = page.getByRole('dialog', { name: 'Assign for intake' })
  await assignment.getByLabel('Responsible Expert').selectOption('expert')
  await assignment.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(assignment).not.toBeVisible()
  await nav.getByRole('link', { name: 'Approvals', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Approve and release', exact: true })).toBeVisible()
  await expect(page.getByText('Submitted', { exact: true })).toHaveClass(/bg-warning/)
  await expect(page.getByText('Not approved', { exact: true })).toHaveClass(/bg-warning/)
  await expect(page.getByText('Draft', { exact: true })).toHaveClass(/bg-secondary/)
  const actionRow = page.getByRole('button', { name: 'View module', exact: true }).locator('..')
  await expect(actionRow.getByRole('button').first()).toHaveText('View module')
  await expect(actionRow.getByRole('button').nth(1)).toHaveText('Details & history')
  expect(pendingRequested).toBe(true)
  await expect(nav.getByRole('link', { name: 'Approvals', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Modules', exact: true })).not.toHaveAttribute('aria-current', 'page')
  expect(await nav.getByRole('link', { name: 'Approvals', exact: true }).evaluate(el => getComputedStyle(el).color)).not.toEqual(await nav.getByRole('link', { name: 'Modules', exact: true }).evaluate(el => getComputedStyle(el).color))
  await page.screenshot({ path: 'test-results/ld-module-navigation-desktop.png', fullPage: true })
  await expect(page.getByRole('heading', { name: 'Catalog intake module', exact: true })).toHaveCount(0)
  await expect(page.getByText('Catalog intake permissions', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Approve and release', exact: true }).click()
  await page.getByRole('dialog', { name: 'Approve and release' }).getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(nav.getByRole('link', { name: 'Approvals', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ld-module-approval-queue-mobile.png', fullPage: true })
  await page.goto('/ld-manager/learning-content')
  await expect(page).toHaveURL(/\/ld-manager\/modules$/)
  expect(writes).toEqual([]); expect(errors).toEqual([])
})


test('Expert header Create and Import actions preserve module and question flows on desktop and mobile', async ({ page }) => {
  test.setTimeout(180_000)
  const calls = await fixture(page, 'DOMAIN_EXPERT')
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/expert/modules')
    const createModule = page.getByRole('button', { name: 'Create module', exact: true })
    const importModule = page.getByRole('button', { name: 'Import', exact: true })
    await expect(createModule).toBeEnabled()
    await expect(page.getByText('Matching your current filters', { exact: true })).toBeVisible()
    await expect(page.getByText('Learning content in your workspace', { exact: true })).toBeVisible()
    await expect(page.getByText('Skills available for module authoring', { exact: true })).toBeVisible()
    await expect(importModule.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    const actionHeight = (await createModule.boundingBox())?.height
    expect((await importModule.boundingBox())?.height).toBe(actionHeight)
    await expect(page.getByText('Import Excel / ZIP', { exact: true })).toHaveCount(0)
    await importModule.click()
    const moduleImportDialog = page.getByRole('dialog', { name: 'Import modules', exact: true })
    await expect(moduleImportDialog).toBeVisible()
    await expect(moduleImportDialog.getByRole('heading', { name: 'Import modules and lessons' })).toBeVisible()
    await expect(moduleImportDialog.getByRole('link', { name: 'Download Excel template and instructions' })).toBeVisible()
    await expect(moduleImportDialog.getByLabel('Module import file')).toBeVisible()
    await page.screenshot({ path: `test-results/module-import-popup-${width}.png`, fullPage: true })
    await moduleImportDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(moduleImportDialog).not.toBeVisible()
    await expect(importModule).toBeFocused()
    await importModule.click()
    await page.keyboard.press('Escape')
    await expect(moduleImportDialog).not.toBeVisible()
    await createModule.click()
    const editor = page.getByRole('dialog', { name: 'Module editor' })
    await expect(editor.getByLabel('Lesson title')).toBeVisible()
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(editor).not.toBeVisible()
    await page.screenshot({ path: `test-results/module-header-actions-${width}.png`, fullPage: true })
    await page.goto('/expert/assessment-bank')
    const createQuestion = page.getByRole('button', { name: 'Create', exact: true })
    const importQuestion = page.getByRole('button', { name: 'Import', exact: true })
    await expect(createQuestion).toBeEnabled()
    const questionRow = page.getByTestId('question-row').first()
    const questionStatus = questionRow.getByTestId('question-status')
    await expect(questionStatus).toContainText('Awaiting review')
    await expect(questionStatus).toContainText('v1 · Easy')
    const codeBox = (await questionRow.getByText('Q-UI-TEST', { exact: true }).boundingBox())!
    const statusBox = (await questionStatus.boundingBox())!
    expect(statusBox.x).toBeGreaterThan(codeBox.x)
    expect(statusBox.y).toBeLessThan((await questionRow.getByText('Which clause filters rows?', { exact: true }).boundingBox())!.y)
    if (width === 1280) expect(Math.abs(statusBox.y - codeBox.y)).toBeLessThan(8)
    await expect(page.getByText('Questions in your organization’s bank', { exact: true })).toBeVisible()
    await expect(page.getByText('Published and not retired', { exact: true })).toBeVisible()
    await expect(page.getByText('Submitted questions awaiting a decision', { exact: true })).toBeVisible()
    await expect(page.getByText('Distinct skills linked to current questions', { exact: true })).toBeVisible()
    expect((await importQuestion.boundingBox())?.height).toBe(actionHeight)
    expect((await createQuestion.boundingBox())?.height).toBe(actionHeight)
    await expect(createQuestion.locator('svg')).toHaveAttribute('aria-hidden', 'true')
    await createQuestion.click()
    const questionDialog = page.getByRole('dialog')
    await expect(questionDialog.getByRole('heading', { name: 'Create draft question' })).toBeVisible()
    await questionDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await importQuestion.click()
    const importDialog = page.getByRole('dialog')
    await expect(importDialog.getByRole('heading', { name: 'Import questions' })).toBeVisible()
    await importDialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(importDialog).not.toBeVisible()
    await page.screenshot({ path: `test-results/question-header-actions-${width}.png`, fullPage: true })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  expect(calls.filter(call => call.startsWith('POST '))).toEqual([])
  expect(errors).toEqual([])
})

test('Module navigation keeps the session while refreshing without a visible loading bar or unused content reads', async ({ page }) => {
  test.setTimeout(120_000)
  const calls = await fixture(page, 'LD_MANAGER')
  await page.goto('/ld-manager/modules')
  await expect(page.getByText('No modules match your filters. Try another search.', { exact: true })).toBeVisible()
  const initialSessionReads = calls.filter(call => call.endsWith('/module-management/session')).length
  expect(initialSessionReads).toBeGreaterThan(0)
  let finishRead: () => void = () => {}
  const heldRead = new Promise<void>(resolve => { finishRead = resolve })
  await page.route('**/api/v1/module-management/modules?**', async route => {
    await heldRead
    await route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 10 } })
  })
  await page.getByRole('navigation', { name: 'Learning workspace' }).getByRole('link', { name: 'Approvals', exact: true }).click()
  const loading = page.getByRole('status').filter({ hasText: /^Loading$/ })
  await expect(loading).toBeVisible()
  const geometry = await loading.evaluate(el => ({ position: getComputedStyle(el).position, height: el.getBoundingClientRect().height }))
  expect(geometry.position).toBe('absolute')
  expect(geometry.height).toBeLessThanOrEqual(1)
  await expect(loading).toHaveClass('sr-only')
  await expect(page.getByText('Loading your session…', { exact: true })).toHaveCount(0)
  expect(calls.filter(call => call.endsWith('/module-management/session'))).toHaveLength(initialSessionReads)
  expect(calls.some(call => call.endsWith('/module-management/contents'))).toBe(false)
  await page.screenshot({ path: 'test-results/module-navigation-loading.png', fullPage: true })
  finishRead()
  await expect(loading).not.toBeVisible()
  await expect(page.getByText('No requests need your attention. New submissions will appear here.', { exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Learning workspace' }).getByRole('link', { name: 'Modules', exact: true }).click()
  await expect(page.getByText('No modules match your filters. Try another search.', { exact: true })).toBeVisible()
  expect(calls.filter(call => call.endsWith('/module-management/session'))).toHaveLength(initialSessionReads)
})
