import * as React from 'react'
import { AlertCircle, CheckCircle2, Loader2, BookOpen } from 'lucide-react'
import { Badge } from '../../../../shared/components/ui/Badge'
import {
  checkRoleReadiness,
} from '../roleReadiness'
import type { TargetRoleModel } from '../../data/ldManagerMockData'
import type { LearningModuleDto } from '../../../../shared/api/learningModuleApi'
import type { BankQuestion } from '../../../../shared/api/questionBankApi'

export interface RolePublicationReadinessViewProps {
  role: TargetRoleModel
  modules: LearningModuleDto[]
  bankQuestions: BankQuestion[]
  isLoading?: boolean
  actor?: 'manager' | 'expert'
}

export function RolePublicationReadinessView({
  role,
  modules,
  bankQuestions,
  isLoading = false,
  actor = 'manager',
}: RolePublicationReadinessViewProps) {
  const readiness = React.useMemo(() => {
    return checkRoleReadiness(role, modules, bankQuestions)
  }, [role, modules, bankQuestions])

  const {
    levelValidation,
    allLevelsValid,
    skillValidation,
    allSkillsValid,
    isOverallReady,
  } = readiness

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-border bg-card shadow-2xs flex flex-col flex-1 h-full min-h-0 space-y-4">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-foreground">
              Publication Readiness &amp; Content Validation
            </span>
            {isLoading ? (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 py-0.5 text-muted-foreground"
              >
                <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
              </Badge>
            ) : isOverallReady ? (
              <Badge variant="success" className="text-[10px] gap-1 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                {actor === 'expert' ? 'Ready to Submit' : 'Ready to Publish'}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] gap-1 py-0.5 bg-amber-500/15 !text-black dark:!text-white border-amber-500/30 font-bold"
                style={{ color: '#000000' }}
              >
                <AlertCircle className="h-3 w-3 !text-black dark:!text-white" style={{ color: '#000000' }} /> Action Required
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automated verification of role levels, competencies, learning modules, and question bank coverage.
          </p>
        </div>
      </div>

      {/* 1. Level Architecture Checklist */}
      <div className="shrink-0 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] text-foreground font-semibold">
              1
            </span>
            Role Levels &amp; Competency Coverage
          </span>
          <Badge
            variant={allLevelsValid ? 'success' : 'outline'}
            className={
              allLevelsValid
                ? 'text-[10px] py-0 px-2'
                : 'text-[10px] py-0 px-2 bg-amber-500/15 !text-black dark:!text-white border-amber-500/30 font-bold'
            }
            style={allLevelsValid ? undefined : { color: '#000000' }}
          >
            {levelValidation.filter((l) => l.isReady).length}/{levelValidation.length} Levels Complete
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {levelValidation.map((lv) => (
            <div
              key={lv.level}
              className={`p-3 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                lv.isReady
                  ? 'bg-success/[0.04] border-success/30 shadow-2xs'
                  : 'bg-muted/20 border-border shadow-2xs hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between font-semibold pb-2 border-b border-border/50">
                <span className="text-foreground font-bold truncate">{lv.level}</span>
                {lv.isReady ? (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4 font-semibold gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Ready
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 font-bold gap-1 bg-amber-500/15 !text-black dark:!text-white border-amber-500/30"
                    style={{ color: '#000000' }}
                  >
                    <AlertCircle className="h-2.5 w-2.5 !text-black dark:!text-white" style={{ color: '#000000' }} /> Incomplete
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5 pt-2 text-[11.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Competencies:</span>
                  <span
                    className={
                      lv.hasCompetency
                        ? 'text-foreground font-semibold'
                        : 'text-destructive font-semibold'
                    }
                  >
                    {lv.compCount > 0 ? `${lv.compCount} configured` : 'None configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Micro-skills:</span>
                  <span
                    className={
                      lv.hasMicroSkills
                        ? 'text-foreground font-semibold'
                        : 'text-destructive font-semibold'
                    }
                  >
                    {lv.skillCount > 0 ? `${lv.skillCount} configured` : 'None configured'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Micro-skill Content Checklist */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2.5 pt-2 border-t border-border/60">
        <div className="shrink-0 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] text-foreground font-semibold">
              2
            </span>
            Learning Modules &amp; Question Bank Coverage
          </span>
          <Badge
            variant={allSkillsValid ? 'success' : 'outline'}
            className={
              allSkillsValid
                ? 'text-[10px] py-0 px-2'
                : 'text-[10px] py-0 px-2 bg-amber-500/15 !text-black dark:!text-white border-amber-500/30 font-bold'
            }
            style={allSkillsValid ? undefined : { color: '#000000' }}
          >
            {skillValidation.filter((s) => s.isReady).length}/{skillValidation.length} Skills Covered
          </Badge>
        </div>

        {skillValidation.length === 0 ? (
          <div className="py-5 px-4 rounded-xl bg-muted/20 border border-dashed border-border/80 text-center flex flex-col items-center justify-center gap-1.5 flex-1 min-h-[140px]">
            <div className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-foreground">No micro-skills configured yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Configure micro-skills for each role level to verify learning module and question bank readiness here.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-[140px] overflow-y-auto space-y-1.5 pr-1 [scrollbar-gutter:stable]">
            {skillValidation.map((sv) => (
              <div
                key={sv.skillId}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2.5 ${
                  sv.isReady
                    ? 'bg-background border-border shadow-2xs'
                    : 'bg-destructive/5 border-destructive/25'
                }`}
              >
                <div className="truncate min-w-0">
                  <span className="font-semibold text-foreground truncate block">
                    {sv.skillName}
                  </span>
                  {sv.levelName && (
                    <span className="text-[10.5px] text-muted-foreground">
                      Level: {sv.levelName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant={sv.hasModule ? 'outline' : 'destructive'}
                    className={`text-[10px] py-0.5 px-2 gap-1 font-medium ${
                      sv.hasModule ? 'text-foreground border-border bg-muted/40' : ''
                    }`}
                  >
                    {sv.hasModule ? '✓ Module' : '✗ No Module'}
                  </Badge>
                  <Badge
                    variant={sv.hasQuestions ? 'outline' : 'destructive'}
                    className={`text-[10px] py-0.5 px-2 gap-1 font-medium ${
                      sv.hasQuestions ? 'text-foreground border-border bg-muted/40' : ''
                    }`}
                  >
                    {sv.hasQuestions ? '✓ Question Bank' : '✗ No Questions'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
