import { beforeEach, expect, it, vi } from 'vitest'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { readSkillScope } from './baselineApi'
vi.mock('../../../shared/api/workspaceFetch', () => ({ workspaceFetch: vi.fn() }))
const locator = { skillId: 'java', knowledgeLevel: 'FOUNDATION' as const, skillVersion: 'v1' }
const wire = () => ({ scope: locator, items: [], activeAttempts: [], totalAttempts: 0, unresolvedAttempts: 0, page: 0, pageSize: 20, hasMore: false, previousAttemptId: null, maxAttempts: 10, retakeAvailableAt: null, policyIssue: null, observedAt: '2026-11-17T00:00:00Z' })
beforeEach(() => vi.resetAllMocks())
it('uses an owned scope read, never client account/organization or a guessed module', async () => {
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify(wire()), { status: 200 }))
  const data = await readSkillScope(locator)
  expect(data.scope).toEqual(locator)
  const url = new URL(String(vi.mocked(workspaceFetch).mock.calls[0][0]), 'http://test')
  expect(url.pathname).toBe('/api/v1/employee/baseline-attempts/skill-scope/history')
  expect(url.searchParams.get('skillVersion')).toBe('v1'); expect(url.searchParams.has('moduleId')).toBe(false); expect(url.searchParams.has('organizationId')).toBe(false)
})
it('preserves a genuinely unavailable policy instead of inventing an attempt limit', async () => {
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify({ ...wire(), maxAttempts: null, policyIssue: 'ASSESSMENT_POLICY_REQUIRED' })))
  expect((await readSkillScope(locator)).maxAttempts).toBeNull()
})
it.each([
  { scope: { ...locator, skillVersion: 'other' } },
  { totalAttempts: -1 },
  { page: 2 },
  { maxAttempts: null, policyIssue: null },
  { observedAt: 'not-a-date' },
])('rejects malformed or mismatched group metadata', async changes => {
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify({ ...wire(), ...changes })))
  await expect(readSkillScope(locator)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
it('keeps server access denial explicit', async () => {
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify({ code: 'FORBIDDEN' }), { status: 403 }))
  await expect(readSkillScope(locator)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
})
