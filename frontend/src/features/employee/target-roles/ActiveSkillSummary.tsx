import { CheckCircle2, Sparkles } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'

export function ActiveSkillSummary() {
  const { profile, clearTargetSkill } = useEmployeeLearningState()

  if (!profile.targetSkill) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">No active tracked skill</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose an available skill from the catalog to establish your learning target.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-success/40" aria-labelledby="active-skill-heading">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-border/70 pb-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1 text-[10px]">
              <CheckCircle2 size={12} />
              Active tracked skill
            </Badge>
            {profile.targetSkillLevel && (
              <Badge variant="outline" className="text-[10px] font-semibold">
                {profile.targetSkillLevel}
              </Badge>
            )}
          </div>
          <CardTitle id="active-skill-heading" className="text-lg">
            {profile.targetSkill}
          </CardTitle>
          {profile.targetSkillMacroCode && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {profile.targetSkillMacroCode}
            </p>
          )}
        </div>
        <Sparkles size={22} className="shrink-0 text-success" aria-hidden="true" />
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 text-xs sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">Level</p>
          <p className="mt-1 font-semibold text-foreground">
            {profile.targetSkillLevel || 'Intermediate'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Tracked Since</p>
          <p className="mt-1 font-semibold text-foreground">
            {profile.targetSkillAssignedAt || 'Recently'}
          </p>
        </div>
        <div className="sm:text-right flex sm:block items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={clearTargetSkill}
            className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
          >
            Untrack skill
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
