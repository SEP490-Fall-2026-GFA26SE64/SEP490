import { expect, it } from 'vitest'
import { individualKnowledgeState } from './individualSkillKnowledge'
import type { KnowledgeEntry } from '../baseline-assessment/knowledgeProfileApi'
const evidence = { kind: 'EVIDENCE', skillId: 'java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION' } as KnowledgeEntry
it('matches only the exact Skill, knowledge level and version; diagnostics alone never award achievement', () => {
  expect(individualKnowledgeState([evidence], 'java', 'v1', 'FOUNDATION').status).toBe('achieved')
  expect(individualKnowledgeState([evidence], 'java', 'v1', 'INTERMEDIATE').status).toBe('notAchieved')
  expect(individualKnowledgeState([evidence], 'java', 'v2', 'FOUNDATION').status).toBe('notAchieved')
  expect(individualKnowledgeState([evidence], 'other', 'v1', 'FOUNDATION').status).toBe('notAchieved')
  expect(individualKnowledgeState([{ ...evidence, kind: 'DIAGNOSTIC', passed: true }], 'java', 'v1', 'FOUNDATION').status).toBe('notAchieved')
})
it('preserves achievement while review is open and ignores resolved review work', () => {
  const review = { ...evidence, kind: 'REVIEW', reviewState: 'NEED_REVIEW' } as KnowledgeEntry
  expect(individualKnowledgeState([evidence, review], 'java', 'v1', 'FOUNDATION')).toEqual({ status: 'review', achieved: true, needsReview: true })
  expect(individualKnowledgeState([evidence, { ...review, reviewState: 'RESOLVED' }], 'java', 'v1', 'FOUNDATION').status).toBe('achieved')
})
it('does not display a failed or unavailable profile request as Not achieved', () => {
  expect(individualKnowledgeState(null, 'java', 'v1', 'FOUNDATION').status).toBe('unavailable')
  expect(individualKnowledgeState([], 'java', null, 'FOUNDATION').status).toBe('unavailable')
})
