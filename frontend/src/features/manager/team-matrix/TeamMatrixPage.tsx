import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  DollarSign,
  Eye,
  FileQuestion,
  FileText,
  History,
  Layers,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
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
import { InteractiveRoleRoadmap } from '../../employee/components/InteractiveRoleRoadmap'
import { getOverviewSkills, type CompetencySkillProfile } from '../../employee/data/employeeOverviewData'
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

  // Learner Modal Micro-Skill Proficiency State
  const [learnerSkillSearch, setLearnerSkillSearch] = React.useState('')
  const [learnerSkillCategory, setLearnerSkillCategory] = React.useState('all')
  const [expandedLearnerSkills, setExpandedLearnerSkills] = React.useState<Record<string, boolean>>({})
  const [learnerSkillPage, setLearnerSkillPage] = React.useState(1)

  // Learner Modal Assessment History State
  const [learnerHistorySearch, setLearnerHistorySearch] = React.useState('')
  const [learnerHistoryFilter, setLearnerHistoryFilter] = React.useState<'all' | 'passed' | 'failed'>('all')
  const [learnerHistorySort, setLearnerHistorySort] = React.useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')

  // Reset modal state when selecting learner
  React.useEffect(() => {
    if (selectedLearner) {
      setLearnerSkillSearch('')
      setLearnerSkillCategory('all')
      setLearnerSkillPage(1)
      setExpandedLearnerSkills({})
      setLearnerHistorySearch('')
      setLearnerHistoryFilter('all')
      setLearnerHistorySort('newest')
      setReviewAttemptId(null)
    }
  }, [selectedLearner])

  // Reset pagination on search/category change
  React.useEffect(() => {
    setLearnerSkillPage(1)
  }, [learnerSkillSearch, learnerSkillCategory])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  // Scope team members strictly to the active company's employees
  const companyEmployees = (activeCompany.users || []).filter((u) => u.role === 'Employee')

  const companyMembers: TeamMemberGap[] = companyEmployees.map((emp, idx) => {
    const telemetryKey = LEARNER_TELEMETRY[emp.id] ? emp.id : (idx === 0 ? 'emp-1' : idx === 1 ? 'emp-2' : idx === 2 ? 'emp-3' : 'emp-4')
    const tel = LEARNER_TELEMETRY[telemetryKey]
    const readiness = tel?.pathwayProgress || (70 + ((idx * 13) % 25))
    const hours = tel ? 24.5 + idx * 8 : 14.0 + idx * 6
    const status: TeamMemberGap['status'] = readiness >= 85 ? 'ready' : readiness >= 50 ? 'on_track' : 'needs_attention'
    const primaryRole = emp.targetRole || activeCompany.targetRoles[0]?.title || 'Target Role Pending'
    const defaultGap = activeCompany.microSkills[idx % Math.max(1, activeCompany.microSkills.length)]?.name || 'Baseline Diagnostic Calibration'
    const inProgStep = tel?.adaptivePathway?.find((s) => s.status === 'in_progress')
    const currentModule = inProgStep
      ? inProgStep.title
      : tel?.adaptivePathway?.[0]?.title || defaultGap

    return {
      id: emp.id,
      name: emp.name,
      currentRole: emp.department || 'Employee',
      targetRole: primaryRole,
      readinessScore: readiness,
      criticalGap: defaultGap,
      currentModule,
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
      member.currentModule.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                    <option value="needs_attention">Behind Pace ({companyMembers.filter((m) => m.status === 'needs_attention').length})</option>
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
                    <th className="py-2.5 px-3">CURRENT MODULE</th>
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
                        <td className="py-3 px-3 text-foreground font-medium text-xs">
                          {member.currentRole}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-medium text-foreground">
                            {member.targetRole}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-xs font-mono font-bold">
                              <span className="text-foreground">
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
                          <span className="text-xs font-medium text-foreground">
                            {member.currentModule}
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
                                : 'Behind Pace'}
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
          const initials = selectedLearner.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)

          // Derive micro-skills for this learner's target role using getOverviewSkills
          const learnerSkills = getOverviewSkills(false, selectedLearner.targetRole)
          const categorySet = new Set<string>()
          learnerSkills.forEach((s) => categorySet.add(s.category))
          const skillCategories = [{ key: 'all', label: 'All Domains', count: learnerSkills.length }]
          categorySet.forEach((cat) => {
            skillCategories.push({
              key: cat,
              label: cat,
              count: learnerSkills.filter((s) => s.category === cat).length,
            })
          })

          const filteredLearnerSkills = learnerSkills.filter((skill) => {
            const q = learnerSkillSearch.toLowerCase().trim()
            const matchesSearch =
              !q ||
              skill.name.toLowerCase().includes(q) ||
              (skill.skillCode && skill.skillCode.toLowerCase().includes(q)) ||
              skill.category.toLowerCase().includes(q)
            const matchesCategory =
              learnerSkillCategory === 'all' || skill.category === learnerSkillCategory
            return matchesSearch && matchesCategory
          })

          const SKILL_PAGE_SIZE = 5
          const totalSkillPages = Math.max(1, Math.ceil(filteredLearnerSkills.length / SKILL_PAGE_SIZE))
          const paginatedLearnerSkills = filteredLearnerSkills.slice(
            (learnerSkillPage - 1) * SKILL_PAGE_SIZE,
            learnerSkillPage * SKILL_PAGE_SIZE
          )

          const getSkillStatusBadge = (status: CompetencySkillProfile['status']) => {
            switch (status) {
              case 'mastered':
                return <Badge variant="success">Mastered</Badge>
              case 'in_progress':
                return <Badge variant="warning">In Progress</Badge>
              case 'critical_gap':
                return <Badge variant="destructive">Critical Gap</Badge>
            }
          }

          // Attempts and Assessment History derivations
          const rawLearnerAttempts =
            telemetry?.attempts && telemetry.attempts.length > 0
              ? telemetry.attempts
              : telemetry?.assessmentQuiz
                ? [telemetry.assessmentQuiz]
                : LEARNER_TELEMETRY['emp-1']?.attempts || []

          const highestScore = rawLearnerAttempts.length > 0 ? Math.max(...rawLearnerAttempts.map((a) => a.score)) : 0
          const avgScore =
            rawLearnerAttempts.length > 0
              ? Math.round(rawLearnerAttempts.reduce((sum, a) => sum + a.score, 0) / rawLearnerAttempts.length)
              : 0

          const filteredLearnerAttempts = rawLearnerAttempts
            .filter((a) => {
              if (learnerHistorySearch.trim()) {
                const q = learnerHistorySearch.toLowerCase().trim()
                const matchesCode = a.blueprintCode.toLowerCase().includes(q)
                const matchesTitle = a.blueprintTitle.toLowerCase().includes(q)
                const matchesDate = a.completedDate.toLowerCase().includes(q)
                if (!matchesCode && !matchesTitle && !matchesDate) return false
              }
              const isPassed = a.score >= (a.passThreshold || 80)
              if (learnerHistoryFilter === 'passed' && !isPassed) return false
              if (learnerHistoryFilter === 'failed' && isPassed) return false
              return true
            })
            .sort((a, b) => {
              if (learnerHistorySort === 'highest') return b.score - a.score
              if (learnerHistorySort === 'lowest') return a.score - b.score
              return 0
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
                            : 'Behind Pace'}
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
                    <span className="font-mono text-base font-semibold text-muted-foreground">
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
                className="w-full flex flex-col flex-1 min-h-0 bg-card"
              >
                {/* Modern Segmented Navigation Tabs */}
                <div className="px-5 sm:px-6 pt-3 pb-2.5 bg-card border-b border-border/70 shrink-0">
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
                    </TabsTrigger>
                    <TabsTrigger
                      value="quiz"
                      className="text-xs font-semibold py-2 flex items-center justify-center gap-1.5 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs transition-all"
                    >
                      <History className="h-3.5 w-3.5 text-primary" />
                      <span>Assessment History</span>
                      {rawLearnerAttempts.length > 0 && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                          {rawLearnerAttempts.length}
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
                      <div className="p-3.5 rounded-xl border border-border/80 bg-card shadow-2xs space-y-1">
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
                        <div className="text-right flex items-baseline gap-1 font-mono text-xs text-muted-foreground font-semibold">
                          <span>{selectedLearner.readinessScore}%</span>
                          <span>/</span>
                          <span>85% Benchmark</span>
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
                      </div>
                    </div>
                  </div>

                  {/* Micro-Skill Proficiency Section (Replacing old stat cards and blocker/ledger) */}
                  <Card className="border border-border bg-card shadow-xs">
                    <CardHeader className="pb-4 border-b border-border/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            <span>Micro-Skill Proficiency</span>
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Track micro-skill mastery levels and inspect the direct teaching module in {selectedLearner.name}&apos;s adaptive learning pathway.
                          </CardDescription>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search micro-skills or categories..."
                            value={learnerSkillSearch}
                            onChange={(e) => setLearnerSkillSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>

                      {/* Category Pills with Count badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {skillCategories.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setLearnerSkillCategory(cat.key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                              learnerSkillCategory === cat.key
                                ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <span>{cat.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                learnerSkillCategory === cat.key
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
                      {filteredLearnerSkills.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs">
                          No competency profiles match the active query or category filter.
                        </div>
                      ) : (
                        paginatedLearnerSkills.map((skill) => {
                          const isExpanded = !!expandedLearnerSkills[skill.id]
                          const moduleInfo =
                            skill.teachingModule ||
                            (skill.recommendedModule
                              ? {
                                  id: 'mod-ref',
                                  moduleCode: skill.recommendedModule.split(':')[0]?.trim() || 'MOD-REF',
                                  title: skill.recommendedModule.includes(':')
                                    ? skill.recommendedModule.split(':')[1]?.trim()
                                    : skill.recommendedModule,
                                  description: 'Curriculum module aligned to this micro-skill in adaptive learning pathway.',
                                  status: (skill.status === 'mastered' ? 'completed' : 'in_progress') as
                                    | 'completed'
                                    | 'in_progress',
                                  order: 1,
                                  estimatedDurationMinutes: 180,
                                }
                              : null)

                          return (
                            <div key={skill.id} className="transition-colors hover:bg-muted/20">
                              {/* Skill Row Header */}
                              <div
                                onClick={() =>
                                  setExpandedLearnerSkills((prev) => ({
                                    ...prev,
                                    [skill.id]: !prev[skill.id],
                                  }))
                                }
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
                                    {getSkillStatusBadge(skill.status)}
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                                      {skill.category}
                                    </Badge>
                                  </div>

                                  {/* Progress bar + percentages */}
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
                                      <span className="text-muted-foreground font-semibold">
                                        {skill.targetRoleRequirement}%
                                      </span>
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
                                              <span>Curriculum Module {moduleInfo.order || 1} of 5 in Pathway</span>
                                              <span>&bull;</span>
                                              <span className="flex items-center gap-1">
                                                <Clock size={11} /> {moduleInfo.estimatedDurationMinutes || 180} mins
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <Badge
                                          variant={moduleInfo.status === 'completed' ? 'success' : 'primary'}
                                          className="text-xs"
                                        >
                                          {moduleInfo.status === 'completed' ? 'Completed' : 'Active Pathway'}
                                        </Badge>
                                      </div>

                                      <p className="text-xs text-muted-foreground leading-relaxed pl-1">
                                        {moduleInfo.description}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                      No direct instructional module linked for this micro-skill.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </CardContent>

                    {filteredLearnerSkills.length > SKILL_PAGE_SIZE && (
                      <div className="px-4 py-3 border-t border-border/80 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="text-muted-foreground text-xs font-medium order-2 sm:order-1">
                          Showing{' '}
                          <span className="font-semibold text-foreground">
                            {(learnerSkillPage - 1) * SKILL_PAGE_SIZE + 1}–
                            {Math.min(learnerSkillPage * SKILL_PAGE_SIZE, filteredLearnerSkills.length)}
                          </span>{' '}
                          of{' '}
                          <span className="font-semibold text-foreground">
                            {filteredLearnerSkills.length}
                          </span>{' '}
                          skills
                        </div>

                        <div className="flex items-center gap-1.5 order-1 sm:order-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={learnerSkillPage <= 1}
                            onClick={() => setLearnerSkillPage((p) => Math.max(1, p - 1))}
                            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                            Prev
                          </Button>

                          <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalSkillPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setLearnerSkillPage(page)}
                                className={`h-7 min-w-[28px] px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                  learnerSkillPage === page
                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={learnerSkillPage >= totalSkillPages}
                            onClick={() => setLearnerSkillPage((p) => Math.min(totalSkillPages, p + 1))}
                            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* TAB 2: ADAPTIVE PATHWAY (SHOWS INTERACTIVE PATHWAY FROM EMPLOYEE PAGE) */}
                <TabsContent
                  value="pathway"
                  className="space-y-4 animate-in fade-in-50 overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-4"
                >
                  <InteractiveRoleRoadmap targetRole={selectedLearner.targetRole} compact />
                </TabsContent>

                {/* TAB 3: ASSESSMENT HISTORY (MATCHES ASSESSMENT HISTORY TAB FROM EMPLOYEE PAGE) */}
                <TabsContent
                  value="quiz"
                  className="space-y-4 animate-in fade-in-50 overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-4"
                >
                  {/* Attempts Stats Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <StatCard
                      title="Total Submissions"
                      value={`${rawLearnerAttempts.length} Finished`}
                      description="Stored in learner portfolio"
                    />

                    <StatCard
                      title="Highest Score"
                      value={`${highestScore}%`}
                      valueClassName="text-success"
                      description="Demonstrated mastery tier"
                    />

                    <StatCard
                      title="Average Score"
                      value={`${avgScore}%`}
                      valueClassName="text-primary"
                      description="Across all dynamic tests"
                    />
                  </div>

                  {/* Search, Filter & Sort Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card rounded-xl border border-border shadow-xs">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search module or quiz title..."
                        value={learnerHistorySearch}
                        onChange={(e) => setLearnerHistorySearch(e.target.value)}
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors"
                      />
                      {learnerHistorySearch && (
                        <button
                          type="button"
                          onClick={() => setLearnerHistorySearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-lg px-2.5 py-1">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Status:</span>
                        <select
                          value={learnerHistoryFilter}
                          onChange={(e) => setLearnerHistoryFilter(e.target.value as 'all' | 'passed' | 'failed')}
                          className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                        >
                          <option value="all">All Statuses</option>
                          <option value="passed">Passed (≥ 80%)</option>
                          <option value="failed">Failed (&lt; 80%)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-lg px-2.5 py-1">
                        <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Sort:</span>
                        <select
                          value={learnerHistorySort}
                          onChange={(e) =>
                            setLearnerHistorySort(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')
                          }
                          className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="highest">Highest Score</option>
                          <option value="lowest">Lowest Score</option>
                        </select>
                      </div>

                      {(learnerHistorySearch || learnerHistoryFilter !== 'all') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLearnerHistorySearch('')
                            setLearnerHistoryFilter('all')
                          }}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* List of Finished Attempts */}
                  <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                            Historical Attempts Ledger
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Archived attempt results, submission timestamps, and question telemetry for {selectedLearner.name}.
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono bg-card px-2.5 py-1 rounded-lg border border-border shadow-2xs">
                        Showing {filteredLearnerAttempts.length} of {rawLearnerAttempts.length} attempts
                      </span>
                    </div>

                    <div className="divide-y divide-border">
                      {filteredLearnerAttempts.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <History className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                          <div className="text-sm font-semibold text-foreground">No matching attempts found</div>
                          <p className="text-xs text-muted-foreground">
                            Try adjusting your search keyword or status filter.
                          </p>
                        </div>
                      ) : (
                        filteredLearnerAttempts.map((attempt) => {
                          const isReviewing = reviewAttemptId === attempt.id
                          const correctCount = attempt.questions.filter((q) => q.isCorrect).length
                          const totalQuestions = attempt.questions.length
                          const isPassed = attempt.score >= (attempt.passThreshold || 80)
                          const accuracyPct = Math.round((correctCount / totalQuestions) * 100)

                          return (
                            <div key={attempt.id} className="transition-colors">
                              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                <div className="space-y-1.5 flex-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <Badge variant="outline" className="font-mono text-xs font-semibold text-primary">
                                      {attempt.blueprintCode}
                                    </Badge>
                                    <span className="font-bold text-sm text-foreground">
                                      {attempt.blueprintTitle}
                                    </span>
                                    <Badge variant={isPassed ? 'success' : 'destructive'}>
                                      {isPassed ? `Passed (${attempt.score}%)` : `Failed (${attempt.score}%)`}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                      <Clock className="h-3 w-3 text-primary" /> {attempt.timeSpent}
                                    </span>
                                  </div>

                                  <div className="text-xs text-muted-foreground flex items-center gap-2.5 flex-wrap">
                                    <span>
                                      Completed: <strong className="text-foreground">{attempt.completedDate}</strong>
                                    </span>
                                    <span>&bull;</span>
                                    <span>
                                      Results: <strong className="text-foreground">{correctCount}</strong> / {totalQuestions} correct (
                                      <span className={isPassed ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                        {totalQuestions - correctCount} incorrect
                                      </span>
                                      )
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                  <Button
                                    variant={isReviewing ? 'primary' : 'outline'}
                                    size="sm"
                                    leftIcon={
                                      <FileText
                                        className={`h-4 w-4 ${isReviewing ? 'text-primary-foreground' : 'text-primary'}`}
                                      />
                                    }
                                    onClick={() => setReviewAttemptId(isReviewing ? null : attempt.id)}
                                  >
                                    {isReviewing ? 'Hide Questions' : 'Review Questions'}
                                  </Button>
                                </div>
                              </div>

                              {/* Question by question review if toggled */}
                              {isReviewing && (
                                <div className="p-4 space-y-3.5 bg-muted/20 border-t border-border">
                                  <div className="flex items-center justify-between gap-2 pb-1">
                                    <div className="flex items-center gap-2">
                                      <FileQuestion className="h-4 w-4 text-primary shrink-0" />
                                      <span className="font-bold text-sm text-foreground">
                                        Question-by-Question Evaluation ({attempt.blueprintCode})
                                      </span>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-primary">
                                      Score: {accuracyPct}% ({correctCount}/{totalQuestions})
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {attempt.questions.map((q, idx) => (
                                      <div
                                        key={q.id}
                                        className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all hover:border-primary/40"
                                      >
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

                                        <div className="p-4 space-y-3 text-xs">
                                          <p className="font-medium text-foreground text-xs leading-relaxed">
                                            {q.prompt}
                                          </p>

                                          <div className="space-y-2 pt-1">
                                            <div
                                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                                q.isCorrect
                                                  ? 'border-success/40 bg-success/10 text-success'
                                                  : 'border-destructive/40 bg-destructive/10 text-destructive'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-[11px] uppercase tracking-wider">
                                                  Learner Response:
                                                </span>
                                                <span className="font-semibold">{q.userAnswer}</span>
                                              </div>
                                              {q.isCorrect ? (
                                                <Check className="h-4 w-4 shrink-0" />
                                              ) : (
                                                <X className="h-4 w-4 shrink-0" />
                                              )}
                                            </div>

                                            {!q.isCorrect && (
                                              <div className="p-2.5 rounded-lg border border-success/40 bg-success/10 text-success flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-[11px] uppercase tracking-wider">
                                                    Correct Benchmark:
                                                  </span>
                                                  <span className="font-semibold">{q.correctAnswer}</span>
                                                </div>
                                                <Check className="h-4 w-4 shrink-0" />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Sleek Docked Footer */}
              <div className="px-5 sm:px-6 py-3.5 border-t border-border bg-card shrink-0 flex items-center justify-end gap-2">
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
                >
                  Export Learner Dossier
                </Button>
              </div>
            </Dialog>
          )
        })()}
      </div>
    </WorkspaceLayout>
  )
}
