import { describe, expect, it } from 'vitest'
import {
  defaultScoreWeights,
  displayWeight,
  isValidScoreWeights,
  moveWeightBoundary,
  rebalanceWeight,
  weightInputRange,
  weightSliderBounds,
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
      expect(rebalanceWeight(defaultScoreWeights(), 'easyScoreWeight', raw)).toBeNull()
    },
  )

  it('keeps the edited value and deterministically rebalances the other two weights', () => {
    const next = rebalanceWeight(defaultScoreWeights(), 'easyScoreWeight', '25')

    expect(next?.easyScoreWeight).toBe(0.25)
    expect(next && isValidScoreWeights(next)).toBe(true)
    expect(next && Object.values(next).reduce((sum, value) => sum + value, 0)).toBe(1)
    expect(rebalanceWeight(defaultScoreWeights(), 'easyScoreWeight', '40')).toBeNull()
  })

  it('moves both slider dividers only inside strict hierarchy bounds', () => {
    const weights = defaultScoreWeights()
    const bounds = weightSliderBounds(weights)

    expect(bounds).toEqual({
      easyBoundary: 2000,
      easyMinimum: 100,
      easyMaximum: 2499,
      mediumBoundary: 5000,
      mediumMinimum: 4001,
      mediumMaximum: 5999,
    })
    expect(moveWeightBoundary(weights, 'easy-medium', 2200)).toEqual({
      easyScoreWeight: 0.22,
      mediumScoreWeight: 0.28,
      hardScoreWeight: 0.5,
    })
    expect(moveWeightBoundary(weights, 'medium-hard', 5200)).toEqual({
      easyScoreWeight: 0.2,
      mediumScoreWeight: 0.32,
      hardScoreWeight: 0.48,
    })
    expect(moveWeightBoundary(weights, 'easy-medium', 2500)).toBeNull()
  })

  it('publishes input ranges that communicate the absolute hierarchy limits', () => {
    expect(weightInputRange('easyScoreWeight')).toEqual({ minimum: '1', maximum: '33.32' })
    expect(weightInputRange('mediumScoreWeight')).toEqual({ minimum: '1.01', maximum: '49.49' })
    expect(weightInputRange('hardScoreWeight')).toEqual({ minimum: '33.34', maximum: '97.99' })
  })
})
