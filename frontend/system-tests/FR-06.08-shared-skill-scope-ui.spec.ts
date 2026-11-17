import { test, expect } from '@playwright/test'
// Isolated HTTP fixtures exercise the real components; PostgreSQL/service suites verify persistence separately.
for (const width of [1440, 390]) {
  test(`shared skill history survives module selection and preserves legacy papers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    const errors: string[] = [], failed: string[] = [], consoleErrors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    const requests: URL[] = []; let posts = 0, phase = 'history'
    const scope = { skillId: 'java', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1' }
    const summary = (id: string, active = false, pathway = false) => ({ attemptId: id, target: { selectionId: pathway ? 'old-pathway' : null, selectionRevision: pathway ? 1 : 0, stepId: pathway ? 'old-step' : null, moduleId: id, moduleRevision: 7 }, state: active ? 'IN_PROGRESS' : 'FINALIZED', startedAt: '2026-11-17T00:00:00Z', deadlineAt: '2026-11-17T00:20:00Z', finishedAt: active ? null : '2026-11-17T00:01:00Z', finishReason: active ? null : 'SUBMITTED', previousAttemptId: null })
    await page.route('**/api/v1/organizations/*/micro-skills', r => r.fulfill({ json: [{ id: 'java', name: 'Java', code: 'JAVA', status: 'ACTIVE', version: 'v1' }] }))
    await page.route('**/api/v1/employee/knowledge-profile?*', r => r.fulfill({ json: { items: [], page: 0, pageSize: 20, hasMore: false } }))
    await page.route('**/api/v1/module-management/skills/java/modules', r => r.fulfill({ json: ['module-A', 'module-B'].map((moduleId, i) => ({ moduleId, title: `Completed ${moduleId}`, contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 7 + i, started: true, completed: true })) }))
    await page.route('**/api/v1/employee/baseline-attempts', r => { posts++; return r.fulfill({ status: 500, json: { code: 'UNEXPECTED_START' } }) })
    await page.route('**/api/v1/employee/baseline-attempts/skill-scope/history?*', r => {
      const url = new URL(r.request().url()); requests.push(url)
      const active = phase === 'active' ? [summary('legacy-individual', true), summary('legacy-pathway', true, true)] : []
      return r.fulfill({ json: { scope: { ...scope, knowledgeLevel: url.searchParams.get('knowledgeLevel') }, items: active.length ? active : [summary('old-module', false, true)], activeAttempts: active, totalAttempts: active.length ? 3 : 2, unresolvedAttempts: 0, page: 0, pageSize: 20, hasMore: false, previousAttemptId: 'old-module', maxAttempts: phase === 'limit' ? 2 : 10, retakeAvailableAt: null, policyIssue: null, observedAt: '2026-11-17T00:10:00Z' } })
    })
    const enter = async () => { await page.goto('/system-tests/support/individual-skill.html'); await page.getByRole('button', { name: 'View modules', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Completed module-A' })).toBeVisible() }
    await enter()
    const panel = page.getByRole('region', { name: 'Skill Assessment', exact: true })
    await expect(panel.getByText('Attempts used: 2 / 10')).toBeVisible()
    const picker = panel.getByRole('button', { name: 'Learning evidence for the new attempt' })
    await picker.click(); await page.getByRole('option', { name: 'Completed module-A', exact: true }).click()
    await expect(panel.getByRole('button', { name: 'Retake Skill Assessment' })).toBeEnabled()
    await picker.click(); await page.getByRole('option', { name: 'Completed module-B', exact: true }).click()
    await expect(panel.getByText('Attempts used: 2 / 10')).toBeVisible()
    await panel.getByRole('button', { name: 'Assessment history' }).click()
    const dialog = page.getByRole('dialog', { name: 'Shared assessment history' })
    await expect(dialog.getByText('Pathway', { exact: true })).toBeVisible()
    await expect(dialog.getByText(/old-module/)).toBeVisible()
    await page.screenshot({ path: `test-results/shared-skill-history-${width}.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    expect(requests.every(u => u.searchParams.get('skillId') === 'java' && !u.searchParams.has('moduleId'))).toBe(true)
    phase = 'limit'; await enter()
    await expect(panel.getByText('Attempts used: 2 / 2')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Retake Skill Assessment' })).toBeDisabled()
    phase = 'active'; await enter()
    await expect(panel.getByRole('button', { name: 'Resume Skill Assessment' })).toHaveCount(2)
    await expect(panel.getByRole('button', { name: 'Retake Skill Assessment' })).toHaveCount(0)
    await expect(picker).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/shared-skill-active-${width}.png`, fullPage: true })
    await panel.getByRole('button', { name: 'Resume Skill Assessment' }).nth(1).click()
    await expect(page.getByRole('heading', { name: 'Assessment navigation reached' })).toBeVisible()
    expect(posts).toBe(0); expect(errors).toEqual([]); expect(failed).toEqual([]); expect(consoleErrors).toEqual([])
  })
}
