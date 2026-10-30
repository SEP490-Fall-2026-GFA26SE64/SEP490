import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { QuestionBankWorkspace } from '../QuestionBankWorkspace'
import { bankRequest, type BankView, type BankSession } from '../../../api/questionBankApi'
vi.mock('../../../layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../../api/questionBankApi', () => ({ bankRequest: vi.fn() }))
const body = { prompt: 'Persisted question', options: ['A1', 'B1', 'C1', 'D1'], correctAnswer: 0, skillId: 'skill', skillName: 'SQL', difficulty: 'EASY', explanation: 'Reason' }
let bank: BankView, session: BankSession
beforeEach(() => {
 session = { maxImportRows: 500, maxImportBytes: 10485760, actor: { id: 'expert', organization: 'org', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'SQL' }], experts: [{ id: 'expert', name: 'Alex' }], people: [{ id: 'expert', name: 'Alex' }] }
 bank = { id: 'bank', name: 'Bank', history: [], questions: [{ id: 'q', code: 'Q-1', createdBy: 'expert', createdAt: '2026-10-30T00:00:00Z', owner: 'expert', revision: 1, retired: false, request: null, versions: [{ id: 'v', number: 1, state: 'DRAFT', content: body, editedBy: 'expert', editedAt: '2026-10-30T00:00:00Z', submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reason: null, viewed: {} }] }] }
 vi.mocked(bankRequest).mockImplementation(async (path, data) => {
   if (path === '/session') return session
   if (path === '/notifications') return []
   if (path === '/questions') { expect(data).toMatchObject({ code: 'Q-NEW', content: { skillId: 'skill' } }); return bank }
   return bank
 })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('retains directory grouped by MicroSkill with actual version and owner', async () => {
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 expect(screen.getByText('Persisted question')).toBeTruthy()
 expect(screen.getByText('Responsible Expert: Alex')).toBeTruthy()
 expect(screen.getByRole('button', { name: 'Edit draft' })).toBeTruthy()
 expect(screen.queryByText('Assessment Blueprints')).toBeNull()
})
it('creates an incomplete draft through the protected API and clears the form only after success', async () => {
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: /^Create$/ }))
 const dialog = screen.getByRole('dialog')
 fireEvent.change(within(dialog).getByLabelText('Question code'), { target: { value: 'Q-NEW' } })
 fireEvent.change(within(dialog).getByLabelText('Question prompt'), { target: { value: 'Incomplete draft' } })
 fireEvent.change(within(dialog).getByLabelText('MicroSkill'), { target: { value: 'skill' } })
 fireEvent.click(within(dialog).getByRole('button', { name: 'Save draft' }))
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
 expect(bankRequest).toHaveBeenCalledWith('/questions', expect.objectContaining({ id: null, content: expect.objectContaining({ correctAnswer: null }) }))
})
it('does not grant peer edit or submit controls', async () => {
 bank.questions[0].owner = 'peer'
 render(<QuestionBankWorkspace />)
 await screen.findByText('Q-1')
 expect(screen.queryByRole('button', { name: 'Edit draft' })).toBeNull()
 expect(screen.queryByRole('button', { name: /^Submit$/ })).toBeNull()
})
it('requires the manager to acknowledge the exact submitted version before approval', async () => {
 session.actor = { id: 'ld', organization: 'org', role: 'LD_MANAGER' }
 bank.questions[0].versions[0].state = 'SUBMITTED'
 render(<QuestionBankWorkspace />)
 fireEvent.click(await screen.findByRole('button', { name: 'Details & history' }))
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
