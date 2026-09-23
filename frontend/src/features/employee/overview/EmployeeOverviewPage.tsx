import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
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
import { Button } from '../../../shared/components/ui/Button'
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
import { CompetencyRadarChart } from '../../learner/components/CompetencyRadarChart'
import {
  COMPETENCY_SKILL_PROFILES,
  type CompetencySkillProfile,
  type EvidenceSource,
  LEARNER_PROFILE_STATS,
} from '../../learner/data/learnerOverviewData'
import '../../learner/overview/LearnerOverviewPage.css'

export function EmployeeOverviewPage() {
  const { profile, isLearningLocked } = useEmployeeLearningState()
  const [selectedRole, setSelectedRole] = React.useState('ai-knowledge-architect')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [expandedSkills, setExpandedSkills] = React.useState<Record<string, boolean>>({
    'c-1': true,
  })

  const toggleSkillExpand = (skillId: string) => {
    setExpandedSkills((prev) => ({
      ...prev,
      [skillId]: !prev[skillId],
    }))
  }

  // Filter skills based on search and category
  const filteredSkills = COMPETENCY_SKILL_PROFILES.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Categories list
  const categories = [
    'all',
    'Graph Architecture',
    'AI & Knowledge Tracing',
    'Distributed Systems',
    'Data Persistence',
    'Semantic Web',
  ]

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
        {/* =========================================================================
            CLEAN, SNUG TOP BAR (REMOVED BLOATED MARKETING HEADERS & DESCRIPTIONS)
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border px-4 py-3 rounded-xl shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <TargetRoleSelector />
            <span className="text-xs text-muted-foreground hidden md:inline">
              Supervisor: {profile.assignedByManager || 'David Miller (Line Manager)'} &bull; Target: {profile.targetReadinessScore}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLearningLocked ? (
              <Link to="/employee/assessment?diagnostic=true">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Take Diagnostic Assessment
                </Button>
              </Link>
            ) : (
              <Link to="/employee/pathway">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Continue Pathway
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* =========================================================================
            AGGREGATED SUMMARY KPIS
           ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Aggregate Competency Statistics
            </h2>
            <span className="text-xs text-muted-foreground">
              Last Assessed: <strong className="text-foreground">{LEARNER_PROFILE_STATS.lastAssessedDate}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Skill Mastery */}
            <StatCard
              variant="gradient"
              icon={<Award className="h-4 w-4" />}
              title="Overall Skill Mastery"
              value={`${LEARNER_PROFILE_STATS.overallMasteryPercentage}%`}
              valueClassName="text-primary"
              description={`${LEARNER_PROFILE_STATS.masteredSkillsCount} of ${LEARNER_PROFILE_STATS.totalSkillsEvaluated} micro-skills mastered`}
            >
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Target Benchmark</span>
                  <span className="font-bold text-foreground">{profile.targetReadinessScore}% Minimum</span>
                </div>
                <Progress value={LEARNER_PROFILE_STATS.overallMasteryPercentage} variant="primary" className="h-2" />
              </div>
            </StatCard>

            {/* KPI 2: Target Readiness Score */}
            <StatCard
              variant="default"
              icon={<Target className="h-4 w-4 text-primary" />}
              title="Target Readiness"
              value={`${LEARNER_PROFILE_STATS.overallMasteryPercentage}%`}
              valueClassName="text-foreground"
              description={`Readiness for ${profile.targetRole || 'AI Knowledge Architect'}`}
            >
              <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Confidence Metric</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {LEARNER_PROFILE_STATS.bktConfidencePercentage}% BKT
                </Badge>
              </div>
            </StatCard>

            {/* KPI 3: Pathway Progression */}
            <StatCard
              variant="default"
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
              title="Pathway Progression"
              value={`${LEARNER_PROFILE_STATS.completedModulesCount} / ${LEARNER_PROFILE_STATS.totalPathwayModules} Modules`}
              description="Curriculum milestone advancement"
            >
              <div className="mt-3 flex items-center gap-1.5 text-xs text-success font-medium">
                <ShieldCheck size={14} />
                <span>{LEARNER_PROFILE_STATS.pathwayProgressPercentage}% Pathway Cleared</span>
              </div>
            </StatCard>

            {/* KPI 4: Adaptivity Efficiency */}
            <StatCard
              variant="default"
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              title="Adaptivity Hours Saved"
              value={`${LEARNER_PROFILE_STATS.hoursSavedViaAdaptivity} hrs`}
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
            MAIN SECTION: RADAR CHART + MULTI-CRITERIA SKILL DRILL-DOWN
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Radar Chart Card */}
          <div className="lg:col-span-5">
            <Card className="border border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold text-foreground">
                      Competency Radar
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    6 Domains
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Multivariate vector of verified proficiency vs target benchmark requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col items-center">
                <CompetencyRadarChart
                  selectedRoleKey={selectedRole}
                  onSelectRoleKey={setSelectedRole}
                />
                <div className="w-full pt-4 mt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary inline-block" />
                    <span className="text-muted-foreground">Current Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-muted-foreground/30 inline-block border border-dashed border-foreground/40" />
                    <span className="text-muted-foreground">Target Requirement</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Detailed Competency List with Expandable Evidence */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-border bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Micro-Skill Mastery & Evidence Ledger
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Explore granular skill ratings and inspect multi-source verification evidence.
                    </CardDescription>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-56">
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

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                          : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {cat === 'all' ? 'All Domains' : cat}
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
