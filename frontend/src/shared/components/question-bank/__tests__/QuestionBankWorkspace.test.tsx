import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QuestionBankWorkspace } from '../QuestionBankWorkspace'
import { bankRequest, type BankView, type BankSession } from '../../../api/questionBankApi'
vi.mock('../../../layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../../api/questionBankApi', () => ({ bankRequest: vi.fn() }))
const body = { prompt: 'Persisted question', options: ['A1', 'B1', 'C1', 'D1'], correctAnswer: 0, skillId: 'skill', skillName: 'SQL', difficulty: 'EASY', explanation: 'Reason', knowledgeLevel: 'FOUNDATION', outcomeCode: 'SQL-01', mandatory: false }
let bank: BankView, session: BankSession
beforeEach(() => {
 session = { maxImportRows: 500, maxImportBytes: 10485760, actor: { id: 'expert', organization: 'org', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'SQL' }], experts: [{ id: 'expert', name: 'Alex' }], people: [{ id: 'expert', name: 'Alex' }] }
 bank = { id: 'bank', name: 'Bank', history: [], questions: [{ id: 'q', code: 'Q-1', createdBy: 'expert', createdAt: '2026-10-30T00:00:00Z', owner: 'expert', revision: 1, retired: false, request: null, versions: [{ id: 'v', number: 1, state: 'DRAFT', content: body, editedBy: 'expert', editedAt: '2026-10-30T00:00:00Z', submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }] }] }
 vi.mocked(bankRequest).mockImplementation(async (path, data) => {
   if (path === '/session') return session
   if (path === '/notifications') return []
   if (path === '/questions') { expect(data).toMatchObject({ content: { skillId: 'skill' } }); return bank }
   return bank
 })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('shows only questions from the confirmed import in the neutral learner simulation', async () => {
 const previous = vi.mocked(bankRequest).getMockImplementation()!
 const rows = [{ code: 'Q-new-one', content: body }, { code: 'Q-new-two', content: { ...body, prompt: 'Second file question' } }]
 const saved = rows.map((row, index) => ({ ...bank.questions[0], id: row.code, code: row.code, versions: [{ ...bank.questions[0].versions[0], id: row.code + '-version', content: { ...row.content, prompt: index === 0 ? 'Persisted imported first' : 'Persisted imported second' } }] }))
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => path === '/imports/preview' ? { id: 'batch', rows, errors: [], warnings: [], expiresAt: '2027-01-01T00:00:00Z', committed: false, expected: {} } : path === '/imports/confirm' ? { ...bank, questions: [...bank.questions, ...saved] } : previous(path, data, signal))
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'Import questions' }))
 const file = new File(['fixture'], 'questions.json', { type: 'application/json' })
 Object.defineProperty(file, 'text', { value: async () => JSON.stringify([{ prompt: 'First file question', skillId: 'skill' }, { prompt: 'Second file question', skillId: 'skill' }]) })
 fireEvent.change(screen.getByLabelText('Select file'), { target: { files: [file] } })
 await screen.findByRole('button', { name: 'Continue to confirmation' })
 fireEvent.click(screen.getAllByRole('button', { name: 'View as test taker' })[1])
 const review=screen.getByRole('dialog',{name:'Review question preview'})
 expect(within(review).getByRole('group',{name:'Second file question'})).toBeTruthy()
 expect(within(review).queryByText('Persisted imported second')).toBeNull()
 expect(vi.mocked(bankRequest).mock.calls.some(([path])=>path==='/imports/confirm')).toBe(false)
 fireEvent.click(within(review).getByRole('button',{name:'Back to import review'}))
 fireEvent.click(screen.getByRole('button', { name: 'Continue to confirmation' }))
 expect(screen.queryByRole('button',{name:'View as test taker'})).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }))
 const dialog = await screen.findByRole('dialog', { name: 'Imported questions' })
 expect(within(dialog).getByRole('heading', { name: 'Import completed · 2 draft questions' })).toBeTruthy()
 expect(within(dialog).getByRole('group', { name: 'Persisted imported first' })).toBeTruthy()
 expect(within(dialog).queryByText('Persisted question')).toBeNull()
 expect(within(dialog).queryByText('Reason')).toBeNull()
 fireEvent.click(within(dialog).getByRole('radio', { name: 'A1' }))
 expect(within(dialog).queryByText(/Correct answer:/)).toBeNull()
 fireEvent.click(within(dialog).getByRole('button', { name: 'Answer key & explanation — staff only' }))
 expect(within(dialog).getByText('Reason')).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button', { name: 'Next question' }))
 expect(within(dialog).getByRole('group', { name: 'Persisted imported second' })).toBeTruthy()
 expect(within(dialog).queryByText('Reason')).toBeNull()
 expect(vi.mocked(bankRequest).mock.calls.filter(([path, data]) => data && path !== '/imports/preview' && path !== '/imports/confirm')).toHaveLength(0)
})
it('shows responsible Expert on the directory and keeps identities separate in the panel', async () => {
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 expect(screen.getByText('Persisted question')).toBeTruthy()
 expect(screen.getByRole('table', { name: 'Question Bank Directory' })).toBeTruthy()
 expect(within(screen.getByTestId('question-row')).getByText('Alex')).toBeTruthy()
 expect(screen.queryByRole('button', { name: 'Edit draft' })).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'View question Q-1' }))
 expect(within(screen.getByRole('region', { name: 'Responsibility' })).getByText('Alex')).toBeTruthy()
 expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit draft' })).toBeTruthy()
 expect(screen.queryByText('Assessment Blueprints')).toBeNull()
})
it('creates an incomplete draft through the protected API and clears the form only after success', async () => {
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Create question$/ }))
 const dialog = screen.getByRole('dialog')
 expect(within(dialog).queryByRole('textbox', { name: 'Question code' })).toBeNull()
 expect(within(dialog).getByText('Generated automatically when saved.')).toBeTruthy()
 fireEvent.change(within(dialog).getByLabelText('Question prompt'), { target: { value: 'Incomplete draft' } })
 fireEvent.change(within(dialog).getByLabelText('MicroSkill'), { target: { value: 'skill' } })
 fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
 expect(bankRequest).toHaveBeenCalledWith('/questions', expect.objectContaining({ id: null, content: expect.objectContaining({ correctAnswer: null }) }))
 expect(vi.mocked(bankRequest).mock.calls.find(([path]) => path === '/questions')?.[1]).not.toHaveProperty('code')
})
it('does not grant peer edit or submit controls', async () => {
 bank.questions[0].owner = 'peer'
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 expect(screen.queryByRole('button', { name: 'Actions for Q-1' })).toBeNull()
 expect(screen.queryByRole('button', { name: 'Edit draft' })).toBeNull()
 expect(screen.queryByRole('button', { name: /^Submit$/ })).toBeNull()
})
it('requires the manager to acknowledge the exact submitted version before approval', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 const dialog = screen.getByRole('dialog')
 expect(within(dialog).getByRole('button', { name: 'Approve & publish' }).hasAttribute('disabled')).toBe(true)
 fireEvent.click(within(dialog).getByRole('button', { name: 'Mark this version reviewed' }))
 await waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/commands', expect.objectContaining({ id: 'q', expectedRevision: 1, action: 'VIEW' })))
})
it('shows an error and retry instead of creating browser fallback data', async () => {
 vi.mocked(bankRequest).mockRejectedValue(new Error('Storage unavailable'))
 render(<QuestionBankWorkspace />)
 await screen.findByRole('alert')
 expect(screen.queryByText('Q-1')).toBeNull()
 expect(screen.getByRole('button', { name: 'Reload latest data' })).toBeTruthy()
})

