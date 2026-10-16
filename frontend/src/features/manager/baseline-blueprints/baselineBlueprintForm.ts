import type { BlueprintRole } from './baselineBlueprintApi'

export const difficulties = ['easy', 'medium', 'hard'] as const

export type Difficulty = typeof difficulties[number]
export type CountField = `${Difficulty}QuestionCount`
export type WeightField = `${Difficulty}ScoreWeight`

const PERCENTAGE_UNITS = 10_000

export function roleQuestionTotal(role: BlueprintRole) {
  return role.skills.reduce((total, skill) => total
    + skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount, 0)
}

export function difficultyQuestionTotal(role: BlueprintRole, difficulty: Difficulty) {
  const field = `${difficulty}QuestionCount` as CountField
  return role.skills.reduce((total, skill) => total + skill[field], 0)
}

export function distributeRoleQuestionTotal(role: BlueprintRole, requestedTotal: number): BlueprintRole {
  const total = Number.isFinite(requestedTotal) ? Math.max(0, Math.trunc(requestedTotal)) : 0
  const skillCount = role.skills.length
  if (skillCount === 0) return role

  const difficultyBase = Math.floor(total / difficulties.length)
  const difficultyRemainder = total % difficulties.length
  const difficultyTotals = difficulties.map((_, index) =>
    difficultyBase + (index < difficultyRemainder ? 1 : 0))
  const [easyScoreWeight, mediumScoreWeight, hardScoreWeight] = proportionalScoreWeights(difficultyTotals)

  const countsBySkill = role.skills.map(() => [0, 0, 0])
  let remainderStart = 0

  difficultyTotals.forEach((difficultyTotal, difficultyIndex) => {
    const perSkill = Math.floor(difficultyTotal / skillCount)
    const remainder = difficultyTotal % skillCount

    for (let skillIndex = 0; skillIndex < skillCount; skillIndex += 1) {
      const remainderDistance = (skillIndex - remainderStart + skillCount) % skillCount
      countsBySkill[skillIndex][difficultyIndex] = perSkill + (remainderDistance < remainder ? 1 : 0)
    }
    remainderStart = (remainderStart + remainder) % skillCount
  })

  return {
    ...role,
    totalQuestionCount: total,
    easyScoreWeight,
    mediumScoreWeight,
    hardScoreWeight,
    skills: role.skills.map((skill, skillIndex) => ({
      ...skill,
      easyQuestionCount: countsBySkill[skillIndex][0],
      mediumQuestionCount: countsBySkill[skillIndex][1],
      hardQuestionCount: countsBySkill[skillIndex][2],
    })),
  }
}

export function scoreWeightToPercentage(weight: number) {
  return Math.round(weight * PERCENTAGE_UNITS) / 100
}

export function percentageToScoreWeight(value: string) {
  const percentage = Math.min(100, Math.max(0, Number.parseFloat(value) || 0))
  return Math.round(percentage * 100) / PERCENTAGE_UNITS
}

function proportionalScoreWeights(difficultyTotals: number[]): [number, number, number] {
  const total = difficultyTotals.reduce((sum, count) => sum + count, 0)
  if (total === 0) return [0, 0, 0]

  const rawUnits = difficultyTotals.map((count) => count * PERCENTAGE_UNITS / total)
  const allocatedUnits = rawUnits.map(Math.floor)
  let remainingUnits = PERCENTAGE_UNITS - allocatedUnits.reduce((sum, units) => sum + units, 0)
  const remainderOrder = rawUnits
    .map((raw, index) => ({ index, remainder: raw - allocatedUnits[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)

  for (let index = 0; index < remainderOrder.length && remainingUnits > 0; index += 1) {
    allocatedUnits[remainderOrder[index].index] += 1
    remainingUnits -= 1
  }

  return allocatedUnits.map((units) => units / PERCENTAGE_UNITS) as [number, number, number]
}
