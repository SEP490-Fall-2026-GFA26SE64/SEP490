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
  rebalanceWholeWeight,
  weightInputRange,
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
  const lastCommittedField = React.useRef<WeightField | undefined>(undefined)
  const weights = weightsFromRole(role)

  const commit = (field: WeightField) => {
    const raw = drafts[field]
    if (raw === undefined) return
    setTouched((current) => ({ ...current, [field]: true }))
    const next = rebalanceWholeWeight(weights, field, raw, lastCommittedField.current)
    if (!next) return
    const remaining = omitKey(drafts, field)
    setDrafts(remaining)
    setTouched((current) => omitKey(current, field))
    onPendingChange(Object.keys(remaining).length > 0)
    lastCommittedField.current = field
    onChange(next)
  }

  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3 text-xs">
      <p className="text-muted-foreground">{t('baselineBlueprint.role.weightHierarchy')}</p>

      <div className="grid gap-3 md:grid-cols-3">
        {difficulties.map((difficulty) => {
          const field = `${difficulty}ScoreWeight` as WeightField
          const count = difficultyQuestionTotal(role, difficulty)
          const range = weightInputRange(field)
          const raw = drafts[field]
          const invalid = Boolean(touched[field]) && raw !== undefined
            && rebalanceWholeWeight(weights, field, raw, lastCommittedField.current) === null
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
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={raw ?? String(Math.round(role[field] * 100))}
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
