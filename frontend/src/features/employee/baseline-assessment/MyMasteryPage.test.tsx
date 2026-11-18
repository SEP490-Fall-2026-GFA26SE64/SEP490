import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { MyMasteryPage } from './MyMasteryPage'
import { BaselineResultPanel } from './BaselineResults'
import type { BaselineResult } from './baselineApi'

vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('../target-roles/RolePathwayRequest', () => ({ RolePathwayRequest: () => null }))
afterEach(cleanup)

function Destination() {
  const location = useLocation()
  return <output>{location.pathname + location.search + location.hash}</output>
}
it.each(['', '?tab=roles', '?search=retained'])('preserves the mastery bookmark query while opening the overview profile: %s', async query => {
  render(<MemoryRouter initialEntries={['/employee/my-mastery' + query]}><Routes>
    <Route path="/employee/my-mastery" element={<MyMasteryPage />} />
    <Route path="/employee/overview" element={<Destination />} />
  </Routes></MemoryRouter>)
  expect(await screen.findByText('/employee/overview' + query + '#competency-profile')).toBeTruthy()
})

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
   startedAt: '2026-10-23T00:00:00Z',
   deadlineAt: '2026-10-23T00:00:00Z',
   observedAt: '2026-10-23T00:00:00Z',
   finishedAt: '2026-10-23T00:00:00Z',
   finishReason: 'SUBMITTED',
   previousAttemptId: null,
   expired: false,
   maxQuestions: 1,
   answeredCount: 1,
   items: [],
   groups: [],
   results: [],
 }

it('keeps a finalized result separate from the retired numeric mastery profile', () => {
  render(<MemoryRouter><BaselineResultPanel result={result} locked={false} run={vi.fn()} /></MemoryRouter>)
  expect(screen.getByText('Results by skill')).toBeTruthy()
  expect(screen.getByText(/does not mark pathway requirements as met/)).toBeTruthy()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByText('100.0%')).toBeNull()
})
it('starts a complete retake with the original selection and source attempt', () => {
  const run = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><BaselineResultPanel result={result} locked={false} run={run} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Retake assessment' }))
  expect(run).toHaveBeenCalledTimes(1)
  expect(JSON.parse(run.mock.calls[0][0].body)).toMatchObject({ purpose: 'BASELINE', expectedSelectionId: result.target.selectionId, expectedSelectionRevision: result.target.selectionRevision, previousAttemptId: result.id })
})
it('locks retake while a command is pending', () => {
  const run = vi.fn().mockResolvedValue(undefined)
  render(<MemoryRouter><BaselineResultPanel result={result} locked run={run} /></MemoryRouter>)
  const retake = screen.getByRole('button', { name: 'Retake assessment' }) as HTMLButtonElement
  expect(retake.disabled).toBe(true)
  fireEvent.click(retake)
  expect(run).not.toHaveBeenCalled()
})
