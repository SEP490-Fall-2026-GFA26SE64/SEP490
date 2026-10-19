import { ChevronDown, WandSparkles } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../shared/components/ui/Accordion'
import { Input } from '../../../shared/components/ui/Input'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { BlueprintCapacity, BlueprintRole } from './baselineBlueprintApi'
import { BaselineWeightControl } from './BaselineWeightControl'
import {
  capacityCellKey,
  roleCapacityLimit,
  type CapacityIssue,
} from './baselineBlueprintCapacity'
import {
  difficulties,
  roleQuestionTotal,
  type CountField,
} from './baselineBlueprintForm'
import type { ScoreWeights } from './baselineBlueprintWeights'

export type { CountField } from './baselineBlueprintForm'

interface BaselineRoleConfigurationProps {
  roles: BlueprintRole[]
  capacity: BlueprintCapacity | null
  capacityIssues: CapacityIssue[]
  disabled: boolean
  onCount: (roleIndex: number, skillIndex: number, field: CountField, value: string) => void
  onWeights: (roleIndex: number, weights: ScoreWeights) => void
  onApplyTotal: (roleIndex: number, total: number) => void
  onPendingInputChange: (roleId: string, pending: boolean) => void
}

export function BaselineRoleConfiguration({
  roles,
  capacity,
  capacityIssues,
  disabled,
  onCount,
  onWeights,
  onApplyTotal,
  onPendingInputChange,
}: BaselineRoleConfigurationProps) {
  return (
    <Accordion type="multiple" defaultValue={roles[0] ? [roles[0].roleId] : []}>
      {roles.map((role, roleIndex) => (
        <RoleConfiguration
          key={role.roleId}
          role={role}
          roleIndex={roleIndex}
          roles={roles}
          capacity={capacity}
          capacityIssues={capacityIssues}
          disabled={disabled}
          onCount={onCount}
          onWeights={onWeights}
          onApplyTotal={onApplyTotal}
          onPendingInputChange={onPendingInputChange}
        />
      ))}
    </Accordion>
  )
}

