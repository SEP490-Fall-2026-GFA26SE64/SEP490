import { test, expect } from '@playwright/test'
// Explicit UI fixtures: these do not create real attempts or certify real scoring/policies.
function wire(finalized = false) {
  return { attemptId: finalized ? 'final-fixture' : 'active-fixture', target: { selectionId: null, selectionRevision: 0, stepId: null, moduleId: 'done', moduleRevision: 7 }, purpose: 'SKILL_ASSESSMENT', state: finalized ? 'FINALIZED' : 'IN_PROGRESS', revision: 1, startedAt: '2026-11-17T00:00:00Z', deadlineAt: '2026-11-17T00:10:00Z', observedAt: '2026-11-17T00:01:00Z', finishedAt: finalized ? '2026-11-17T00:01:00Z' : null, finishReason: finalized ? 'SUBMITTED' : null, previousAttemptId: null, groups: [{ id: 'g', skillName: 'Java', requirement: { skillId: 'java', knowledgeLevel: 'FOUNDATION', outcomeCodes: [] }, role: 'MAIN', totalCount: 1, requiredCorrectCount: 1, mandatoryRequired: true }], questions: [{ position: 1, itemVersionId: 'item-1', groupId: 'g', prompt: 'Fixture question', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], selectedOptionId: finalized ? 'a' : null }], results: finalized ? [{ groupId: 'g', correctCount: 1, totalCount: 1, mandatorySatisfied: true, passed: true, vetoTriggered: false, reasons: [] }] : [] }
}
for (const width of [1440, 390]) {
  test(`completed-module assessment CTA, exact revision, denial, resume and retake at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    const errors: string[] = [], failed: string[] = [], consoles: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoles.push(m.text()) })
    let phase = 'take', multiple = false
    const starts: Record<string, unknown>[] = [], contexts: URL[] = []
    await page.route('**/api/v1/organizations/*/micro-skills', r => r.fulfill({ json: [{ id: 'java', name: 'Java', code: 'JAVA', status: 'ACTIVE', version: 'v1' }] }))
    await page.route('**/api/v1/employee/knowledge-profile?*', r => r.fulfill({ json: { items: [], page: 0, pageSize: 20, hasMore: false } }))
    await page.route('**/api/v1/module-management/skills/java/modules', r => r.fulfill({ json: [
      { moduleId: 'done', title: 'Completed Java', contentVersion: 'content-v2', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 7, started: true, completed: true },
      { moduleId: 'learning', title: 'Keep learning Java', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 8, started: true, completed: false },
      { moduleId: 'locked', title: 'Locked Java', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 9, started: false, completed: true, unavailableReason: 'PREREQUISITE_NOT_MET' },
      ...(multiple ? [{ moduleId: 'alternative', title: 'Alternative completed Java', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 11, started: true, completed: true }] : []),
      { moduleId: 'unknown', title: 'Legacy Java', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: null, started: true, completed: true },
    ] }))
    await page.route('**/api/v1/employee/pathway', r => r.fulfill({ json: null }))
    await page.route('**/api/v1/workspace-auth/csrf', r => r.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'fixture' } }))
    await page.route('**/api/v1/employee/baseline-attempts/context?*', r => { contexts.push(new URL(r.request().url())); return r.fulfill({ json: phase === 'resume' ? wire() : phase === 'retake' ? wire(true) : null }) })
    await page.route('**/api/v1/employee/baseline-attempts', r => {
      expect(r.request().method()).toBe('POST'); expect(r.request().headers()['idempotency-key']).toBeTruthy()
      starts.push(r.request().postDataJSON())
      return r.fulfill(phase === 'policy' ? { status: 422, json: { code: 'ASSESSMENT_POLICY_REQUIRED' } } : { json: wire() })
    })
    await page.route('**/api/v1/employee/baseline-attempts/skill-scope/history?*', r => r.fulfill({ status: 404, json: { code: 'NOT_FOUND' } }))
    const enter = async () => { await page.goto('/system-tests/support/individual-skill.html'); await page.getByRole('button', { name: 'View modules', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Completed Java', exact: true })).toBeVisible() }
    await enter()
    const card = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { name: 'Completed Java', exact: true }) })
    const panel = page.getByRole('region', { name: 'Skill Assessment', exact: true })
    const take = panel.getByRole('button', { name: 'Take Skill Assessment', exact: true })
    await expect(take).toBeEnabled()
    expect(starts).toHaveLength(0)
    await expect(card.getByRole('button', { name: /Skill Assessment/ })).toHaveCount(0)
    await expect(panel.getByText('Learning evidence:', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Locked', exact: true })).toBeDisabled()
    await expect(page.locator('.catalog-card').getByRole('button', { name: /Skill Assessment/ })).toHaveCount(0)
    expect(contexts.every(url => url.searchParams.get('moduleId') === 'done' && url.searchParams.get('moduleRevision') === '7')).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/module-assessment-cta-${width}.png`, fullPage: true })
    await take.click(); await expect(page.getByRole('heading', { name: 'Assessment navigation reached' })).toBeVisible()
    expect(starts[0]).toMatchObject({ purpose: 'SKILL_ASSESSMENT', expectedSelectionId: null, expectedSelectionRevision: 0, stepId: null, moduleId: 'done', moduleRevision: 7, previousAttemptId: null })
    phase = 'policy'; await enter(); await panel.getByRole('button', { name: 'Take Skill Assessment', exact: true }).click()
    await expect(panel.getByRole('alert')).toContainText('active skill–knowledge level configuration')
    await expect(card.getByText('Content completed', { exact: true })).toBeVisible(); await expect(card.getByRole('button', { name: 'Review module', exact: true })).toBeEnabled()
    phase = 'retake'; await enter(); await panel.getByRole('button', { name: 'Retake Skill Assessment', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Assessment navigation reached' })).toBeVisible()
    expect(starts.at(-1)?.previousAttemptId).toBe('final-fixture')
    phase = 'resume'; await enter(); const count = starts.length
    await panel.getByRole('button', { name: 'Resume Skill Assessment', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Assessment navigation reached' })).toBeVisible()
    expect(starts).toHaveLength(count)
    phase = 'take'; multiple = true; await enter()
    const readCount = contexts.length
    await expect(panel.getByText('Choose a module to view its assessment attempts and conditions.')).toBeVisible()
    await expect(panel.getByRole('button', { name: /Take Skill Assessment/ })).toHaveCount(0)
    expect(contexts).toHaveLength(readCount)
    await panel.getByRole('button', { name: 'Completed module used for assessment' }).click()
    await page.getByRole('option', { name: /Alternative completed Java/ }).click()
    await expect(panel.getByRole('button', { name: 'Take Skill Assessment' })).toBeEnabled()
    expect(contexts.at(-1)?.searchParams.get('moduleId')).toBe('alternative')
    expect(contexts.at(-1)?.searchParams.get('moduleRevision')).toBe('11')
    await page.screenshot({ path: `test-results/skill-level-assessment-selection-${width}.png`, fullPage: true })
    await page.getByRole('tab', { name: /Intermediate/ }).click()
    await expect(page.getByRole('region', { name: 'Skill Assessment', exact: true }).getByText(/No completed eligible module/)).toBeVisible()
    expect(starts).toHaveLength(count); expect(errors).toEqual([]); expect(failed).toEqual([])
    await test.info().attach('console-including-deliberate-policy-denial', { body: JSON.stringify(consoles), contentType: 'application/json' })
  })
}
