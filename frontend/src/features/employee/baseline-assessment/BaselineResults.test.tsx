import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { BaselineResultPanel } from './BaselineResults'
import type { BaselineResult } from './baselineApi'

vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('../target-roles/RolePathwayRequest', () => ({ RolePathwayRequest: () => null }))
afterEach(cleanup)

it('counts stable Skill identities, requires every level to pass and retains frozen thresholds in compact rows', () => {
  const result: BaselineResult = {
    id: 'historical', purpose: 'BASELINE', target: { selectionId: 'selection', selectionRevision: 4 },
    jobPositionId: 'job', jobPositionName: 'Job', roleId: 'role', roleName: 'Role', levelId: 'senior', levelName: 'Senior',
    state: 'FINALIZED', revision: 8, startedAt: '2026-11-19T01:00:00Z', deadlineAt: '2026-11-19T02:00:00Z',
    observedAt: '2026-11-19T01:05:00Z', finishedAt: '2026-11-19T01:05:00Z', finishReason: 'SUBMITTED', previousAttemptId: null,
    expired: false, maxQuestions: 12, answeredCount: 12, items: [],
    groups: [
      { id: 'a-foundation', skillName: 'Same display name', requirement: { skillId: 'skill-a', knowledgeLevel: 'FOUNDATION', outcomeCodes: [] }, role: 'TARGET', totalCount: 5, requiredCorrectCount: 4, mandatoryRequired: false },
      { id: 'a-intermediate', skillName: 'Same display name', requirement: { skillId: 'skill-a', knowledgeLevel: 'INTERMEDIATE', outcomeCodes: [] }, role: 'TARGET', totalCount: 5, requiredCorrectCount: 4, mandatoryRequired: false },
      { id: 'b-foundation', skillName: 'Same display name', requirement: { skillId: 'skill-b', knowledgeLevel: 'FOUNDATION', outcomeCodes: [] }, role: 'TARGET', totalCount: 2, requiredCorrectCount: 2, mandatoryRequired: false },
    ],
    results: [
      { groupId: 'a-foundation', correctCount: 5, totalCount: 5, passed: true, mandatorySatisfied: true, vetoTriggered: false, reasons: [] },
      { groupId: 'a-intermediate', correctCount: 3, totalCount: 5, passed: false, mandatorySatisfied: true, vetoTriggered: false, reasons: ['BELOW_THRESHOLD'] },
      { groupId: 'b-foundation', correctCount: 2, totalCount: 2, passed: true, mandatorySatisfied: true, vetoTriggered: false, reasons: [] },
    ],
  }
  const before = JSON.stringify(result), run = vi.fn()
  render(<MemoryRouter><BaselineResultPanel result={result} locked={false} run={run} /></MemoryRouter>)
  expect(screen.getByText('1 / 2')).toBeTruthy()
  expect(screen.getByText('2 / 3')).toBeTruthy()
  const rows = within(screen.getByRole('table')).getAllByRole('row')
  expect(rows).toHaveLength(3)
  expect(within(rows[1]).getAllByText(/Not passed/)).toHaveLength(2)
  expect(within(rows[2]).getAllByText(/Passed/)).toHaveLength(2)
  fireEvent.click(within(rows[1]).getByText('Score details'))
  expect(within(rows[1]).getByText('Correct: 3 / 5 · Required: 4 / 5')).toBeTruthy()
  expect(JSON.stringify(result)).toBe(before)
  expect(run).not.toHaveBeenCalled()
})
