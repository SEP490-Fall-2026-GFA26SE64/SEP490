import { test, expect as baseExpect, type APIRequestContext } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const expect = baseExpect.configure({ timeout: 30000 })
const root = '/api/v1/module-management'
async function write(request: APIRequestContext, method: 'post' | 'put', path: string, data: unknown = {}) {
  const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
  return request[method](path, { data, headers: { [csrf.headerName]: csrf.token, 'Idempotency-Key': randomUUID() } })
}
async function login(request: APIRequestContext, role: string) {
  const r = await write(request, 'post', '/api/v1/workspace-auth/sign-in', { email: role === 'expert' ? 'expert@technova.com' : `${role}@workspace.dev.invalid`, password: role === 'expert' ? (process.env.INDIVIDUAL_EXPERT_PASSWORD ?? 'Password123!') : (process.env.INDIVIDUAL_TEST_PASSWORD ?? 'Workspace-Development-490!') })
  expect(r.status()).toBe(200); return r.json()
}
test('isolated real independent learning, exact assessment admission, persisted achievement and mobile reader', async ({ browser, baseURL }) => {
  test.setTimeout(900000)
  expect(new URL(baseURL!).port).toBe('28088') // Refuse running fixture mutations on the shared workspace.
  const probe = await browser.newContext({ baseURL })
  try { await expect.poll(async () => { try { return (await probe.request.get('/api/v1/workspace-auth/csrf', { timeout: 5000 })).status() } catch { return 0 } }, { timeout: 600000, intervals: [5000] }).toBe(200) } finally { await probe.close() }
  const employee = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const expert = await browser.newContext({ baseURL })
  try {
    const identity = await login(employee.request, 'employee'); await login(expert.request, 'expert')
    const skillsResponse = await employee.request.get(`/api/v1/organizations/${identity.organizationId}/micro-skills`)
    expect(skillsResponse.status()).toBe(200)
    const skills = await skillsResponse.json()
    const skillFixture = skills.find((skill: any) => skill.id === 'MS-ARC02')
    expect(skillFixture).toBeTruthy()
    const list = await employee.request.get(`${root}/skills/${skillFixture.id}/modules`)
    expect(list.status()).toBe(200)
    const moduleFixture = (await list.json()).find((module: any) => module.moduleId === 'MOD-ARC02-FOUNDATION-01')
    expect(moduleFixture?.unavailableReason).toBeNull()
    expect((await write(employee.request, 'post', `${root}/skills/${skillFixture.id}/modules/${moduleFixture.moduleId}/learning`)).status()).toBe(204)
    const begin = await write(employee.request, 'post', `${root}/learning/${moduleFixture.moduleId}/begin`)
    expect(begin.status()).toBe(200)
    const fixtureView = await begin.json()
    expect(fixtureView.revision.payload.content.lessons.every((lesson: any) => lesson.type === 'TEXT')).toBe(true)
    const directory = await expert.request.get('/api/v1/assessment-policies/SKILL_ASSESSMENT/scopes?owner=MS-ARC02&level=FOUNDATION')
    expect(directory.status()).toBe(200)
    const scope = (await directory.json()).rows[0]?.scope
    expect(scope?.ready).toBe(true)
    const fixturePolicyPath = '/api/v1/assessment-policies/SKILL_ASSESSMENT/scopes/' + encodeURIComponent(scope.key)
    const fixtureWorkspace = await (await expert.request.get(fixturePolicyPath)).json()
    expect(fixtureWorkspace.groupCapacities.every((capacity: any) => capacity.maxQuestions >= capacity.minQuestions)).toBe(true)
    const chosen = { skill: skillFixture, module: moduleFixture, view: fixtureView, workspace: fixtureWorkspace, policyPath: fixturePolicyPath }
    expect(chosen, 'Released text module with no unmet prerequisites and a ready real question bank').toBeTruthy()
    const { skill, module, view, policyPath } = chosen
    let workspace = chosen.workspace
    if (!workspace.active) {
      let r
      if (!workspace.draft) { r = await write(expert.request, 'post', policyPath + '/draft', { commandKey: randomUUID(), expectedActivationRevision: workspace.activationRevision }); expect(r.status()).toBe(200); workspace = await r.json() }
      const configuration = { timeLimitSeconds: 600, retakeWaitSeconds: 0, maxAttempts: 5, groups: workspace.groupCapacities.map((c: any) => ({ skillId: c.skillId, knowledgeLevel: c.knowledgeLevel, totalCount: Math.max(1, c.minQuestions), requiredCorrectCount: Math.max(1, c.minQuestions), mandatoryRequired: true, allWrongVeto: false })) }
      r = await write(expert.request, 'put', policyPath + '/draft', { commandKey: randomUUID(), draftId: workspace.draft.id, expectedRevision: workspace.draft.revision, expectedCatalogHash: workspace.scope.catalogHash, configuration })
      expect(r.status()).toBe(200); workspace = await r.json()
      r = await write(expert.request, 'post', policyPath + '/activation', { commandKey: randomUUID(), draftId: workspace.draft.id, expectedRevision: workspace.draft.revision, expectedActivationRevision: workspace.activationRevision, expectedCatalogHash: workspace.scope.catalogHash })
      expect(r.status()).toBe(200)
    }
    const command = { purpose: 'SKILL_ASSESSMENT', expectedSelectionId: null, expectedSelectionRevision: 0, previousAttemptId: null, stepId: null, moduleId: module.moduleId, moduleRevision: view.revision.number }
    expect((await write(expert.request, 'post', '/api/v1/employee/baseline-attempts', command)).status()).toBe(403)
    expect((await write(employee.request, 'post', '/api/v1/employee/baseline-attempts', { ...command, purpose: 'BASELINE' })).status()).toBe(400)
    expect((await employee.request.get(`${root}/skills/unknown-test-skill/modules`)).status()).toBe(404)
    const premature = await write(employee.request, 'post', '/api/v1/employee/baseline-attempts', command)
    expect(premature.status()).toBe(409); expect((await premature.json()).code).toBe('EXACT_LEARNING_COMPLETION_REQUIRED')
    const page = await employee.newPage(), errors: string[] = [], failed: string[] = [], consoleErrors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.goto(`/workspace/${identity.workspaceSlug}/employee/upskilling?tab=skills`)
    await page.getByRole('searchbox', { name: 'Search skills or modules', exact: true }).fill(skill.name)
    await page.getByRole('button', { name: 'View modules', exact: true }).first().click()
    await expect(page.getByRole('dialog')).toContainText(module.title)
    await page.screenshot({ path: 'test-results/individual-skill-desktop.png', fullPage: true })
    // Real progress API with isolated fixture lessons, preserving all original learner records.
    for (const lesson of view.revision.payload.content.lessons) {
      const response = await write(employee.request, 'put', `${root}/learning/${module.moduleId}/lessons/${lesson.id}/progress`, { revision: view.revision.number, positionSeconds: 0, reachedEnd: true, complete: true })
      expect(response.status()).toBe(200)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/workspace/${identity.workspaceSlug}/employee/modules/${module.moduleId}`)
    await expect(page.getByRole('button', { name: 'Take Skill Assessment', exact: true })).toBeVisible({ timeout: 30000 })
    await page.screenshot({ path: 'test-results/individual-skill-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Take Skill Assessment', exact: true }).click()
    await expect(page).toHaveURL(/baseline-assessment\//)
    const id = page.url().split('/').pop()!
    let attempt = await (await employee.request.get('/api/v1/employee/baseline-attempts/' + id)).json()
    expect(attempt.target.selectionId).toBeNull()
    for (const q of attempt.questions) {
      // Isolated test-container access only; protected keys never enter the Employee API/UI.
      const answer = execFileSync('docker', ['exec', '-i', 'independent-skill-r3-postgres-1', 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-Atc', `SELECT protected_key->>'correctOptionId' FROM platform.item_version WHERE item_version_id='${q.itemVersionId}'::uuid`], { encoding: 'utf8' }).trim()
      const r = await write(employee.request, 'post', `/api/v1/employee/baseline-attempts/${id}/answers`, { expectedRevision: attempt.revision, position: q.position, itemVersionId: q.itemVersionId, selectedOptionId: answer })
      expect(r.status()).toBe(200); attempt = await r.json()
    }
    const submitted = await write(employee.request, 'post', `/api/v1/employee/baseline-attempts/${id}/submit`, { expectedRevision: attempt.revision })
    expect(submitted.status()).toBe(200); expect((await submitted.json()).results.every((g: any) => g.passed)).toBe(true)
    await expect.poll(() => execFileSync('docker', ['exec', '-i', 'independent-skill-r3-postgres-1', 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-Atc', `SELECT count(*) FROM platform.skill_knowledge_evidence WHERE source_id='${id}'::uuid`], { encoding: 'utf8' }).trim(), { timeout: 30000 }).toBe('1')
    await page.goto(`/workspace/${identity.workspaceSlug}/employee/upskilling?tab=skills`)
    await page.getByRole('searchbox', { name: 'Search skills or modules', exact: true }).fill(skill.name)
    await page.getByRole('button', { name: 'View modules', exact: true }).first().click()
    await expect(page.getByRole('tab', { name: /Foundation/ })).toContainText('Achieved')
    await expect(page.getByRole('tab', { name: /Advanced/ })).toContainText('Not achieved')
    await page.screenshot({ path: 'test-results/individual-skill-achieved-mobile.png', fullPage: true })
    expect(errors).toEqual([]); expect(failed).toEqual([])
    await test.info().attach('browser-console', { body: JSON.stringify(consoleErrors), contentType: 'application/json' })
  } finally { await employee.close(); await expert.close() }
})