it('lists unreviewed selected codes in a popup without sending approval and opens the first detail', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }))
 const dialog = screen.getByRole('dialog')
 expect(within(dialog).getByText('Q-1')).toBeTruthy()
 expect(within(dialog).getByText(/Open Details & history/)).toBeTruthy()
 expect(vi.mocked(bankRequest).mock.calls.some(([path]) => path === '/approve')).toBe(false)
 fireEvent.click(within(dialog).getByRole('button', { name: 'Open first question' }))
 expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark this version reviewed' })).toBeTruthy()
})
it('shows server conflicts in the bulk popup with question codes and retains selection', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 bank.questions[0].versions[0].viewed = { ld: 'v' }
 const implementation = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, ...args) => {
  if (path === '/approve') throw new Error('q: Question changed. Reload and review the current version.')
  return implementation(path, ...args)
 })
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }))
 const dialog = await screen.findByRole('dialog')
 expect(within(dialog).getByText('Q-1: Question changed. Reload and review the current version.')).toBeTruthy()
 fireEvent.click(within(dialog).getByRole('button', { name: 'Back to list' }))
 expect((screen.getByRole('checkbox', { name: 'Select Q-1' }) as HTMLInputElement).checked).toBe(true)
})
it('sends bulk approval when all selected versions are acknowledged', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 bank.questions[0].versions[0].viewed = { ld: 'v' }
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Approve selected (1)' }))
 await waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/approve', { questions: [{ id: 'q', expectedRevision: 1, action: 'APPROVE' }] }))
 await screen.findByText('Selected versions approved.')
 expect(screen.queryByRole('dialog')).toBeNull()
})

