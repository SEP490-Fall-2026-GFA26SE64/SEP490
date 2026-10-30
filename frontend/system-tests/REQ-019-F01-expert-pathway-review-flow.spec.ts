import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import type { GapPreview, PathwayView, ReviewDetail } from '../src/shared/api/initialPathway'

function required(name: string) { const value = process.env[name]; if (!value) throw new Error('Blocked: missing isolated fixture capability ' + name); return value }
async function body<T>(response: APIResponse, code = 200): Promise<T> {
  if (response.status() !== code) { const error = await response.json().catch(() => ({})); throw new Error('HTTP ' + response.status() + ' ' + new URL(response.url()).pathname + ' code=' + String(error.code ?? 'UNKNOWN')) }
  expect(response.status()).toBe(code); return response.json() as Promise<T>
}
async function command<T>(request: APIRequestContext, path: string, data: unknown, code = 200, method: 'post' | 'put' = 'post') {
  const csrf = await body<{ headerName: string; token: string }>(await request.get('/api/v1/workspace-auth/csrf'))
  return body<T>(await request[method](path, { headers: { [csrf.headerName]: csrf.token, 'Idempotency-Key': randomUUID() }, data }), code)
}
async function signIn(request: APIRequestContext, prefix: string) {
  const identity = await command<{ stage: string; roles: string[]; organizationId: string; accountId: string }>(request, '/api/v1/workspace-auth/sign-in', { email: required(prefix + '_EMAIL'), password: required('C3_WORKSPACE_PASSWORD') })
  expect(identity.stage).toBe('COMPLETE'); return identity
}
type Attempt = { id: string; state: string; revision: number; items: { position: number; itemVersionId: string; options: { id: string }[]; selectedOptionId: string | null }[] }
type WireDetail = Omit<ReviewDetail, 'revision'> & { revision: Omit<ReviewDetail['revision'], 'overrides'> & { overrides: string[][] } }
const reviewPath = (id: string) => '/api/v1/expert/initial-pathways/' + id
const ordered = (d: WireDetail) => [...d.revision.plan.modules].sort((a, b) => a.ordinal - b.ordinal).map(m => m.id)
async function detail(page: Page, id: string) { return body<WireDetail>(await page.request.get(reviewPath(id))) }
function row(page: Page, zone: string, module: string) { return page.getByRole('region', { name: zone, exact: true }).getByRole('listitem').filter({ has: page.getByText(module, { exact: true }) }) }
async function changed(page: Page, id: string, revision: number) { await expect.poll(async () => (await detail(page, id)).summary.revision).toBe(revision + 1); await expect(page.getByRole('button', { name: 'Check again', exact: true }).first()).toBeEnabled(); return detail(page, id) }
async function closeCheck(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Check pathway and resolve issues' })
  if (await dialog.count()) { await expect(dialog.getByRole('button', { name: 'Close', exact: true }).first()).toBeEnabled(); await dialog.getByRole('button', { name: 'Close', exact: true }).first().click() }
}

