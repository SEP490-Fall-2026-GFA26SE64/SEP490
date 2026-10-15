import { ChevronDown } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../shared/components/ui/Accordion'
import { Input } from '../../../shared/components/ui/Input'
import type { BlueprintRole } from './baselineBlueprintApi'

export type CountField = 'easyQuestionCount' | 'mediumQuestionCount' | 'hardQuestionCount'
export type WeightField = 'easyScoreWeight' | 'mediumScoreWeight' | 'hardScoreWeight'

interface BaselineRoleConfigurationProps {
  roles: BlueprintRole[]
  disabled: boolean
  onCount: (roleIndex: number, skillIndex: number, field: CountField, value: string) => void
  onWeight: (roleIndex: number, field: WeightField, value: string) => void
}

export function BaselineRoleConfiguration({
  roles,
  disabled,
  onCount,
  onWeight,
}: BaselineRoleConfigurationProps) {
  return (
    <Accordion type="single" defaultValue={roles[0] ? [roles[0].roleId] : []}>
      {roles.map((role, roleIndex) => {
        const total = roleTotal(role)
        return (
          <AccordionItem key={role.roleId} value={role.roleId}>
            <AccordionTrigger disabled={disabled}>
              <span className="flex flex-wrap items-center gap-2">
                <span>{role.roleNameSnapshot}</span>
                <Badge variant={total > 0 ? 'primary' : 'secondary'}>
                  {total > 0 ? `${total} questions` : '0 questions · not included'}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 text-foreground">
              <p className="text-xs text-muted-foreground">
                Set every count to 0 to keep this Occupation role out of the baseline assessment.
              </p>

              <div className="grid gap-3 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-3">
                {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                  const field = `${difficulty}ScoreWeight` as WeightField
                  const count = difficultyTotal(role, difficulty)
                  return (
                    <label key={field} className="space-y-1 capitalize">
                      {difficulty} score weight
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={role[field]}
                        disabled={disabled}
                        onChange={(event) => onWeight(roleIndex, field, event.target.value)}
                      />
                      <span className="block normal-case text-muted-foreground">
                        {count} configured question{count === 1 ? '' : 's'}
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
                          <Badge variant={skillTotal > 0 ? 'outline' : 'secondary'}>{skillTotal} questions</Badge>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-3">
                        {(['easy', 'medium', 'hard'] as const).map((difficulty) => {
                          const field = `${difficulty}QuestionCount` as CountField
                          return (
                            <label key={field} className="space-y-1 text-xs capitalize">
                              {difficulty} questions
                              <Input
                                type="number"
                                min="0"
                                value={skill[field]}
                                disabled={disabled}
                                onChange={(event) => onCount(roleIndex, skillIndex, field, event.target.value)}
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
      })}
    </Accordion>
  )
}

function roleTotal(role: BlueprintRole) {
  return role.skills.reduce((total, skill) => total
    + skill.easyQuestionCount + skill.mediumQuestionCount + skill.hardQuestionCount, 0)
}

function difficultyTotal(role: BlueprintRole, difficulty: 'easy' | 'medium' | 'hard') {
  const field = `${difficulty}QuestionCount` as CountField
  return role.skills.reduce((total, skill) => total + skill[field], 0)
}
