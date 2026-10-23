import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { CurrentRolePanel } from './CurrentRolePanel'
import { RoleBaselineGate } from './RoleBaselineGate'
import * as api from './currentRoleFlowApi'
import type { CurrentRole, RoleFlowView } from './currentRoleFlowApi'
vi.mock('./currentRoleFlowApi', async () => ({ ...await vi.importActual('./currentRoleFlowApi'), currentRoles: vi.fn(), readRoleFlow: vi.fn(), chooseCurrentRole: vi.fn() }))
vi.mock('../baseline-assessment/useBaselineAttempt', () => ({ useBaselineAttempt: () => ({ locked: false, busy: false, error: null, pending: null, run: vi.fn() }) }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const role: CurrentRole = { id: 'role-a', code: 'A', name: 'Role A', scope: 'Build APIs', occupationId: 'occ-a', occupationName: 'Occupation A', catalogVersion: 'f1', fingerprint: 'f1', levels: [{ id: 'l1', code: 'L1', name: 'Junior', rank: 1, context: 'Context', attainmentRule: 'ALL', skills: [{ id: 's1', code: 'S1', name: 'Skill 1', requiredScore: .7, mandatory: true }] }] }
const empty: RoleFlowView = { selection: null, progress: { state: 'SELECT_ROLE', requiredCount: 0, coveredCount: 0, attemptId: null, baselineVersion: null } }
const selected: RoleFlowView = { selection: { selectionId: 'sel-1', role, revision: 1, selectedAt: '2026-10-23T00:00:00Z', available: true }, progress: { state: 'BASELINE_REQUIRED', requiredCount: 15, coveredCount: 14, attemptId: null, baselineVersion: 1 } }
function show(node = <CurrentRolePanel />, path = '/') {
 const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
 render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{node}</MemoryRouter></QueryClientProvider>)
 return client
}
beforeEach(() => { vi.mocked(api.currentRoles).mockResolvedValue([role]); vi.mocked(api.readRoleFlow).mockResolvedValue(empty); vi.mocked(api.chooseCurrentRole).mockResolvedValue(selected.selection!) })
afterEach(cleanup)
it('RB02/03 renders string Role details with separate Level and current requirements', async () => {
 show(); await screen.findByText('Role A'); fireEvent.click(screen.getByRole('button', { name: 'roleFlow.details' }))
 const dialog = screen.getByRole('dialog'); expect(within(dialog).getByText('Junior')).toBeTruthy(); expect(within(dialog).getByText(/Skill 1/)).toBeTruthy()
 expect(api.chooseCurrentRole).not.toHaveBeenCalled()
})
it('RB11 after committed choice and failed reconciliation retries GET only', async () => {
 vi.mocked(api.readRoleFlow).mockResolvedValueOnce(empty).mockRejectedValueOnce(new api.RoleFlowError('NETWORK_ERROR')).mockResolvedValueOnce(selected)
 show(); await screen.findByText('Role A'); fireEvent.click(screen.getByRole('button', { name: 'roleFlow.choose' }))
 fireEvent.click(screen.getByRole('button', { name: 'roleFlow.confirm' }))
 await screen.findByRole('button', { name: 'roleFlow.retry' }); expect(api.chooseCurrentRole).toHaveBeenCalledTimes(1)
 fireEvent.click(screen.getByRole('button', { name: 'roleFlow.retry' }))
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
 expect(api.chooseCurrentRole).toHaveBeenCalledTimes(1); expect(api.readRoleFlow).toHaveBeenCalledTimes(3)
})
it('RB05 unknown write outcome retains identical body/key and locks cancel', async () => {
 vi.mocked(api.chooseCurrentRole).mockRejectedValueOnce(new api.RoleFlowError('NETWORK_ERROR')).mockResolvedValueOnce(selected.selection!)
 vi.mocked(api.readRoleFlow).mockResolvedValueOnce(empty).mockResolvedValue(selected)
 show(); await screen.findByText('Role A'); fireEvent.click(screen.getByRole('button', { name: 'roleFlow.choose' }))
 fireEvent.click(screen.getByRole('button', { name: 'roleFlow.confirm' }))
 await screen.findByRole('button', { name: 'roleFlow.retry' })
 expect((screen.getAllByRole('button', { name: 'roleFlow.cancel' }).find(b => b.textContent === 'roleFlow.cancel')! as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button', { name: 'roleFlow.retry' }))
 await waitFor(() => expect(api.chooseCurrentRole).toHaveBeenCalledTimes(2))
 expect(vi.mocked(api.chooseCurrentRole).mock.calls[1][0]).toEqual(vi.mocked(api.chooseCurrentRole).mock.calls[0][0])
})
it('RB07/14 complete low-score coverage exposes continuation without start', () => {
 show(<RoleBaselineGate view={{ ...selected, progress: { ...selected.progress, state: 'COMPLETE', coveredCount: 15, attemptId: 'original-v1' } }} />)
 expect(screen.queryByRole('button', { name: 'roleFlow.start' })).toBeNull()
 expect(screen.getByRole('link', { name: 'roleFlow.continue' }).getAttribute('href')).toBe('/employee/gap-analysis')
 expect(api.chooseCurrentRole).not.toHaveBeenCalled()
})
it('RB13 resume links original attempt and disables every Role change', async () => {
 vi.mocked(api.readRoleFlow).mockResolvedValue({ ...selected, progress: { ...selected.progress, state: 'RESUME', attemptId: 'pinned-attempt' } })
 show(); await screen.findByRole('link', { name: 'roleFlow.resume' })
 expect(screen.getByRole('link', { name: 'roleFlow.resume' }).getAttribute('href')).toContain('pinned-attempt')
 expect((screen.getByRole('button', { name: 'roleFlow.selected' }) as HTMLButtonElement).disabled).toBe(true)
})
it('RB01 current search alias filters choices without making a selection', async () => {
 show(<CurrentRolePanel />, '/?search=unmatched'); await waitFor(() => expect(api.currentRoles).toHaveBeenCalled())
 await act(async () => {}); expect(screen.queryByText('Role A')).toBeNull(); expect(api.chooseCurrentRole).not.toHaveBeenCalled()
})

it('RB01/17 paginates 12 choices and resets pagination after filtering without writes', async () => {
 vi.mocked(api.currentRoles).mockResolvedValue(Array.from({ length: 13 }, (_, index) => ({ ...role, id: 'role-'+index, name: 'Role '+String(index).padStart(2,'0') })))
 show(); await screen.findByText('Role 00')
 expect(screen.queryByText('Role 12')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'adaptiveBaseline.paging.next'}))
 expect(screen.getByText('Role 12')).toBeTruthy(); expect(screen.queryByText('Role 00')).toBeNull()
 fireEvent.change(screen.getByRole('searchbox',{name:'roleFlow.search'}),{target:{value:'Role 00'}})
 expect(screen.getByText('Role 00')).toBeTruthy(); expect(screen.queryByText('Role 12')).toBeNull()
 expect(api.chooseCurrentRole).not.toHaveBeenCalled()
})