test('R03/R06/R07/R09/R14 E02/E03 real session baseline → repair/order → exact approval → own Employee', async ({ browser, baseURL }, info) => {
  // Credentials come from the isolated stack. No cookies, trace or raw response artifacts.
  expect(baseURL).toBe('http://127.0.0.1:38088')
  expect(required('C3_COMPOSE_PROJECT')).toMatch(/^adapt-learn-graph-c3-pathway-[a-z0-9-]+$/)
  const expert = await browser.newContext({ baseURL }), employee = await browser.newContext({ baseURL }), manager = await browser.newContext({ baseURL })
  const page = await expert.newPage(), employeePage = await employee.newPage()
  const consoleErrors: string[] = [], failedRequests: string[] = []
  for (const surface of [page, employeePage]) {
    surface.on('pageerror', error => consoleErrors.push(error.message))
    surface.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') failedRequests.push(new URL(request.url()).pathname) })
  }
  try {
    const employeeIdentity = await signIn(employee.request, 'C3_EMPLOYEE')
    const expertIdentity = await signIn(expert.request, 'C3_EXPERT')
    expect(expertIdentity.organizationId).toBe(employeeIdentity.organizationId)
    expect(expertIdentity.roles).toEqual(['DOMAIN_EXPERT']); expect(employeeIdentity.roles).toEqual(['EMPLOYEE'])
    // Prerequisite input setup through the actual owner API; no direct baseline/mastery outcomes.
    const managerIdentity = await signIn(manager.request, 'C3_MANAGER')
    expect(managerIdentity.roles).toEqual(['LD_MANAGER']); expect(managerIdentity.organizationId).toBe(employeeIdentity.organizationId)
    const blueprintPath = '/api/v1/ld/adaptive-baseline-blueprints/occupations/' + encodeURIComponent(required('C3_OCCUPATION_ID'))
    const workspace = await body<{ current: { configuration: unknown } | null; working: unknown; activation: { revision: number } | null }>(await manager.request.get(blueprintPath))
    const configuration = { name: 'C3 review prerequisite input', occupationBounds: { maxQuestions: 120, timeLimitSeconds: 3600 } }
    expect(workspace.working).toBeNull()
    if (workspace.current) expect(workspace.current.configuration).toEqual(configuration) // retain this run's input after a pre-attempt harness failure
    else {
      const draft = await command<{ workingRevisionId: string; revision: number }>(manager.request, blueprintPath + '/working', { expectedRevision: 0, expectedWorkingRevisionId: null, configuration }, 200, 'put')
      await command(manager.request, blueprintPath + '/finalize', { workingRevisionId: draft.workingRevisionId, expectedWorkingRevision: draft.revision, expectedActivationRevision: workspace.activation?.revision ?? 0, expectedCurrent: null })
    }
    // Fresh one-run volume only. Fail on existing outcomes; never reset or adopt a draft.
    const before = await body<PathwayView>(await employee.request.get('/api/v1/employee/pathway'))
    expect(before.status).toBeNull()
    expect(await body<unknown[]>(await employee.request.get('/api/v1/employee/baseline-attempts/history'))).toEqual([])
    const selection = await body<{ selection: { selectionId: string; role: { id: string }; levelId: string } | null }>(await employee.request.get('/api/v1/employee/target-role-selection'))
    if (selection.selection) { expect(selection.selection.role.id).toBe(required('C3_ROLE_ID')); expect(selection.selection.levelId).toBe(required('C3_LEVEL_ID')) }
    await command(employee.request, '/api/v1/employee/target-role-selection', { roleId: required('C3_ROLE_ID'), levelId: required('C3_LEVEL_ID'), expectedCurrentSelectionId: selection.selection?.selectionId ?? null }, 200, 'put')
    let attempt = await command<Attempt>(employee.request, '/api/v1/employee/baseline-attempts', { entry: 'SELECTED_ROLE' })
    let answers = 0
    while (attempt.state === 'IN_PROGRESS' && answers < 256) {
      const item = attempt.items.at(-1)!
      expect(item.options.length).toBeGreaterThan(0)
      attempt = await command<Attempt>(employee.request, '/api/v1/employee/baseline-attempts/' + attempt.id + '/answers', { expectedRevision: attempt.revision, position: item.position, itemVersionId: item.itemVersionId, selectedOptionId: item.options[0]!.id })
      answers++
    }
    expect(['SUBMITTED', 'AUTO_SUBMITTED']).toContain(attempt.state)
    const gap = await body<GapPreview>(await employee.request.get('/api/v1/employee/role-gaps', { params: { roleId: required('C3_ROLE_ID'), levelId: required('C3_LEVEL_ID') } }))
    expect(gap.result.need).toBe('LEARNING_REQUIRED')
    const accepted = await command<{ requestId: string }>(employee.request, '/api/v1/employee/initial-pathway-requests', { roleId: gap.roleId, levelId: gap.levelId, expectedSelectionId: gap.expectedSelectionId, expectedSelectionRevision: gap.expectedSelectionRevision, expectedGapInputHash: gap.gapInputHash }, 202)
    const id = accepted.requestId
    await expect.poll(async () => (await body<{ reviewStatus: string }>(await employee.request.get('/api/v1/employee/initial-pathway-requests/' + id))).reviewStatus, { timeout: 60000 }).toBe('AWAITING_EXPERT_REVIEW')
    expect((await body<PathwayView>(await employee.request.get('/api/v1/employee/pathway'))).modules).toEqual([])
    await page.goto('/expert/pathway-review')
    const link = page.locator('a[href="/expert/pathway-review/' + id + '"]')
    await expect(link).toBeVisible(); await link.click()
    let current = await detail(page, id)
    const initial = current
    await expect(page.getByRole('region', { name: 'Excluded Modules', exact: true }).getByRole('listitem')).toHaveCount(0)
    const catalogSearch = page.getByRole('textbox', { name: 'Search modules' })
    await catalogSearch.fill('C3-NO-SUCH-MODULE')
    await expect(page.getByRole('region', { name: 'Add Existing Catalog Module', exact: true }).getByRole('listitem')).toHaveCount(0)
    expect((await detail(page, id)).summary.contentHash).toBe(initial.summary.contentHash)
    await catalogSearch.clear()
    const provider = current.revision.plan.dependencies.find(g => g.providerModuleId && g.providerModuleId !== g.moduleId)?.providerModuleId
    expect(provider, 'Fixture needs an actual removable prerequisite provider').toBeTruthy()
    await row(page, 'Pathway Learning Modules', provider!).getByRole('button', { name: 'Exclude', exact: true }).click()
    current = await changed(page, id, current.summary.revision)
    expect(current.revision.selectedModules).not.toContain(provider)
    expect(current.revision.overrides.at(-1)![0]).toBe('EXCLUDE')
    await closeCheck(page)
    await row(page, 'Excluded Modules', provider!).getByRole('button', { name: 'Remove module', exact: true }).click()
    current = await changed(page, id, current.summary.revision)
    expect(current.revision.overrides.at(-1)![0]).toBe('REMOVE')
    await closeCheck(page)
    await expect(page.getByRole('button', { name: 'Confirm this plan', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Check again', exact: true }).first().click()
    const check = page.getByRole('dialog', { name: 'Check pathway and resolve issues' })
    const suggestion = check.locator('div').filter({ has: page.getByText(provider!, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Include', exact: true }) }).last()
    const inclusionPath = reviewPath(id) + '/inclusions', inclusionAttempts: { key: string | undefined; body: string | null }[] = []
    page.on('request', request => { if (new URL(request.url()).pathname === inclusionPath && request.method() === 'POST') inclusionAttempts.push({ key: request.headers()['idempotency-key'], body: request.postData() }) })
    // Deliver the real request through the browser/proxy/session. Lose only its completed response;
    // keep the actual server response observable before asserting the uncertain-command retry.
    await page.evaluate(path => {
      const state = window as typeof window & { c3Fetch?: typeof fetch; c3LostStatus?: number }
      const original = window.fetch.bind(window); state.c3Fetch = original; let lost = false
      window.fetch = async (input, init) => {
        const response = await original(input, init)
        if (!lost && new URL(response.url).pathname === path && init?.method === 'POST') {
          lost = true; state.c3LostStatus = response.status
          throw new TypeError('C3 deliberate response loss after actual server response')
        }
        return response
      }
    }, inclusionPath)
    const beforeRepairRevision = current.summary.revision
    await suggestion.getByRole('button', { name: 'Include', exact: true }).click()
    await expect(check.getByRole('button', { name: 'Retry the same request', exact: true })).toBeVisible()
    await expect(check.getByRole('button', { name: 'Retry the same request', exact: true })).toBeEnabled()
    expect(await page.evaluate(() => (window as typeof window & { c3LostStatus?: number }).c3LostStatus)).toBe(200)
    expect((await detail(page, id)).summary.revision).toBe(beforeRepairRevision + 1)
    await check.getByRole('button', { name: 'Retry the same request', exact: true }).click()
    current = await changed(page, id, beforeRepairRevision)
    expect(inclusionAttempts).toHaveLength(2); expect(inclusionAttempts[0]!.key).toBeTruthy(); expect(inclusionAttempts[1]).toEqual(inclusionAttempts[0])
    await page.evaluate(() => { const state = window as typeof window & { c3Fetch?: typeof fetch }; window.fetch = state.c3Fetch!; delete state.c3Fetch })
    expect(current.revision.selectedModules).toContain(provider)
    await closeCheck(page)
    // Hand-derived adjacent swap from the observed DAG, independent of planner/hash serializer.
    const ids = ordered(current)
    const index = ids.findIndex((dependent, i) => i > 0 && !current.revision.plan.dependencies.some(g => g.providerModuleId === ids[i - 1] && g.moduleId === dependent))
    expect(index, 'Fixture requires an independent adjacent pair').toBeGreaterThan(0)
    const expectedOrder = [...ids]; [expectedOrder[index - 1], expectedOrder[index]] = [expectedOrder[index]!, expectedOrder[index - 1]!]
    await row(page, 'Pathway Learning Modules', ids[index]!).getByRole('button', { name: 'Move module up' }).focus(); await page.keyboard.press('Enter')
    current = await changed(page, id, current.summary.revision)
    expect(ordered(current)).toEqual(expectedOrder)
    await page.reload(); await expect(row(page, 'Pathway Learning Modules', ids[index]!)).toBeVisible()
    expect(ordered(await detail(page, id))).toEqual(expectedOrder)
    let validations = 0, detailGets = 0, confirmations = 0
    page.on('request', request => { const url = new URL(request.url()).pathname
      if (request.method() === 'GET' && url === reviewPath(id) + '/validation') validations++
      if (request.method() === 'GET' && url === reviewPath(id)) detailGets++
      if (request.method() === 'POST' && url === reviewPath(id) + '/confirmation') confirmations++
    })
    await page.getByRole('button', { name: 'Check again', exact: true }).first().click()
    await expect(page.getByRole('button', { name: 'Confirm this plan', exact: true })).toBeEnabled()
    expect(validations).toBe(1); expect(detailGets).toBe(0)
    await page.getByRole('button', { name: 'Confirm this plan', exact: true }).click()
    const preview = page.getByRole('dialog', { name: 'Review pathway before approval' })
    await expect(preview).toBeVisible()
    await preview.getByRole('button', { name: 'Adaptive Timeline', exact: true }).click()
    expect(confirmations).toBe(0)
    await preview.getByRole('button', { name: 'Confirm and approve', exact: true }).focus()
    await page.keyboard.press('Tab')
    expect(await preview.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true)
    await page.screenshot({ path: info.outputPath('draft-preview-desktop-en.png'), fullPage: true })
    await page.keyboard.press('Escape'); await expect(preview).toHaveCount(0); expect(confirmations).toBe(0)
    await page.getByRole('button', { name: 'Confirm this plan', exact: true }).click(); await expect(preview).toBeVisible()
    expect((await body<PathwayView>(await employee.request.get('/api/v1/employee/pathway'))).modules).toEqual([])
    const captured = await detail(page, id)
    const approvalResponse = page.waitForResponse(response => new URL(response.url()).pathname === reviewPath(id) + '/confirmation' && response.request().method() === 'POST')
    await preview.getByRole('button', { name: 'Confirm and approve', exact: true }).click()
    const approved = await approvalResponse; expect(approved.status()).toBe(200)
    expect(approved.request().postDataJSON()).toEqual({ expectedRevision: captured.summary.revision, expectedContentHash: captured.summary.contentHash })
    await expect.poll(async () => (await detail(page, id)).summary.reviewStatus).toBe('APPROVED');expect(confirmations).toBe(1)
    const own = await body<PathwayView>(await employee.request.get('/api/v1/employee/pathway'))
    expect(own.status?.revision).toBe(captured.summary.revision);expect(own.status?.revisionContentHash).toBe(captured.summary.contentHash)
    expect(own.modules.map(m => m.module.id)).toEqual(expectedOrder)
    expect(own.dependencies.map(g => [g.moduleId, g.providerModuleId, g.dependentSkillId, g.prerequisiteSkillId])).toEqual(captured.revision.plan.dependencies.map(g => [g.moduleId, g.providerModuleId, g.dependentSkillId, g.prerequisiteSkillId]))
    expect(own.modules.every(m => m.entry === null || m.accessState === 'AVAILABLE')).toBe(true)
    await employeePage.goto('/employee/pathway');await employeePage.reload()
    for (const module of own.modules) await expect(employeePage.getByText(module.module.title, { exact: true }).first()).toBeVisible()
    await employeePage.getByRole('button', { name: 'Adaptive Timeline', exact: true }).click()
    const timeline = employeePage.locator('ol').filter({ has: employeePage.getByRole('button', { name: '1. ' + own.modules[0]!.module.title, exact: true }) })
    const renderedIds = await timeline.locator(':scope > li').evaluateAll(rows => rows.map(row => row.querySelector('p.font-mono')?.textContent))
    expect(renderedIds).toEqual(expectedOrder)
    for (const item of own.modules) await expect(timeline.getByRole('button', { name: item.module.ordinal + '. ' + item.module.title, exact: true })).toBeVisible()
    await employeePage.screenshot({ path: info.outputPath('employee-approved-timeline-en.png'), fullPage: true })
    expect((await detail(page, id)).revision.overrides.slice(0, initial.revision.overrides.length)).toEqual(initial.revision.overrides)
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click(); await page.getByRole('button', { name: 'VI', exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('expert-approved-mobile-vi.png'), fullPage: true })
    expect(consoleErrors).toEqual([]);expect(failedRequests).toEqual([]) // actual network completes; only the application response is deliberately lost
    await info.attach('sanitized-identity-order.json', { body: JSON.stringify({ project: required('C3_COMPOSE_PROJECT'), answers, revision: captured.summary.revision, hash: captured.summary.contentHash, expectedOrder, validations, confirmations }), contentType: 'application/json' })
  } finally { await expert.close();await employee.close();await manager.close() }
})

test('R12/R14 E07 archived unresolved equal-hash Check locks every repair and retains approved archive', async ({ browser, baseURL }, info) => {
  expect(baseURL).toBe('http://127.0.0.1:38088'); expect(required('C3_COMPOSE_PROJECT')).toMatch(/^adapt-learn-graph-c3-pathway-[a-z0-9-]+$/)
  const expert = await browser.newContext({ baseURL }), employee = await browser.newContext({ baseURL }); const page = await expert.newPage()
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  try {
    await signIn(expert.request, 'C3_EXPERT'); await signIn(employee.request, 'C3_EMPLOYEE')
    const approved = await body<PathwayView>(await employee.request.get('/api/v1/employee/pathway'))
    expect(approved.status?.reviewStatus).toBe('APPROVED'); expect(approved.status?.requestId).toBeTruthy()
    const historyBefore = await body<unknown>(await employee.request.get('/api/v1/employee/baseline-attempts/history'))
    const masteryBefore = await body<unknown>(await employee.request.get('/api/v1/employee/target-role-selection/mastery'))
    const role = await body<{ levels: { id: string }[] }>(await employee.request.get('/api/v1/employee/target-roles/' + required('C3_ROLE_ID')))
    const other = role.levels.find(level => level.id !== required('C3_LEVEL_ID'))!; expect(other).toBeTruthy()
    async function choose(levelId: string) {
      const current = await body<{ selection: { selectionId: string } }>(await employee.request.get('/api/v1/employee/target-role-selection'))
      await command(employee.request, '/api/v1/employee/target-role-selection', { roleId: required('C3_ROLE_ID'), levelId, expectedCurrentSelectionId: current.selection.selectionId }, 200, 'put')
    }
    await choose(other.id); await choose(required('C3_LEVEL_ID')) // new confirmed selection, preserve prior approval/history and original baseline
    const gap = await body<GapPreview>(await employee.request.get('/api/v1/employee/role-gaps', { params: { roleId: required('C3_ROLE_ID'), levelId: required('C3_LEVEL_ID') } }))
    const admitted = await command<{ requestId: string }>(employee.request, '/api/v1/employee/initial-pathway-requests', { roleId: gap.roleId, levelId: gap.levelId, expectedSelectionId: gap.expectedSelectionId, expectedSelectionRevision: gap.expectedSelectionRevision, expectedGapInputHash: gap.gapInputHash }, 202)
    const id = admitted.requestId
    await expect.poll(async () => (await body<{ reviewStatus: string }>(await employee.request.get('/api/v1/employee/initial-pathway-requests/' + id))).reviewStatus, { timeout: 60000 }).toBe('AWAITING_EXPERT_REVIEW')
    await page.goto('/expert/pathway-review/' + id); let current = await detail(page, id)
    const provider = current.revision.plan.dependencies.find(g => g.providerModuleId && g.providerModuleId !== g.moduleId)?.providerModuleId
    expect(provider).toBeTruthy(); await row(page, 'Pathway Learning Modules', provider!).getByRole('button', { name: 'Exclude', exact: true }).click()
    current = await changed(page, id, current.summary.revision); expect(current.summary.validationStatus).toBe('UNRESOLVED'); await closeCheck(page)
    await choose(other.id) // actual owner transition archives the unresolved draft; no direct lifecycle fixture mutation
    current = await detail(page, id); expect(current.summary.reviewStatus).toBe('ARCHIVED')
    const checked = await body<{ validationStatus: string; revisionContentHash: string }>(await expert.request.get(reviewPath(id) + '/validation'))
    expect(checked.validationStatus).toBe('UNRESOLVED'); expect(checked.revisionContentHash).toBe(current.summary.contentHash)
    await page.reload(); let editRequests = 0
    page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith(reviewPath(id) + '/')) editRequests++ })
    await page.getByRole('button', { name: 'Check again', exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Check pathway and resolve issues' }); await expect(dialog).toBeVisible()
    const includes = dialog.getByRole('button', { name: 'Include', exact: true }); expect(await includes.count()).toBeGreaterThan(0)
    for (const button of await includes.all()) { await expect(button).toBeDisabled(); await button.evaluate(node => (node as HTMLButtonElement).click()) }
    expect(editRequests).toBe(0)
    await page.setViewportSize({ width: 390, height: 844 }); await expect(dialog.getByRole('button', { name: 'Close', exact: true }).first()).toBeInViewport()
    await page.screenshot({ path: info.outputPath('archived-unresolved-locked-mobile-en.png'), fullPage: true })
    await closeCheck(page); await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click(); await page.getByRole('button', { name: 'VI', exact: true }).click()
    await page.getByRole('button', { name: 'Kiểm tra lại', exact: true }).first().click()
    const viDialog = page.getByRole('dialog', { name: 'Kiểm tra và bổ sung lộ trình' }); await expect(viDialog).toBeVisible()
    const viIncludes = viDialog.getByRole('button', { name: 'Thêm', exact: true })
    expect(await viIncludes.count()).toBeGreaterThan(0)
    for (const button of await viIncludes.all()) await expect(button).toBeDisabled()
    await page.screenshot({ path: info.outputPath('archived-unresolved-locked-mobile-vi.png'), fullPage: true })
    await page.screenshot({ path: info.outputPath('archived-unresolved-locked-mobile-vi-viewport.png') })
    const denied = await command<{ code: string }>(expert.request, reviewPath(id) + '/inclusions', { expectedRevision: current.summary.revision, expectedContentHash: current.summary.contentHash, moduleId: provider, reason: null }, 409)
    expect(denied.code).toBe('STALE_REVISION'); const after = await detail(page, id)
    expect(after.revision).toEqual(current.revision)
    const archive = await body<PathwayView>(await employee.request.get('/api/v1/employee/pathways/' + approved.status!.requestId))
    expect(archive.archived).toBe(true);expect(archive.status?.revisionContentHash).toBe(approved.status!.revisionContentHash)
    expect(archive.modules.map(m => m.module)).toEqual(approved.modules.map(m => m.module));expect(archive.modules.every(m => m.accessState === 'ARCHIVED' && m.entry === null)).toBe(true)
    expect(await body<unknown>(await employee.request.get('/api/v1/employee/baseline-attempts/history'))).toEqual(historyBefore)
    expect(await body<unknown>(await employee.request.get('/api/v1/employee/target-role-selection/mastery'))).toEqual(masteryBefore);expect(errors).toEqual([])
    await info.attach('sanitized-archived-repair.json', { body: JSON.stringify({ revision: current.summary.revision, hash: current.summary.contentHash, status: current.summary.reviewStatus, validation: checked.validationStatus, disabledSuggestions: await viIncludes.count(), editRequests }), contentType: 'application/json' })
  } finally { await expert.close();await employee.close() }
})
