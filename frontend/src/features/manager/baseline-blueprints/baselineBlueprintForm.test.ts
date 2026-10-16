import { describe, expect, it } from 'vitest'
import { developmentBaselineRoles } from './developmentBaselineCatalog'
import {
  difficulties,
  difficultyQuestionTotal,
  distributeRoleQuestionTotal,
  percentageToScoreWeight,
  roleQuestionTotal,
  scoreWeightToPercentage,
  type CountField,
} from './baselineBlueprintForm'

describe('baseline blueprint form policy', () => {
  it('distributes a role total deterministically and balances difficulty and skill totals', () => {
    const role = developmentBaselineRoles()[0]

    const first = distributeRoleQuestionTotal(role, 17)
    const replay = distributeRoleQuestionTotal(role, 17)

    expect(replay).toEqual(first)
    expect(roleQuestionTotal(first)).toBe(17)

    const difficultyTotals = difficulties.map((difficulty) =>
      difficultyQuestionTotal(first, difficulty))
    expect(Math.max(...difficultyTotals) - Math.min(...difficultyTotals)).toBeLessThanOrEqual(1)

    for (const difficulty of difficulties) {
      const field = `${difficulty}QuestionCount` as CountField
      const counts = first.skills.map((skill) => skill[field])
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    }

    const skillTotals = first.skills.map((skill) =>
      skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount)
    expect(Math.max(...skillTotals) - Math.min(...skillTotals)).toBeLessThanOrEqual(1)
    expect(first.skills.map((skill) => skill.microSkillId))
      .toEqual(role.skills.map((skill) => skill.microSkillId))
  })

  it('initializes proportional percentages that display as exactly 100 percent', () => {
    const distributed = distributeRoleQuestionTotal(developmentBaselineRoles()[0], 17)
    const displayed = [
      scoreWeightToPercentage(distributed.easyScoreWeight),
      scoreWeightToPercentage(distributed.mediumScoreWeight),
      scoreWeightToPercentage(distributed.hardScoreWeight),
    ]

    expect(displayed.reduce((sum, value) => sum + value, 0)).toBe(100)
    expect(distributed.easyScoreWeight
      + distributed.mediumScoreWeight
      + distributed.hardScoreWeight).toBeCloseTo(1, 10)
  })

  it('clears every count and weight for total zero and maps 40 percent to decimal 0.4', () => {
    const cleared = distributeRoleQuestionTotal(developmentBaselineRoles()[0], 0)

    expect(roleQuestionTotal(cleared)).toBe(0)
    expect([
      cleared.easyScoreWeight,
      cleared.mediumScoreWeight,
      cleared.hardScoreWeight,
    ]).toEqual([0, 0, 0])
    expect(percentageToScoreWeight('40')).toBe(0.4)
    expect(scoreWeightToPercentage(0.4)).toBe(40)
  })
})
