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
import type { BlueprintRole } from './baselineBlueprintApi'
import {
  difficulties,
  difficultyQuestionTotal,
  scoreWeightToPercentage,
  roleQuestionTotal,
  type CountField,
  type WeightField,
} from './baselineBlueprintForm'

export type { CountField, WeightField } from './baselineBlueprintForm'

interface BaselineRoleConfigurationProps {
  roles: BlueprintRole[]
  disabled: boolean
  onCount: (roleIndex: number, skillIndex: number, field: CountField, value: string) => void
  onWeight: (roleIndex: number, field: WeightField, value: string) => void
  onApplyTotal: (roleIndex: number, total: number) => void
}

export function BaselineRoleConfiguration({
  roles,
  disabled,
  onCount,
  onWeight,
  onApplyTotal,
}: BaselineRoleConfigurationProps) {
  return (
    <Accordion type="multiple" defaultValue={roles[0] ? [roles[0].roleId] : []}>
      {roles.map((role, roleIndex) => (
        <RoleConfiguration
          key={role.roleId}
          role={role}
          roleIndex={roleIndex}
          disabled={disabled}
          onCount={onCount}
          onWeight={onWeight}
          onApplyTotal={onApplyTotal}
        />
      ))}
    </Accordion>
  )
}

function RoleConfiguration({ role, roleIndex, disabled, onCount, onWeight, onApplyTotal }:
  { role: BlueprintRole; roleIndex: number } & Omit<BaselineRoleConfigurationProps, 'roles'>) {
  const { t } = useTranslation()
  const total = roleQuestionTotal(role)
  const [totalDraft, setTotalDraft] = React.useState<string | null>(null)
  const totalInput = totalDraft ?? String(total)

  const applyTotal = () => {
    const parsed = Number.parseInt(totalInput, 10)
    setTotalDraft(null)
    onApplyTotal(roleIndex, Number.isFinite(parsed) ? Math.max(0, parsed) : 0)
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
              step="1"
              value={totalInput}
              disabled={disabled}
              onChange={(event) => setTotalDraft(event.target.value)}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            leftIcon={<WandSparkles size={15} />}
            disabled={disabled || role.skills.length === 0}
            onClick={applyTotal}
          >
            {t('baselineBlueprint.role.applyAndDistribute')}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            {t('baselineBlueprint.role.applyHint')}
          </p>
        </div>

        <div className="grid gap-3 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-3">
          {difficulties.map((difficulty) => {
            const field = `${difficulty}ScoreWeight` as WeightField
            const count = difficultyQuestionTotal(role, difficulty)
            const weightLabel = formatMessage(t('baselineBlueprint.role.scoreWeight'), {
              difficulty: t(`baselineBlueprint.difficulty.${difficulty}`),
            })
            return (
              <label key={field} className="space-y-1 capitalize">
                {weightLabel}
                <div className="relative">
                  <Input
                    aria-label={weightLabel}
                    className="pr-7"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={scoreWeightToPercentage(role[field])}
                    disabled={disabled}
                    onChange={(event) => onWeight(roleIndex, field, event.target.value)}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
                <span className="block normal-case text-muted-foreground">
                  {formatMessage(t(count === 1
                    ? 'baselineBlueprint.role.configuredQuestionOne'
                    : 'baselineBlueprint.role.configuredQuestionMany'), { count })}
                </span>
              </label>
            )
          })}
        </div>

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
                    return (
                      <label key={field} className="space-y-1 text-xs capitalize">
                        {formatMessage(t('baselineBlueprint.role.difficultyQuestions'), {
                          difficulty: t(`baselineBlueprint.difficulty.${difficulty}`),
                        })}
                        <Input
                          type="number"
                          min="0"
                          value={skill[field]}
                          disabled={disabled}
                          onChange={(event) => {
                            setTotalDraft(null)
                            onCount(roleIndex, skillIndex, field, event.target.value)
                          }}
                        />
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
