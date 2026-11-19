import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BaselinePolicyDialog } from './BaselinePolicyDialog'
import { getPolicyWorkspace, runScopedCommand, type PolicyWorkspace } from './scopedAssessmentPolicyApi'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'

vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('./scopedAssessmentPolicyApi', async original => ({ ...await original<typeof import('./scopedAssessmentPolicyApi')>(), getPolicyWorkspace: vi.fn(), runScopedCommand: vi.fn() }))
afterEach(cleanup)
const hash = 'a'.repeat(64)
function workspace(): PolicyWorkspace {
  const groups = [{ requirement: { skillId: 'skill', knowledgeLevel: 'FOUNDATION' as const, outcomeCodes: [] }, skillName: 'Skill', skillVersion: 'v1', readinessIssues: [] }]
  return { scope: { key: hash, purpose: 'BASELINE', ownerId: 'role', ownerName: 'Role', levelId: 'ALL_ROLE_LEVELS', levelName: 'All Role levels', rank: 0, ready: true, catalogHash: hash, groups, readinessIssues: [], memberLevels: [{ id: 'junior', name: 'Junior', rank: 1, groups, readinessIssues: [] }] }, draft: null, active: null, activationRevision: 0, versions: [], totalVersions: 0, capacities: [{ knowledgeLevel: 'FOUNDATION', skillCount: 1, maxQuestions: 500, limitingSkills: [] }], maxPaperItems: 1000, abandonedDrafts: [], totalAbandonedDrafts: 0, groupCapacities: [] }
}
beforeEach(() => { vi.mocked(getPolicyWorkspace).mockResolvedValue(workspace()); vi.mocked(runScopedCommand).mockReset() })
async function open() {
  const close = vi.fn()
  render(<BaselinePolicyDialog scopeKey={hash} initialAction="configure" onClose={close} renderError={() => <p role="alert">Save failed</p>} />)
  await screen.findByLabelText('knowledgeLevel.FOUNDATION questions')
  return close
}
function counts() {
  fireEvent.change(screen.getByLabelText('knowledgeLevel.FOUNDATION questions'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('knowledgeLevel.FOUNDATION correct'), { target: { value: '7' } })
}
it('opening, changing fields, Next, Back and Discard cause zero server mutations', async () => {
  const close = await open(); counts()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect((screen.getByLabelText('knowledgeLevel.FOUNDATION correct') as HTMLInputElement).value).toBe('7')
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  const confirmation = screen.getByRole('dialog', { name: 'Unsaved changes' })
  expect(within(confirmation).getByRole('button', { name: 'Save draft' })).toBeTruthy()
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Continue editing' }))
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Unsaved changes' })).getByRole('button', { name: 'Discard changes' }))
  expect(close).toHaveBeenCalledWith(false)
  expect(runScopedCommand).not.toHaveBeenCalled()
})
it('a failed explicit Save keeps edits and never closes or activates', async () => {
  vi.mocked(runScopedCommand).mockRejectedValue(new AdaptiveBaselineApiError(422, 'POLICY_CONFIGURATION_REQUIRED'))
  const close = await open(); counts()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByRole('alert')
  expect((screen.getByLabelText('knowledgeLevel.FOUNDATION correct') as HTMLInputElement).value).toBe('7')
  expect(close).not.toHaveBeenCalled()
  expect(runScopedCommand).toHaveBeenCalledTimes(1)
  expect(vi.mocked(runScopedCommand).mock.calls[0][0]).toMatchObject({ kind: 'progress', draftId: null, expectedRevision: 0, expectedActivationRevision: 0 })
})
it('requires successful explicit save before activation and activates exactly its saved revision', async () => {
  await open(); counts(); fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  for (const [label, value] of [['Seconds per question', '30'], ['Retake wait (seconds)', '0'], ['Maximum attempts', '3']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  expect((screen.getByRole('button', { name: 'Activate' }) as HTMLButtonElement).disabled).toBe(true)
  const saved = workspace()
  saved.draft = { id: 'saved-draft', revision: 2, configuration: { timeLimitSeconds: null, baselineTiming: { secondsPerQuestion: 30 }, retakeWaitSeconds: 0, maxAttempts: 3, groups: [{ skillId: 'skill', knowledgeLevel: 'FOUNDATION', totalCount: 10, requiredCorrectCount: 7, mandatoryRequired: false, allWrongVeto: false }] }, catalogHash: hash, updatedAt: '2026-11-19T00:00:00Z', editorState: { step: 3, completed: true, levels: [{ knowledgeLevel: 'FOUNDATION', totalCount: 10, requiredCorrectCount: 7 }], timeLimitSeconds: null, timePerQuestionSeconds: 30, retakeWaitSeconds: 0, maxAttempts: 3 } }
  vi.mocked(runScopedCommand).mockResolvedValue(saved)
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await waitFor(() => expect((screen.getByRole('button', { name: 'Activate' }) as HTMLButtonElement).disabled).toBe(false))
  expect(runScopedCommand).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  fireEvent.change(screen.getByLabelText('Seconds per question'), { target: { value: '31' } })
  expect((screen.getByRole('button', { name: 'Activate' }) as HTMLButtonElement).disabled).toBe(true)
  expect(runScopedCommand).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText('Seconds per question'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.click(screen.getByRole('button', { name: 'Activate' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Activate saved draft' })).getByRole('button', { name: 'Activate' }))
  await waitFor(() => expect(runScopedCommand).toHaveBeenCalledTimes(2))
  expect(vi.mocked(runScopedCommand).mock.calls[1][0]).toMatchObject({ kind: 'activate', draftId: 'saved-draft', expectedRevision: 2, expectedActivationRevision: 0 })
})
it('Save draft in dirty-close persists partial progress once and closes only after success', async () => {
  const close = await open(); counts()
  const saved = workspace()
  saved.draft = { id: 'partial-draft', revision: 2, configuration: null, catalogHash: hash, updatedAt: '2026-11-19T00:00:00Z', editorState: { step: 1, completed: false, levels: [{ knowledgeLevel: 'FOUNDATION', totalCount: 10, requiredCorrectCount: 7 }], timeLimitSeconds: null, timePerQuestionSeconds: null, retakeWaitSeconds: null, maxAttempts: null } }
  vi.mocked(runScopedCommand).mockResolvedValue(saved)
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save draft' }))
  await waitFor(() => expect(close).toHaveBeenCalledWith(true))
  expect(runScopedCommand).toHaveBeenCalledTimes(1)
  expect(vi.mocked(runScopedCommand).mock.calls[0][0]).toMatchObject({ kind: 'progress', editorState: { step: 1, completed: false } })
})
