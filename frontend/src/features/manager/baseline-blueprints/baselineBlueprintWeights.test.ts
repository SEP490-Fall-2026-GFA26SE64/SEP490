import { describe, expect, it } from 'vitest'
import {
  defaultScoreWeights,
  displayWeight,
  isValidScoreWeights,
  rebalanceWholeWeight,
  weightInputRange,
} from './baselineBlueprintWeights'

describe('baselineBlueprintWeights', () => {
  it('uses a valid hard-greater-than-medium-greater-than-easy default', () => {
    const weights = defaultScoreWeights()

    expect(weights).toEqual({
      easyScoreWeight: 0.2,
      mediumScoreWeight: 0.3,
      hardScoreWeight: 0.5,
    })
    expect(isValidScoreWeights(weights)).toBe(true)
    expect(displayWeight(weights.hardScoreWeight)).toBe('50')
  })

  it.each(['', '040', '0', '1.001', '100', '-1', 'abc'])(
    'rejects malformed or out-of-range percentage %s',
    (raw) => {
      expect(rebalanceWholeWeight(defaultScoreWeights(), 'easyScoreWeight', raw)).toBeNull()
    },
  )

  it('keeps the edited value and deterministically rebalances the other two weights', () => {
    const afterHard = rebalanceWholeWeight(defaultScoreWeights(), 'hardScoreWeight', '40')
    expect(afterHard).toEqual({ easyScoreWeight: 0.29, mediumScoreWeight: 0.31, hardScoreWeight: 0.4 })
    const afterMedium = rebalanceWholeWeight(afterHard!, 'mediumScoreWeight', '35', 'hardScoreWeight')
    expect(afterMedium).toEqual({ easyScoreWeight: 0.25, mediumScoreWeight: 0.35, hardScoreWeight: 0.4 })
    expect(isValidScoreWeights(afterMedium!)).toBe(true)
  })

  it('rejects an edit that cannot preserve the previous field and hierarchy', () => {
    const afterHard = rebalanceWholeWeight(defaultScoreWeights(), 'hardScoreWeight', '40')!
    expect(rebalanceWholeWeight(afterHard, 'mediumScoreWeight', '40', 'hardScoreWeight')).toBeNull()
    expect(rebalanceWholeWeight(afterHard, 'mediumScoreWeight', '39.5', 'hardScoreWeight')).toBeNull()
  })

  it('publishes input ranges that communicate the absolute hierarchy limits', () => {
    expect(weightInputRange('easyScoreWeight')).toEqual({ minimum: '1', maximum: '32' })
    expect(weightInputRange('mediumScoreWeight')).toEqual({ minimum: '2', maximum: '49' })
    expect(weightInputRange('hardScoreWeight')).toEqual({ minimum: '34', maximum: '97' })
  })
})
