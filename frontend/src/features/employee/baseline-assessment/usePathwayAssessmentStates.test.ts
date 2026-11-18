import { expect, it } from 'vitest'
import { moduleAssessmentState, type AttemptOutcomeLike } from './usePathwayAssessmentStates'

const pathway = { selectionId: 'selection-1', selectionRevision: 2 }
const step = { id: 'step-1' }
const passed = (target: AttemptOutcomeLike['target']): AttemptOutcomeLike => ({
  target, state: 'COMPLETED', results: [{ groupId: 'main', passed: true, vetoTriggered: false }],
  groups: [{ id: 'main', role: 'MAIN' }],
})

it('ignores independent assessments with a null selection', () => {
  expect(moduleAssessmentState([passed({ selectionId: null, selectionRevision: 0, stepId: null })], pathway, step)).toBe('notStarted')
})

it('uses the matching pathway assessment alongside independent history', () => {
  expect(moduleAssessmentState([
    passed({ selectionId: null, selectionRevision: 0, stepId: null }),
    passed({ ...pathway, stepId: step.id }),
  ], pathway, step)).toBe('passed')
})

it('ignores other selections, revisions and steps', () => {
  expect(moduleAssessmentState([
    passed({ ...pathway, selectionId: 'other', stepId: step.id }),
    passed({ ...pathway, selectionRevision: 1, stepId: step.id }),
    passed({ ...pathway, stepId: 'other' }),
  ], pathway, step)).toBe('notStarted')
})
