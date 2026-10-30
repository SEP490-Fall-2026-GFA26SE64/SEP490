import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkReview, initialSession, PathwayError, prepareReviewCommand, readArchivedPathway, readInitialPathway, readReviewDetail, sendPathwayCommand } from './initialPathway'
import { reviewFixture, target } from '../../features/expert/pathway-review/reviewTestFixtures'

const fetcher = vi.fn()
beforeEach(() => { vi.stubGlobal('fetch', fetcher); fetcher.mockReset() })
afterEach(() => vi.unstubAllGlobals())
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
function wire() { const d = reviewFixture(); return { ...d, revision: { ...d.revision, overrides: [['MOVE_UP', 'M-B', 'saved'], ['REMOVE', 'M-OLD', 'neutral']] } } }
describe('REQ-019/020 API client and E01/E09 projection boundaries (mock HTTP only)', () => {
  it.each(['inclusions', 'exclusions', 'removals', 'move-up', 'move-down', 'confirmation'] as const)('R03 prepares %s with exact tuple and no tenant/actor fields', action => {
    const command = prepareReviewCommand('path/19', reviewFixture(), action, 'M-A', 'reason')
    expect(command.path).toBe('expert/initial-pathways/path%2F19/' + (action.startsWith('move-') ? 'moves' : action))
    const expected = { expectedRevision: 4, expectedContentHash: 'a'.repeat(64) }
    expect(JSON.parse(command.body)).toEqual(action === 'confirmation' ? expected : { ...expected, moduleId: 'M-A', reason: 'reason', ...(action.startsWith('move-') ? { direction: action === 'move-up' ? 'UP' : 'DOWN' } : {}) })
    expect(command.key).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('R01 command obtains session CSRF and exact retries reuse key/body', async () => {
    fetcher.mockImplementation((url: string) => Promise.resolve(respond(url.endsWith('/csrf') ? { headerName: 'X-CSRF-TOKEN', token: 'unit-token' } : { pathwayId: 'p' })))
    const command = prepareReviewCommand('p', reviewFixture(), 'confirmation')
    await sendPathwayCommand(command); await sendPathwayCommand(command)
    const posts = fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(posts).toHaveLength(2)
    for (const [, init] of posts) {
      expect(init.body).toBe(command.body); expect(init.credentials).toBe('same-origin'); expect(init.cache).toBe('no-store')
      expect(init.headers.get('Idempotency-Key')).toBe(command.key); expect(init.headers.get('X-CSRF-TOKEN')).toBe('unit-token')
      expect(init.headers.has('X-User-Role')).toBe(false)
    }
  })
  it('R09 each Check issues validation GET; no command or detail implicitly fetched', async () => {
    fetcher.mockResolvedValue(respond({ validationStatus: 'VALID', diagnostics: [], revisionContentHash: 'a'.repeat(64), warnings: [] }))
    await checkReview('p'); fetcher.mockResolvedValue(respond({ validationStatus: 'VALID', diagnostics: [], revisionContentHash: 'a'.repeat(64), warnings: [] })); await checkReview('p')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.every(([url, init]) => url === '/api/v1/expert/initial-pathways/p/validation' && init.method === undefined && init.cache === 'no-store')).toBe(true)
  })
  it('R02 parses current teaching fields and all saved override intents', async () => {
    fetcher.mockResolvedValue(respond(wire())); const detail = await readReviewDetail('p')
    expect(detail.revision.overrides).toEqual([{ action: 'MOVE_UP', moduleId: 'M-B', reason: 'saved' }, { action: 'REMOVE', moduleId: 'M-OLD', reason: 'neutral' }])
    expect(detail.revision.plan.modules[0]!.targets[0]).toEqual(target)
  })
  it('P19 legacy teaching stays legacy; mixed format rejects', async () => {
    const d = wire(), legacy = { skillId: 'S', instructionLevel: 'FOUNDATIONAL' }
    const old = { ...d, candidates: [], revision: { ...d.revision, plan: { ...d.revision.plan, modules: d.revision.plan.modules.map(m => ({ ...m, targets: [legacy] })) } } }
    fetcher.mockResolvedValue(respond(old)); const parsed = await readReviewDetail('p')
    expect(parsed.revision.plan.modules[0]!.targets[0]).toEqual({ ...legacy, teachingFocus: null, difficultyLevel: null, coverageRole: null, expertAttention: false, attentionReason: null })
    old.revision.plan.modules[0]!.targets = [{ ...legacy, teachingFocus: 'PRIMARY' } as typeof legacy]
    fetcher.mockResolvedValue(respond(old)); await expect(readReviewDetail('p')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
  it('R14 inversion retains safe diagnostics without invented reasons', async () => {
    fetcher.mockResolvedValue(respond({ code: 'PREREQUISITE_ORDER_VIOLATION', diagnostics: ['PREREQUISITE_ORDER:P:D:S', 12] }, 422))
    await expect(readReviewDetail('p')).rejects.toMatchObject({ status: 422, diagnostics: ['PREREQUISITE_ORDER:P:D:S'] })
  })
  it('E01 own and archive URLs never accept arbitrary learner/tenant input', async () => {
    fetcher.mockImplementation(() => Promise.resolve(respond({ status: null, modules: [], dependencies: [], archived: false })))
    await readInitialPathway(); await readArchivedPathway('foreign/id')
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/v1/employee/pathway', '/api/v1/employee/pathways/foreign%2Fid'])
  })
  it('R11 network and invalid successful responses remain uncertain; 404 is definitive', async () => {
    fetcher.mockRejectedValueOnce(new TypeError('offline')); await expect(readReviewDetail('p')).rejects.toMatchObject({ code: 'NETWORK_ERROR', ambiguous: true })
    fetcher.mockResolvedValueOnce(respond({ invalid: true })); await expect(readReviewDetail('p')).rejects.toMatchObject({ code: 'INVALID_RESPONSE', ambiguous: true })
    expect(new PathwayError('PATHWAY_NOT_FOUND', 404).ambiguous).toBe(false)
  })
  it('R01 only complete single-role trusted session is accepted', async () => {
    fetcher.mockResolvedValueOnce(respond({ stage: 'COMPLETE', accountId: 'a', organizationId: 'ORG-A', roles: ['DOMAIN_EXPERT'] }))
    expect(await initialSession()).toEqual({ actorId: 'a', organizationId: 'ORG-A', role: 'DOMAIN_EXPERT', persona: 'workspace' })
    fetcher.mockResolvedValueOnce(respond({ stage: 'COMPLETE', accountId: 'a', organizationId: 'ORG-A', roles: ['EMPLOYEE', 'DOMAIN_EXPERT'] }))
    await expect(initialSession()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
