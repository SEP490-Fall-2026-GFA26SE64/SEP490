import {
  AlertCircle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Eye,
  FileQuestion,
  FileText,
  History,
  Layers,
  Lock,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Dialog } from '../../../shared/components/ui/Dialog'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  LEARNER_TELEMETRY,
  type TeamMemberGap,
} from '../data/managerData'
import { getActiveCompany, type CompanyRecord } from '../../../shared/stores/companyStore'
import { Link } from 'react-router-dom'
import './TeamMatrixPage.css'

export function TeamMatrixPage() {
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

  const [statusFilter, setStatusFilter] = React.useState<'all' | 'ready' | 'on_track' | 'needs_attention'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10
  const [selectedLearner, setSelectedLearner] = React.useState<TeamMemberGap | null>(null)
  const [learnerModalTab, setLearnerModalTab] = React.useState<'overview' | 'pathway' | 'quiz'>('overview')
  const [reviewAttemptId, setReviewAttemptId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  // Scope team members strictly to the active company's employees
  const companyEmployees = (activeCompany.users || []).filter((u) => u.role === 'Employee')

  const companyMembers: TeamMemberGap[] = companyEmployees.map((emp, idx) => {
    const telemetryKey = LEARNER_TELEMETRY[emp.id] ? emp.id : (idx === 0 ? 'emp-1' : idx === 1 ? 'emp-2' : 'emp-3')
    const tel = LEARNER_TELEMETRY[telemetryKey]
    const readiness = tel?.pathwayProgress || (70 + ((idx * 13) % 25))
    const hours = tel ? 24.5 + idx * 8 : 14.0 + idx * 6
    const status: TeamMemberGap['status'] = readiness >= 85 ? 'ready' : readiness >= 50 ? 'on_track' : 'needs_attention'
    const primaryRole = emp.targetRole || activeCompany.targetRoles[0]?.title || 'Target Role Pending'
    const defaultGap = activeCompany.microSkills[idx % Math.max(1, activeCompany.microSkills.length)]?.name || 'Baseline Diagnostic Calibration'

    return {
      id: emp.id,
      name: emp.name,
      currentRole: emp.department || 'Employee',
      targetRole: primaryRole,
      readinessScore: readiness,
      criticalGap: defaultGap,
      hoursSaved: hours,
      status,
    }
  })

  const filteredMembers = companyMembers.filter((member) => {
    const matchesFilter = statusFilter === 'all' || member.status === statusFilter
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.criticalGap.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Dynamic calculations for active company
  const totalHoursSaved = companyMembers.reduce((acc, m) => acc + m.hoursSaved, 0)
  const averageReadiness =
    companyMembers.length > 0
      ? Math.round(companyMembers.reduce((acc, m) => acc + m.readinessScore, 0) / companyMembers.length)
      : 0
  const promotionReadyCount = companyMembers.filter((m) => m.status === 'ready').length
  const promotionReadyName = companyMembers.find((m) => m.status === 'ready')?.name

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Average Team Readiness"
            value={`${averageReadiness}%`}
            valueClassName="text-primary"
            description={companyMembers.length > 0 ? "+14% improvement this quarter" : "No active employee telemetry"}
          >
            <Progress value={averageReadiness} variant="primary" />
          </StatCard>

          <StatCard
            variant="gradient"
            icon={<DollarSign className="h-4 w-4 text-success" />}
            title="Cumulative Hours Saved"
            value={`${totalHoursSaved} Hours`}
            valueClassName="text-success"
            description="Saved via adaptive knowledge-gap skipping vs rigid traditional training."
          />

          <StatCard
            variant="gradient"
            icon={<UserCheck className="h-4 w-4 text-primary" />}
            title="Promotion Ready"
            value={`${promotionReadyCount} Employee${promotionReadyCount === 1 ? '' : 's'}`}
            description={
              promotionReadyName
                ? `${promotionReadyName} has reached target competency thresholds.`
                : 'No employees have reached target promotion readiness yet.'
            }
          />
        </div>

        {/* Team Matrix Table - Target Roles Standard Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Team Role Progression & Gap Identification
                </CardTitle>
                <CardDescription>
                  Live competency scores mapped against benchmark target role proficiencies.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter by employee, role, or gap..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ready' | 'on_track' | 'needs_attention')}
                    aria-label="Filter by Status"
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses ({companyMembers.length})</option>
                    <option value="ready">Ready ({companyMembers.filter((m) => m.status === 'ready').length})</option>
                    <option value="on_track">On Track ({companyMembers.filter((m) => m.status === 'on_track').length})</option>
                    <option value="needs_attention">Needs Support ({companyMembers.filter((m) => m.status === 'needs_attention').length})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3">EMPLOYEE</th>
                    <th className="py-2.5 px-3">CURRENT ROLE</th>
                    <th className="py-2.5 px-3">TARGET ROLE</th>
                    <th className="py-2.5 px-3">READINESS SCORE</th>
                    <th className="py-2.5 px-3">CRITICAL SKILL GAP</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companyMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-xs text-muted-foreground">
                        <div className="max-w-md mx-auto space-y-3">
                          <Users className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                          <p className="font-semibold text-foreground text-sm">No Employees Registered in {activeCompany.name}</p>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            Provision employees in the User Directory to track competency readiness, progression thresholds, and diagnostic gap telemetry.
                          </p>
                          <Link to="/ld-manager/users" className="inline-block pt-1">
                            <Button variant="primary" size="sm">Go to User Directory</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-xs text-muted-foreground">
                        No team members match the active filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {member.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                            <span className="font-bold text-foreground group-hover:text-primary transition-colors text-xs">
                              {member.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-medium text-xs">
                          {member.currentRole}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="font-semibold text-primary border-primary/30 bg-secondary/30 text-[11px]">
                            {member.targetRole}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-xs font-mono font-bold">
                              <span
                                className={
                                  member.readinessScore >= 80
                                    ? 'text-success'
                                    : member.readinessScore >= 50
                                      ? 'text-warning'
                                      : 'text-destructive'
                                }
                              >
                                {member.readinessScore}%
                              </span>
                            </div>
                            <Progress
                              value={member.readinessScore}
                              variant={
                                member.readinessScore >= 80
                                  ? 'success'
                                  : member.readinessScore >= 50
                                    ? 'warning'
                                    : 'destructive'
                              }
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {member.criticalGap}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              member.status === 'ready'
                                ? 'success'
                                : member.status === 'on_track'
                                  ? 'warning'
                                  : 'destructive'
                            }
                            className="font-bold text-[11px] shadow-2xs"
                          >
                            {member.status === 'ready'
                              ? 'Ready for Promotion'
                              : member.status === 'on_track'
                                ? 'On Track'
                                : 'Needs Support'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedLearner(member)
                              setLearnerModalTab('overview')
                              setReviewAttemptId(null)
                            }}
                            title="View Learner Progress"
                            aria-label="View Learner Progress"
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredMembers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredMembers.length / pageSize) || 1}
                totalItems={filteredMembers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="members"
              />
            )}
          </CardContent>
        </Card>

        {/* VIEW LEARNER PROGRESS MODAL (Miro Flow: Team Matrix Screen -> View Learner Progress Modal) */}
        {selectedLearner && (() => {
          const telemetry = LEARNER_TELEMETRY[selectedLearner.id]
          const pathway = telemetry?.adaptivePathway || []
          const attempts = telemetry?.attempts || (telemetry?.assessmentQuiz ? [telemetry.assessmentQuiz] : [])
          const completedSteps = pathway.filter((s) => s.status === 'completed').length
          const initials = selectedLearner.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)

          // Dynamically assemble key evaluated skills for this learner
          const assessedSkills: {
            name: string
            category: string
            status: 'mastered' | 'in_progress' | 'gap'
            score?: number
          }[] = []

          if (attempts.length > 0) {
            attempts[0].questions.forEach((q) => {
              if (!assessedSkills.some((s) => s.name === q.skillName)) {
                assessedSkills.push({
                  name: q.skillName,
                  category: q.skillCode,
                  status: q.isCorrect ? 'mastered' : 'gap',
                  score: q.isCorrect ? 100 : 0,
                })
              }
            })
          }

          pathway.forEach((step) => {
            if (assessedSkills.length < 5 && step.skillsTaught.length > 0) {
              const skill = step.skillsTaught[0]
              if (!assessedSkills.some((s) => s.name === skill)) {
                assessedSkills.push({
                  name: skill,
                  category: step.code,
                  status:
                    step.status === 'completed'
                      ? 'mastered'
                      : step.status === 'in_progress'
                        ? 'in_progress'
                        : 'in_progress',
                  score: step.score,
                })
              }
            }
          })

          return (
            <Dialog
              open={Boolean(selectedLearner)}
              onOpenChange={(open) => !open && setSelectedLearner(null)}
              className="max-w-5xl h-[88vh] max-h-[90vh] p-0 flex flex-col overflow-hidden"
            >
              {/* Executive Header Bar */}
              <div className="px-5 sm:px-6 py-4 border-b border-border bg-card shrink-0 flex items-center justify-between gap-4 pr-14">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-secondary text-primary font-bold text-base border border-primary/25 shadow-2xs flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                        Learner Dossier: {selectedLearner.name}
                      </h2>
                      <Badge
                        variant={
                          selectedLearner.status === 'ready'
                            ? 'success'
                            : selectedLearner.status === 'on_track'
                              ? 'warning'
                              : 'destructive'
                        }
                        className="font-bold text-[11px] shrink-0"
                      >
                        {selectedLearner.status === 'ready'
                          ? 'Ready for Promotion'
                          : selectedLearner.status === 'on_track'
                            ? 'On Track'
                            : 'Needs Attention'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-semibold text-foreground">{selectedLearner.currentRole}</span>
                      <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                      <span className="font-semibold text-primary">{selectedLearner.targetRole}</span>
                      <span className="text-border">•</span>
                      <span className="font-mono text-[11px] text-muted-foreground">ID: {selectedLearner.id.toUpperCase()}</span>
                      <span className="text-border">•</span>
                      <span className="text-[11px] text-muted-foreground">{telemetry?.targetRoleCode || 'ROLE-TRACK-01'}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                      Role Fit Match
                    </span>
                    <span className="font-mono text-base font-black text-primary">
                      {selectedLearner.readinessScore}%
                    </span>
                  </div>
                  <div className="h-8 w-px bg-border/60" />
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                      Time Saved
                    </span>
                    <span className="font-mono text-base font-black text-success">
                      {selectedLearner.hoursSaved}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Tabs Container */}
              <Tabs
                value={learnerModalTab}
                onValueChange={(val) => {
                  setLearnerModalTab(val as 'overview' | 'pathway' | 'quiz')
                  setReviewAttemptId(null)
                }}
                className="w-full flex flex-col flex-1 min-h-0 bg-background"
              >
                {/* Modern Segmented Navigation Tabs */}
                <div className="px-5 sm:px-6 pt-3 pb-2.5 bg-background border-b border-border/70 shrink-0">
                  <TabsList className="grid grid-cols-3 w-full bg-muted/60 p-1 rounded-xl h-auto">
                    <TabsTrigger
                      value="overview"
                      className="text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all"
                    >
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      <span>Overview &amp; Gaps</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="pathway"
                      className="text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>Adaptive Pathway</span>
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                        {completedSteps}/{pathway.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="quiz"
                      className="text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all"
                    >
                      <History className="h-3.5 w-3.5 text-primary" />
                      <span>Assessment Telemetry</span>
                      {attempts.length > 0 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                          {attempts.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: OVERVIEW & GAPS */}
                <TabsContent
                  value="overview"
                  className="space-y-4 animate-in fade-in-50 overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-4"
                >
                  {/* Hero Career Progression & Competency Fit Card */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-secondary/25 shadow-2xs space-y-4">
                    {/* Visual Role Trajectory Flow */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
                      {/* Current Baseline Card */}
                      <div className="p-3.5 rounded-xl border border-border/80 bg-background/90 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Layers className="h-3 w-3 text-muted-foreground" />
                            Current Baseline Role
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono py-0 text-muted-foreground">
                            Verified
                          </Badge>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-foreground">
                          {selectedLearner.currentRole}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Foundational domain competency established
                        </p>
                      </div>

                      {/* Middle Adaptive Indicator */}
                      <div className="flex flex-col items-center justify-center px-2 py-1 text-center shrink-0">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border border-primary/25 text-[11px] font-semibold text-primary shadow-2xs">
                          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                          <span>Adaptive Trajectory</span>
                          <ArrowRight className="h-3 w-3 text-primary" />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                          Adaptive Competency Engine
                        </span>
                      </div>

                      {/* Target Career Goal Card */}
                      <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Target className="h-3 w-3 text-primary" />
                            Target Career Goal
                          </span>
                          <Badge variant="primary" className="text-[10px] py-0 font-bold">
                            Goal
                          </Badge>
                        </div>
                        <div className="text-sm sm:text-base font-bold text-primary">
                          {selectedLearner.targetRole}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Target promotion benchmark: 85% fit
                        </p>
                      </div>
                    </div>

                    {/* Competency Readiness Meter with Target Benchmark Line */}
                    <div className="pt-3 border-t border-border/60 space-y-2">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            Competency Readiness Fit
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Aggregated across evaluated ontology skill prerequisites
                          </span>
                        </div>
                        <div className="text-right flex items-baseline gap-1.5">
                          <span className="font-mono text-2xl font-black text-primary">
                            {selectedLearner.readinessScore}%
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold">
                            / 85% Benchmark
                          </span>
                        </div>
                      </div>

                      {/* Gauge Bar with Target Pin */}
                      <div className="relative pt-1 pb-1">
                        <div className="relative h-3 w-full bg-muted/80 rounded-full overflow-hidden border border-border/80">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              selectedLearner.readinessScore >= 85
                                ? 'bg-success'
                                : selectedLearner.readinessScore >= 60
                                  ? 'bg-primary'
                                  : 'bg-warning'
                            }`}
                            style={{ width: `${Math.min(selectedLearner.readinessScore, 100)}%` }}
                          />
                        </div>
                        {/* 85% Benchmark Line Marker */}
                        <div
                          className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
                          style={{ left: '85%' }}
                        >
                          <div className="w-0.5 h-5 -mt-1 bg-foreground/60 rounded-full shadow-xs" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          Target Benchmark: <strong>85% Minimum Required</strong>
                        </span>
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            selectedLearner.readinessScore >= 85 ? 'text-success' : 'text-primary'
                          }`}
                        >
                          {selectedLearner.readinessScore >= 85 ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Threshold Achieved (+{selectedLearner.readinessScore - 85}% buffer)</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>{85 - selectedLearner.readinessScore}% deficit remaining to promotion readiness</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 High-Signal Telemetry Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          Time Efficiency
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono text-primary font-bold">
                          Skip Logic
                        </Badge>
                      </div>
                      <div className="text-xl font-black font-mono text-foreground">
                        {selectedLearner.hoursSaved} Hours Saved
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Hours saved skipping known concepts via diagnostic test evaluation.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Curriculum Velocity
                        </span>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {telemetry?.pathwayProgress || 0}% Complete
                        </span>
                      </div>
                      <div className="text-xl font-black font-mono text-foreground">
                        {completedSteps} of {pathway.length} Modules
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Personalized adaptive modules completed towards target role.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-all space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-primary" />
                          Assessment Diagnostic
                        </span>
                        <Badge
                          variant={attempts[0]?.passed ? 'success' : 'destructive'}
                          className="text-[10px] px-1.5 py-0 font-bold"
                        >
                          {attempts[0]?.passed ? 'Passed' : 'Needs Review'}
                        </Badge>
                      </div>
                      <div className="text-xl font-black font-mono text-foreground">
                        {attempts[0]?.score ?? selectedLearner.readinessScore}% Accuracy
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {attempts[0]?.passed
                          ? 'Benchmark passed across evaluated blueprint skills.'
                          : 'Foundational gaps identified for sequenced remediation.'}
                      </p>
                    </div>
                  </div>

                  {/* Two-Column Diagnostic & Skill Matrix Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Primary Blocking Competency Gap */}
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-destructive/15 text-destructive">
                              <AlertCircle className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-bold text-destructive uppercase tracking-wide">
                              Primary Progression Blocker
                            </span>
                          </div>
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            High Priority
                          </Badge>
                        </div>

                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-foreground">
                            {selectedLearner.criticalGap}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                            This competency currently gates transition to <strong>{selectedLearner.targetRole}</strong>. Diagnostic telemetry identified a conceptual deficit during graph neural network evaluation.
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-card/90 border border-destructive/20 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px]">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span>Active Remediation Intervention:</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {pathway.find((p) => p.status === 'in_progress')?.title ? (
                              <>Sequenced module <strong>{pathway.find((p) => p.status === 'in_progress')?.code}: {pathway.find((p) => p.status === 'in_progress')?.title}</strong> ({pathway.find((p) => p.status === 'in_progress')?.duration}) to close this gap.</>
                            ) : (
                              <>Sequenced fast-track assessment quiz or module review to resolve this ontology prerequisite.</>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs h-8 flex-1"
                          onClick={() => setLearnerModalTab('pathway')}
                          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                        >
                          View Remediation in Pathway
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => setLearnerModalTab('quiz')}
                          leftIcon={<History className="h-3.5 w-3.5" />}
                        >
                          Review Quiz
                        </Button>
                      </div>
                    </div>

                    {/* Right: Ontology Competency Ledger */}
                    <div className="p-4 rounded-xl border border-border bg-card shadow-2xs flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-md bg-primary/10 text-primary">
                              <Layers className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                                Ontology Competency Ledger
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Evaluated against {selectedLearner.targetRole}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-mono text-primary font-bold">
                            Competency Validated
                          </Badge>
                        </div>

                        <div className="divide-y divide-border/40 mt-1">
                          {assessedSkills.map((item, idx) => (
                            <div key={idx} className="py-2 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                {item.status === 'mastered' ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                ) : item.status === 'in_progress' ? (
                                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                ) : (
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                )}
                                <span className="font-medium text-foreground truncate">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-mono text-[11px] text-muted-foreground hidden sm:inline">
                                  {item.category}
                                </span>
                                <Badge
                                  variant={
                                    item.status === 'mastered'
                                      ? 'success'
                                      : item.status === 'in_progress'
                                        ? 'primary'
                                        : 'destructive'
                                  }
                                  className="text-[10px] py-0 px-1.5 font-semibold"
                                >
                                  {item.status === 'mastered'
                                    ? `Mastered (${item.score || 90}%)`
                                    : item.status === 'in_progress'
                                      ? 'In Progress'
                                      : 'Gap Flagged'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Ontology prerequisites verified</span>
                        <span className="font-semibold text-foreground">
                          {assessedSkills.filter((s) => s.status === 'mastered').length} of {assessedSkills.length} Verified
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: ADAPTIVE PATHWAY */}
                <TabsContent
                  value="pathway"
                  className="space-y-4 animate-in fade-in-50 overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-4"
                >
                  {/* Pathway Header Banner */}
                  <div className="p-4 rounded-xl border border-border bg-gradient-to-r from-muted/30 via-card to-secondary/15 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] text-primary font-bold">
                            {telemetry?.targetRoleCode || 'TARGET-TRACK'}
                          </Badge>
                          <span className="font-bold text-foreground text-sm">
                            {telemetry?.targetRoleTitle || selectedLearner.targetRole}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">
                          Sequenced modules addressing {selectedLearner.name}'s verified competency gaps and ontological prerequisites.
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-primary font-bold text-sm">
                          {completedSteps} / {pathway.length} Modules Cleared ({telemetry?.pathwayProgress || 0}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={telemetry?.pathwayProgress || 0} variant="primary" className="h-2" />
                  </div>

                  {/* Modules Sequence */}
                  <div className="space-y-3">
                    {pathway.map((step, idx) => {
                      const isCompleted = step.status === 'completed'
                      const isInProgress = step.status === 'in_progress'
                      const isRecommended = step.status === 'recommended'

                      return (
                        <div
                          key={step.id}
                          className={`p-4 rounded-xl border text-xs transition-all relative ${
                            isInProgress
                              ? 'border-primary/50 bg-primary/5 shadow-xs ring-1 ring-primary/20'
                              : isRecommended
                                ? 'border-primary/30 bg-primary/3'
                                : isCompleted
                                  ? 'border-border bg-card'
                                  : 'border-border/60 bg-muted/20 opacity-75'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Step Index & Status Icon */}
                              <div
                                className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                                  isCompleted
                                    ? 'bg-success/15 text-success'
                                    : isInProgress
                                      ? 'bg-primary/15 text-primary animate-pulse'
                                      : isRecommended
                                        ? 'bg-primary/15 text-primary'
                                        : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isInProgress ? (
                                  <Clock className="h-4 w-4" />
                                ) : isRecommended ? (
                                  <Sparkles className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted font-bold text-muted-foreground">
                                    STEP 0{idx + 1}
                                  </span>
                                  <span className="font-mono font-bold text-xs text-primary">{step.code}</span>
                                  <span className="font-bold text-sm text-foreground">{step.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {step.rationale}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {step.duration}
                              </span>
                              <Badge
                                variant={
                                  isCompleted
                                    ? 'success'
                                    : isInProgress || isRecommended
                                      ? 'primary'
                                      : 'outline'
                                }
                                className="text-[11px] font-semibold"
                              >
                                {isCompleted
                                  ? `Mastered (${step.score}%)`
                                  : isInProgress
                                    ? 'Active Intervention'
                                    : isRecommended
                                      ? 'Recommended'
                                      : `Locked (${step.prerequisite || 'Prereq'})`}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-muted-foreground font-semibold">Taught Competencies:</span>
                              {step.skillsTaught.map((skill, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border text-[10px] font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                {/* TAB 3: ASSESSMENT QUIZ */}
                <TabsContent
                  value="quiz"
                  className="space-y-4 animate-in fade-in-50 overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-4"
                >
                  {attempts.length > 0 ? (
                    <div className="space-y-3.5">
                      {attempts
                        .filter((a) => !reviewAttemptId || a.id === reviewAttemptId)
                        .map((attempt) => {
                          const isReviewing = reviewAttemptId === attempt.id
                          const correctCount = attempt.questions.filter((q) => q.isCorrect).length
                          const totalQuestions = attempt.questions.length
                          const isPassed = attempt.score >= (attempt.passThreshold || 80)
                          const accuracyPct = Math.round((correctCount / totalQuestions) * 100)

                          return (
                            <div
                              key={attempt.id}
                              className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden"
                            >
                              {/* Attempt Header */}
                              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-secondary/25 border-border">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-xs font-bold text-primary border-primary/30"
                                    >
                                      {attempt.blueprintCode}
                                    </Badge>
                                    <span className="font-bold text-sm text-foreground">
                                      {attempt.blueprintTitle}
                                    </span>
                                    <Badge
                                      variant={isPassed ? 'success' : 'destructive'}
                                      className="text-xs font-bold"
                                    >
                                      {isPassed ? `✓ Passed — ${attempt.score}%` : `✗ Failed — ${attempt.score}%`}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 text-primary" />
                                      {attempt.timeSpent}
                                    </span>
                                    <span>
                                      Completed: <strong className="text-foreground">{attempt.completedDate}</strong>
                                    </span>
                                    <span className="font-semibold text-foreground">
                                      <span className="text-success">{correctCount} correct</span> ·{' '}
                                      <span className="text-destructive">
                                        {totalQuestions - correctCount} incorrect
                                      </span>
                                    </span>
                                    <span className="text-muted-foreground">
                                      Pass benchmark: <strong className="text-foreground">{attempt.passThreshold}%</strong>
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant={isReviewing ? 'primary' : 'outline'}
                                  size="sm"
                                  className="text-xs h-8 shrink-0"
                                  leftIcon={<FileText className="h-3.5 w-3.5" />}
                                  onClick={() => setReviewAttemptId(isReviewing ? null : attempt.id)}
                                >
                                  {isReviewing ? 'Hide Questions' : 'Review Questions'}
                                </Button>
                              </div>

                              {/* Score Summary Bar */}
                              <div className="px-4 py-2 bg-muted/20 border-b border-border flex items-center gap-3">
                                <div className="flex-1">
                                  <Progress
                                    value={accuracyPct}
                                    variant="primary"
                                    className="h-2"
                                  />
                                </div>
                                <span className="text-xs font-bold font-mono shrink-0 text-primary">
                                  {accuracyPct}% accuracy
                                </span>
                              </div>

                              {/* Expanded Review Panel */}
                              {isReviewing && (
                                <div className="p-4 space-y-3.5 animate-in fade-in-50 bg-background/50">
                                  <div className="flex items-center gap-2 pb-1">
                                    <FileQuestion className="h-4 w-4 text-primary shrink-0" />
                                    <span className="font-bold text-sm text-foreground">
                                      Question-by-Question Evaluation
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {attempt.questions.map((q, idx) => (
                                      <div
                                        key={q.id}
                                        className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all hover:border-primary/40"
                                      >
                                        {/* Question Header Bar */}
                                        <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-border bg-secondary/35">
                                          <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary text-primary-foreground shadow-2xs">
                                              {idx + 1}
                                            </span>
                                            <span className="font-semibold text-xs text-foreground">
                                              {q.code}
                                            </span>
                                            <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-card text-muted-foreground border border-border">
                                              <Layers className="h-3 w-3 text-primary" />
                                              <span className="font-mono font-semibold text-primary">{q.skillCode}</span>
                                              <span className="hidden sm:inline text-muted-foreground">
                                                — {q.skillName}
                                              </span>
                                            </div>
                                          </div>
                                          <Badge
                                            variant={q.isCorrect ? 'success' : 'destructive'}
                                            className="text-[11px] font-bold shrink-0 gap-1 px-2.5 py-0.5"
                                          >
                                            {q.isCorrect ? (
                                              <>
                                                <Check className="h-3 w-3" /> Correct
                                              </>
                                            ) : (
                                              <>
                                                <X className="h-3 w-3" /> Incorrect
                                              </>
                                            )}
                                          </Badge>
                                        </div>

                                        {/* Question Body */}
                                        <div className="p-4 space-y-3">
                                          {/* Prompt */}
                                          <div className="p-3 rounded-lg bg-muted/20 border border-border">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                              Question Prompt
                                            </p>
                                            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                                              {q.prompt}
                                            </p>
                                          </div>

                                          {/* Answers */}
                                          {q.isCorrect ? (
                                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-success/10 border border-success/30">
                                              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                              <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold text-success uppercase tracking-wider">
                                                  Learner's Correct Response
                                                </p>
                                                <p className="text-xs sm:text-sm font-semibold text-foreground">
                                                  {q.userAnswer}
                                                </p>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                                                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                                                    Submitted Answer
                                                  </p>
                                                  <p className="text-xs sm:text-sm font-semibold text-foreground line-through opacity-75">
                                                    {q.userAnswer}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-success/10 border border-success/30">
                                                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                                <div className="space-y-0.5">
                                                  <p className="text-[10px] font-bold text-success uppercase tracking-wider">
                                                    Target Correct Answer
                                                  </p>
                                                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                                                    {q.correctAnswer}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="p-10 text-center border border-border rounded-2xl bg-card text-muted-foreground space-y-3">
                      <History className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
                      <p className="font-bold text-base text-foreground">No assessment attempts recorded</p>
                      <p className="text-sm">
                        This learner has not submitted any baseline diagnostic or module milestone assessments yet.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Sleek Docked Footer */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-card shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 self-start sm:self-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span>Calibrated via Competency Benchmark Engine</span>
                  <span className="text-border">•</span>
                  <span>Employee ID: <strong>{selectedLearner.id.toUpperCase()}</strong></span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button variant="outline" size="sm" onClick={() => setSelectedLearner(null)}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: 'Progress Report Downloaded',
                        description: `Exported career progress dossier for ${selectedLearner.name}.`,
                        variant: 'success',
                      })
                      setSelectedLearner(null)
                    }}
                    leftIcon={<Award className="h-3.5 w-3.5" />}
                  >
                    Export Learner Dossier
                  </Button>
                </div>
              </div>
            </Dialog>
          )
        })()}
      </div>
    </WorkspaceLayout>
  )
}