function RoleConfiguration({ role, roleIndex, roles, capacity, capacityIssues, disabled, onCount, onWeights, onApplyTotal, onPendingInputChange }:
  { role: BlueprintRole; roleIndex: number } & BaselineRoleConfigurationProps) {
  const { t } = useTranslation()
  const total = roleQuestionTotal(role)
  const [totalDraft, setTotalDraft] = React.useState<string | null>(null)
  const [totalTouched, setTotalTouched] = React.useState(false)
  const [countDrafts, setCountDrafts] = React.useState<Record<string, string>>({})
  const [countTouched, setCountTouched] = React.useState<Record<string, boolean>>({})
  const [weightPending, setWeightPending] = React.useState(false)
  const totalInput = totalDraft ?? String(total)
  const limit = capacity ? roleCapacityLimit(roles, roleIndex, capacity) : null
  const parsedTotal = parseCount(totalInput)
  const totalValid = parsedTotal !== null && (parsedTotal === 0 || Boolean(
    limit?.feasible && parsedTotal >= limit.minimum && parsedTotal <= limit.maximum,
  ))
  const roleIssues = capacityIssues.filter((issue) => issue.roleIds.includes(role.roleId))

  const applyTotal = () => {
    setTotalTouched(true)
    if (!totalValid || parsedTotal === null) return
    setTotalDraft(null)
    setTotalTouched(false)
    setCountDrafts({})
    setCountTouched({})
    onPendingInputChange(role.roleId, false)
    onApplyTotal(roleIndex, parsedTotal)
  }

  return (
    <AccordionItem value={role.roleId}>
      <AccordionTrigger disabled={disabled}>
        <span className="flex flex-wrap items-center gap-2">
          <span>{role.roleNameSnapshot}</span>
          <Badge variant={total > 0 ? 'primary' : 'secondary'}>
            {total > 0 ? questionCount(t, total) : t('baselineBlueprint.role.zeroExcluded')}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 text-foreground">
        <p className="text-xs text-muted-foreground">
          {t('baselineBlueprint.role.excludeHelp')}
        </p>

        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-muted/30 p-3">
          <label className="min-w-48 flex-1 space-y-1 text-xs font-medium">
            {t('baselineBlueprint.role.totalQuestions')}
            <Input
              type="number"
              min="0"
              max={limit?.maximum}
              step="1"
              value={totalInput}
              aria-invalid={totalTouched && !totalValid}
              disabled={disabled || !capacity}
              onBlur={() => setTotalTouched(true)}
              onChange={(event) => {
                setTotalDraft(event.target.value)
                setTotalTouched(false)
                onPendingInputChange(role.roleId, true)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyTotal()
              }}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            leftIcon={<WandSparkles size={15} />}
            disabled={disabled || !capacity || role.skills.length === 0 || !totalValid || weightPending}
            onClick={applyTotal}
          >
            {t('baselineBlueprint.role.applyAndDistribute')}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            {limit ? formatMessage(t('baselineBlueprint.role.capacityRange'), {
              minimum: limit.minimum, maximum: limit.maximum,
            }) : t('baselineBlueprint.role.capacityUnavailable')}
          </p>
          {totalTouched && !totalValid && <p className="w-full text-xs text-destructive">
            {t('baselineBlueprint.validation.capacityRange')}
          </p>}
          {roleIssues.some((issue) => issue.code === 'ROLE_MINIMUM') && (
            <p className="w-full text-xs text-destructive">
              {t('baselineBlueprint.validation.roleMinimum')}
            </p>
          )}
        </div>

        <BaselineWeightControl
          role={role}
          disabled={disabled || total === 0}
          onChange={(weights) => onWeights(roleIndex, weights)}
          onPendingChange={(pending) => {
            setWeightPending(pending)
            onPendingInputChange(
              role.roleId,
              pending || totalDraft !== null || Object.keys(countDrafts).length > 0,
            )
          }}
        />

        <div className="space-y-2">
          {role.skills.map((skill, skillIndex) => {
            const skillTotal = skill.easyQuestionCount
              + skill.mediumQuestionCount + skill.hardQuestionCount
            return (
              <details key={skill.microSkillId} className="group rounded-md border border-border bg-background">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-medium">
                  <span>{skill.microSkillNameSnapshot}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={skillTotal > 0 ? 'outline' : 'secondary'}>
                      {questionCount(t, skillTotal)}
                    </Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-3">
                  {difficulties.map((difficulty) => {
                    const field = `${difficulty}QuestionCount` as CountField
                    const draftKey = `${skill.microSkillId}:${field}`
                    const draft = countDrafts[draftKey]
                    const input = draft ?? String(skill[field])
                    const parsed = parseCount(input)
                    const cellMaximum = limit?.cells[capacityCellKey(skill.microSkillId, difficulty)] ?? 0
                    const draftInvalid = draft !== undefined && (parsed === null || parsed > cellMaximum)
                    const capacityInvalid = roleIssues.some((issue) => issue.microSkillId === skill.microSkillId
                      && issue.difficulty === difficulty)
                    const invalid = (Boolean(countTouched[draftKey]) && draftInvalid) || capacityInvalid
                    const commitCount = () => {
                      if (draft === undefined) return
                      setCountTouched((current) => ({ ...current, [draftKey]: true }))
                      if (draftInvalid || parsed === null) return
                      setTotalDraft(null)
                      setTotalTouched(false)
                      onCount(roleIndex, skillIndex, field, String(parsed))
                      setCountDrafts((current) => omitKey(current, draftKey))
                      setCountTouched((current) => omitKey(current, draftKey))
                      onPendingInputChange(
                        role.roleId,
                        weightPending || Object.keys(countDrafts).some((key) => key !== draftKey),
                      )
                    }
                    return (
                      <label key={field} className="space-y-1 text-xs capitalize">
                        {formatMessage(t('baselineBlueprint.role.difficultyQuestions'), {
                          difficulty: t(`baselineBlueprint.difficulty.${difficulty}`),
                        })}
                        <Input
                          type="number"
                          min="0"
                          max={cellMaximum}
                          step="1"
                          value={input}
                          aria-invalid={invalid}
                          disabled={disabled || !capacity}
                          onBlur={commitCount}
                          onChange={(event) => {
                            setCountDrafts((current) => ({ ...current, [draftKey]: event.target.value }))
                            setCountTouched((current) => omitKey(current, draftKey))
                            onPendingInputChange(role.roleId, true)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitCount()
                          }}
                        />
                        <span className={invalid
                          ? 'block normal-case text-destructive'
                          : 'block normal-case text-muted-foreground'}>
                          {invalid
                            ? t('baselineBlueprint.validation.cellCapacity')
                            : formatMessage(t('baselineBlueprint.role.cellAvailable'), { count: cellMaximum })}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function parseCount(value: string) {
  if (!/^(0|[1-9]\d*)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function omitKey<T>(record: Record<string, T>, key: string) {
  const remaining = { ...record }
  delete remaining[key]
  return remaining
}

type Translator = (keyOrPhrase: string, fallback?: string) => string

function questionCount(t: Translator, count: number) {
  return formatMessage(t(count === 1
    ? 'baselineBlueprint.role.questionOne'
    : 'baselineBlueprint.role.questionMany'), { count })
}

function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  )
}
