import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/app/styles.css'
import { LanguageProvider } from '../../src/shared/i18n/LanguageContext'
import { BaselineAttemptPanel } from '../../src/features/employee/baseline-assessment/BaselineAttemptPanel'
import type { BaselineAttempt, BaselineCommand } from '../../src/features/employee/baseline-assessment/baselineApi'

// Isolated browser fixture: real UI, synthetic paper and controlled save acknowledgements; no backend writes.
export function AssessmentKeyboardFixture() {
  const params = new URLSearchParams(window.location.search)
  const [attempt, setAttempt] = useState<BaselineAttempt>(() => ({
    id: 'browser-keyboard', purpose: params.get('purpose') === 'SKILL_ASSESSMENT' ? 'SKILL_ASSESSMENT' : 'BASELINE',
    target: { selectionId: 'fixture-selection', selectionRevision: 1 }, jobPositionId: 'fixture-job', jobPositionName: 'Fixture job',
    roleId: 'fixture-role', roleName: 'Keyboard fixture', levelId: 'fixture-level', levelName: 'Middle',
    state: 'IN_PROGRESS', revision: 1, startedAt: '2026-11-18T00:00:00Z', deadlineAt: '2026-11-18T00:10:00Z',
    observedAt: '2026-11-18T00:00:00Z', finishedAt: null, finishReason: null, previousAttemptId: null,
    expired: false, maxQuestions: 2, answeredCount: 0, groups: [], results: [],
    items: [1, 2].map(position => ({ position, itemVersionId: `fixture-item-${position}`, groupId: 'fixture-group',
      prompt: `Question fixture ${position}`, selectedOptionId: null,
      options: ['a', 'b', 'c', 'd'].map(id => ({ id, text: `Option ${id}` })) })),
  }))
  const [commands, setCommands] = useState<BaselineCommand[]>([]), [busy, setBusy] = useState(false)
  const [error, setError] = useState(false), [done, setDone] = useState(false)
  const firstFailure = useRef(params.get('fail') === '1')
  async function run(command: BaselineCommand) {
    setCommands(previous => [...previous, command]); setBusy(true); setError(false)
    await new Promise(resolve => setTimeout(resolve, 200))
    if (firstFailure.current) { firstFailure.current = false; setError(true); setBusy(false); return }
    if (command.path.endsWith('/answers')) {
      const answer = JSON.parse(command.body) as { position: number; selectedOptionId: string }
      setAttempt(previous => {
        const items = previous.items.map(item => item.position === answer.position ? { ...item, selectedOptionId: answer.selectedOptionId } : item)
        return { ...previous, revision: previous.revision + 1, items, answeredCount: items.filter(item => item.selectedOptionId).length }
      })
    } else setDone(true)
    setBusy(false)
  }
  return <main className="mx-auto max-w-5xl p-4">
    <output className="sr-only" data-testid="commands">{JSON.stringify(commands)}</output>
    {error && <p role="alert">Simulated save failure</p>}
    {done ? <p role="status">Explicit submission accepted</p> : <BaselineAttemptPanel attempt={attempt} seconds={600} locked={busy} busy={busy} run={run} />}
  </main>
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><AssessmentKeyboardFixture /></LanguageProvider>)