it('shows live answer preview without making incomplete draft fields required', async () => {
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Create question$/ }))
 const dialog = screen.getByRole('dialog')
 fireEvent.change(within(dialog).getByLabelText('Question prompt'), { target: { value: 'Live question preview' } })
 fireEvent.change(within(dialog).getByLabelText('Option A'), { target: { value: 'Live answer' } })
 fireEvent.click(within(dialog).getByRole('radio', { name: 'Correct answer A' }))
 const preview = within(dialog).getByRole('complementary', { name: 'Question preview' })
 expect(within(preview).getByText('Live question preview')).toBeTruthy()
 expect(within(preview).getByText('Live answer')).toBeTruthy()
 expect(within(preview).getByLabelText('Correct answer')).toBeTruthy()
 expect(within(dialog).getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(true)
 fireEvent.change(within(dialog).getByLabelText('MicroSkill'), { target: { value: 'skill' } })
 expect(within(dialog).getByRole('button', { name: 'Save draft' }).hasAttribute('disabled')).toBe(false)
})

it('clears all directory filters and restores matching rows', async () => {
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 fireEvent.change(screen.getByRole('textbox', { name: 'Search questions' }), { target: { value: 'no match' } })
 expect(screen.getByText('No questions match this view')).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
 expect(screen.getByText('Q-1')).toBeTruthy()
 expect(screen.getByRole('textbox', { name: 'Search questions' }).getAttribute('value')).toBe('')
})

it('keeps import confirmation behind server validation and warning acknowledgement', async () => {
 let invalid = true
 const original = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => path === '/imports/preview'
   ? { id: 'batch', rows: [{ code: 'Q-preview', content: body }], errors: invalid ? ['Invalid skill'] : [], warnings: invalid ? [] : ['Missing answer'], expiresAt: '2027-01-01T00:00:00Z', committed: false, expected: {} }
   : original(path, data, signal))
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Import questions$/ }))
 const dialog = screen.getByRole('dialog')
 const file = new File(['unused'], 'questions.json', { type: 'application/json' })
 Object.defineProperty(file, 'text', { value: async () => JSON.stringify([{ prompt: 'Imported', skillId: 'skill' }]) })
 fireEvent.change(within(dialog).getByLabelText('Select file'), { target: { files: [file] } })
 await within(dialog).findByRole('heading', { name: 'Resolve errors before continuing' })
 expect(within(dialog).getByRole('button', { name: 'Continue to confirmation' }).hasAttribute('disabled')).toBe(true)
 fireEvent.click(within(dialog).getByRole('button', { name: /^Back$/ }))
 invalid = false
 fireEvent.change(within(dialog).getByLabelText('Select file'), { target: { files: [file] } })
 await within(dialog).findByRole('heading', { name: 'Warnings to review' })
 expect(within(dialog).getByRole('button', { name: 'Continue to confirmation' }).hasAttribute('disabled')).toBe(true)
 fireEvent.click(within(dialog).getByRole('checkbox'))
 fireEvent.click(within(dialog).getByRole('button', { name: 'Continue to confirmation' }))
 expect(within(dialog).getByRole('heading', { name: 'Ready to create drafts' })).toBeTruthy()
 expect(bankRequest).not.toHaveBeenCalledWith('/imports/confirm', expect.anything())
})

