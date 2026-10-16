import {
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Search,
  TrendingDown,
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

export function LearningOutcomesPage() {
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
          id: `cohort-${tr.id}`,
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
        id: `cohort-${activeCompany.id}`,
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
    return activeCompany.microSkills.slice(0, 5).map((s, idx) => ({
      skillId: s.id,
      skillCode: s.code,
      skillName: s.name,
      masteryRate: 70 + ((idx * 9) % 25),
      avgAttemptsToPass: 1.5,
      difficultyTag: (idx === 0 ? 'Bottleneck' : idx === 1 ? 'High Velocity' : 'Nominal') as 'Bottleneck' | 'High Velocity' | 'Nominal',
      status: (idx === 0 ? 'bottleneck' : idx === 1 ? 'high_attainment' : 'normal') as 'bottleneck' | 'high_attainment' | 'normal',
    }))
  }, [activeCompany])

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
    const matchesStatus = selectedStatus === 'all' || c.status.toLowerCase() === selectedStatus.toLowerCase()
    const matchesSearch =
      c.cohortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDept && matchesStatus && matchesSearch
  })

  // Aggregate computations
  const totalLearners = filteredCohorts.reduce((acc, c) => acc + c.learnerCount, 0)
  const avgProficiency =
    filteredCohorts.length > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.avgScore, 0) / filteredCohorts.length)
      : 0
  const avgCompletion =
    filteredCohorts.length > 0
      ? Math.round(filteredCohorts.reduce((acc, c) => acc + c.completionRate, 0) / filteredCohorts.length)
      : 0
  const avgGapClosure =
    filteredCohorts.length > 0
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
          : `Cohort,Department,Target Role,Learner Count,Avg Score,Completion Rate,Gap Closure Rate,Status\n` +
            filteredCohorts
              .map(
                (c) =>
                  `"${c.cohortName}","${c.department}","${c.targetRole}",${c.learnerCount},${c.avgScore}%,${c.completionRate}%,${c.gapClosureRate}%,"${c.status}"`,
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Calendar className="h-4 w-4" />}
                onClick={() =>
                  toast({
                    title: 'Current Academic Term',
                    description: 'Showing active aggregated outcomes for Q1 2026 cycle.',
                    variant: 'info',
                  })
                }
              >
                Q1 2026 Cycle
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => setIsExportModalOpen(true)}
              >
                Export Learning Report
              </Button>
            </div>
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Total Active Learners"
            value={totalLearners.toString()}
            valueClassName="text-primary"
            description={`In ${activeCompany.name} across ${availableDepts.length || 1} department${availableDepts.length === 1 ? '' : 's'}`}
          >
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <span className="font-semibold text-foreground">{filteredCohorts.length}</span> active cohorts
            </div>
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<Award className="h-4 w-4 text-success" />}
            title="Mean Mastery Score"
            value={`${avgProficiency}%`}
            valueClassName="text-success"
            description="Exceeds 75% enterprise baseline"
          >
            <Progress value={avgProficiency} variant="success" className="mt-2" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-primary" />}
            title="Module Completion Rate"
            value={`${avgCompletion}%`}
            valueClassName="text-primary"
            description="+12.4% vs previous quarter"
          >
            <Progress value={avgCompletion} variant="primary" className="mt-2" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-warning" />}
            title="Competency Gap Closure"
            value={`${avgGapClosure}%`}
            valueClassName="text-warning"
            description="Velocity: +18.4% QoQ"
          >
            <Progress value={avgGapClosure} variant="warning" className="mt-2" />
          </StatCard>
        </div>

        {/* Micro-Skill Velocity & Bottleneck Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Skill Acquisition Velocity & Critical Bottlenecks
                </CardTitle>
                <CardDescription>
                  Tracking learner mastery velocity and average diagnostic attempts required per atomic micro-skill.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                Ontology v1.2 Mappings
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {skillMetrics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No micro-skills defined in {activeCompany.name}. Define ontology skills to view velocity metrics.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {skillMetrics.map((s) => {
                  const isBottleneck = s.difficultyTag === 'Bottleneck'
                  const isHigh = s.difficultyTag === 'High Velocity'
                  return (
                    <div
                      key={s.skillCode}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isBottleneck
                          ? 'border-destructive/30 bg-destructive/5'
                          : isHigh
                          ? 'border-success/30 bg-success/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">{s.skillCode}</span>
                        <Badge
                          variant={isBottleneck ? 'destructive' : isHigh ? 'success' : 'secondary'}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {s.difficultyTag}
                        </Badge>
                      </div>
                      <div className="font-semibold text-xs text-foreground truncate" title={s.skillName}>
                        {s.skillName}
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-foreground">{s.masteryRate}%</span>
                        <span className="text-[11px] text-muted-foreground">
                          {s.avgAttemptsToPass} {s.avgAttemptsToPass === 1 ? 'attempt' : 'attempts'} avg
                        </span>
                      </div>
                      <Progress
                        value={s.masteryRate}
                        variant={isBottleneck ? 'destructive' : isHigh ? 'success' : 'primary'}
                        className="mt-2 h-1.5"
                      />
                    </div>
                  )
                })}
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
                  Cohort Learning Performance & Attainment
                </CardTitle>
                <CardDescription>
                  Detailed aggregate breakdown by departmental cohorts enrolled in competency learning paths.
                </CardDescription>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search cohorts or roles..."
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
                    <option value="attention">Needs Attention</option>
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
                      <th className="py-2.5 px-3">Cohort Name</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Target Role</th>
                      <th className="py-2.5 px-3 text-center">Learners</th>
                      <th className="py-2.5 px-3">Avg Proficiency</th>
                      <th className="py-2.5 px-3">Completion</th>
                      <th className="py-2.5 px-3">Gap Closure</th>
                      <th className="py-2.5 px-3">Velocity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCohorts.map((cohort) => (
                      <tr key={cohort.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground">
                          {cohort.cohortName}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">{cohort.department}</td>
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
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              cohort.velocityTrend.startsWith('+') ? 'text-success' : 'text-destructive'
                            }`}
                          >
                            {cohort.velocityTrend.startsWith('+') ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {cohort.velocityTrend}
                          </span>
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
                            {cohort.status}
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
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary shrink-0" />
                  <span>Department Outcome Details: {selectedCohort.department}</span>
                </DialogTitle>
                <Badge
                  variant={
                    selectedCohort.status === 'Exceeding'
                      ? 'success'
                      : selectedCohort.status === 'On Track'
                      ? 'primary'
                      : 'destructive'
                  }
                  className="shrink-0"
                >
                  {selectedCohort.status}
                </Badge>
              </div>
              <DialogDescription>
                Detailed competency attainment telemetry for {selectedCohort.cohortName} ({selectedCohort.department}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Enrolled Learners</span>
                  <strong className="text-foreground text-sm font-bold">{selectedCohort.learnerCount} Engineers</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Target Role Goal</span>
                  <strong className="text-foreground text-sm font-bold truncate block">{selectedCohort.targetRole}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cohort Proficiency</span>
                  <strong className="text-primary text-sm font-bold">{selectedCohort.avgScore}%</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gap Closure</span>
                  <strong className="text-success text-sm font-bold">{selectedCohort.gapClosureRate}%</strong>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border space-y-2">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Diagnostic Competency Mastery Distribution</span>
                  <span className="text-muted-foreground text-[11px]">Benchmark: 75% Target</span>
                </div>
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">Graph Semantic Architecture (COMP-SEM-01)</span>
                      <span className="font-bold text-foreground">88% (Exceeding)</span>
                    </div>
                    <Progress value={88} variant="success" className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">Graph Machine Learning (COMP-GML-02)</span>
                      <span className="font-bold text-foreground">72% (Near Target)</span>
                    </div>
                    <Progress value={72} variant="primary" className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">Adaptive Learning Engines (COMP-ADP-03)</span>
                      <span className="font-bold text-destructive">56% (Critical Gap)</span>
                    </div>
                    <Progress value={56} variant="destructive" className="h-1.5" />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/30 border border-primary/20 text-xs">
                <div className="font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  L&D Prescriptive Recommendation
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Cohort members demonstrate high proficiency in Cypher DDL syntax but struggle with neighborhood
                  aggregation in GNNs. Recommend prioritizing the "Hands-on Geometric Deep Learning (MOD-GNN-201)" lab
                  module.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: 'Cohort Roster Exported',
                    description: `Detailed roster for ${selectedCohort.cohortName} queued for manager review.`,
                    variant: 'info',
                  })
                }}
              >
                Export Cohort Roster
              </Button>
              <Button variant="primary" size="sm" onClick={() => setSelectedCohort(null)}>
                Close Drilldown
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
