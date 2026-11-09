import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { BaselineAttemptPanel } from './BaselineAttemptPanel'
import { BaselineHistory } from './BaselineResults'
import { BaselineHandoff } from './EmployeeBaselinePage'
import { readHistory, type BaselineAttempt } from './baselineApi'
vi.mock('./baselineApi', async () => ({ ...await vi.importActual('./baselineApi'), readHistory: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
afterEach(cleanup)
const attempt: BaselineAttempt = {
  id: 'original-v1',
  target: { selectionId: 's1', selectionRevision: 1 },
  jobPositionId: 'occ-a',
  jobPositionName: 'Original jobPosition',
  roleId: 'role-a',
  roleName: 'Original Role',
  levelId: 'lvl-1',
  levelName: 'Level 1',
  purpose: 'BASELINE',
  state: 'IN_PROGRESS',
  revision: 2,
  startedAt: '2026-10-24T00:00:00Z',
  deadlineAt: '2026-10-24T01:00:00Z',
  observedAt: '2026-10-24T00:01:00Z',
  finishedAt: null,
  finishReason: null,
  previousAttemptId: null,
  expired: false,
  maxQuestions: 45,
  answeredCount: 1,
  items: [
    {
      position: 1,
      itemVersionId: 'pinned-question-v1',
      groupId: 'grp-1',
      prompt: 'Original submitted question',
      selectedOptionId: 'a',
      options: [
        { id: 'a', text: 'Saved response' },
        { id: 'b', text: 'Other response' },
      ],
    },
  ],
  groups: [],
  results: [],
}
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
  const original: BaselineAttempt = {
    ...attempt,
    id: 'original-v1',
    roleName: 'Original Role',
    levelName: 'Level 1',
    state: 'FINALIZED',
    finishedAt: attempt.observedAt,
    finishReason: 'SUBMITTED',
  }
  vi.mocked(readHistory).mockResolvedValue([original])
  render(<MemoryRouter><BaselineHistory /></MemoryRouter>); await screen.findByText(/Original Role/)
  expect(screen.getByRole('link', { name: /Original Role/ }).getAttribute('href')).toBe('/employee/baseline-assessment/original-v1')
  fireEvent.click(screen.getByRole('button', { name: 'employeeBaseline.refresh' }))
  await waitFor(() => expect(readHistory).toHaveBeenCalledTimes(2)); await screen.findByText(/Original Role/)
  expect(original.state).toBe('FINALIZED')
})