it('shows field-level draft errors, preserves null answer and clears errors when corrected', async () => {
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Create question$/ }))
 const dialog = screen.getByRole('dialog')
 const prompt = within(dialog).getByLabelText('Question prompt')
 const skill = within(dialog).getByLabelText('MicroSkill')
 fireEvent.blur(prompt)
 fireEvent.blur(skill)
 expect(within(dialog).getByText('Enter a question prompt to save a draft.')).toBeTruthy()
 expect(within(dialog).getByText('Choose a MicroSkill to save a draft.')).toBeTruthy()
 expect(within(dialog).queryByText('Your question will appear here.')).toBeNull()
 expect(within(dialog).getByText('Question prompt is empty')).toBeTruthy()
 fireEvent.change(prompt, { target: { value: 'Valid draft prompt' } })
 fireEvent.change(skill, { target: { value: 'skill' } })
 expect(within(dialog).queryByText('Enter a question prompt to save a draft.')).toBeNull()
 fireEvent.click(within(dialog).getByRole('radio', { name: 'Correct answer A' }))
 fireEvent.click(within(dialog).getByRole('radio', { name: 'Correct answer B' }))
 expect((within(dialog).getByRole('radio', { name: 'Correct answer A' }) as HTMLInputElement).checked).toBe(false)
 expect((within(dialog).getByRole('radio', { name: 'Correct answer B' }) as HTMLInputElement).checked).toBe(true)
 fireEvent.click(within(dialog).getByRole('button', { name: 'Clear answer selection' }))
 fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
 await waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/questions', expect.objectContaining({ content: expect.objectContaining({ correctAnswer: null, knowledgeLevel: null }) })))
})

it('retains entered content and correct answer after server-side validation rejects a draft', async () => {
 const original = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => {
  if (path === '/questions') throw new Error('Select a currently active approved MicroSkill')
  return original(path, data, signal)
 })
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Create question$/ }))
 const dialog = screen.getByRole('dialog')
 fireEvent.change(within(dialog).getByLabelText('Question prompt'), { target: { value: 'Keep this draft text' } })
 fireEvent.change(within(dialog).getByLabelText('MicroSkill'), { target: { value: 'skill' } })
 fireEvent.click(within(dialog).getByRole('radio', { name: 'Correct answer C' }))
 fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
 await within(dialog).findByRole('alert')
 expect((within(dialog).getByLabelText('Question prompt') as HTMLTextAreaElement).value).toBe('Keep this draft text')
 expect((within(dialog).getByRole('radio', { name: 'Correct answer C' }) as HTMLInputElement).checked).toBe(true)
})

it('keeps page and search state when closing a question panel', async () => {
 const sample = bank.questions[0]
 bank.questions = Array.from({ length: 21 }, (_, index) => ({ ...sample, id: 'q' + index, code: 'Q-' + (index + 1) }))
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
 const source = screen.getByRole('button', { name: 'View question Q-21' })
 fireEvent.click(source)
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Close$/ }))
 expect(screen.getByRole('button', { name: 'View question Q-21' })).toBeTruthy()
 expect(screen.queryByText('Q-1')).toBeNull()
 fireEvent.change(screen.getByRole('textbox', { name: 'Search questions' }), { target: { value: 'Q-21' } })
 fireEvent.click(screen.getByRole('button', { name: 'View question Q-21' }))
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Close$/ }))
 expect((screen.getByRole('textbox', { name: 'Search questions' }) as HTMLInputElement).value).toBe('Q-21')
})

it('exposes permitted owner actions in the overflow and closes it when editing', async () => {
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'Actions for Q-1' }))
 const tools = screen.getByRole('dialog', { name: 'Actions for Q-1' })
 expect(within(tools).getByRole('button', { name: 'Edit draft' })).toBeTruthy()
 expect(within(tools).getByRole('button', { name: 'Submit' })).toBeTruthy()
 fireEvent.click(within(tools).getByRole('button', { name: 'Edit draft' }))
 await screen.findByRole('dialog')
 expect(screen.queryByRole('dialog', { name: 'Actions for Q-1' })).toBeNull()
})

it('shows Unassigned only for absent owner and never substitutes the creator', async () => {
 bank.questions[0].owner = null
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 const row = screen.getByTestId('question-row')
 expect(within(row).getByText('Unassigned')).toBeTruthy()
 expect(within(row).queryByText('Alex')).toBeNull()
})

