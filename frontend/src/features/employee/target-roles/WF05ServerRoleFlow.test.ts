import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { chooseCurrentRole, currentRoles, prepareRoleChoice, readRoleFlow } from './currentRoleFlowApi'
vi.mock('../../../shared/api/workspaceFetch', () => ({ workspaceFetch: vi.fn() }))
const role = { id: 'R1', code: 'R1', name: 'Role', scope: 'Scope', jobPositionId: 'J1', jobPositionName: 'Job', catalogVersion: 'v1', fingerprint: 'a'.repeat(64), levels: [{ id: 'ACTUAL-MEMBER-ID', code: 'L', name: 'Level', rank: 1, context: 'Context', attainmentRule: 'ALL', skills: [{ id: 'A', code: 'A', name: 'A', requiredKnowledgeLevels: ['FOUNDATION'], mandatory: true }] }] }
beforeEach(() => { vi.stubEnv('VITE_LOCAL_BASELINE_DEMO_ENABLED', 'false'); vi.mocked(workspaceFetch).mockReset() })
afterEach(() => { localStorage.clear(); vi.unstubAllEnvs() })
it('WF05 regression: the Role catalog retains server member-Level IDs without reconstruction or numeric targets', async () => {
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify([role]), { status: 200 }))
  const result = await currentRoles()
  expect(result[0].levels[0].id).toBe('ACTUAL-MEMBER-ID')
  expect(result[0].levels[0].skills[0].requiredKnowledgeLevels).toEqual(['FOUNDATION'])
  expect(result[0].levels[0].skills[0].requiredScore).toBeUndefined()
  expect(workspaceFetch).toHaveBeenCalledTimes(1)
  expect(workspaceFetch).toHaveBeenCalledWith('/api/v1/employee/target-roles', expect.objectContaining({ method: 'GET' }))
})
it('WF05 regression: server selection/readiness/target lock remain authoritative despite browser selection keys', async () => {
  localStorage.setItem('alg_employee_active_role_employee@wf05.test', JSON.stringify({ roleId: 'FAKE', levelId: 'FAKE' }))
  const selected = { selectionId: 'SERVER-SELECTION', role, revision: 4, selectedAt: '2026-11-16T00:00:00Z', available: true, levelId: 'ACTUAL-MEMBER-ID' }
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify({ selection: selected, progress: { state: 'BASELINE_REQUIRED', requiredCount: 1, coveredCount: 0, attemptId: null, baselineVersion: 1 }, placement: null, targetLocked: true }), { status: 200 }))
  const result = await readRoleFlow()
  expect(result.selection?.selectionId).toBe('SERVER-SELECTION')
  expect(result.selection?.levelId).toBe('ACTUAL-MEMBER-ID')
  expect(result.progress.state).toBe('BASELINE_REQUIRED')
  expect(result.targetLocked).toBe(true)
  expect(workspaceFetch).toHaveBeenCalledTimes(1)
})
it('WF05 regression: denied selection propagates its server conflict without local success or browser writes', async () => {
  const before = localStorage.length
  vi.mocked(workspaceFetch).mockResolvedValue(new Response(JSON.stringify({ code: 'TARGET_ROLE_LEVEL_LOCKED' }), { status: 409 }))
  const command = prepareRoleChoice('R1', 'CURRENT', 'ACTUAL-MEMBER-ID')
  await expect(chooseCurrentRole(command)).rejects.toMatchObject({ code: 'TARGET_ROLE_LEVEL_LOCKED', status: 409 })
  expect(localStorage.length).toBe(before)
  expect(workspaceFetch).toHaveBeenCalledWith('/api/v1/employee/target-role-selection', expect.objectContaining({ method: 'PUT', body: command.body, headers: expect.objectContaining({ 'Idempotency-Key': command.key }) }))
})
it('WF05 regression: unavailable server state remains an error rather than fabricated READY', async () => {
  vi.mocked(workspaceFetch).mockRejectedValue(new Error('offline'))
  await expect(readRoleFlow()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
})
