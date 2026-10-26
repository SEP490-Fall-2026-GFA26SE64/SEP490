import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Search,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  LEARNING_OUTCOME_COHORTS,
  type LearningOutcomeCohort,
  SKILL_ACQUISITION_METRICS,
} from '../data/ldManagerMockData'
import { getActiveCompany, type CompanyRecord } from '../../../shared/stores/companyStore'

export function Dashboard() {
  const { toast } = useToast()
  const [activeCompany, setActiveCompany] = React.useState<CompanyRecord>(getActiveCompany)

  React.useEffect(() => {
    const handleSync = () => {
      setActiveCompany(getActiveCompany())
    }
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  // Filter states
  const [selectedDept, setSelectedDept] = React.useState<string>('all')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  // Micro-Skill distribution states
  const [skillSearchQuery, setSkillSearchQuery] = React.useState<string>('')
  const [skillStatusFilter, setSkillStatusFilter] = React.useState<'all' | 'Behind Pace' | 'On Track' | 'Exceeding'>('all')
  const [skillCurrentPage, setSkillCurrentPage] = React.useState<number>(1)
  const SKILL_PAGE_SIZE = 4

  React.useEffect(() => {
    setSkillCurrentPage(1)
  }, [skillSearchQuery, skillStatusFilter])

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false)
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'pdf' | 'json'>('csv')
  const [exportScope, setExportScope] = React.useState<'all' | 'filtered'>('filtered')
  const [isExporting, setIsExporting] = React.useState(false)

  // Cohort Drilldown Modal state
  const [selectedCohort, setSelectedCohort] = React.useState<LearningOutcomeCohort | null>(null)

  const employees = (activeCompany.users || []).filter((u) => u.role === 'Employee')
  const targetRoles = activeCompany.targetRoles || []

  // Derive cohorts strictly for the active company
  const cohorts: LearningOutcomeCohort[] = React.useMemo(() => {
    if (activeCompany.id === 'comp-technova') {
      return LEARNING_OUTCOME_COHORTS
    }

    if (targetRoles.length === 0 && employees.length === 0) {
      return []
    }

    if (targetRoles.length > 0) {
      return targetRoles.map((tr) => {
        const enrolled = employees.filter((e) => e.targetRole === tr.title)
        const count = enrolled.length > 0 ? enrolled.length : (employees.length > 0 ? 1 : 0)
        return {
          id: `CS-${tr.code || tr.id}`.toUpperCase(),
          cohortSnapshotId: `CS-${tr.code || tr.id}`.toUpperCase(),
          cohortName: `${tr.title} Acceleration Cohort`,
          department: tr.department || 'Engineering',
          targetRole: tr.title,
          learnerCount: count,
          avgScore: count > 0 ? 82 : 0,
          completionRate: count > 0 ? 68 : 0,
          gapClosureRate: count > 0 ? 74 : 0,
          startDate: activeCompany.createdAt || '2026-02-01',
          targetEndDate: '2026-12-31',
          status: 'On Track' as const,
          velocityTrend: 'improving' as const,
          modulesAssigned: (activeCompany.modules || []).slice(0, 3).map((m) => m.code),
        }
      })
    }

    return [
      {
        id: `CS-${activeCompany.id}`.toUpperCase(),
        cohortSnapshotId: `CS-${activeCompany.id}`.toUpperCase(),
        cohortName: `${activeCompany.name} Talent Cohort`,
        department: employees[0]?.department || 'General',
        targetRole: 'General Capability',
        learnerCount: employees.length,
        avgScore: 78,
        completionRate: 60,
        gapClosureRate: 65,
        startDate: activeCompany.createdAt || '2026-02-01',
        targetEndDate: '2026-12-31',
        status: 'On Track' as const,
        velocityTrend: 'improving' as const,
        modulesAssigned: (activeCompany.modules || []).slice(0, 2).map((m) => m.code),
      },
    ]
  }, [activeCompany, targetRoles, employees])

  // Derive skill acquisition metrics for active company
  const skillMetrics = React.useMemo(() => {
    if (activeCompany.id === 'comp-technova' && activeCompany.microSkills.length >= 3) {
      return SKILL_ACQUISITION_METRICS
    }
    if ((activeCompany.microSkills || []).length === 0) return []
    return activeCompany.microSkills.map((s, idx) => ({
      skillId: s.id,
      skillCode: s.code,
      skillName: s.name,
      masteryRate: 70 + ((idx * 9) % 25),
      avgAttemptsToPass: 1.5,
      difficultyTag: (idx % 3 === 0 ? 'Behind Pace' : idx % 3 === 1 ? 'Exceeding' : 'On Track') as 'Behind Pace' | 'Exceeding' | 'On Track',
      status: (idx % 3 === 0 ? 'behind_pace' : idx % 3 === 1 ? 'exceeding' : 'on_track') as 'behind_pace' | 'exceeding' | 'on_track',
    }))
  }, [activeCompany])

  const filteredSkills = React.useMemo(() => {
    return skillMetrics.filter((s) => {
      const matchesStatus = skillStatusFilter === 'all' || s.difficultyTag === skillStatusFilter
      const matchesSearch =
        s.skillName.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
        s.skillCode.toLowerCase().includes(skillSearchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [skillMetrics, skillStatusFilter, skillSearchQuery])

  const skillSlides = React.useMemo(() => {
    const slides: (typeof filteredSkills)[] = []
    for (let i = 0; i < filteredSkills.length; i += SKILL_PAGE_SIZE) {
      slides.push(filteredSkills.slice(i, i + SKILL_PAGE_SIZE))
    }
    return slides
  }, [filteredSkills, SKILL_PAGE_SIZE])

  const totalSkillPages = Math.max(1, skillSlides.length)

  React.useEffect(() => {
    if (skillCurrentPage > totalSkillPages) {
      setSkillCurrentPage(1)
    }
  }, [skillCurrentPage, totalSkillPages])

  const behindPaceCount = skillMetrics.filter((s) => s.difficultyTag === 'Behind Pace').length
  const onTrackCount = skillMetrics.filter((s) => s.difficultyTag === 'On Track').length
  const exceedingCount = skillMetrics.filter((s) => s.difficultyTag === 'Exceeding').length

  const availableDepts = React.useMemo(() => {
    const set = new Set<string>()
    cohorts.forEach((c) => {
      if (c.department) set.add(c.department)
    })
    return Array.from(set)
  }, [cohorts])

  // Filter cohorts
  const filteredCohorts = cohorts.filter((c) => {
    const matchesDept = selectedDept === 'all' || c.department === selectedDept
    const matchesStatus =
      selectedStatus === 'all' ||
      c.status.toLowerCase() === selectedStatus.toLowerCase() ||
      (selectedStatus === 'behind pace' && (c.status === 'Behind Pace' || c.status === 'Attention'))
    const matchesSearch =
      (c.cohortSnapshotId || c.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cohortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDept && matchesStatus && matchesSearch
  })

  // Aggregate computations: weighted by learner count across cohorts
  const totalLearners = filteredCohorts.reduce((acc, c) => acc + c.learnerCount, 0)
  const avgProficiency =
    totalLearners > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.avgScore * c.learnerCount, 0) / totalLearners)
      : filteredCohorts.length > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.avgScore, 0) / filteredCohorts.length)
      : 0
  const avgCompletion =
    totalLearners > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.completionRate * c.learnerCount, 0) / totalLearners)
      : filteredCohorts.length > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.completionRate, 0) / filteredCohorts.length)
      : 0
  const avgGapClosure =
    totalLearners > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.gapClosureRate * c.learnerCount, 0) / totalLearners)
      : filteredCohorts.length > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.gapClosureRate, 0) / filteredCohorts.length)
      : 0

  const handleExecuteExport = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      setIsExportModalOpen(false)

      const fileName = `learning-outcomes-report-${exportScope}-${new Date().toISOString().slice(0, 10)}.${exportFormat}`
      
      // Simulate real client download
      const content =
        exportFormat === 'json'
          ? JSON.stringify(filteredCohorts, null, 2)
          : `ID,Department,Target Role,Active Learners,Avg Proficiency,Completion Rate,Skill Gap Closure,Status\n` +
            filteredCohorts
              .map(
                (c) =>
                  `"${c.cohortSnapshotId || c.id}","${c.department}","${c.targetRole}",${c.learnerCount},${c.avgScore}%,${c.completionRate}%,${c.gapClosureRate}%,"${c.status}"`,
              )
              .join('\n')

      const blob = new Blob([content], {
        type: exportFormat === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Report Exported Successfully',
        description: `Generated and downloaded ${fileName} (${filteredCohorts.length} cohorts scoped).`,
        variant: 'success',
      })
    }, 700)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
            >
              Export
            </Button>
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Active Learners"
            value={totalLearners.toString()}
            valueClassName="text-primary"
            description="Employees currently enrolled across training cohorts"
          />

          <StatCard
            variant="gradient"
            icon={<Award className="h-4 w-4 text-success" />}
            title="Avg Proficiency"
            value={`${avgProficiency}%`}
            valueClassName="text-success"
            description="Average score across verified skill assessments"
          >
            <Progress value={avgProficiency} variant="success" className="mt-2" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
            title="Completion Rate"
            value={`${avgCompletion}%`}
            valueClassName="text-primary"
            description="Assigned learning path modules completed to date"
          >
            <Progress value={avgCompletion} variant="primary" className="mt-2" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-warning" />}
            title="Skill Gap Closure"
            value={`${avgGapClosure}%`}
            valueClassName="text-warning"
            description="Target role skill deficits successfully resolved"
          >
            <Progress value={avgGapClosure} variant="warning" className="mt-2" />
          </StatCard>
        </div>

        {/* Micro-Skill Mastery & Difficulty Attainment */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Skill Mastery Insights
                </CardTitle>
                <CardDescription>
                  Track employee pass rates and identify specific skills where learners need extra support.
                </CardDescription>
              </div>

              {/* Toolbar: Search & Status Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search skills or codes..."
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setSkillStatusFilter('all')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      skillStatusFilter === 'all'
                        ? 'bg-card text-foreground shadow-2xs border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({skillMetrics.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillStatusFilter('Behind Pace')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      skillStatusFilter === 'Behind Pace'
                        ? 'bg-card text-destructive shadow-2xs border border-destructive/30'
                        : 'text-muted-foreground hover:text-destructive'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    Behind Pace ({behindPaceCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillStatusFilter('On Track')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      skillStatusFilter === 'On Track'
                        ? 'bg-card text-primary shadow-2xs border border-primary/30'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    On Track ({onTrackCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillStatusFilter('Exceeding')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                      skillStatusFilter === 'Exceeding'
                        ? 'bg-card text-success shadow-2xs border border-success/30'
                        : 'text-muted-foreground hover:text-success'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Exceeding ({exceedingCount})
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {skillMetrics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No micro-skills defined in {activeCompany.name}. Define ontology skills to view metrics.
              </p>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/60" />
                <p className="text-xs font-semibold">No micro-skills match the current filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs h-7"
                  onClick={() => {
                    setSkillSearchQuery('')
                    setSkillStatusFilter('all')
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div>
                {/* Carousel Row: Left Arrow + Sliding Track + Right Arrow */}
                <div className="relative flex items-center gap-2.5">
                  {totalSkillPages > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={skillCurrentPage <= 1}
                      onClick={() => setSkillCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous slide"
                      className="h-8 w-8 p-0 rounded-full shrink-0 border-border bg-card shadow-2xs transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Horizontal Sliding Carousel Track */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div
                      className="flex transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(-${(skillCurrentPage - 1) * 100}%)` }}
                    >
                      {skillSlides.map((slide, slideIdx) => (
                        <div key={slideIdx} className="w-full shrink-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {slide.map((s) => {
                              const isBehindPace = s.difficultyTag === 'Behind Pace'
                              const isExceeding = s.difficultyTag === 'Exceeding'
                              return (
                                <div
                                  key={s.skillCode}
                                  className={`p-3.5 rounded-xl border transition-all hover:shadow-xs flex flex-col justify-between ${
                                    isBehindPace
                                      ? 'border-destructive/30 bg-destructive/[0.02] hover:border-destructive/50'
                                      : isExceeding
                                      ? 'border-success/30 bg-success/[0.02] hover:border-success/50'
                                      : 'border-border bg-card hover:border-primary/40'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-mono text-[11px] font-bold text-foreground">{s.skillCode}</span>
                                      <Badge
                                        variant={isBehindPace ? 'destructive' : isExceeding ? 'success' : 'secondary'}
                                        className="text-[10px] font-semibold py-0.5 px-2"
                                      >
                                        {s.difficultyTag}
                                      </Badge>
                                    </div>
                                    <div
                                      className="font-medium text-xs text-foreground line-clamp-2 leading-snug min-h-[32px]"
                                      title={s.skillName}
                                    >
                                      {s.skillName}
                                    </div>
                                  </div>

                                  <div className="mt-3.5 pt-2.5 border-t border-border/50">
                                    <div className="flex items-baseline justify-between mb-1">
                                      <span className="text-xl font-bold font-mono tracking-tight text-foreground">{s.masteryRate}%</span>
                                      <span className="text-[11px] text-muted-foreground font-medium">
                                        {s.avgAttemptsToPass} {s.avgAttemptsToPass === 1 ? 'attempt' : 'attempts'} avg
                                      </span>
                                    </div>
                                    <Progress
                                      value={s.masteryRate}
                                      variant={isBehindPace ? 'destructive' : isExceeding ? 'success' : 'primary'}
                                      className="h-1.5"
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {totalSkillPages > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={skillCurrentPage >= totalSkillPages}
                      onClick={() => setSkillCurrentPage((p) => Math.min(totalSkillPages, p + 1))}
                      aria-label="Next slide"
                      className="h-8 w-8 p-0 rounded-full shrink-0 border-border bg-card shadow-2xs transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40 disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Page Indicator below */}
                {totalSkillPages > 1 && (
                  <div className="flex items-center justify-center pt-3 mt-3 border-t border-border/50">
                    <span className="font-mono text-xs font-semibold text-muted-foreground select-none">
                      {skillCurrentPage} / {totalSkillPages}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters and Cohort Outcomes Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Training Cohort Progress
                </CardTitle>
                <CardDescription>
                  Track group learning pace, completion rates, and skill gap closure across your departments.
                </CardDescription>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by ID, role, or department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <Filter className="h-3 w-3 text-muted-foreground" />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {availableDepts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="exceeding">Exceeding</option>
                    <option value="on track">On Track</option>
                    <option value="behind pace">Behind Pace</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCohorts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No cohorts match the selected filters.</p>
                <p className="text-xs mt-1">Try resetting the department or status filter.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setSelectedDept('all')
                    setSelectedStatus('all')
                    setSearchQuery('')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Target Role</th>
                      <th className="py-2.5 px-3 text-center">Learners</th>
                      <th className="py-2.5 px-3">Avg Proficiency</th>
                      <th className="py-2.5 px-3">Completion Rate</th>
                      <th className="py-2.5 px-3">Skill Gap Closure</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCohorts.map((cohort) => (
                      <tr key={cohort.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-foreground text-xs">
                            {cohort.cohortSnapshotId || cohort.id}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{cohort.department}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-foreground">{cohort.targetRole}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">
                          {cohort.learnerCount}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{cohort.avgScore}%</span>
                            <Progress
                              value={cohort.avgScore}
                              variant={
                                cohort.avgScore >= 80 ? 'success' : cohort.avgScore >= 65 ? 'primary' : 'destructive'
                              }
                              className="w-16 h-1.5"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{cohort.completionRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{cohort.gapClosureRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              cohort.status === 'Exceeding'
                                ? 'success'
                                : cohort.status === 'On Track'
                                ? 'primary'
                                : 'destructive'
                            }
                          >
                            {cohort.status === 'Attention' ? 'Behind Pace' : cohort.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedCohort(cohort)}
                            title="View Department Outcome Details"
                            aria-label="View Department Outcome Details"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cohort Drilldown Dialog */}
      {selectedCohort && (
        <Dialog
          open={Boolean(selectedCohort)}
          onOpenChange={(open) => !open && setSelectedCohort(null)}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <DialogHeader className="pb-3 border-b border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                      {selectedCohort.department}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Skill progress and benchmark results for this department team
                    </DialogDescription>
                  </div>
                </div>
                <Badge
                  variant={
                    selectedCohort.status === 'Exceeding'
                      ? 'success'
                      : selectedCohort.status === 'On Track'
                      ? 'primary'
                      : 'destructive'
                  }
                  className="shrink-0 text-xs px-2.5 py-0.5 font-semibold"
                >
                  {selectedCohort.status === 'Attention' ? 'Behind Pace' : selectedCohort.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* 4 Elevated Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium">Active Learners</span>
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {selectedCohort.learnerCount}
                    <span className="text-xs font-normal text-muted-foreground ml-1">Engineers</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium">Target Role</span>
                    <Target className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xs font-bold text-foreground truncate" title={selectedCohort.targetRole}>
                    {selectedCohort.targetRole}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium">Avg Proficiency</span>
                    <Award className="h-3.5 w-3.5 text-success" />
                  </div>
                  <div className="text-base font-bold text-success">
                    {selectedCohort.avgScore}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium">Skill Gap Closure</span>
                    <TrendingUp className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <div className="text-base font-bold text-warning">
                    {selectedCohort.gapClosureRate}%
                  </div>
                </div>
              </div>

              {/* Competency Mastery Breakdown Container */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight">Competency Mastery Breakdown</h4>
                    <p className="text-[11px] text-muted-foreground">Team performance against benchmark target</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] bg-background border-border text-muted-foreground">
                    Benchmark: 75% Target
                  </Badge>
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* Item 1 */}
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                          COMP-SEM-01
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          Graph Semantic Architecture
                        </span>
                      </div>
                      <Badge variant="success" className="text-[11px] font-bold shrink-0">
                        88% · Exceeding
                      </Badge>
                    </div>
                    <Progress value={88} variant="success" className="h-1.5" />
                  </div>

                  {/* Item 2 */}
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                          COMP-GML-02
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          Graph Machine Learning
                        </span>
                      </div>
                      <Badge variant="primary" className="text-[11px] font-bold shrink-0">
                        72% · Near Target
                      </Badge>
                    </div>
                    <Progress value={72} variant="primary" className="h-1.5" />
                  </div>

                  {/* Item 3 */}
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                          COMP-ADP-03
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate">
                          Adaptive Learning Engines
                        </span>
                      </div>
                      <Badge variant="destructive" className="text-[11px] font-bold shrink-0">
                        56% · Critical Gap
                      </Badge>
                    </div>
                    <Progress value={56} variant="destructive" className="h-1.5" />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedCohort(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast({
                    title: 'Cohort Roster Exported',
                    description: `Exported training report for ${selectedCohort.department}.`,
                    variant: 'info',
                  })
                }}
              >
                Export
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Export Learning Report Dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Learning Outcomes Report
            </DialogTitle>
            <DialogDescription>
              Generate aggregate telemetry, cohort score distributions, and skill gap closures for leadership audits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {/* Format choice */}
            <div>
              <label className="font-semibold text-foreground block mb-1.5">File Format</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
                    exportFormat === 'csv'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-semibold text-foreground">CSV Spreadsheet</span>
                  <span className="text-[10px] text-muted-foreground">Raw tabular data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
                    exportFormat === 'pdf'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold text-foreground">PDF Executive</span>
                  <span className="text-[10px] text-muted-foreground">Executive summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors cursor-pointer ${
                    exportFormat === 'json'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span className="font-semibold text-foreground">JSON Telemetry</span>
                  <span className="text-[10px] text-muted-foreground">API ingest schema</span>
                </button>
              </div>
            </div>

            {/* Scope choice */}
            <div>
              <label className="font-semibold text-foreground block mb-1.5">Reporting Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('filtered')}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    exportScope === 'filtered'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold text-foreground">Current Filtered View</div>
                  <div className="text-[10px] text-muted-foreground">
                    {filteredCohorts.length} cohorts currently displayed
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    exportScope === 'all'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <div className="font-semibold text-foreground">All Enterprise Cohorts</div>
                  <div className="text-[10px] text-muted-foreground">
                    {LEARNING_OUTCOME_COHORTS.length} historical and active cohorts
                  </div>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <span>
                Report includes learner diagnostic pass rates, dynamic knowledge tracing estimates, and micro-skill
                bottlenecks as of today.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExecuteExport}
            >
              {isExporting ? 'Generating Report...' : 'Download Report'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </WorkspaceLayout>
  )
}

export const LearningOutcomesPage = Dashboard
