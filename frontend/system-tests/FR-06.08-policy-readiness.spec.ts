import { test, expect } from '@playwright/test'

// Browser feature test with controlled HTTP ports, not a deployed backend/database journey.
test('FR-06.08-SYS01: missing server policy blocks a new assessment without sending a start command', async ({ page }) => {
  const unexpected: string[] = [], errors: string[] = []
  let starts = 0
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/v1/**', route => { unexpected.push(route.request().url()); return route.fulfill({ status: 404, json: {} }) })
  await page.route('**/api/v1/organizations/*/micro-skills', route => route.fulfill({ json: [{ id: 'java', name: 'Java', code: 'JAVA', status: 'ACTIVE', version: 'v1' }] }))
  await page.route('**/api/v1/employee/knowledge-profile?*', route => route.fulfill({ json: { items: [], page: 0, pageSize: 20, hasMore: false } }))
  await page.route('**/api/v1/module-management/skills/java/modules', route => route.fulfill({ json: [{ moduleId: 'module-A', title: 'Completed Java', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', moduleRevision: 1, started: true, completed: true }] }))
  await page.route('**/api/v1/employee/baseline-attempts', route => { starts++; return route.fulfill({ status: 500, json: { code: 'UNEXPECTED_START' } }) })
  await page.route('**/api/v1/employee/baseline-attempts/skill-scope/history?*', route => route.fulfill({ json: {
    scope: { skillId: 'java', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1' }, items: [], activeAttempts: [],
    totalAttempts: 0, unresolvedAttempts: 0, page: 0, pageSize: 20, hasMore: false, previousAttemptId: null,
    maxAttempts: null, retakeAvailableAt: null, policyIssue: 'ASSESSMENT_POLICY_REQUIRED', observedAt: '2026-11-23T00:00:00Z',
  } }))
  await page.goto('/system-tests/support/individual-skill.html')
  await page.getByRole('button', { name: 'View modules', exact: true }).click()
  const panel = page.getByRole('region', { name: 'Skill Assessment', exact: true })
  await expect(panel.getByText('Attempts used: 0')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Take Skill Assessment', exact: true })).toBeDisabled()
  expect(starts).toBe(0)
  expect(unexpected).toEqual([])
  expect(errors).toEqual([])
})