it('searches eligible experts, requires a reason and sends real assignment shape with expected revision', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 session.experts.push({ id: 'next-owner', name: 'Jamie Rivera' })
 session.people.push({ id: 'next-owner', name: 'Jamie Rivera' })
 const original = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => {
  if (path === '/commands') {
   const command = data as { owner: string; reason: string }
   bank = { ...bank, questions: bank.questions.map(q => ({ ...q, owner: command.owner, revision: q.revision + 1 })), history: [{ id: 'assignment', question: 'q', version: 'v', action: 'ASSIGNED', actor: 'ld', at: '2026-11-10T10:00:00Z', reason: command.reason, snapshot: null }] }
   return bank
  }
  return original(path, data, signal)
 })
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Reassign Expert' }))
 const form = screen.getByRole('dialog', { name: 'Assign responsible Expert' })
 fireEvent.change(within(form).getByRole('textbox', { name: 'Search experts' }), { target: { value: 'Jamie' } })
 fireEvent.click(within(form).getByRole('radio', { name: 'Jamie Rivera' }))
 expect(within(form).getByRole('button', { name: 'Confirm assignment' }).hasAttribute('disabled')).toBe(true)
 fireEvent.change(within(form).getByLabelText('Assignment reason'), { target: { value: 'Coverage ownership change' } })
 fireEvent.click(within(form).getByRole('button', { name: 'Confirm assignment' }))
 await waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/commands', { id: 'q', expectedRevision: 1, action: 'ASSIGN', reason: 'Coverage ownership change', owner: 'next-owner' }))
 await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Assign responsible Expert' })).toBeNull())
 expect(within(screen.getByRole('region', { name: 'Responsibility' })).getByText('Jamie Rivera')).toBeTruthy()
 fireEvent.click(screen.getByRole('tab', { name: 'History & versions' }))
 expect(within(screen.getByRole('list', { name: 'Activity history' })).getByText('Coverage ownership change')).toBeTruthy()
})

it('keeps assignment inputs after server rejection and offers Clear selection only with selection', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 const original = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => {
  if (path === '/commands') throw new Error('Question changed. Reload the latest data.')
  return original(path, data, signal)
 })
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 expect(screen.queryByRole('toolbar')).toBeNull()
 fireEvent.click(screen.getByRole('checkbox', { name: 'Select Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
 expect(screen.queryByRole('toolbar')).toBeNull()
 fireEvent.click(screen.getByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Reassign Expert' }))
 const form = screen.getByRole('dialog', { name: 'Assign responsible Expert' })
 fireEvent.change(within(form).getByLabelText('Assignment reason'), { target: { value: 'Keep this reason' } })
 fireEvent.click(within(form).getByRole('button', { name: 'Confirm assignment' }))
 await within(form).findByRole('alert')
 expect((within(form).getByLabelText('Assignment reason') as HTMLTextAreaElement).value).toBe('Keep this reason')
 expect((within(form).getByRole('radio', { name: 'Alex' }) as HTMLInputElement).checked).toBe(true)
})

it('copies the full question code, not the internal entity ID', async () => {
 const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
 const writeText = vi.fn().mockResolvedValue(undefined)
 Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
 try {
  bank.questions[0].code = 'Q-12345678-ABCD-1234-5678-123456789ABC'
  render(<QuestionBankWorkspace />)
  fireEvent.click(await screen.findByRole('button', { name: 'Copy ID ' + bank.questions[0].code }))
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(bank.questions[0].code))
  expect(writeText).not.toHaveBeenCalledWith('q')
 } finally { if (original) Object.defineProperty(navigator, 'clipboard', original); else Reflect.deleteProperty(navigator, 'clipboard') }
})

it('keeps four detail sections and explains mandatory scope without excluding the question from Baseline', async () => {
 bank.questions[0].versions[0].content = { ...body, mandatory: true, explanation: null }
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 const panel = screen.getByRole('dialog', { name: 'Question details' })
 for (const name of ['Question overview', 'Responsibility', 'Question content', 'Assessment configuration']) expect(within(panel).getByRole('region', { name })).toBeTruthy()
 const content = within(panel).getByRole('region', { name: 'Question content' })
 const choices = within(content).getByRole('list', { name: 'Answer choices' })
 expect(within(choices).getAllByRole('listitem')).toHaveLength(4)
 expect(within(choices).getAllByText('Correct answer')).toHaveLength(1)
 expect(within(choices).getAllByRole('listitem')[0].className).toContain('border-success')
 expect(within(content).getByText('No explanation provided for this question.')).toBeTruthy()
 expect(within(panel).getByText('Baseline uses its own selection policy. This mandatory setting does not apply to Baseline.')).toBeTruthy()
 expect(within(panel).queryByText('Ignored by Baseline')).toBeNull()
})

it('uses real version snapshots without claiming assignment creates another version', async () => {
 const original = bank.questions[0].versions[0]
 bank.questions[0].versions = [{ ...original, id: 'old', number: 1, state: 'PUBLISHED', content: { ...body, prompt: 'Historical prompt', correctAnswer: 2, explanation: null } }, { ...original, number: 2 }]
 bank.history = [{ id: 'assigned', question: 'q', version: 'v', actor: 'expert', action: 'ASSIGNED', at: '2026-11-01T00:00:00Z', reason: null, snapshot: null }, { id: 'created', question: 'q', version: 'old', actor: 'expert', action: 'CREATED', at: '2026-10-30T00:00:00Z', reason: null, snapshot: { ...body, prompt: 'Actual captured snapshot' } }]
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('tab', { name: 'History & versions' }))
 const version = screen.getByRole('combobox', { name: 'Version' }) as HTMLSelectElement
 expect(version.options).toHaveLength(2)
 const timeline = screen.getByRole('list', { name: 'Activity history' })
 expect(within(timeline).getAllByRole('listitem')[0].textContent).toContain('Question created')
 expect(within(timeline).getAllByRole('listitem')[1].textContent).toContain('Responsibility updated')
 expect(within(timeline).getAllByRole('button', { name: 'View question snapshot' })).toHaveLength(1)
 fireEvent.click(within(timeline).getByRole('button', { name: 'View question snapshot' }))
 expect(within(timeline).getByText('Actual captured snapshot')).toBeTruthy()
 expect(within(timeline).queryByText('Recorded question activity.')).toBeNull()
 fireEvent.change(version, { target: { value: 'old' } })
 expect((screen.getByRole('combobox', { name: 'Version' }) as HTMLSelectElement).selectedOptions[0].textContent).toBe('v1 · Historical')
 fireEvent.click(screen.getByRole('tab', { name: 'Question content' }))
 expect(within(screen.getByRole('region', { name: 'Question content' })).getByText('Historical prompt')).toBeTruthy()
})

