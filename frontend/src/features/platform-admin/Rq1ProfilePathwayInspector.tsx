import { knowledgeLevelVariant } from './rq1Presentation'
import * as React from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GitFork,
  Lock,
  Network,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { Heading } from '../../shared/components/typography/Heading'
import { cn } from '../../shared/lib/utils'
import type {
  RoleLevelName,
  Rq1ProfileComparisonResult,
  Rq1ProfilePathwayResult,
  Rq1RankedModuleItem,
} from './rq1BenchmarkEngine'

interface Rq1ProfilePathwayInspectorProps {
  profiles: Rq1ProfilePathwayResult[]
  comparisonsByProfileId: Map<string, Rq1ProfileComparisonResult>
  selectedProfileId: string
  onSelectProfileId: (profileId: string) => void
  isVi: boolean
  mode?: 'pathway' | 'comparison'
  hasTop5Reference?: boolean
}


function renderExpertGradeBadge(grade: 0 | 1 | 2 | null | undefined, isVi: boolean) {
  if (grade === undefined || grade === null) return null
  if (grade === 2) {
    return (
      <Badge variant="success" className="text-[11px]">
        {isVi ? 'Chuyên gia: Grade 2 (Khớp chuẩn)' : 'Expert: Grade 2 (Directly Suitable)'}
      </Badge>
    )
  }
  if (grade === 1) {
    return (
      <Badge variant="warning" className="text-[11px]">
        {isVi ? 'Chuyên gia: Grade 1 (Bổ trợ)' : 'Expert: Grade 1 (Supporting)'}
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="text-[11px]">
      {isVi ? 'Chuyên gia: Grade 0 (Không phù hợp)' : 'Expert: Grade 0 (Irrelevant)'}
    </Badge>
  )
}

export function Rq1ProfilePathwayInspector({
  profiles,
  comparisonsByProfileId,
  selectedProfileId,
  onSelectProfileId,
  isVi,
  mode = 'pathway',
  hasTop5Reference = false,
}: Rq1ProfilePathwayInspectorProps) {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'ALL' | RoleLevelName>('ALL')

  const filteredProfiles = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return profiles.filter((p) => {
      if (roleFilter !== 'ALL' && p.roleLevel !== roleFilter) return false
      if (!q) return true
      return (
        p.profileId.toLowerCase().includes(q) ||
        p.roleLevel.toLowerCase().includes(q) ||
        p.pathwaySteps.some(
          (s) => s.skillId.toLowerCase().includes(q) || s.skillName.toLowerCase().includes(q)
        )
      )
    })
  }, [profiles, search, roleFilter])

  const activeProfile = React.useMemo(
    () => profiles.find((p) => p.profileId === selectedProfileId) ?? filteredProfiles[0] ?? profiles[0],
    [profiles, selectedProfileId, filteredProfiles]
  )

  const activeComparison = activeProfile ? comparisonsByProfileId.get(activeProfile.profileId) : undefined

  if (!activeProfile) {
    return null
  }

  const g0List: Rq1RankedModuleItem[] = activeComparison
    ? activeComparison.g0Top5Labeled
    : activeProfile.g0Top5
  const c0List: Rq1RankedModuleItem[] = activeComparison
    ? activeComparison.c0Top5Labeled
    : activeProfile.c0Top5

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Left Column: 50 Profiles Directory */}
      <Card className="lg:col-span-4 bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>
              {isVi ? `Danh sách Hồ sơ đã nạp (${profiles.length})` : `Loaded Learner Profiles (${profiles.length})`}
            </span>
            <Badge variant="primary">{filteredProfiles.length}</Badge>
          </CardTitle>
          <div className="pt-2 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isVi ? 'Tìm mã SYN-... hoặc kỹ năng...' : 'Search SYN-... or skill...'}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {(['ALL', 'Junior', 'Middle', 'Senior'] as const).map((lvl) => (
                <Button
                  key={lvl}
                  size="sm"
                  variant={roleFilter === lvl ? 'primary' : 'outline'}
                  onClick={() => setRoleFilter(lvl)}
                  className="h-7 px-2.5 text-xs"
                >
                  {lvl === 'ALL' ? (isVi ? 'Tất cả' : 'All') : lvl}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-[680px] overflow-y-auto divide-y divide-border border-t border-border -mx-6 px-2">
            {filteredProfiles.map((p, idx) => {
              const isSelected = p.profileId === activeProfile.profileId
              const comp = comparisonsByProfileId.get(p.profileId)
              return (
                <button
                  key={p.profileId}
                  type="button"
                  data-testid={`rq1-profile-item-${p.profileId}`}
                  onClick={() => onSelectProfileId(p.profileId)}
                  className={cn(
                    'w-full text-left p-3 rounded-md transition-all flex items-start justify-between gap-2 my-0.5',
                    isSelected
                      ? 'bg-secondary border border-primary/40 shadow-xs'
                      : 'hover:bg-muted/60 border border-transparent'
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                      <span className="font-mono text-xs font-bold text-foreground">{p.profileId}</span>
                      <Badge variant="outline" className="text-[11px]">
                        {p.roleLevel}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>
                        {isVi ? `${p.needsLearningCount} kỹ năng cần học` : `${p.needsLearningCount} skills to learn`}
                      </span>
                      <span>•</span>
                      <span>{p.allGraphMatchedModules.length} modules</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        p.gapBand === 'LOW' ? 'success' : p.gapBand === 'MEDIUM' ? 'warning' : 'destructive'
                      }
                      className="text-[10px]"
                    >
                      {p.gapBand} ({p.gapCount})
                    </Badge>
                    {comp && (
                      <span className="text-[11px] font-semibold text-primary">
                        G0 nDCG: {(comp.g0Metrics.ndcgAt5 * 100).toFixed(0)}% vs C0:{' '}
                        {(comp.c0Metrics.ndcgAt5 * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected profile details */}
      <div className="lg:col-span-8 space-y-4">
        {mode === 'pathway' && <>
        {/* Profile Summary Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary" className="font-mono">
                    {activeProfile.profileId}
                  </Badge>
                  <Badge variant="secondary">Application Developer • {activeProfile.roleLevel}</Badge>
                  <Badge
                    variant={
                      activeProfile.gapBand === 'LOW'
                        ? 'success'
                        : activeProfile.gapBand === 'MEDIUM'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {isVi ? `Mức thiếu hụt: ${activeProfile.gapBand}` : `Gap Band: ${activeProfile.gapBand}`}
                  </Badge>
                  <Badge variant="outline">{activeProfile.evidenceHistoryStratum}</Badge>
                </div>
                <CardTitle className="text-base font-bold mt-2">
                  {isVi
                    ? `Kết Quả Phân Tích Baseline & Lộ Trình Học Tập Cá Nhân Hóa (${activeProfile.profileId})`
                    : `Baseline Diagnostic Analysis & Personalized Learning Pathway (${activeProfile.profileId})`}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground">
                  {isVi ? 'Tổng yêu cầu của Cấp' : 'Role Target Groups'}
                </div>
                <div className="text-lg font-bold text-foreground mt-0.5">
                  {activeProfile.totalTargetRequirements}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground">
                  {isVi ? 'Đã có thành tích chính thức' : 'Officially Achieved'}
                </div>
                <div className="text-lg font-bold text-success mt-0.5">
                  {activeProfile.officiallyAchievedCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <div className="text-xs text-muted-foreground">
                  {isVi ? 'Đậu Baseline (Được miễn học)' : 'Baseline Passed (Exempt)'}
                </div>
                <div className="text-lg font-bold text-primary mt-0.5">
                  {activeProfile.baselineExemptCount}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary border border-primary/30">
                <div className="text-xs font-semibold text-primary">
                  {isVi ? 'Trượt Baseline (Skill Cần Học)' : 'Failed Baseline (Skills to Learn)'}
                </div>
                <div className="text-lg font-bold text-primary mt-0.5" data-testid="rq1-active-gap-count">
                  {activeProfile.needsLearningCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Generated Learning Pathway (Skills to Learn + Matched Modules) */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GitFork size={17} className="text-primary" />
              <span>
                {isVi
                  ? `1. Lộ Trình Kỹ Năng Cần Học & Học Phần Tương Ứng (${activeProfile.pathwaySteps.length} Bước — Tương tự Learning Pathways)`
                  : `1. Generated Learning Pathway: Skills to Learn & Matched Modules (${activeProfile.pathwaySteps.length} Steps)`}
              </span>
            </CardTitle>
            <CardDescription>
              {isVi
                ? 'Sắp xếp tự động theo thứ tự quan hệ tiên quyết (HAS_SKILL_PREREQUISITE) và ánh xạ trực tiếp tới các Module khớp đúng (Skill + Knowledge Level) trong kho học liệu.'
                : 'Topologically ordered by prerequisite edges (HAS_SKILL_PREREQUISITE) and bound to exact (Skill + Knowledge Level) modules from the catalog.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {activeProfile.pathwaySteps.map((step) => (
              <div
                key={`${step.skillId}-${step.knowledgeLevel}`}
                className="p-3.5 rounded-lg border border-border bg-muted/25 space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {step.stepNumber}
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground">{step.skillId}</span>
                    <Heading level={4} className="text-sm font-semibold text-foreground">
                      {step.skillName}
                    </Heading>
                    <Badge variant={knowledgeLevelVariant(step.knowledgeLevel)}>{step.knowledgeLevel}</Badge>
                    <Badge variant="outline">{step.competencyGroup}</Badge>
                  </div>
                  {step.prerequisiteSkillIds.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>{isVi ? 'Tiên quyết:' : 'Prerequisites:'}</span>
                      <span className="font-mono font-medium text-foreground">
                        {step.prerequisiteSkillIds.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground pl-8">
                  <span className="font-semibold text-foreground">
                    {isVi ? 'Mục tiêu kiến thức cần đạt:' : 'Target Knowledge Outcomes:'}
                  </span>{' '}
                  {step.targetOutcomes.map((o) => o.text).join(' • ')}
                </div>

                <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {step.matchedModules.map((mod) => {
                    const isExpertGrade2 = activeComparison?.expertGrade2ModuleIds.includes(mod.id)
                    return (
                      <div
                        key={mod.id}
                        className="p-3 rounded-md bg-card border border-border flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary flex items-center gap-1">
                              <BookOpen size={13} />
                              {mod.id}
                            </span>
                            <div className="flex items-center gap-1">
                              {step.matchedModules.length > 1 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {isVi ? 'Lựa chọn tương đương' : 'Alternative Option'}
                                </Badge>
                              )}
                              {activeComparison &&
                                renderExpertGradeBadge(isExpertGrade2 ? 2 : 0, isVi)}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-foreground mt-1">{mod.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {isVi ? 'Tình huống:' : 'Scenario:'} {mod.scenarioFocus}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        </>}
        {mode === 'comparison' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target size={17} className="text-primary" />
                  <span>
                    {isVi
                      ? 'Top 5 gợi ý cho hồ sơ này'
                      : 'Top 5 recommendations for this profile'}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1">
                  {isVi
                    ? 'Chọn hồ sơ để xem thứ hạng, cấp độ và lý do mỗi phương pháp đề xuất học phần.'
                    : 'Select a profile to compare ranks, levels and recommendation details.'}
                </CardDescription>
              </div>
              {hasTop5Reference ? null : !activeComparison ? (
                <Badge variant="warning" className="flex items-center gap-1.5 py-1 px-2.5">
                  <Lock size={13} />
                  <span>
                    {isVi
                      ? 'Chờ file đối chiếu ở Bước 2'
                      : 'Awaiting a reference file in Step 2'}
                  </span>
                </Badge>
              ) : (
                <Badge variant="success" className="flex items-center gap-1.5 py-1 px-2.5">
                  <CheckCircle2 size={13} />
                  <span>
                    {isVi
                      ? `Đã đối chiếu Chuyên gia (${activeComparison.expertGrade2ModuleIds.length} module Grade 2)`
                      : `Expert Evaluated (${activeComparison.expertGrade2ModuleIds.length} Grade-2 modules)`}
                  </span>
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Per-profile Metric Bar once Step 2 is uploaded */}
            {activeComparison && (
              <div className="p-3 rounded-lg bg-secondary/70 border border-primary/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground font-medium">Hit Rate@5 (HR@5)</div>
                  <div className="font-bold text-sm mt-0.5">
                    <span className="text-success">
                      Graph: {(activeComparison.g0Metrics.hitAt5 * 100).toFixed(0)}%
                    </span>
                    {' vs '}
                    <span className="text-muted-foreground">
                      CBF: {(activeComparison.c0Metrics.hitAt5 * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground font-medium">Precision@5</div>
                  <div className="font-bold text-sm mt-0.5">
                    <span className="text-success">
                      Graph: {(activeComparison.g0Metrics.precisionAt5 * 100).toFixed(0)}%
                    </span>
                    {' vs '}
                    <span className="text-muted-foreground">
                      CBF: {(activeComparison.c0Metrics.precisionAt5 * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground font-medium">Recall@5</div>
                  <div className="font-bold text-sm mt-0.5">
                    <span className="text-success">
                      Graph: {(activeComparison.g0Metrics.recallAt5 * 100).toFixed(0)}%
                    </span>
                    {' vs '}
                    <span className="text-muted-foreground">
                      CBF: {(activeComparison.c0Metrics.recallAt5 * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground font-medium">Graded nDCG@5</div>
                  <div className="font-bold text-sm mt-0.5">
                    <span className="text-success">
                      Graph: {(activeComparison.g0Metrics.ndcgAt5 * 100).toFixed(1)}%
                    </span>
                    {' vs '}
                    <span className="text-muted-foreground">
                      CBF: {(activeComparison.c0Metrics.ndcgAt5 * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Column 1: G0 Graph-Traversal Top-5 */}
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-md bg-muted border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Network size={15} className="text-primary" />
                    <span>
                      {isVi
                        ? 'Graph-Traversal của Hệ thống (G0 Top-5)'
                        : 'System Graph-Traversal (G0 Top-5)'}
                    </span>
                  </div>
                  {activeComparison && (
                    <Badge variant="success">
                      {activeComparison.g0Metrics.grade2HitsInTop5}/5 Grade 2
                    </Badge>
                  )}
                </div>

                {g0List.map((item) => (
                  <div
                    key={item.moduleId}
                    className={cn(
                      'p-3 rounded-lg border space-y-1.5',
                      item.expertGrade === 2
                        ? 'bg-card border-success/50'
                        : item.exactGraphMatch
                          ? 'bg-card border-border'
                          : 'bg-muted/30 border-border'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="primary" className="text-[11px]">
                          #{item.rank}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.moduleId}
                        </span>
                        <Badge variant={knowledgeLevelVariant(item.knowledgeLevel)} className="text-[10px]">
                          {item.knowledgeLevel}
                        </Badge>
                      </div>
                      {renderExpertGradeBadge(item.expertGrade, isVi)}
                    </div>
                    <div className="text-xs font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {isVi ? 'Kỹ năng dạy:' : 'Teaches:'}{' '}
                      <span className="font-mono font-semibold text-foreground">{item.skillId}</span> (
                      {item.skillName})
                    </div>
                    <div className="text-[11px] pt-1 border-t border-border flex items-center gap-1 text-muted-foreground">
                      <ArrowRight size={12} className="text-primary shrink-0" />
                      <span>{isVi ? item.diagnosticNoteVi : item.diagnosticNoteEn}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Column 2: C0 Content-Based Filtering Top-5 */}
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-md bg-muted border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Sparkles size={15} className="text-muted-foreground" />
                    <span>
                      {isVi
                        ? 'Content-Based Filtering (C0 TF-IDF Top-5)'
                        : 'Content-Based Filtering (C0 TF-IDF Top-5)'}
                    </span>
                  </div>
                  {activeComparison && (
                    <Badge
                      variant={
                        activeComparison.c0Metrics.grade2HitsInTop5 >=
                        activeComparison.g0Metrics.grade2HitsInTop5
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {activeComparison.c0Metrics.grade2HitsInTop5}/5 Grade 2
                    </Badge>
                  )}
                </div>

                {c0List.map((item) => (
                  <div
                    key={item.moduleId}
                    className={cn(
                      'p-3 rounded-lg border space-y-1.5',
                      item.expertGrade === 2
                        ? 'bg-card border-success/50'
                        : item.expertGrade === 0
                          ? 'bg-card border-destructive/40'
                          : 'bg-card border-border'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[11px]">
                          #{item.rank}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.moduleId}
                        </span>
                        <Badge variant={knowledgeLevelVariant(item.knowledgeLevel)} className="text-[10px]">
                          {item.knowledgeLevel}
                        </Badge>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          cos={item.score.toFixed(3)}
                        </span>
                      </div>
                      {renderExpertGradeBadge(item.expertGrade, isVi)}
                    </div>
                    <div className="text-xs font-semibold text-foreground">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {isVi ? 'Kỹ năng thực tế của Module:' : 'Module Actual Skill:'}{' '}
                      <span className="font-mono font-semibold text-foreground">{item.skillId}</span> (
                      {item.skillName})
                    </div>
                    <div
                      className={cn(
                        'text-[11px] pt-1 border-t border-border flex items-center gap-1',
                        item.exactGraphMatch ? 'text-success font-medium' : 'text-destructive font-medium'
                      )}
                    >
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{isVi ? item.diagnosticNoteVi : item.diagnosticNoteEn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
