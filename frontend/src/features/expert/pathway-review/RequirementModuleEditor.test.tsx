import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { RequirementModuleEditor } from './RequirementModuleEditor'
import { checkModuleSelection, type RuleReviewDetail } from '../../../shared/api/requirementPathway'

vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('../../../shared/api/requirementPathway', async original => ({ ...await original<typeof import('../../../shared/api/requirementPathway')>(), checkModuleSelection: vi.fn() }))
vi.mock('./RequirementModuleGraph', () => ({ RequirementModuleGraph: ({ steps }: { steps: RuleReviewDetail['plan']['steps'] }) => <div>{steps.map(step => <div key={step.id} data-step-id={step.id}>{step.options.map(module => <span key={module.moduleId}>{module.title}</span>)}</div>)}</div> }))
afterEach(cleanup)
const module = { moduleId: 'module-id', moduleRevision: 3, contentVersion: 'content-3', skillVersion: 'skill-v1', title: 'Validate inputs lesson', outcomeCodes: [], startedAt: null, completedAt: null }
function detail(): RuleReviewDetail {
  return { status: { requestId: 'request', learnerId: 'learner', learnerName: 'Learner', roleName: 'Role', levelName: 'Junior', generationStatus: 'SUCCEEDED', reviewStatus: 'AWAITING_EXPERT_REVIEW', reasonCode: null, revision: 2, contentHash: 'a'.repeat(64) }, archived: false,
    plan: { steps: ['FOUNDATION', 'INTERMEDIATE'].map((knowledgeLevel, index) => ({ id: `step-${index}`, requirement: { skillId: 'skill', skillName: 'Validate inputs', skillVersion: 'skill-v1', knowledgeLevel: knowledgeLevel as 'FOUNDATION' | 'INTERMEDIATE', outcomeCodes: [], provision: 'MODULE_ONLY' }, kind: 'REQUIRED', state: 'NEEDS_EXPERT_ACTION', reason: 'NO_MODULE', fulfilledEvidenceId: null, options: [], certificate: null, learningLocked: true })), dependencies: [] },
    candidates: [{ stepId: 'step-0', module }], related: [{ skillId: 'skill', knowledgeLevel: 'FOUNDATION', module }], reorderableStepIds: [],
    validation: { revision: 2, contentHash: 'a'.repeat(64), valid: false, issues: [{ stepId: 'step-0', reason: 'MODULE_OPTIONS_CHANGED', blocking: true }] } }
}
function mount(data: RuleReviewDetail) {
  const onCommand = vi.fn(), client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><RequirementModuleEditor id="request" scope="org:actor" detail={data} disabled={false} onCommand={onCommand} onApprove={vi.fn()} onBypass={vi.fn()} onDirtyChange={vi.fn()} /></QueryClientProvider>)
  return onCommand
}
it('never falls back to a different node when a selected requirement is incompatible', () => {
  mount(detail())
  fireEvent.change(screen.getByRole('combobox', { name: 'moduleReview.skillFilter' }), { target: { value: 'step-1' } })
  expect((screen.getByRole('button', { name: 'moduleReview.include' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('note').textContent).toBe('moduleReview.outsideScope')
})
it('includes the exact candidate revision at the intended node and prepares a real save command', () => {
  const onCommand = mount(detail())
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'step-0' } })
  fireEvent.click(screen.getByRole('button', { name: 'moduleReview.include' }))
  expect(screen.getByRole('status').textContent).toContain('moduleReview.includedNotice')
  fireEvent.click(screen.getByRole('button', { name: 'moduleReview.save' }))
  const body = JSON.parse(onCommand.mock.calls[0][0].body)
  expect(body.selections).toEqual([{ stepId: 'step-0', options: [{ moduleId: 'module-id', moduleRevision: 3, contentVersion: 'content-3' }] }, { stepId: 'step-1', options: [] }])
})
it('explains an exact Skill version mismatch despite identical names and knowledge labels', () => {
  const data = detail(); data.plan.steps[0].requirement.skillVersion = 'skill-v2'; data.candidates = []
  mount(data)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'step-0' } })
  expect(screen.getByRole('note').textContent).toBe('moduleReview.versionMismatch')
  expect((screen.getByRole('button', { name: 'moduleReview.include' }) as HTMLButtonElement).disabled).toBe(true)
})
it('reveals actionable check results and reports a successful check explicitly', async () => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.mocked(checkModuleSelection).mockResolvedValue({ revision: 2, contentHash: 'a'.repeat(64), valid: true, issues: [] })
  mount(detail())
  expect(screen.getByText(/Include at least one eligible module/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'moduleReview.check' }))
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('moduleReview.checkPassed'))
})
it('explains the certificate-only provision restriction without weakening module eligibility', () => {
  const data = detail(); data.plan.steps[0].requirement.provision = 'CERTIFICATE_ONLY'; data.candidates = []
  mount(data)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'step-0' } })
  expect(screen.getByRole('note').textContent).toBe('moduleReview.certificateRequirement')
  expect((screen.getByRole('button', { name: 'moduleReview.include' }) as HTMLButtonElement).disabled).toBe(true)
})
it('keeps issues for distinct module revisions separate and deduplicates only identical issues', () => {
  const data = detail()
  const second = { ...module, moduleId: 'other-module', moduleRevision: 4, title: 'Second lesson' }
  data.plan.steps[0].options = [module, second]
  const issue = { stepId: 'step-0', reason: 'MODULE_OPTIONS_CHANGED', blocking: true, moduleId: module.moduleId, moduleRevision: 3 }
  data.validation.issues = [issue, { ...issue }, { ...issue, moduleId: second.moduleId, moduleRevision: 4 }]
  mount(data)
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('Validate inputs lesson (module-id · v3)')).toBeTruthy()
  expect(screen.getByText('Second lesson (other-module · v4)')).toBeTruthy()
})
