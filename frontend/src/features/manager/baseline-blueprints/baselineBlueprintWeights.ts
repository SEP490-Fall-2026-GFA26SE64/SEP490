import type { BlueprintRole } from './baselineBlueprintApi'
import type { WeightField } from './baselineBlueprintForm'

const TOTAL_UNITS = 10_000
const MINIMUM_UNITS = 100

export interface ScoreWeights {
  easyScoreWeight: number
  mediumScoreWeight: number
  hardScoreWeight: number
}

export interface WeightSliderBounds {
  easyBoundary: number
  easyMinimum: number
  easyMaximum: number
  mediumBoundary: number
  mediumMinimum: number
  mediumMaximum: number
}

export function isValidScoreWeights(weights: ScoreWeights) {
  const [easy, medium, hard] = weightUnits(weights)
  return easy >= MINIMUM_UNITS
    && easy < medium
    && medium < hard
    && easy + medium + hard === TOTAL_UNITS
}

export function defaultScoreWeights(): ScoreWeights {
  return fromUnits([2_000, 3_000, 5_000])
}

export function displayWeight(weight: number) {
  return String(Math.round(weight * TOTAL_UNITS) / 100)
}

export function rebalanceWeight(
  current: ScoreWeights,
  field: WeightField,
  rawValue: string,
): ScoreWeights | null {
  const fixed = parsePercentageUnits(rawValue)
  if (fixed === null) return null
  const editedIndex = weightFieldIndex(field)
  const otherIndexes = [0, 1, 2].filter((index) => index !== editedIndex)
  const remaining = TOTAL_UNITS - fixed
  const currentUnits = weightUnits(current)
  const currentOtherTotal = otherIndexes.reduce((sum, index) => sum + currentUnits[index], 0)
  const target = currentOtherTotal > 0
    ? remaining * currentUnits[otherIndexes[0]] / currentOtherTotal
    : remaining / 2
  let best: { units: [number, number, number]; distance: number } | null = null

  for (let first = MINIMUM_UNITS; first <= remaining - MINIMUM_UNITS; first += 1) {
    const candidate: [number, number, number] = [0, 0, 0]
    candidate[editedIndex] = fixed
    candidate[otherIndexes[0]] = first
    candidate[otherIndexes[1]] = remaining - first
    if (!validUnits(candidate)) continue
    const distance = Math.abs(first - target)
    if (!best || distance < best.distance) best = { units: candidate, distance }
  }
  return best ? fromUnits(best.units) : null
}

export function rebalanceWholeWeight(
  current: ScoreWeights,
  field: WeightField,
  rawValue: string,
  preservedField?: WeightField,
): ScoreWeights | null {
  const fixed = parseWholePercentage(rawValue)
  if (fixed === null) return null

  const editedIndex = weightFieldIndex(field)
  const preservedIndex = preservedField && preservedField !== field
    ? weightFieldIndex(preservedField)
    : null

  if (preservedIndex !== null) {
    const preserved = Math.round(weightUnits(current)[preservedIndex] / 100)
    const derivedIndex = [0, 1, 2].find((index) => index !== editedIndex && index !== preservedIndex)
    if (derivedIndex === undefined) return null
    const candidate: [number, number, number] = [0, 0, 0]
    candidate[editedIndex] = fixed
    candidate[preservedIndex] = preserved
    candidate[derivedIndex] = 100 - fixed - preserved
    return validWholePercentages(candidate) ? fromWholePercentages(candidate) : null
  }

  const otherIndexes = [0, 1, 2].filter((index) => index !== editedIndex)
  const remaining = 100 - fixed
  let best: { percentages: [number, number, number]; distance: number } | null = null
  for (let first = 1; first < remaining; first += 1) {
    const candidate: [number, number, number] = [0, 0, 0]
    candidate[editedIndex] = fixed
    candidate[otherIndexes[0]] = first
    candidate[otherIndexes[1]] = remaining - first
    if (!validWholePercentages(candidate)) continue
    const distance = Math.abs(candidate[otherIndexes[0]] - candidate[otherIndexes[1]])
    if (!best || distance < best.distance) best = { percentages: candidate, distance }
  }
  return best ? fromWholePercentages(best.percentages) : null
}