it('confirms drawer submission, allows cancel without mutation and retains server validation errors', async () => {
 const original = vi.mocked(bankRequest).getMockImplementation()!
 vi.mocked(bankRequest).mockImplementation(async (path, data, signal) => {
  if (path === '/commands') throw new Error('Complete every answer before submission.')
  return original(path, data, signal)
 })
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }))
 let confirm = screen.getByRole('dialog', { name: 'Confirm question action' })
 expect(within(confirm).queryByRole('textbox')).toBeNull()
 expect(within(confirm).getByRole('button', { name: 'Confirm submission' }).hasAttribute('disabled')).toBe(false)
 fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
 expect(vi.mocked(bankRequest).mock.calls.some(([path]) => path === '/commands')).toBe(false)
 fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }))
 confirm = screen.getByRole('dialog', { name: 'Confirm question action' })
 fireEvent.click(within(confirm).getByRole('button', { name: 'Confirm submission' }))
 await within(confirm).findByRole('alert')
 expect(within(confirm).getByText('Persisted question')).toBeTruthy()
 expect(bankRequest).toHaveBeenCalledWith('/commands', { id: 'q', expectedRevision: 1, action: 'SUBMIT', reason: '', owner: null })
})

it('confirms approval only after the existing exact-version acknowledgement guard', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 bank.questions[0].versions[0].viewed = { ld: 'v' }
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('button', { name: 'Approve & publish' }))
 const confirm = screen.getByRole('dialog', { name: 'Confirm question action' })
 expect(vi.mocked(bankRequest).mock.calls.some(([path]) => path === '/commands')).toBe(false)
 expect(within(confirm).queryByRole('textbox')).toBeNull()
 fireEvent.click(within(confirm).getByRole('button', { name: 'Confirm approval' }))
 await waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/commands', { id: 'q', expectedRevision: 1, action: 'APPROVE', reason: '', owner: null }))
 await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Confirm question action' })).toBeNull())
})

