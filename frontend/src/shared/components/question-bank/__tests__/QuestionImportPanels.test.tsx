import { importIssueLocation } from '../importIssueLocation'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ImportValidationSummary, QuestionImportUpload } from '../QuestionImportPanels'
import type { BankContent, BankPreview } from '../../../api/questionBankApi'
const copy = (en: string) => en
const content: BankContent = { prompt: 'Question', options: [], correctAnswer: null, skillId: 'skill', skillName: null, knowledgeLevel: null, mandatory: false, explanation: null }
afterEach(cleanup)
it('counts accepted drafts, rejected rows and distinct matching candidates without counting warnings as rows', () => {
 const preview: BankPreview = { id: 'batch', rows: [{ code: 'Q-1', content }, { code: 'Q-2', content }], errors: ['Row 2: invalid skill'], warnings: ['Q-1: matching content exists: old', 'Q-1: matching content in this file', 'Another warning'], expiresAt: '', committed: false, expected: {} }
 render(<ImportValidationSummary preview={preview} totalRows={3} copy={copy} />)
 for (const [label, count] of [['Total rows', '3'], ['Accepted drafts', '2'], ['Rejected rows', '1'], ['Matching content', '1']]) expect(within(screen.getByText(label).parentElement!).getByText(count)).toBeTruthy()
})
it('maps actual Excel source rows and retains unsupported errors verbatim', () => {
 expect(importIssueLocation('Row 2: invalid skillId', [2, 7], true, copy)).toBe('Excel row 7: invalid skillId')
 expect(importIssueLocation('Row 1: invalid prompt', [1], false, copy)).toBe('JSON item 1: invalid prompt')
 expect(importIssueLocation('Storage unavailable', [], false, copy)).toBe('Storage unavailable')
})
it('offers keyboard file browsing and accepts dropped files only when enabled', () => {
 const upload = vi.fn(), template = vi.fn()
 const file = new File(['[]'], 'questions.json', { type: 'application/json' })
 const props = { busy: false, file: { name: file.name, bytes: file.size }, maxBytes: 10485760, maxRows: 500, onUpload: upload, onTemplate: template, copy }
 const view = render(<QuestionImportUpload {...props} />)
 fireEvent.drop(screen.getByText('Drag and drop your file here').parentElement!, { dataTransfer: { files: [file] } })
 expect(upload).toHaveBeenCalledWith(file)
 expect(screen.getByText('questions.json')).toBeTruthy()
 expect(screen.getByRole('button', { name: 'Browse files' })).toBeTruthy()
 fireEvent.click(screen.getByRole('button', { name: 'Excel template' }))
 expect(template).toHaveBeenCalledWith('xlsx')
 view.rerender(<QuestionImportUpload {...props} busy />)
 upload.mockClear()
 fireEvent.drop(screen.getByText('Drag and drop your file here').parentElement!, { dataTransfer: { files: [file] } })
 expect(upload).not.toHaveBeenCalled()
 expect(screen.getByRole('button', { name: 'Browse files' }).hasAttribute('disabled')).toBe(true)
})

it('announces the current step and completed steps without adding navigation actions', async () => {
 const { LinearStepper } = await import('../../ui/LinearStepper')
 render(<LinearStepper steps={['Choose File', 'Review', 'Confirm']} currentStep={2} ariaLabel="Import progress" />)
 const steps = within(screen.getByRole('list', { name: 'Import progress' })).getAllByRole('listitem')
 expect(steps).toHaveLength(3)
 expect(steps[2].getAttribute('aria-current')).toBe('step')
 expect(within(steps[0]).getByText('· Completed')).toBeTruthy()
 expect(screen.queryByRole('button')).toBeNull()
})