export function weightSliderBounds(weights: ScoreWeights): WeightSliderBounds {
  const [easy, medium, hard] = weightUnits(weights)
  const easyValues: number[] = []
  const mediumValues: number[] = []

  for (let boundary = MINIMUM_UNITS; boundary < TOTAL_UNITS; boundary += 1) {
    if (validUnits([boundary, TOTAL_UNITS - hard - boundary, hard])) easyValues.push(boundary)
    if (validUnits([easy, boundary - easy, TOTAL_UNITS - boundary])) mediumValues.push(boundary)
  }
  return {
    easyBoundary: easy,
    easyMinimum: easyValues[0] ?? easy,
    easyMaximum: easyValues.at(-1) ?? easy,
    mediumBoundary: easy + medium,
    mediumMinimum: mediumValues[0] ?? easy + medium,
    mediumMaximum: mediumValues.at(-1) ?? easy + medium,
  }
}

export function moveWeightBoundary(
  weights: ScoreWeights,
  boundary: 'easy-medium' | 'medium-hard',
  value: number,
): ScoreWeights | null {
  if (!Number.isInteger(value)) return null
  const [easy, , hard] = weightUnits(weights)
  const candidate: [number, number, number] = boundary === 'easy-medium'
    ? [value, TOTAL_UNITS - hard - value, hard]
    : [easy, value - easy, TOTAL_UNITS - value]
  return validUnits(candidate) ? fromUnits(candidate) : null
}

export function weightInputRange(field: WeightField) {
  if (field === 'easyScoreWeight') return { minimum: '1', maximum: '32' }
  if (field === 'mediumScoreWeight') return { minimum: '2', maximum: '49' }
  return { minimum: '34', maximum: '97' }
}

export function weightsFromRole(role: BlueprintRole): ScoreWeights {
  return {
    easyScoreWeight: role.easyScoreWeight,
    mediumScoreWeight: role.mediumScoreWeight,
    hardScoreWeight: role.hardScoreWeight,
  }
}

function parsePercentageUnits(value: string) {
  if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/.test(value)) return null
  const units = Math.round(Number(value) * 100)
  return units >= MINIMUM_UNITS && units < TOTAL_UNITS ? units : null
}

function parseWholePercentage(value: string) {
  if (!/^(?:[1-9]|[1-9]\d)$/.test(value)) return null
  const percentage = Number(value)
  return percentage < 100 ? percentage : null
}

function weightFieldIndex(field: WeightField) {
  if (field === 'easyScoreWeight') return 0
  if (field === 'mediumScoreWeight') return 1
  return 2
}

function weightUnits(weights: ScoreWeights): [number, number, number] {
  return [
    Math.round(weights.easyScoreWeight * TOTAL_UNITS),
    Math.round(weights.mediumScoreWeight * TOTAL_UNITS),
    Math.round(weights.hardScoreWeight * TOTAL_UNITS),
  ]
}

function validUnits([easy, medium, hard]: [number, number, number]) {
  return easy >= MINIMUM_UNITS
    && easy < medium
    && medium < hard
    && easy + medium + hard === TOTAL_UNITS
}

function validWholePercentages([easy, medium, hard]: [number, number, number]) {
  return Number.isInteger(easy)
    && Number.isInteger(medium)
    && Number.isInteger(hard)
    && easy >= 1
    && easy < medium
    && medium < hard
    && easy + medium + hard === 100
}

function fromWholePercentages([easy, medium, hard]: [number, number, number]): ScoreWeights {
  return fromUnits([easy * 100, medium * 100, hard * 100])
}

function fromUnits([easy, medium, hard]: [number, number, number]): ScoreWeights {
  return {
    easyScoreWeight: easy / TOTAL_UNITS,
    mediumScoreWeight: medium / TOTAL_UNITS,
    hardScoreWeight: hard / TOTAL_UNITS,
  }
}
