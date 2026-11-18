import { test, expect } from '@playwright/test'
// Explicit isolated API fixtures; do not seed or mutate learner evidence.
function evidence(changes: Record<string, unknown> = {}) {
  return { kind: 'EVIDENCE', id: 'path-e1', skillId: 'java', skillName: 'Java', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', outcomeCodes: [], observedAt: '2026-11-17T00:00:00Z', purpose: null, attemptId: 'pathway-attempt', correctCount: null, totalCount: null, passed: null, mandatorySatisfied: null, vetoTriggered: null, reasons: [], sourceKind: 'MODULE_ASSESSMENT', sourceId: 'pathway-attempt', reviewState: null, ...changes }
}
for (const width of [1440, 390]) {
  test(`My Skills merges all official evidence and preserves exact levels/versions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    const calls: number[] = [], writes: string[] = [], errors: string[] = [], consoles: string[] = [], failed: string[] = []
    page.on('pageerror', e => errors.push(e.message)); page.on('requestfailed', r => failed.push(r.url())); page.on('console', m => { if (m.type() === 'error') consoles.push(m.text()) })
    await page.route('**/api/v1/employee/knowledge-profile?*', r => {
      if (r.request().method() !== 'GET') writes.push(r.request().method())
      const p = Number(new URL(r.request().url()).searchParams.get('page')); calls.push(p)
      const diagnostic = Array.from({ length: 19 }, (_, i) => evidence({ id: 'diag' + i, kind: 'DIAGNOSTIC', skillName: 'Diagnostic only', skillId: 'diagnostic', purpose: 'BASELINE', passed: true, correctCount: 3, totalCount: 3, mandatorySatisfied: true, vetoTriggered: false }))
      const items = p === 0 ? [evidence(), ...diagnostic] : [evidence(), evidence({ id: 'ind-e2', sourceId: 'independent-attempt', attemptId: 'independent-attempt' }), evidence({ id: 'adv', knowledgeLevel: 'ADVANCED', sourceId: 'independent-advanced', attemptId: 'independent-advanced' }), evidence({ id: 'old', skillVersion: 'v0', knowledgeLevel: 'INTERMEDIATE' }), evidence({ id: 'review', kind: 'REVIEW', reviewState: 'NEED_REVIEW', sourceKind: 'SKILL_ASSESSMENT' }), evidence({ id: 'cert', skillId: 'git', skillName: 'Git', sourceKind: 'CERTIFICATE', attemptId: null })]
      return r.fulfill({ json: { items, page: p, pageSize: 20, hasMore: p === 0 } })
    })
    await page.goto('/system-tests/support/my-skills.html')
    await expect(page.getByText('3 skill versions with achieved levels', { exact: true })).toBeVisible()
    expect(calls).toEqual([0, 1]); expect(writes).toEqual([])
    await expect(page.getByText('Diagnostic only')).toHaveCount(0)
    const list = page.getByRole('list', { name: 'Achieved skills' })
    await expect(list.getByRole('listitem')).toHaveCount(3)
    await expect(page.getByRole('button', { name: 'Java · Intermediate · v1', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Java · Foundation · v0', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/my-skills-${width}.png`, fullPage: true })
    await page.getByRole('searchbox', { name: 'Search skills' }).fill('Java')
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await page.getByRole('button', { name: 'Achieved level' }).click(); await page.getByRole('option', { name: 'Advanced', exact: true }).click()
    await expect(list.getByRole('listitem')).toHaveCount(1)
    await page.getByRole('button', { name: 'Java · Foundation · v1', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Achievement details' })
    await expect(dialog.getByText('Needs review — achievement retained', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('listitem')).toHaveCount(2)
    await expect(dialog.getByRole('link', { name: 'View assessment result' }).nth(0)).toHaveAttribute('href', /pathway-attempt/)
    await expect(dialog.getByRole('link', { name: 'View assessment result' }).nth(1)).toHaveAttribute('href', /independent-attempt/)
    await page.screenshot({ path: `test-results/my-skills-detail-${width}.png`, fullPage: true })
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Java · Foundation · v1', exact: true })).toBeFocused()
    await page.getByRole('searchbox', { name: 'Search skills' }).fill('absent')
    await expect(page.getByText('No matching achieved skills')).toBeVisible()
    await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
    await page.getByRole('button', { name: 'Java · Advanced · v1', exact: true }).click()
    await dialog.getByRole('link', { name: 'View assessment result' }).click()
    await expect(page.getByRole('heading', { name: 'Assessment result navigation reached' })).toBeVisible()
    expect(errors).toEqual([]); expect(failed).toEqual([]); expect(consoles).toEqual([])
  })
  test(`My Skills loading, empty, retry and denied states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    let phase = 'error'
    await page.route('**/api/v1/employee/knowledge-profile?*', r => r.fulfill(phase === 'error' ? { status: 503, json: { code: 'DEPENDENCY_UNAVAILABLE' } } : phase === 'denied' ? { status: 403, json: { code: 'FORBIDDEN' } } : { json: { items: [], page: 0, pageSize: 20, hasMore: false } }))
    await page.goto('/system-tests/support/my-skills.html')
    await expect(page.getByRole('alert')).toContainText('could not be fully loaded')
    await expect(page.getByText('No achieved skills yet')).toHaveCount(0)
    phase = 'empty'; await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await expect(page.getByText('No achieved skills yet')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    phase = 'denied'; await page.getByRole('button', { name: 'Refresh', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Sign in as an Employee')
    await expect(page.getByRole('searchbox')).toHaveCount(0)
  })
}
