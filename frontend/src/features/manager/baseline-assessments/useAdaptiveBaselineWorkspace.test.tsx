import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as api from './adaptiveBaselineApi'
import type { AdaptiveWorkspace } from './adaptiveBaselineApi'
import { adaptiveApproval, useAdaptiveBaselineWorkspace } from './useAdaptiveBaselineWorkspace'
import { boundsDraft } from './adaptiveBaselineDraft'
vi.mock('./adaptiveBaselineApi', async () => ({ ...await vi.importActual('./adaptiveBaselineApi'), getAdaptiveWorkspace: vi.fn(), saveAdaptiveWorking: vi.fn(), discardAdaptiveWorking: vi.fn(), testAdaptiveBlueprint: vi.fn(), finalizeAdaptiveBlueprint: vi.fn() }))
const workspace: AdaptiveWorkspace = { occupationId: 'occ-a', capacity: { occupationName: 'Fixture', catalogFingerprint: 'f1', explorationCapacity: 135, explorationMissingParameterCount: 0, roles: {}, occupation: { eligibleCapacity: 135, skillCount: 15, minimumPerSkill: 3, minimumQuestions: 45, modelMaxQuestions: 4096 } }, working: { blueprintId: 'blueprint', workingRevisionId: 'draft-1', revision: 1, updatedAt: '2026-10-23T00:00:00Z', noOp: false, configuration: { name: 'Draft', occupationBounds: { maxQuestions: 45, timeLimitSeconds: 3000 } } }, current: { id: { blueprintId: 'blueprint', version: 1 }, configuration: { name: 'Active v1', occupationBounds: { maxQuestions: 45, timeLimitSeconds: 2700 } }, occupationName: 'Fixture', catalogFingerprint: 'f1', pins: { modelVersionId: 'm1', masteryMappingVersionId: 'mm1', parameterSetId: 'p1' }, roles: {}, createdAt: '2026-10-22T00:00:00Z' }, activation: { revision: 1, current: { blueprintId: 'blueprint', version: 1 }, changedAt: '2026-10-22T00:00:00Z' }, admissionReadiness: 'READY' }
beforeEach(() => { vi.mocked(api.getAdaptiveWorkspace).mockResolvedValue(structuredClone(workspace)); vi.mocked(api.saveAdaptiveWorking).mockResolvedValue(workspace.working!); vi.mocked(api.discardAdaptiveWorking).mockResolvedValue(workspace.working!) })
afterEach(cleanup)
it('VB01/02 Draft loads independently of Active and unchanged Save sends nothing', async () => {
 const { result } = renderHook(() => useAdaptiveBaselineWorkspace('occ-a'))
 await waitFor(() => expect(result.current.busy).toBe(false))
 expect(result.current.draft?.name).toBe('Draft'); expect(result.current.draft?.occupation.totalSeconds).toBe('3000')
 act(() => result.current.command('save')); expect(api.saveAdaptiveWorking).not.toHaveBeenCalled()
 expect(result.current.workspace?.current?.configuration.name).toBe('Active v1')
})
it('VB04 after known Save success and failed GET retries only reads', async () => {
 vi.mocked(api.getAdaptiveWorkspace).mockResolvedValueOnce(structuredClone(workspace)).mockRejectedValueOnce(new api.AdaptiveBaselineApiError(0,'NETWORK_ERROR')).mockResolvedValueOnce(workspace)
 const { result } = renderHook(() => useAdaptiveBaselineWorkspace('occ-a'))
 await waitFor(() => expect(result.current.busy).toBe(false))
 act(() => result.current.edit({ name: 'Edited', occupation: boundsDraft({ maxQuestions: 100, timeLimitSeconds: 6600 }) }))
 act(() => result.current.command('save'))
 await waitFor(() => expect(result.current.writeCommitted).toBe(true))
 expect(result.current.pending).toBe(true); expect(api.saveAdaptiveWorking).toHaveBeenCalledTimes(1)
 await act(async () => result.current.retry())
 expect(api.saveAdaptiveWorking).toHaveBeenCalledTimes(1); expect(api.getAdaptiveWorkspace).toHaveBeenCalledTimes(3)
 expect(result.current.pending).toBe(false)
})
it('VB03 discard requires confirmed exact Draft identity and revision', async () => {
 const { result } = renderHook(() => useAdaptiveBaselineWorkspace('occ-a'))
 await waitFor(() => expect(result.current.busy).toBe(false))
 act(() => result.current.command('discard','',{ ...adaptiveApproval(workspace), workingId: 'stale-id' }))
 expect(result.current.error?.code).toBe('VERSION_CONFLICT'); expect(api.discardAdaptiveWorking).not.toHaveBeenCalled()
})
it('VB03 confirmed discard uses original key/id/revision during ambiguous retry', async () => {
 vi.mocked(api.discardAdaptiveWorking).mockRejectedValueOnce(new api.AdaptiveBaselineApiError(0,'NETWORK_ERROR')).mockResolvedValueOnce(workspace.working!)
 const { result } = renderHook(() => useAdaptiveBaselineWorkspace('occ-a'))
 await waitFor(() => expect(result.current.busy).toBe(false))
 act(() => result.current.command('discard','',adaptiveApproval(workspace)))
 await waitFor(() => expect(result.current.error?.code).toBe('NETWORK_ERROR'))
 await act(async () => result.current.retry())
 expect(api.discardAdaptiveWorking).toHaveBeenCalledTimes(2)
 expect(vi.mocked(api.discardAdaptiveWorking).mock.calls[1]).toEqual(vi.mocked(api.discardAdaptiveWorking).mock.calls[0])
 expect(vi.mocked(api.discardAdaptiveWorking).mock.calls[0].slice(0,3)).toEqual(['occ-a','draft-1',1])
})
it('VB04 preview binding is invalidated by edits before activation', async () => {
 vi.mocked(api.testAdaptiveBlueprint).mockResolvedValue({ feasible: true, shortages: [], sample: [] })
 const { result } = renderHook(() => useAdaptiveBaselineWorkspace('occ-a'))
 await waitFor(() => expect(result.current.busy).toBe(false))
 await act(async () => result.current.test()); expect(result.current.canActivate).toBe(true)
 act(() => result.current.edit({ ...result.current.draft!, name: 'Unsaved' }))
 expect(result.current.canActivate).toBe(false)
 act(() => result.current.command('finalize','',adaptiveApproval(workspace)))
 expect(api.finalizeAdaptiveBlueprint).not.toHaveBeenCalled()
})