it('renders permitted incomplete content and null author metadata without fabricated values', async () => {
 bank.questions[0].owner = null
 bank.questions[0].createdBy = null
 bank.questions[0].createdAt = null
 bank.questions[0].versions[0] = { ...bank.questions[0].versions[0], editedBy: null, editedAt: null, content: { ...body, prompt: '', options: ['', '', '', ''], correctAnswer: null, explanation: null } }
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 const responsibility = screen.getByRole('region', { name: 'Responsibility' })
 expect(within(responsibility).getByText('Unassigned')).toBeTruthy()
 const content = screen.getByRole('region', { name: 'Question content' })
 expect(within(content).getByText('Question prompt has not been entered.')).toBeTruthy()
 expect(within(content).getAllByText('Answer has not been entered.')).toHaveLength(4)
 expect(within(content).getByText('Correct answer has not been selected.')).toBeTruthy()
 expect(within(content).queryByText('Correct answer', { exact: true })).toBeNull()
 fireEvent.click(screen.getByRole('tab', { name: 'History & versions' }))
 const metadata = screen.getByRole('region', { name: 'Version information' })
 for (const entry of metadata.querySelectorAll('dd')) expect(entry.textContent).toBe('—')
 expect(screen.getByText('No activity was recorded for this question. Earlier changes may not be available for legacy items.')).toBeTruthy()
 expect(screen.queryByText('Not recorded')).toBeNull()
})

it('keeps known owner names while honestly reporting an unavailable current role', async () => {
 bank.questions[0].owner = 'former'
 session.people.push({ id: 'former', name: 'Former Owner' })
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 const responsibility = screen.getByRole('region', { name: 'Responsibility' })
 expect(within(responsibility).getByText('Former Owner')).toBeTruthy()
 expect(within(responsibility).getByText('Current Expert role is unavailable.')).toBeTruthy()
 expect(within(responsibility).queryByText('Expert', { exact: true })).toBeNull()
 expect(within(responsibility).queryByText('Unassigned')).toBeNull()
})

it('does not substitute the current owner for a historical assignment recipient', async () => {
 bank.history = [{ id: 'assignment', question: 'q', version: 'v', actor: 'expert', action: 'ASSIGNED', at: '2026-11-01T00:00:00Z', reason: 'Earlier assignment', snapshot: null }]
 session.people.push({ id: 'now', name: 'Current Owner Only' })
 bank.questions[0].owner = 'now'
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('tab', { name: 'History & versions' }))
 const event = within(screen.getByRole('list', { name: 'Activity history' })).getByRole('listitem')
 expect(within(event).getByText('Responsibility updated')).toBeTruthy()
 expect(within(event).getByText('A responsible Expert was assigned or reassigned.')).toBeTruthy()
 expect(within(event).getByText('Performed by')).toBeTruthy()
 expect(within(event).getByText('Alex')).toBeTruthy()
 expect(within(event).getByText('This question · v1')).toBeTruthy()
 expect(within(event).getByText('Historical recipient unavailable')).toBeTruthy()
 expect(within(event).queryByText('Current Owner Only')).toBeNull()
 expect(within(event).queryByRole('button', { name: 'View question snapshot' })).toBeNull()
 expect((screen.getByRole('combobox', { name: 'Version' }) as HTMLSelectElement).options).toHaveLength(1)
})

it.each([
 ['REQUEST_RETIRE', 'Retirement requested', 'A request was submitted; question availability had not yet changed.'],
 ['RETIRE_CONFIRMED', 'Status changed · Retired', 'The question was retired from future selection.'],
 ['RETURN', 'Returned for changes', 'L&D returned the submission to Draft for changes.'],
 ['UNKNOWN_LEGACY_EVENT', 'UNKNOWN_LEGACY_EVENT', 'An additional activity was recorded for this question.'],
])('explains %s without inventing a different transition', async (action, title, description) => {
 bank.history = [{ id: 'event', question: 'q', version: null, actor: 'expert', action, at: '2026-11-01T00:00:00Z', reason: null, snapshot: null }]
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'View question Q-1' }))
 fireEvent.click(screen.getByRole('tab', { name: 'History & versions' }))
 const event = within(screen.getByRole('list', { name: 'Activity history' })).getByRole('listitem')
 expect(within(event).getByText(title)).toBeTruthy()
 expect(within(event).getByText(description)).toBeTruthy()
 expect(within(event).getByText('This question')).toBeTruthy()
 expect(within(event).queryByText('Note / reason')).toBeNull()
 expect(within(event).queryByText('Rejected')).toBeNull()
})
