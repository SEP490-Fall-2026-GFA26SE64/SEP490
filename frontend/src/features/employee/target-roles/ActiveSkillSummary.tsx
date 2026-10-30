import * as React from 'react'
import { CheckCircle2, ChevronDown, Sparkles, Trash2, X } from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { cn } from '../../../shared/lib/utils'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'

import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'

export function ActiveSkillSummary() {
  const { trackedSkills, untrackSkill, clearTrackedSkills } = useEmployeeLearningState()
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [skillToUntrack, setSkillToUntrack] = React.useState<string | null>(null)
  const [isConfirmAllOpen, setIsConfirmAllOpen] = React.useState(false)

  if (trackedSkills.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">No active tracked skills</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose available skills from the catalog below to track multiple learning targets concurrently.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-border bg-card shadow-2xs transition-all duration-150" aria-labelledby="active-skills-heading">
        <CardHeader
          className={cn(
            "flex-row items-center justify-between gap-3 space-y-0 py-3.5 px-5 transition-colors cursor-pointer select-none",
            isExpanded && "border-b border-border/70"
          )}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle id="active-skills-heading" className="text-sm sm:text-base font-bold text-foreground">
                  Active Tracked Skills
                </CardTitle>
                <Badge variant="success" className="gap-1 text-[10px] font-semibold py-0.5">
                  <CheckCircle2 size={11} />
                  <span>{trackedSkills.length} {trackedSkills.length === 1 ? 'Skill' : 'Skills'} Tracked</span>
                </Badge>
              </div>
              {!isExpanded && (
                <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                  <span className="text-xs text-muted-foreground truncate">
                    {trackedSkills.map((s) => s.skillName).join(' • ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded((prev) => !prev)
              }}
              rightIcon={
                <ChevronDown
                  size={14}
                  className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                />
              }
              className="text-xs text-muted-foreground hover:text-foreground h-7.5 px-2 cursor-pointer whitespace-nowrap"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse active tracked skills' : 'Expand active tracked skills'}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {trackedSkills.map((skill) => {
                const level = skill.level || 'Intermediate'
                return (
                  <div
                    key={skill.skillName}
                    className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:border-primary/30 transition-all gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        {skill.macroCode ? (
                          <Badge variant="secondary" className="text-[10px] font-semibold text-primary truncate max-w-[140px] whitespace-nowrap">
                            {skill.macroCode}
                          </Badge>
                        ) : (
                          <span />
                        )}
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap",
                            level === 'Beginner'
                              ? 'bg-success/10 text-success'
                              : level === 'Intermediate'
                              ? 'bg-warning/15 text-black border border-warning/30'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {level}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-1">
                        {skill.skillName}
                      </h4>
                      <p className="mt-1 text-[11px] text-muted-foreground whitespace-nowrap">
                        Tracked since: <span className="font-medium text-foreground">{skill.assignedAt || 'Recently'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<X size={12} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSkillToUntrack(skill.skillName)
                        }}
                        className="h-7 px-2.5 text-xs font-semibold bg-background border-border text-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                        title={`Untrack ${skill.skillName}`}
                      >
                        Untrack
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {trackedSkills.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs text-muted-foreground">
                <span>Tracking {trackedSkills.length} skills in parallel.</span>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Trash2 size={12} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsConfirmAllOpen(true)
                  }}
                  className="text-xs font-semibold bg-background border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/40 h-7.5 px-3 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                >
                  Untrack all skills
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Confirmation Modal for Single Untrack */}
      <ConfirmationModal
        open={Boolean(skillToUntrack)}
        onOpenChange={(open) => {
          if (!open) setSkillToUntrack(null)
        }}
        title="Untrack Skill"
        description={
          <span>
            Are you sure you want to stop tracking <strong className="text-foreground">{skillToUntrack}</strong>? You can re-track it at any time from the catalog below.
          </span>
        }
        confirmText="Untrack"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (skillToUntrack) {
            untrackSkill(skillToUntrack)
            setSkillToUntrack(null)
          }
        }}
      />

      {/* Confirmation Modal for Untrack All */}
      <ConfirmationModal
        open={isConfirmAllOpen}
        onOpenChange={setIsConfirmAllOpen}
        title="Untrack All Skills"
        description="Are you sure you want to stop tracking all active skills? This will clear your currently tracked skills list."
        confirmText="Untrack all"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          clearTrackedSkills()
          setIsConfirmAllOpen(false)
        }}
      />
    </>
  )
}
