import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import type { BankContent } from '../../../api/questionBankApi'
import { QuestionDraftForm } from '../QuestionDraftForm'
import { QuestionContentPreview } from '../QuestionContentPreview'
const blank: BankContent = { prompt: '', options: ['', '', '', ''], correctAnswer: null, skillId: '', skillName: null, knowledgeLevel: null, mandatory: false, explanation: null }
afterEach(cleanup)
function Form() {
  const [content, setContent] = useState(blank)
  return <><QuestionDraftForm content={content} code={null} skills={[{ id: 'skill', name: 'Skill' }]} knowledgeLevels={['FOUNDATION']} busy={false} vi={false} onChange={patch => setContent(old => ({ ...old, ...patch }))} /><output aria-label="Draft value">{JSON.stringify(content)}</output></>
}
it('retains multiline question, answers and explanation exactly without selecting an answer automatically', () => {
  render(<Form />)
  const prompt = 'First line\nSecond line\n' + 'x'.repeat(150)
  const answer = 'A long answer\nwith another line'
  fireEvent.change(screen.getByLabelText('Question prompt'), { target: { value: prompt } })
  fireEvent.change(screen.getByLabelText('Option A'), { target: { value: answer } })
  fireEvent.change(screen.getByLabelText('Answer explanation'), { target: { value: 'Reason one\nReason two' } })
  const value = JSON.parse(screen.getByLabelText('Draft value').textContent!)
  expect(value).toMatchObject({ prompt, options: [answer, '', '', ''], explanation: 'Reason one\nReason two', correctAnswer: null })
  expect(screen.getByLabelText('Option A').tagName).toBe('TEXTAREA')
  fireEvent.click(screen.getByLabelText('Correct answer A'))
  expect(JSON.parse(screen.getByLabelText('Draft value').textContent!).correctAnswer).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Clear answer selection' }))
  expect(JSON.parse(screen.getByLabelText('Draft value').textContent!).correctAnswer).toBeNull()
})
it('keeps permitted empty fields and existing required-field feedback', () => {
  render(<Form />)
  fireEvent.blur(screen.getByLabelText('Question prompt'))
  expect(screen.getByRole('alert').textContent).toContain('Enter a question prompt')
  expect(JSON.parse(screen.getByLabelText('Draft value').textContent!)).toEqual(blank)
})
it.each(['default', 'details'] as const)('shows complete long content and explicit correct status in %s preview', variant => {
  const text = 'A'.repeat(200) + '\nMore content'
  render(<QuestionContentPreview variant={variant} content={{ ...blank, prompt: 'Long prompt', options: [text, 'B', 'C', 'D'], correctAnswer: 0, explanation: 'Full explanation' }} vi={false} />)
  const rows = within(screen.getByRole('list', { name: 'Answer choices' })).getAllByRole('listitem')
  expect(rows).toHaveLength(4)
  expect(rows[0].textContent).toContain(text)
  expect(rows[0].textContent).toContain('A')
  expect(screen.getByText(/Full explanation/)).toBeTruthy()
})
