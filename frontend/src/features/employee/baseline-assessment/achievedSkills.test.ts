import { expect, it } from 'vitest'
import { achievedSkills } from './achievedSkills'
import type { KnowledgeEntry } from './knowledgeProfileApi'
const evidence = (overrides: Partial<KnowledgeEntry> = {}): KnowledgeEntry => ({ kind: 'EVIDENCE', id: 'e1', skillId: 'java', skillName: 'Java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION', outcomeCodes: [], observedAt: '2026-11-17T00:00:00Z', purpose: null, attemptId: null, correctCount: null, totalCount: null, passed: null, mandatorySatisfied: null, vetoTriggered: null, reasons: [], sourceKind: 'MODULE_ASSESSMENT', sourceId: 'source1', reviewState: null, ...overrides })
it('merges official records without duplicating a Skill/version/level or losing distinct evidence', () => {
  const one = evidence(), two = evidence({ id: 'e2', sourceId: 'source2' })
  const rows = achievedSkills([one, two, one])
  expect(rows).toHaveLength(1); expect(rows[0].levels).toHaveLength(1); expect(rows[0].levels[0].evidence).toHaveLength(2)
})
it('diagnostic passes and review records alone never award a level', () => {
  expect(achievedSkills([evidence({ kind: 'DIAGNOSTIC', passed: true }), evidence({ kind: 'REVIEW', id: 'r', reviewState: 'NEED_REVIEW' })])).toEqual([])
})
it('keeps exact versions and levels, including an Advanced achievement without inferring lower levels', () => {
  const rows = achievedSkills([evidence({ knowledgeLevel: 'ADVANCED' }), evidence({ id: 'older', skillVersion: 'v0', knowledgeLevel: 'INTERMEDIATE' })])
  expect(rows.map(r => [r.skillVersion, r.levels.map(l => l.knowledgeLevel)])).toEqual([['v0', ['INTERMEDIATE']], ['v1', ['ADVANCED']]])
})
it('retains official certificate/assessment evidence with a review annotation, excluding diagnostic history', () => {
  const rows = achievedSkills([evidence({ sourceKind: 'CERTIFICATE' }), evidence({ kind: 'REVIEW', id: 'r', reviewState: 'NEED_REVIEW' }), evidence({ kind: 'DIAGNOSTIC', id: 'd', passed: false })])
  expect(rows[0].levels[0].needsReview).toBe(true); expect(rows[0].levels[0].evidence).toHaveLength(1)
  expect(rows[0].levels[0].latestAssessment).toBeUndefined()
})

it('a resolved review does not mark an achieved level as needing review', () => {
  const rows = achievedSkills([evidence(), evidence({ kind: 'REVIEW', id: 'resolved', reviewState: 'RESOLVED' })])
  expect(rows[0].levels[0].needsReview).toBe(false)
  expect(rows[0].levels[0].evidence).toHaveLength(1)
})
