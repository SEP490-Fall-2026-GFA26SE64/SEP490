import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { BaselineAttemptPanel } from './BaselineAttemptPanel'
import { BaselineHistory } from './BaselineResults'
import { BaselineHandoff } from './EmployeeBaselinePage'
import { readHistory, type BaselineAttempt, type BaselineResult } from './baselineApi'
vi.mock('./baselineApi', async () => ({ ...await vi.importActual('./baselineApi'), readHistory: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
afterEach(cleanup)
const attempt: BaselineAttempt = { id: 'original-v1', occupationId: 'occ-a', occupationName: 'Original occupation', purpose: 'ROLE_REQUIREMENT', roleId: 'role-a', assessmentScope: 'OCCUPATION', state: 'IN_PROGRESS', revision: 2, startedAt: '2026-10-24T00:00:00Z', deadlineAt: '2026-10-24T01:00:00Z', observedAt: '2026-10-24T00:01:00Z', expired: false, maxQuestions: 45, answeredCount: 1, items: [{ position: 1, itemVersionId: 'pinned-question-v1', prompt: 'Original submitted question', selectedOptionId: 'a', options: [{ id: 'a', text: 'Saved response' }, { id: 'b', text: 'Other response' }] }] }
it('MM05/AB-A09 submitted answer review remains readonly and cannot issue another answer', () => {
  const run = vi.fn()
  render(<BaselineAttemptPanel attempt={attempt} seconds={3540} locked={false} run={run} />)
  expect(screen.getByText('Original submitted question')).toBeTruthy()
  for (const radio of screen.getAllByRole('radio')) {
    expect((radio as HTMLInputElement).disabled).toBe(true); fireEvent.click(radio)
  }
  expect(run).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'employeeBaseline.saveNext' })).toBeNull()
})
it('RB01 Role handoff uses the one intended Roles tab', () => {
  render(<MemoryRouter><BaselineHandoff /></MemoryRouter>)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/employee/upskilling?tab=roles')
})
it('AB-R03/R04 history loading, failure, retry and empty remain read-only', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(readHistory).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail })).mockResolvedValueOnce([])
  render(<MemoryRouter><BaselineHistory /></MemoryRouter>)
  expect((screen.getByRole('button', { name: 'employeeBaseline.refresh' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => reject(Error('unavailable'))); await screen.findByRole('alert')
  fireEvent.click(screen.getByRole('button', { name: 'employeeBaseline.refresh' }))
  await screen.findByText('employeeBaseline.emptyHistory'); expect(readHistory).toHaveBeenCalledTimes(2)
})
it('AB-R03 original Role/history scope and source attempt stay stable on repeated read', async () => {
  const original: BaselineResult = { attemptId: 'original-v1', occupationId: 'occ-a', occupationName: 'Original occupation', purpose: 'ROLE_REQUIREMENT', roleId: 'role-a', roleName: 'Original Role', assessmentScope: 'EARLIER_ROLE', state: 'INVALIDATED', completionReason: 'MANUAL', startedAt: attempt.startedAt, completedAt: attempt.observedAt, replacesAttemptId: null, replacementAttemptId: 'replacement-v1', rawScore: null, skills: [] }
  vi.mocked(readHistory).mockResolvedValue([original])
  render(<MemoryRouter><BaselineHistory /></MemoryRouter>); await screen.findByText(/Original Role/)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/employee/baseline-assessment/original-v1')
  expect(screen.getByText('employeeBaseline.scopes.EARLIER_ROLE')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'employeeBaseline.refresh' }))
  await waitFor(() => expect(readHistory).toHaveBeenCalledTimes(2)); await screen.findByText(/Original Role/)
  expect(original.assessmentScope).toBe('EARLIER_ROLE')
})
