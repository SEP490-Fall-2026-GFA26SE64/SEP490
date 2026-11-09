import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readRoleOverview, type OverviewSkill } from './roleOverviewData'
import { RequirementStatusRing } from './RequirementStatusRing'
import { OverviewSkillRow } from './OverviewSkillRow'
import { Button } from '../../../shared/components/ui/Button'
import { Link } from 'react-router-dom'
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { CompetencyRadarChart } from '../components/CompetencyRadarChart'
import { RiasecRadarChart } from '../components/RiasecRadarChart'
import {
  getOverviewBenchmark,
  getOverviewSkills,
  normalizeRoleKey,
  normalizeSkillKey,
  type CompetencySkillProfile,
} from '../data/employeeOverviewData'
import './EmployeeOverviewPage.css'

export function EmployeeOverviewPage() {
  const { profile } = useEmployeeLearningState()
  const { t, language } = useTranslation()
  const [, setActiveCompany] = React.useState(getActiveCompany)

  React.useEffect(() => {
    const handleSync = () => setActiveCompany(getActiveCompany())
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  const isSkillMode = profile.selectedViewType === 'skill'
  const session = React.useContext(WorkspaceSessionContext)
  const overview = useQuery({ queryKey: ['employee-role-overview', session?.identity.organizationId, session?.identity.accountId],
    queryFn: ({ signal }) => readRoleOverview(signal), enabled: !isSkillMode, staleTime: 0 })
  const real = !isSkillMode && !overview.isError ? overview.data : undefined
  const vi = language === 'vi'
  const missing = vi ? 'Chưa thiết lập' : 'Not set'
  const level = real?.flow.selection?.role.levels.find(l => l.id === real.flow.selection?.levelId)
  const realTitle = real?.flow.selection ? `${real.flow.selection.role.name}${level ? ' · ' + level.name : ''}` : (vi ? 'Chưa chọn Role' : 'No Role selected')
  const requiredSteps = real?.pathway?.steps.filter(s => s.kind === 'REQUIRED') ?? []
  const achievedSteps = requiredSteps.filter(s => s.state === 'FULFILLED').length
  const achievedPairs = real?.pairs.filter(p => p.status === 'achieved').length ?? 0
  const readiness = real?.pairs.length ? Math.round(100 * achievedPairs / real.pairs.length) : 0
  const progressLabels: Record<string, string> = {
    BASELINE_REQUIRED: vi ? 'Cần baseline' : 'Baseline required', RESUME: vi ? 'Đang làm baseline' : 'Baseline in progress',
    COMPLETE: vi ? 'Đã có kết quả baseline' : 'Baseline result available', BASELINE_NOT_REQUIRED: vi ? 'Không cần baseline' : 'Baseline not required',
    BASELINE_UNAVAILABLE: vi ? 'Baseline chưa khả dụng' : 'Baseline unavailable', ROLE_UNAVAILABLE: vi ? 'Role không còn khả dụng' : 'Role unavailable',
  }
  const liveStatus = overview.isPending ? (vi ? 'Đang tải' : 'Loading') : overview.isError ? (vi ? 'Không tải được' : 'Unavailable')
    : progressLabels[real?.flow.progress.state ?? ''] ?? (real?.flow.selection ? (vi ? 'Đã chọn mục tiêu' : 'Target selected') : missing)
  const [selectedRole, setSelectedRole] = React.useState(() => normalizeRoleKey(profile.targetRole))
  const [selectedSkill, setSelectedSkill] = React.useState(() => normalizeSkillKey(profile.targetSkill))

  React.useEffect(() => {
    if (profile.targetRole) {
      setSelectedRole(normalizeRoleKey(profile.targetRole))
    }
  }, [profile.targetRole])

  React.useEffect(() => {
    if (profile.targetSkill) {
      setSelectedSkill(normalizeSkillKey(profile.targetSkill))
    }
  }, [profile.targetSkill])

  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [expandedSkills, setExpandedSkills] = React.useState<Record<string, boolean>>({
    'sk-1': true,
    'sk-5': true,
  })

  // Derive benchmark and skills dynamically based on active target role or skill
  const activeBenchmark = React.useMemo(() => {
    const benchmark = getOverviewBenchmark(isSkillMode, selectedRole, selectedSkill)
    return !isSkillMode ? { ...benchmark, roleTitle: realTitle } : benchmark
  }, [isSkillMode, selectedRole, selectedSkill, realTitle])

  const companySkills: (CompetencySkillProfile | OverviewSkill)[] = React.useMemo(() => {
    return !isSkillMode ? real?.skills ?? [] : getOverviewSkills(isSkillMode, selectedRole, selectedSkill)
  }, [isSkillMode, selectedRole, selectedSkill, real])

  // Company and role/skill-scoped statistics
  const profileStats = React.useMemo(() => {
    const totalSkills = companySkills.length
    const mastered = companySkills.filter((s) => s.status === 'mastered').length
    const inProgress = companySkills.filter((s) => s.status === 'in_progress').length
    const criticalGaps = companySkills.filter((s) => s.status === 'critical_gap').length
    
    const sumReq = companySkills.reduce((acc, s) => acc + s.targetRoleRequirement, 0)
    const sumCur = companySkills.reduce((acc, s) => acc + s.estimatedMastery, 0)
    const overallMastery = sumReq > 0 ? Math.round((sumCur / sumReq) * 100) : 0
    
    const completedModules = isSkillMode ? mastered : achievedSteps
    const totalModules = isSkillMode ? totalSkills : requiredSteps.length
    const pathwayProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

    return {
      overallMasteryPercentage: isSkillMode ? overallMastery : totalSkills ? Math.round(100 * mastered / totalSkills) : 0,
      totalSkillsEvaluated: totalSkills,
      masteredSkillsCount: mastered,
      inProgressSkillsCount: inProgress,
      criticalGapsCount: criticalGaps,
      pathwayProgressPercentage: pathwayProgress,
      completedModulesCount: completedModules,
      totalPathwayModules: totalModules,
      hoursSavedViaAdaptivity: Math.round(getOverviewSkills(isSkillMode, selectedRole, selectedSkill).filter(s => s.status === 'mastered').length * 6.5),
      lastAssessedDate: '2026-09-20',
    }
  }, [companySkills, isSkillMode, achievedSteps, requiredSteps.length, selectedRole, selectedSkill])

  // Duration, Start Date, End Date metadata for overview
  const startDate = !isSkillMode ? real?.flow.selection?.selectedAt.slice(0, 10) ?? missing : profile.assignedAt ? profile.assignedAt.split(' ')[0] : '2026-06-15'
  const endDate = !isSkillMode ? missing : profile.deadline || '2026-12-31'
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const diffMonths = (diffDays / 30.4).toFixed(1)
  const durationText = !isSkillMode ? missing : language === 'vi'
    ? `${diffMonths} Tháng (${diffDays} Ngày)`
    : `${diffMonths} Months (${diffDays} Days)`

  const toggleSkillExpand = (skillId: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [skillId]: !prev[skillId],
    }))
  }

  // Filter skills based on search and category
  const filteredSkills = companySkills.filter((skill) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      skill.name.toLowerCase().includes(q) ||
      (skill.skillCode && skill.skillCode.toLowerCase().includes(q)) ||
      skill.category.toLowerCase().includes(q)
    const matchesCategory =
      selectedCategory === 'all' || !companySkills.some(s => s.category === selectedCategory) || skill.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Pagination for Micro-Skill Proficiency
  const [currentPage, setCurrentPage] = React.useState(1)
  const PAGE_SIZE = 5

  // Reset page to 1 when search, category, role, or skill changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, selectedRole, selectedSkill])

  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / PAGE_SIZE))
  const paginatedSkills = React.useMemo(() => {
    const startIndex = (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE
    return filteredSkills.slice(startIndex, startIndex + PAGE_SIZE)
  }, [filteredSkills, currentPage, totalPages])

  // Categories list with counts
  const categories = React.useMemo(() => {
    const set = new Set<string>()
    companySkills.forEach((s) => set.add(s.category))
    const arr = [{ key: 'all', label: !isSkillMode ? (vi ? 'Tất cả Skill' : 'All Skills') : 'All Domains', count: companySkills.length }]
    set.forEach((cat) => {
      arr.push({
        key: cat,
        label: cat,
        count: companySkills.filter((s) => s.category === cat).length,
      })
    })
    return arr
  }, [companySkills, isSkillMode, vi])

  const getStatusBadge = (status: CompetencySkillProfile['status']) => {
    switch (status) {
      case 'mastered':
        return <Badge variant="success">Mastered</Badge>
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>
      case 'critical_gap':
        return <Badge variant="destructive">Critical Gap</Badge>
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16 employee-overview-container">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 flex-wrap">
              <TargetRoleSelector roleSummary={!isSkillMode ? { title: realTitle, status: liveStatus } : undefined} />

              {/* Timeline & Duration Metadata */}
              <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border px-3.5 py-1.5 rounded-xl shadow-2xs text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={13} className="text-primary" />
                  <span>{t('header.start')}: <strong className="text-foreground font-mono">{startDate}</strong></span>
                </div>
                <span className="text-border hidden sm:inline">&bull;</span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={13} className="text-primary" />
                  <span>{t('header.end')}: <strong className="text-foreground font-mono">{endDate}</strong></span>
                </div>
                <span className="text-border hidden sm:inline">&bull;</span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={13} className="text-primary" />
                  <span>{t('header.duration')}: <Badge variant="secondary" className="font-mono text-xs font-bold text-primary">{durationText}</Badge></span>
                </div>
              </div>
            </div>
          }
        />

        {!isSkillMode && (overview.isPending || overview.isError || !real?.flow.selection) && <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground" role="status">{overview.isPending ? (vi ? 'Đang tải dữ liệu học tập…' : 'Loading learning data…') : overview.isError ? (vi ? 'Không tải được dữ liệu học tập. Vui lòng thử lại.' : 'Could not load learning data. Please retry.') : (vi ? 'Chọn Role tại Upskilling để xem tổng quan.' : 'Select a Role in Upskilling to view your overview.')} {overview.isError && <Button size="sm" variant="outline" onClick={() => overview.refetch()}>{vi ? 'Thử lại' : 'Retry'}</Button>}</div>}
        {/* =========================================================================
            AGGREGATED SUMMARY KPIS
           ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" /> {t('Aggregate Competency Statistics')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Skill Mastery */}
            <StatCard
              variant="gradient"
              icon={<Award className="h-4 w-4" />}
              title={t('Overall Skill Mastery')}
              value={!isSkillMode && !real?.flow.selection ? '—' : `${profileStats.overallMasteryPercentage}%`}
              valueClassName="text-primary font-bold"
              description={language === 'vi' 
                ? `${profileStats.masteredSkillsCount} trên ${profileStats.totalSkillsEvaluated} vi kỹ năng đã thành thạo`
                : `${profileStats.masteredSkillsCount} of ${profileStats.totalSkillsEvaluated} micro-skills mastered`}
            >
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>{t('Target Benchmark')}</span>
                  <span className="font-bold text-foreground">{isSkillMode ? `${profile.targetReadinessScore}% ${t('Minimum')}` : (vi ? 'Tất cả yêu cầu của Skill' : 'All requirements per Skill')}</span>
                </div>
                <Progress value={profileStats.overallMasteryPercentage} variant="primary" className="h-2" />
              </div>
            </StatCard>

            {/* KPI 2: Target Readiness Score */}
            <StatCard
              variant="default"
              icon={<Target className="h-4 w-4 text-primary" />}
              title={isSkillMode ? t('Skill Readiness') : t('Target Readiness')}
              value={!isSkillMode ? real?.pairs.length ? `${readiness}%` : '—' : `${profileStats.overallMasteryPercentage}%`}
              valueClassName="text-foreground font-bold"
              description={language === 'vi' 
                ? `Độ sẵn sàng cho ${activeBenchmark.roleTitle}`
                : `Readiness for ${activeBenchmark.roleTitle}`}
            >
              {!isSkillMode && real?.flow.selection && <div className="mt-3 text-xs text-muted-foreground pt-1 border-t border-border/60">{achievedPairs}/{real.pairs.length} {vi ? 'yêu cầu kiến thức đạt chính thức' : 'knowledge requirements officially achieved'}</div>}
            </StatCard>

            {/* KPI 3: Pathway Progression */}
            <StatCard
              variant="default"
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
              title={t('Pathway Progression')}
              value={!isSkillMode && !real?.pathway ? '—' : `${profileStats.completedModulesCount} / ${profileStats.totalPathwayModules} ${isSkillMode ? t('Modules') : vi ? 'bước yêu cầu' : 'required steps'}`}
              valueClassName="text-foreground font-bold"
              description={t('Curriculum milestone advancement')}
            >
              <div className="mt-3 flex items-center gap-1.5 text-xs text-success font-medium">
                <ShieldCheck size={14} />
                <span>{profileStats.pathwayProgressPercentage}% {t('Pathway Cleared')}</span>
              </div>
            </StatCard>

            {/* KPI 4: Adaptivity Efficiency */}
            <StatCard
              variant="default"
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              title={t('Adaptivity Hours Saved')}
              value={`${profileStats.hoursSavedViaAdaptivity} hrs`}
              valueClassName="text-foreground font-bold"
              description={t('Reduced learning time through knowledge tracing')}
            >
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <Clock size={13} />
                <span>{t('Next assessment gate ready')}</span>
              </div>
            </StatCard>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: DUAL RADAR CHARTS (COMPETENCY RADAR + RIASEC INTEREST RADAR)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* TOP LEFT: Competency Radar Analysis */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    {isSkillMode ? t('Competency Radar Analysis') : vi ? 'Trạng thái yêu cầu kiến thức' : 'Knowledge Requirement Status'}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {!isSkillMode ? (vi ? `Trạng thái yêu cầu kiến thức cho ${realTitle}.` : `Knowledge requirements for ${realTitle}.`) : language === 'vi'
                  ? `Biểu đồ đa biến thể hiện mức độ thành thạo đã được xác thực so với chuẩn của ${activeBenchmark.roleTitle}.`
                  : `Multivariate vector of verified proficiency vs benchmark requirements for ${activeBenchmark.roleTitle}.`}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col items-center justify-center">
              {!isSkillMode ? real ? <RequirementStatusRing pairs={real.pairs} /> : <div className="min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">{overview.isError ? (vi ? 'Dữ liệu chưa khả dụng' : 'Data unavailable') : (vi ? 'Đang tải…' : 'Loading…')}</div> : <CompetencyRadarChart
                selectedRoleKey={selectedRole}
                onSelectRoleKey={setSelectedRole}
                isSkillMode={isSkillMode}
                selectedSkillKey={selectedSkill}
                onSelectSkillKey={setSelectedSkill}
              />}
            </CardContent>
          </Card>

          {/* TOP RIGHT: RIASEC Holland Code Interest Radar */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-bold text-foreground">
                    {t('RIASEC Radar Analysis')}
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                {language === 'vi'
                  ? 'Đánh giá 6 nhóm xu hướng nghề nghiệp Holland (O*NET) so với định hướng của vai trò mục tiêu.'
                  : 'Evaluated Holland Code interests (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) vs target role alignment.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col items-center justify-center">
              <RiasecRadarChart selectedRoleKey={selectedRole} />
            </CardContent>
          </Card>
        </div>

        {/* =========================================================================
            SECTION 2: FULL-WIDTH MICRO-SKILL PROFICIENCY
           ========================================================================= */}
        <div className="w-full space-y-4">
          <Card className="border border-border bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{t('Micro-Skill Proficiency')}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {language === 'vi'
                      ? 'Theo dõi mức độ thành thạo của từng vi kỹ năng và mở học phần giảng dạy trực tiếp trong lộ trình học tập.'
                      : 'Track micro-skill mastery levels and inspect the direct teaching module in your adaptive learning pathway.'}
                  </CardDescription>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('Search micro-skills or categories...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Category Pills with Count badges */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === cat.key
                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        selectedCategory === cat.key
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-border/60">
              {filteredSkills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  {language === 'vi' 
                    ? 'Không tìm thấy vi kỹ năng nào phù hợp với bộ lọc.'
                    : 'No competency profiles match the active query or filter.'}
                </div>
              ) : (
                paginatedSkills.map((skill) => {
                  if (!isSkillMode) return <OverviewSkillRow key={skill.id} skill={skill as OverviewSkill} expanded={!!expandedSkills[skill.id]} toggle={() => toggleSkillExpand(skill.id)} />
                  const isExpanded = !!expandedSkills[skill.id]
                  const moduleInfo = skill.teachingModule || (skill.recommendedModule ? {
                    id: 'mod-ref',
                    moduleCode: skill.recommendedModule.split(':')[0]?.trim() || 'MOD-REF',
                    title: skill.recommendedModule.includes(':') ? skill.recommendedModule.split(':')[1]?.trim() : skill.recommendedModule,
                    description: 'Curriculum module aligned to this micro-skill in your adaptive learning pathway.',
                    status: (skill.status === 'mastered' ? 'completed' : 'in_progress') as 'completed' | 'in_progress',
                    order: 1,
                    estimatedDurationMinutes: 180,
                  } : null)

                  return (
                    <div key={skill.id} className="transition-colors hover:bg-muted/20">
                      {/* Skill Row Header */}
                      <div
                        onClick={() => toggleSkillExpand(skill.id)}
                        className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {skill.skillCode && (
                              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {skill.skillCode}
                              </span>
                            )}
                            <span className="font-bold text-sm text-foreground">{skill.name}</span>
                            {getStatusBadge(skill.status)}
                            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                              {skill.category}
                            </Badge>
                          </div>

                          {/* Clean progress bar + percentages without gap or deficit */}
                          <div className="mt-2.5 flex items-center gap-3">
                            <div className="relative flex-1 py-1">
                              <Progress
                                value={skill.estimatedMastery}
                                variant={skill.status === 'mastered' ? 'success' : 'warning'}
                                className="h-2 rounded-full"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                              <span className="font-bold text-foreground">{skill.estimatedMastery}%</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-muted-foreground font-semibold">{skill.targetRoleRequirement}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {moduleInfo && (
                            <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex bg-muted/40 text-muted-foreground">
                              {moduleInfo.moduleCode}
                            </Badge>
                          )}
                          <div className="p-1 rounded text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Dropdown: Teaching Module Only */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40">
                          {moduleInfo ? (
                            <div className="p-3.5 rounded-xl border border-border/80 bg-card/90 shadow-2xs space-y-2.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                    <BookOpen size={16} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold font-mono text-primary">
                                        {moduleInfo.moduleCode}:
                                      </span>
                                      <span className="text-xs font-bold text-foreground">
                                        {moduleInfo.title}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                      <span>
                                        {language === 'vi' 
                                          ? `Học phần ${moduleInfo.order} trên 5 trong lộ trình` 
                                          : `Curriculum Module ${moduleInfo.order} of 5 in Pathway`}
                                      </span>
                                      <span>&bull;</span>
                                      <span className="flex items-center gap-1 font-mono">
                                        <Clock size={11} />
                                        {Math.round(moduleInfo.estimatedDurationMinutes / 60)} {language === 'vi' ? 'giờ' : 'hrs'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      moduleInfo.status === 'completed'
                                        ? 'success'
                                        : moduleInfo.status === 'in_progress'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                    className="text-[10px] font-mono font-bold capitalize"
                                  >
                                    {moduleInfo.status.replace('_', ' ')}
                                  </Badge>

                                  <Link
                                    to="/employee/pathway"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:text-white hover:bg-primary-hover transition-colors shadow-2xs cursor-pointer"
                                    style={{ color: '#ffffff' }}
                                  >
                                    <span className="text-white font-bold" style={{ color: '#ffffff' }}>
                                      {language === 'vi' ? 'Xem trong lộ trình' : 'Go to Pathway'}
                                    </span>
                                    <ExternalLink size={12} className="text-white shrink-0" style={{ color: '#ffffff' }} />
                                  </Link>
                                </div>
                              </div>

                              <p className="text-xs text-muted-foreground leading-relaxed pl-10">
                                {moduleInfo.description}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 text-xs text-muted-foreground text-center">
                              {language === 'vi' ? 'Chưa liên kết học phần giảng dạy.' : 'No teaching module linked to this micro-skill.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>

            {filteredSkills.length > 0 && (
              <Pagination
                currentPage={Math.min(currentPage, totalPages)}
                totalPages={totalPages}
                totalItems={filteredSkills.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel={language === 'vi' ? 'vi kỹ năng' : 'micro-skills'}
              />
            )}
          </Card>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

// Backwards compatibility alias
export const LearnerOverviewPage = EmployeeOverviewPage
