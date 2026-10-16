import * as React from 'react'
import { Input } from '../../../shared/components/ui/Input'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { BlueprintRole } from './baselineBlueprintApi'
import {
  difficulties,
  difficultyQuestionTotal,
  roleQuestionTotal,
  type WeightField,
} from './baselineBlueprintForm'
import {
  displayWeight,
  isValidScoreWeights,
  moveWeightBoundary,
  rebalanceWeight,
  weightInputRange,
  weightSliderBounds,
  weightsFromRole,
  type ScoreWeights,
} from './baselineBlueprintWeights'

interface BaselineWeightControlProps {
  role: BlueprintRole
  disabled: boolean
  onChange: (weights: ScoreWeights) => void
  onPendingChange: (pending: boolean) => void
}

export function BaselineWeightControl({
  role, disabled, onChange, onPendingChange,
}: BaselineWeightControlProps) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = React.useState<Partial<Record<WeightField, string>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<WeightField, boolean>>>({})
  const weights = weightsFromRole(role)
  const slider = isValidScoreWeights(weights) ? weightSliderBounds(weights) : null

  const commit = (field: WeightField) => {
    const raw = drafts[field]
    if (raw === undefined) return
    setTouched((current) => ({ ...current, [field]: true }))
    const next = rebalanceWeight(weights, field, raw)
    if (!next) return
    const remaining = omitKey(drafts, field)
    setDrafts(remaining)
    setTouched((current) => omitKey(current, field))
    onPendingChange(Object.keys(remaining).length > 0)
    onChange(next)
  }

  const moveBoundary = (boundary: 'easy-medium' | 'medium-hard', value: string) => {
    if (!slider) return
    const requested = Number(value)
    const clamped = boundary === 'easy-medium'
      ? Math.min(slider.easyMaximum, Math.max(slider.easyMinimum, requested))
      : Math.min(slider.mediumMaximum, Math.max(slider.mediumMinimum, requested))
    const next = moveWeightBoundary(weights, boundary, clamped)
    if (!next) return
    setDrafts({})
    setTouched({})
    onPendingChange(false)
    onChange(next)
  }

  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3 text-xs">
      <div className="space-y-2">
        <div className="baseline-weight-slider relative h-10 overflow-hidden rounded-md border border-border bg-background">
          <div className="flex h-full" aria-hidden="true">
            <WeightSegment className="bg-success/20" width={role.easyScoreWeight} label={t('baselineBlueprint.difficulty.easy')} />
            <WeightSegment className="bg-warning/20" width={role.mediumScoreWeight} label={t('baselineBlueprint.difficulty.medium')} />
            <WeightSegment className="bg-destructive/15" width={role.hardScoreWeight} label={t('baselineBlueprint.difficulty.hard')} />
          </div>
          {slider && <>
            <input
              className="baseline-weight-range"
              type="range"
              min="0"
              max="10000"
              step="1"
              value={slider.easyBoundary}
              disabled={disabled}
              aria-label={t('baselineBlueprint.role.easyMediumBoundary')}
              onChange={(event) => moveBoundary('easy-medium', event.target.value)}
            />
            <input
              className="baseline-weight-range"
              type="range"
              min="0"
              max="10000"
              step="1"
              value={slider.mediumBoundary}
              disabled={disabled}
              aria-label={t('baselineBlueprint.role.mediumHardBoundary')}
              onChange={(event) => moveBoundary('medium-hard', event.target.value)}
            />
          </>}
        </div>
        <p className="text-muted-foreground">{t('baselineBlueprint.role.weightHierarchy')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {difficulties.map((difficulty) => {
          const field = `${difficulty}ScoreWeight` as WeightField
          const count = difficultyQuestionTotal(role, difficulty)
          const range = weightInputRange(field)
          const raw = drafts[field]
          const invalid = Boolean(touched[field]) && raw !== undefined
            && rebalanceWeight(weights, field, raw) === null
          const weightLabel = formatMessage(t('baselineBlueprint.role.scoreWeight'), {
            difficulty: t(`baselineBlueprint.difficulty.${difficulty}`),
          })
          return (
            <label key={field} className="space-y-1 capitalize">
              {weightLabel}
              <div className="relative">
                <Input
                  aria-label={weightLabel}
                  aria-invalid={invalid}
                  className="pr-7"
                  type="text"
                  inputMode="decimal"
                  value={raw ?? displayWeight(role[field])}
                  disabled={disabled || roleQuestionTotal(role) === 0}
                  onBlur={() => commit(field)}
                  onChange={(event) => {
                    setDrafts((current) => ({ ...current, [field]: event.target.value }))
                    setTouched((current) => omitKey(current, field))
                    onPendingChange(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commit(field)
                  }}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <span className={invalid
                ? 'block normal-case text-destructive'
                : 'block normal-case text-muted-foreground'}>
                {invalid
                  ? formatMessage(t('baselineBlueprint.validation.weightRange'), range)
                  : formatMessage(t(count === 1
                    ? 'baselineBlueprint.role.configuredQuestionOne'
                    : 'baselineBlueprint.role.configuredQuestionMany'), { count })}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function WeightSegment({ className, width, label }: {
  className: string
  width: number
  label: string
}) {
  return <div className={`flex min-w-0 items-center justify-center overflow-hidden ${className}`}
    style={{ width: `${width * 100}%` }}>
    <span className="truncate px-1 font-medium">{label} {displayWeight(width)}%</span>
  </div>
}

function omitKey<T>(record: Partial<Record<WeightField, T>>, key: WeightField) {
  const remaining = { ...record }
  delete remaining[key]
  return remaining
}

function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
