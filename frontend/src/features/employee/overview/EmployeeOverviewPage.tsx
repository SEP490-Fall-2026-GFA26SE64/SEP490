import * as React from 'react'
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  GitPullRequest,
  GraduationCap,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { CompetencyRadarChart } from '../components/CompetencyRadarChart'
import {
  COMPETENCY_SKILL_PROFILES,
  type CompetencySkillProfile,
  type EvidenceSource,
} from '../data/employeeOverviewData'
import './EmployeeOverviewPage.css'

export function EmployeeOverviewPage() {
  const { profile } = useEmployeeLearningState()
  const [activeCompany, setActiveCompany] = React.useState(getActiveCompany)

  React.useEffect(() => {
    const handleSync = () => setActiveCompany(getActiveCompany())
    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('companies_updated', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('companies_updated', handleSync)
    }
  }, [])

  const [selectedRole, setSelectedRole] = React.useState('ai-knowledge-architect')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [expandedSkills, setExpandedSkills] = React.useState<Record<string, boolean>>({
    'c-1': true,
  })

  // Derive skills from active company microSkills
  const companySkills: CompetencySkillProfile[] = React.useMemo(() => {
    if (!activeCompany?.microSkills || activeCompany.microSkills.length === 0) {
      return []
    }
    return activeCompany.microSkills.map((ms, idx) => {
      const match = COMPETENCY_SKILL_PROFILES.find(
        (p) => p.name.toLowerCase() === ms.name.toLowerCase() || p.id === ms.id
      )
      if (match) return match
      const isMastered = ms.status === 'published'
      return {
        id: ms.id,
        name: ms.name,
        category: (ms.bloomLevel === 'Create' ? 'AI & Knowledge Tracing' : 'Graph Architecture') as any,
        estimatedMastery: isMastered ? 82 : 55,
        targetRoleRequirement: 85,
        status: isMastered ? 'mastered' : 'in_progress',
        bktConfidence: 89,
        evidenceCount: isMastered ? 2 : 1,
        evidenceSources: [
          {
            id: `ev-${ms.id}`,
            type: 'assessment',
            title: `${ms.name} Formative Diagnostic`,
            providerOrIssuer: 'Enterprise Cognitive Engine',
            date: '2026-09-20',
            scoreOrLevel: isMastered ? '85%' : '55%',
            verificationStatus: isMastered ? 'verified' : 'pending',
            notes: ms.observableOutcome,
          },
        ],
        recommendedModule: activeCompany.modules[idx % (activeCompany.modules.length || 1)]?.title || 'Core Foundation Module',
      }
    })
  }, [activeCompany])

  // Company-scoped statistics
  const profileStats = React.useMemo(() => {
    const totalSkills = activeCompany.microSkills.length
    const mastered = activeCompany.microSkills.filter((s) => s.status === 'published').length
    const inProgress = totalSkills - mastered
    const overallMastery = totalSkills > 0 ? Math.round((mastered / totalSkills) * 100) : 0
    const totalModules = activeCompany.modules.length
    const completedModules = Math.min(totalModules, Math.floor(totalModules * 0.5))
    const pathwayProgress = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0

    return {
      overallMasteryPercentage: overallMastery,
      totalSkillsEvaluated: totalSkills,
      masteredSkillsCount: mastered,
      inProgressSkillsCount: inProgress,
      criticalGapsCount: Math.max(0, totalSkills - mastered),
      pathwayProgressPercentage: pathwayProgress,
      completedModulesCount: completedModules,
      totalPathwayModules: totalModules,
      bktConfidencePercentage: totalSkills > 0 ? 91 : 0,
      hoursSavedViaAdaptivity: totalModules * 4.5,
      lastAssessedDate: '2026-09-20',
    }
  }, [activeCompany])

  // Duration, Start Date, End Date metadata for overview
  const startDate = profile.assignedAt ? profile.assignedAt.split(' ')[0] : '2026-06-15'
  const endDate = profile.deadline || '2026-12-31'
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const diffMonths = (diffDays / 30.4).toFixed(1)
  const durationText = `${diffMonths} Months (${diffDays} Days)`

  const toggleSkillExpand = (skillId: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [skillId]: !prev[skillId],
    }))
  }

  // Filter skills based on search and category
  const filteredSkills = companySkills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Categories list with counts
  const categories = React.useMemo(() => {
    const set = new Set<string>()
    companySkills.forEach((s) => set.add(s.category))
    const arr = [{ key: 'all', label: 'All Domains', count: companySkills.length }]
    set.forEach((cat) => {
      arr.push({
        key: cat,
        label: cat,
        count: companySkills.filter((s) => s.category === cat).length,
      })
    })
    return arr
  }, [companySkills])

  const getEvidenceIcon = (type: EvidenceSource['type']) => {
    switch (type) {
      case 'assessment':
        return <FileText size={15} className="text-primary" />
      case 'endorsement':
        return <UserCheck size={15} className="text-success" />
      case 'work_proof':
        return <GitPullRequest size={15} className="text-primary" />
      case 'course':
        return <GraduationCap size={15} className="text-secondary-foreground" />
      default:
        return <ShieldCheck size={15} className="text-muted-foreground" />
    }
  }

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
        {/* Top of the screen matching Assessment Quiz style: Target Role on left, Timeline on right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <TargetRoleSelector />

          {/* Timeline & Duration Metadata */}
          <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border px-3.5 py-1.5 rounded-xl shadow-2xs text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={13} className="text-primary" />
              <span>Start: <strong className="text-foreground font-mono">{startDate}</strong></span>
            </div>
            <span className="text-border hidden sm:inline">&bull;</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={13} className="text-primary" />
              <span>End: <strong className="text-foreground font-mono">{endDate}</strong></span>
            </div>
            <span className="text-border hidden sm:inline">&bull;</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock size={13} className="text-primary" />
              <span>Duration: <Badge variant="secondary" className="font-mono text-xs font-bold text-primary">{durationText}</Badge></span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            AGGREGATED SUMMARY KPIS
           ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" /> Aggregate Competency Statistics
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Last Assessed: <strong className="text-foreground">{profileStats.lastAssessedDate}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Skill Mastery */}
            <StatCard
              variant="gradient"
              icon={<Award className="h-4 w-4" />}
              title="Overall Skill Mastery"
              value={`${profileStats.overallMasteryPercentage}%`}
              valueClassName="text-primary font-bold"
              description={`${profileStats.masteredSkillsCount} of ${profileStats.totalSkillsEvaluated} micro-skills mastered`}
            >
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Target Benchmark</span>
                  <span className="font-bold text-foreground">{profile.targetReadinessScore}% Minimum</span>
                </div>
                <Progress value={profileStats.overallMasteryPercentage} variant="primary" className="h-2" />
              </div>
            </StatCard>

            {/* KPI 2: Target Readiness Score */}
            <StatCard
              variant="default"
              icon={<Target className="h-4 w-4 text-primary" />}
              title="Target Readiness"
              value={`${profileStats.overallMasteryPercentage}%`}
              valueClassName="text-foreground font-bold"
              description={`Readiness for ${profile.targetRole || 'AI Knowledge Architect'}`}
            >
              <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Confidence Metric</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {profileStats.bktConfidencePercentage}% BKT
                </Badge>
              </div>
            </StatCard>

            {/* KPI 3: Pathway Progression */}
            <StatCard
              variant="default"
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
              title="Pathway Progression"
              value={`${profileStats.completedModulesCount} / ${profileStats.totalPathwayModules} Modules`}
              valueClassName="text-foreground font-bold"
              description="Curriculum milestone advancement"
            >
              <div className="mt-3 flex items-center gap-1.5 text-xs text-success font-medium">
                <ShieldCheck size={14} />
                <span>{profileStats.pathwayProgressPercentage}% Pathway Cleared</span>
              </div>
            </StatCard>

            {/* KPI 4: Adaptivity Efficiency */}
            <StatCard
              variant="default"
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              title="Adaptivity Hours Saved"
              value={`${profileStats.hoursSavedViaAdaptivity} hrs`}
              valueClassName="text-foreground font-bold"
              description="Reduced learning time through knowledge tracing"
            >
              <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <Clock size={13} />
                <span>Next assessment gate ready</span>
              </div>
            </StatCard>
          </div>
        </div>

        {/* =========================================================================
            MAIN SECTION: RADAR CHART (LEFT) + SKILL DRILL-DOWN (RIGHT)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Generous Radar Chart Card */}
          <div className="lg:col-span-6 xl:col-span-5">
            <Card className="border border-border bg-card shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold text-foreground">
                      Competency Radar
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    6 Key Domains
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Multivariate vector of verified proficiency vs target role benchmark requirements.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 flex flex-col items-center">
                <CompetencyRadarChart
                  selectedRoleKey={selectedRole}
                  onSelectRoleKey={setSelectedRole}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Detailed Competency List with Expandable Evidence */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            <Card className="border border-border bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Micro-Skill Mastery &amp; Evidence Ledger
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Explore granular skill ratings and inspect multi-source verification evidence.
                    </CardDescription>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-52">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Category Pills with Count badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-3">
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
                    No competency profiles match the query &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredSkills.map((skill) => {
                    const isExpanded = !!expandedSkills[skill.id]

                    return (
                      <div key={skill.id} className="transition-colors hover:bg-muted/20">
                        {/* Skill Row Header */}
                        <div
                          onClick={() => toggleSkillExpand(skill.id)}
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{skill.name}</span>
                              {getStatusBadge(skill.status)}
                              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                                {skill.category}
                              </Badge>
                            </div>

                            {/* Progress bar + percentages */}
                            <div className="mt-2.5 flex items-center gap-3">
                              <Progress
                                value={skill.estimatedMastery}
                                variant={
                                  skill.status === 'mastered'
                                    ? 'success'
                                    : skill.status === 'critical_gap'
                                    ? 'destructive'
                                    : 'warning'
                                }
                                className="h-1.5 flex-1"
                              />
                              <span className="text-xs font-mono font-bold text-foreground shrink-0">
                                {skill.estimatedMastery}% / {skill.targetRoleRequirement}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground hidden sm:inline font-mono">
                              {skill.evidenceCount} proofs
                            </span>
                            <div className="p-1 rounded text-muted-foreground hover:text-foreground">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Evidence Ledger */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/40">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Sparkles size={12} className="text-primary" /> Verified Evidence Sources
                            </h4>
                            <div className="space-y-2">
                              {skill.evidenceSources.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="p-2.5 rounded-lg border border-border/80 bg-card/80 flex items-start justify-between gap-3 text-xs"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div className="mt-0.5 shrink-0">{getEvidenceIcon(ev.type)}</div>
                                    <div>
                                      <div className="font-semibold text-foreground">{ev.title}</div>
                                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                        <span>Issued by: {ev.providerOrIssuer}</span>
                                        <span>&bull;</span>
                                        <span>{ev.date}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <Badge
                                      variant={ev.verificationStatus === 'verified' ? 'success' : 'secondary'}
                                      className="font-mono text-[10px]"
                                    >
                                      {ev.verificationStatus}
                                    </Badge>
                                    {ev.scoreOrLevel && (
                                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                        {ev.scoreOrLevel}
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
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

// Backwards compatibility alias
export const LearnerOverviewPage = EmployeeOverviewPage
