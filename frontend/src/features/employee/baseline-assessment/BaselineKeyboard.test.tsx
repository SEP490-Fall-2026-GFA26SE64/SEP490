import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { BaselineAttemptPanel } from './BaselineAttemptPanel'
import type { BaselineAttempt, BaselineCommand } from './baselineApi'

vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)

function paper(purpose: BaselineAttempt['purpose'] = 'BASELINE'): BaselineAttempt {
  return {
    id: 'keyboard-attempt', purpose, target: { selectionId: 'selection', selectionRevision: 1 },
    jobPositionId: 'job', jobPositionName: 'Job', roleId: 'role', roleName: 'Role', levelId: 'level', levelName: 'Middle',
    state: 'IN_PROGRESS', revision: 1, startedAt: '2026-11-18T00:00:00Z', deadlineAt: '2026-11-18T00:10:00Z',
    observedAt: '2026-11-18T00:00:00Z', finishedAt: null, finishReason: null, previousAttemptId: null,
    expired: false, maxQuestions: 2, answeredCount: 0, groups: [], results: [],
    items: [1, 2].map(position => ({ position, itemVersionId: `item-${position}`, groupId: 'group',
      prompt: `Prompt ${position}`, selectedOptionId: null,
      options: ['a', 'b', 'c', 'd'].map(id => ({ id, text: `Option ${id}` })) })),
  }
}

it.each(['BASELINE', 'SKILL_ASSESSMENT'] as const)('%s saves once, waits for accepted answer, focuses next question and never auto-submits', async purpose => {
  const user = userEvent.setup(), original = paper(purpose)
  let finish!: () => void
  const run = vi.fn((_command: BaselineCommand) => new Promise<void>(resolve => { finish = resolve }))
  const view = render(<BaselineAttemptPanel attempt={original} seconds={600} locked={false} run={run} />)
  await user.keyboard('2{Enter}{Enter}1')
  expect(run).toHaveBeenCalledTimes(1)
  expect(JSON.parse(run.mock.calls[0]![0]!.body)).toMatchObject({ position: 1, selectedOptionId: 'b', expectedRevision: 1 })
  expect(screen.getByText('Prompt 1')).toBeTruthy()
  expect((screen.getByRole('radio', { name: 'Option b' }) as HTMLInputElement).checked).toBe(true)
  await act(async () => finish())
  expect(screen.getByText('Prompt 1')).toBeTruthy() // Resolving run alone is not acceptance.
  const accepted = { ...original, revision: 2, answeredCount: 1, items: original.items.map(i => i.position === 1 ? { ...i, selectedOptionId: 'b' } : i) }
  view.rerender(<BaselineAttemptPanel attempt={accepted} seconds={600} locked={false} run={run} />)
  expect(screen.getByText('Prompt 2')).toBeTruthy()
  await user.keyboard('1{Enter}')
  expect(run).toHaveBeenCalledTimes(2)
  expect(JSON.parse(run.mock.calls[1]![0]!.body)).toMatchObject({ position: 2, selectedOptionId: 'a', expectedRevision: 2 })
  expect(screen.queryByRole('dialog')).toBeNull()
  await act(async () => finish())
  view.rerender(<BaselineAttemptPanel attempt={{ ...accepted, revision: 3, answeredCount: 2,
    items: accepted.items.map(i => i.position === 2 ? { ...i, selectedOptionId: 'a' } : i) }} seconds={600} locked={false} run={run} />)
  expect(screen.getByRole('dialog')).toBeTruthy()
  await user.keyboard('2')
  expect(run).toHaveBeenCalledTimes(2)
  expect(run.mock.calls.every(([command]) => command.path.endsWith('/answers'))).toBe(true)
})

it('keeps a failed save on the same question and allows retry without losing the choice', async () => {
  const user = userEvent.setup(), run = vi.fn(async () => {})
  render(<BaselineAttemptPanel attempt={paper()} seconds={600} locked={false} run={run} />)
  await user.keyboard('3{Enter}')
  expect(screen.getByText('Prompt 1')).toBeTruthy()
  expect((screen.getByRole('radio', { name: 'Option c' }) as HTMLInputElement).checked).toBe(true)
  await user.keyboard('{Enter}')
  expect(run).toHaveBeenCalledTimes(2)
})

it.each([
  { locked: true }, { busy: true }, { seconds: 0 }, { expired: true }, { state: 'FINALIZED' as const },
])('ignores shortcuts for an unavailable attempt: %j', async flags => {
  const user = userEvent.setup(), run = vi.fn(async () => {})
  render(<BaselineAttemptPanel attempt={{ ...paper(), expired: flags.expired ?? false, state: flags.state ?? 'IN_PROGRESS' }}
    seconds={flags.seconds ?? 600} locked={flags.locked ?? false} busy={flags.busy ?? false} run={run} />)
  await user.keyboard('1{Enter}')
  expect(run).not.toHaveBeenCalled()
  expect(screen.getByText(flags.seconds === 0 || flags.expired ? 'employeeBaseline.expired' : 'Prompt 1')).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('ignores empty Enter, repeats, modifiers, IME, editable controls and out-of-range keys', async () => {
  const user = userEvent.setup(), run = vi.fn(async () => {})
  const { container } = render(<BaselineAttemptPanel attempt={paper()} seconds={600} locked={false} run={run} />)
  const question = screen.getByText('Prompt 1').closest('div[tabindex]')!
  await user.keyboard('{Enter}0')
  for (const flags of [{ repeat: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }, { isComposing: true }]) {
    fireEvent.keyDown(question, { key: '1', ...flags })
  }
  for (const element of [document.createElement('input'), document.createElement('textarea'), document.createElement('select')]) {
    container.firstElementChild!.append(element)
    fireEvent.keyDown(element, { key: '1' }); fireEvent.keyDown(element, { key: 'Enter' })
  }
  expect(screen.getAllByRole('radio').some(radio => (radio as HTMLInputElement).checked)).toBe(false)
  expect(run).not.toHaveBeenCalled()
  expect(screen.getByText('Prompt 1')).toBeTruthy()
})

it('selects the tenth displayed option with 0', async () => {
  const user = userEvent.setup(), attempt = paper()
  attempt.items[0]!.options = Array.from({ length: 10 }, (_, i) => ({ id: `id-${i}`, text: `Answer ${i + 1}` }))
  render(<BaselineAttemptPanel attempt={attempt} seconds={600} locked={false} run={vi.fn(async () => {})} />)
  await user.keyboard('0')
  expect((screen.getByRole('radio', { name: 'Answer 10' }) as HTMLInputElement).checked).toBe(true)
})
