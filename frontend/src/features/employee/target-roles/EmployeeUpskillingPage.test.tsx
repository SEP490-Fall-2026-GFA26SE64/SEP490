import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EmployeeUpskillingPage } from './EmployeeTargetRolesPage'
import * as api from './currentRoleFlowApi'
import * as baseline from '../baseline-assessment/baselineApi'
import type { CurrentRole, RoleFlowView } from './currentRoleFlowApi'
vi.mock('./currentRoleFlowApi', async () => ({ ...await vi.importActual('./currentRoleFlowApi'), currentRoles: vi.fn(), readRoleFlow: vi.fn(), chooseCurrentRole: vi.fn() }))
vi.mock('../baseline-assessment/baselineApi', async () => ({ ...await vi.importActual('../baseline-assessment/baselineApi'), executeCommand: vi.fn() }))
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('./ActiveSkillSummary', () => ({ ActiveSkillSummary: () => <div>Existing skill summary</div> }))
vi.mock('./UpskillSkillsPanel', () => ({ UpskillSkillsPanel: () => <div>Existing skills flow</div> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const role: CurrentRole = { id: 'role-a', code: 'A', name: 'Role A', scope: 'Original scope', occupationId: 'occ-a', occupationName: 'Occupation A', catalogVersion: 'f1', fingerprint: 'f1', levels: [] }
const empty: RoleFlowView = { selection: null, progress: { state: 'SELECT_ROLE', requiredCount: 0, coveredCount: 0, attemptId: null, baselineVersion: null } }
const selected: RoleFlowView = { selection: { selectionId: 'sel-1', role, revision: 1, selectedAt: '2026-10-24T00:00:00Z', available: true }, progress: { state: 'BASELINE_REQUIRED', requiredCount: 15, coveredCount: 0, attemptId: null, baselineVersion: 1 } }
function show(query = '') { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter initialEntries={['/employee/upskilling' + query]}><EmployeeUpskillingPage /></MemoryRouter></QueryClientProvider>) }
beforeEach(() => { vi.mocked(api.currentRoles).mockResolvedValue([role]); vi.mocked(api.readRoleFlow).mockResolvedValue(empty) })
afterEach(cleanup)
it.each(['', '?tab=invalid', '?tab=roles'])('RB01 Roles default and accessible heading without visible banner: %s', async query => {
  show(query); await screen.findByText('Role A')
  expect(screen.getByRole('tab', { name: 'upskillingUi.roles' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('heading', { level: 1 }).classList.contains('sr-only')).toBe(true)
  expect(api.chooseCurrentRole).not.toHaveBeenCalled()
})
it('RB01 keyboard tabs use Arrow/Home/End and explicit Skills retains its existing flow', () => {
  show('?tab=skills&search=kept')
  const skills = screen.getByRole('tab', { name: 'upskillingUi.skills' }), roles = screen.getByRole('tab', { name: 'upskillingUi.roles' })
  expect(screen.getByText('Existing skills flow')).toBeTruthy()
  for (const [key, target] of [['End', roles], ['ArrowRight', skills], ['ArrowLeft', roles], ['Home', skills]] as const) {
    fireEvent.keyDown(document.activeElement === roles ? roles : skills, { key })
    expect(target.getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(target)
  }
})
it('RB05/11 unknown Role selection survives Skills round trip with identical request key/body', async () => {
  vi.mocked(api.chooseCurrentRole).mockRejectedValue(new api.RoleFlowError('NETWORK_ERROR'))
  show(); await screen.findByText('Role A')
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.choose' })); fireEvent.click(screen.getByRole('button', { name: 'roleFlow.confirm' }))
  await screen.findByRole('button', { name: 'roleFlow.retry' })
  fireEvent.click(screen.getByRole('tab', { name: 'upskillingUi.skills' })); fireEvent.click(screen.getByRole('tab', { name: 'upskillingUi.roles' }))
  const dialog = screen.getByRole('dialog')
  expect((within(dialog).getAllByRole('button', { name: 'roleFlow.cancel' }).find(node => node.textContent === 'roleFlow.cancel') as HTMLButtonElement).disabled).toBe(true)
  fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.getByRole('dialog')).toBe(dialog)
  fireEvent.click(within(dialog).getByRole('button', { name: 'roleFlow.retry' }))
  await waitFor(() => expect(api.chooseCurrentRole).toHaveBeenCalledTimes(2))
  expect(vi.mocked(api.chooseCurrentRole).mock.calls[1][0]).toEqual(vi.mocked(api.chooseCurrentRole).mock.calls[0][0])
  expect(JSON.parse(vi.mocked(api.chooseCurrentRole).mock.calls[0][0].body)).toEqual({ roleId: 'role-a', expectedCurrentSelectionId: null })
})
it('RB12/16 pending baseline start survives summary collapse and tab changes; retries exact server-scoped command', async () => {
  vi.mocked(api.readRoleFlow).mockResolvedValue(selected)
  vi.mocked(baseline.executeCommand).mockRejectedValue(new baseline.BaselineError('NETWORK_ERROR'))
  show(); await screen.findByRole('button', { name: 'roleFlow.start' })
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.start' }))
  await screen.findByRole('button', { name: 'roleFlow.retry' })
  fireEvent.click(screen.getByRole('button', { name: 'upskillingUi.showDetails' })); fireEvent.click(screen.getByRole('button', { name: 'upskillingUi.showDetails' }))
  fireEvent.click(screen.getByRole('tab', { name: 'upskillingUi.skills' })); fireEvent.click(screen.getByRole('tab', { name: 'upskillingUi.roles' }))
  expect((screen.getByRole('button', { name: 'roleFlow.start' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.retry' }))
  await waitFor(() => expect(baseline.executeCommand).toHaveBeenCalledTimes(2))
  const calls = vi.mocked(baseline.executeCommand).mock.calls
  expect(calls[1][0]).toBe(calls[0][0]); expect(JSON.parse(calls[0][0].body)).toEqual({ entry: 'SELECTED_ROLE' })
})
