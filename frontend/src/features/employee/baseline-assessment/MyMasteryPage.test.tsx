import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { MyMasteryPage } from './MyMasteryPage'
import { BaselineResultPanel } from './BaselineResults'
import type { BaselineResult } from './baselineApi'
import { readMyMastery } from '../target-roles/currentRoleFlowApi'
vi.mock('../target-roles/currentRoleFlowApi', async () => ({ ...await vi.importActual('../target-roles/currentRoleFlowApi'), readMyMastery: vi.fn() }))
vi.mock('./baselineApi', async () => ({ ...await vi.importActual('./baselineApi'), employeeBaselineEnabled: true }))
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const profile = { jobPositionId: 'occ-a', jobPositionName: 'Original JobPosition', attemptId: 'attempt-v1', baselineVersion: 1, initializedAt: '2026-10-23T00:00:00Z', skills: [{ id: 's1', name: 'Original Skill', mastery: 0, confidence: 'LOW' }] }
function show(node = <MyMasteryPage />) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>) }
beforeEach(() => vi.mocked(readMyMastery).mockResolvedValue([profile]))
afterEach(cleanup)
it('MM01/03 keeps valid zero mastery, source version and original result link', async () => {
 show(); await screen.findByText('Original Skill')
 expect(screen.getByRole('heading', { level: 1 }).classList.contains('sr-only')).toBe(true)
 expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
 expect(screen.getByText(/roleFlow.baselineVersion.*1/)).toBeTruthy()
 expect(screen.getByRole('link', { name: 'baselineUi.viewResult' }).getAttribute('href')).toContain('attempt-v1')
})
it('MM01 empty profiles show an empty state, never fake zero mastery', async () => {
 vi.mocked(readMyMastery).mockResolvedValue([]); show(); await screen.findByText('baselineUi.empty')
 expect(screen.queryByRole('progressbar')).toBeNull()
})
it('MM02 dependency failure has explicit retry and recovers', async () => {
 vi.mocked(readMyMastery).mockRejectedValueOnce(Error('outage')).mockResolvedValueOnce([profile])
 show(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'roleFlow.retry' }))
 await screen.findByText('Original Skill'); expect(readMyMastery).toHaveBeenCalledTimes(2)
})
it('MM01 multiple profiles retain separate original versions', async () => {
 vi.mocked(readMyMastery).mockResolvedValue([profile, { ...profile, jobPositionId: 'occ-b', jobPositionName: 'Other JobPosition', baselineVersion: 2, attemptId: 'attempt-v2' }])
 show(); await screen.findByText('Other JobPosition')
 expect(screen.getAllByRole('link', { name: 'baselineUi.viewResult' }).map(a => a.getAttribute('href'))).toEqual(['/employee/baseline-assessment/attempt-v1', '/employee/baseline-assessment/attempt-v2'])
})
it('MM03 raw assessment score remains separate from zero mastery and no retake', async () => {
 const result: BaselineResult = {
   id: 'attempt-v1',
   target: { selectionId: 's1', selectionRevision: 1 },
   jobPositionId: 'occ-a',
   jobPositionName: 'Original JobPosition',
   roleId: 'role-a',
   roleName: 'Role A',
   levelId: 'lvl-1',
   levelName: 'Level 1',
   purpose: 'BASELINE',
   state: 'FINALIZED',
   revision: 1,
   startedAt: profile.initializedAt,
   deadlineAt: profile.initializedAt,
   observedAt: profile.initializedAt,
   finishedAt: profile.initializedAt,
   finishReason: 'SUBMITTED',
   previousAttemptId: null,
   expired: false,
   maxQuestions: 1,
   answeredCount: 1,
   items: [],
   groups: [],
   results: [],
 }
 show(<BaselineResultPanel result={result} locked={false} run={vi.fn()} />)
 await screen.findByText('baselineUi.profileSaved')
 expect(screen.getByText('100.0%')).toBeTruthy(); expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
 expect(screen.getByText('employeeBaseline.noRetake')).toBeTruthy()
 expect(screen.queryByText('employeeBaseline.startReplacement')).toBeNull()
})
it('MM05 help is keyboard focusable and explains profile update limits', async () => {
 show(); await screen.findByText('Original Skill')
 const help=screen.getByRole('button', { name: 'baselineUi.helpTitle' }); help.focus(); expect(document.activeElement).toBe(help)
 fireEvent.click(help); expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByText('baselineUi.profileUpdateHelp')).toBeTruthy()
 fireEvent.keyDown(document, { key: 'Escape' }); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})
