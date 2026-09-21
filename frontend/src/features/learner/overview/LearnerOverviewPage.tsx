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
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
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
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { CompetencyRadarChart } from '../components/CompetencyRadarChart'
import {
  COMPETENCY_SKILL_PROFILES,
  type CompetencySkillProfile,
  type EvidenceSource,
  LEARNER_PROFILE_STATS,
} from '../data/learnerOverviewData'
import './LearnerOverviewPage.css'

export function LearnerOverviewPage() {
  const [selectedRole, setSelectedRole] = React.useState('ai-knowledge-architect')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [expandedSkills, setExpandedSkills] = React.useState<Record<string, boolean>>({
    'c-1': true, // Open the first skill by default to show evidence immediately
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
      <div className="space-y-8 pb-16 learner-overview-container">
        {/* =========================================================================
            COCKPIT PAGE HEADER WITH QUICK ACTION LAUNCHERS
           ========================================================================= */}
        <PageHeader
          icon={<LayoutDashboard className="h-8 w-8 text-primary" />}
          title="Learner Overview"
          description="Continuous competency cockpit tracking verified skill mastery, Bayesian knowledge estimation, and dynamic pathway progression."
          actions={
            <Link to="/learner/pathway">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                Continue Pathway
              </Button>
            </Link>
          }
        />

        {/* =========================================================================
            USE CASE 1: GET PROFILE STATISTIC (AGGREGATED SUMMARY KPIS)
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
              description={`${LEARNER_PROFILE_STATS.masteredSkillsCount} of ${LEARNER_PROFILE_STATS.totalSkillsEvaluated} micro-skills mastered across domains`}
            >
              <Progress value={LEARNER_PROFILE_STATS.overallMasteryPercentage} variant="primary" />
            </StatCard>

            {/* KPI 2: Pathway Progress */}
            <StatCard
              variant="gradient"
              icon={<Compass className="h-4 w-4" />}
              title="Pathway Progress"
              value={`${LEARNER_PROFILE_STATS.pathwayProgressPercentage}%`}
              valueClassName="text-foreground"
              description={`${LEARNER_PROFILE_STATS.completedModulesCount} of ${LEARNER_PROFILE_STATS.totalPathwayModules} curriculum modules completed`}
            >
              <Progress value={LEARNER_PROFILE_STATS.pathwayProgressPercentage} variant="primary" />
            </StatCard>

            {/* KPI 3: Time Saved via Adaptive Graph */}
            <StatCard
              variant="gradient"
              icon={<Clock className="h-4 w-4" />}
              title="Adaptive Velocity"
              value={`${LEARNER_PROFILE_STATS.hoursSavedViaAdaptivity}h Saved`}
              valueClassName="text-success"
              description="Prior competencies fast-tracked without repeating content"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-success inline-block" />
                <span>3 modules skipped via diagnostic proof</span>
              </div>
            </StatCard>

            {/* KPI 4: Bayesian Knowledge Tracing Confidence */}
            <StatCard
              variant="gradient"
              icon={<TrendingUp className="h-4 w-4" />}
              title="BKT Confidence Index"
              value={`${LEARNER_PROFILE_STATS.bktConfidencePercentage}%`}
              valueClassName="text-foreground"
              description="Algorithmic certainty based on multi-source evidence"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{LEARNER_PROFILE_STATS.criticalGapsCount} critical gaps detected</span>
                <Link to="/learner/gap-analysis" className="text-primary font-medium hover:underline">
                  Analyze Gaps →
                </Link>
              </div>
            </StatCard>
          </div>
        </div>

        {/* =========================================================================
            USE CASE 2: VIEW COMPETENCY RADAR CHART
           ========================================================================= */}
        <Card className="border-border shadow-xs">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Competency Radar: Skill Mastery vs. Target Role Benchmarks</span>
                </CardTitle>
                <CardDescription>
                  Visualize multi-dimensional mastery coverage against organizational threshold standards.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/learner/gap-analysis">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight size={13} />}>
                    Bridge Modules
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <CompetencyRadarChart
              selectedRoleKey={selectedRole}
              onSelectRoleKey={setSelectedRole}
            />
          </CardContent>
        </Card>

        {/* =========================================================================
            USE CASE 3: VIEW COMPETENCY PROFILE & DETAILED EVIDENCE SOURCES
           ========================================================================= */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-border bg-muted/15 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    Verified Competency Profile & Evidence Sources
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed micro-skill evaluations verified by diagnostic quizzes, peer endorsements, and repository commits
                </p>
              </div>

              {/* Search bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search micro-skills or domains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {cat === 'all' ? 'All Domains' : cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            {filteredSkills.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Search size={32} className="mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">No micro-skills matched your search filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                  }}
                  className="text-xs text-primary underline font-medium cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSkills.map((skill) => {
                  const isExpanded = !!expandedSkills[skill.id]
                  const gap = Math.max(0, skill.targetRoleRequirement - skill.estimatedMastery)

                  return (
                    <div key={skill.id} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors space-y-3">
                      {/* Top Skill Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{skill.name}</span>
                            {getStatusBadge(skill.status)}
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                              {skill.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>BKT Certainty: <strong className="text-foreground">{skill.bktConfidence}%</strong></span>
                            <span>•</span>
                            <span>{skill.evidenceCount} Verified Evidence Sources</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4 sm:self-center">
                          <div className="text-right text-xs">
                            <span className="block text-muted-foreground">
                              Mastery: <strong className="text-primary text-sm">{skill.estimatedMastery}%</strong> / Req: <strong className="text-foreground">{skill.targetRoleRequirement}%</strong>
                            </span>
                            {gap > 0 ? (
                              <span className="text-[11px] font-semibold text-destructive">
                                Deficit: -{gap}%
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-success flex items-center gap-0.5 justify-end">
                                <CheckCircle2 size={12} /> Target Met
                              </span>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSkillExpand(skill.id)}
                            rightIcon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            className="text-xs"
                          >
                            {isExpanded ? 'Hide Proof' : 'Inspect Evidence'}
                          </Button>
                        </div>
                      </div>

                      {/* Visual mastery bar */}
                      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="absolute h-full bg-border rounded-full"
                          style={{ width: `${skill.targetRoleRequirement}%` }}
                        />
                        <div
                          className={`absolute h-full rounded-full transition-all duration-300 ${
                            skill.status === 'mastered'
                              ? 'bg-success'
                              : skill.status === 'in_progress'
                                ? 'bg-warning'
                                : 'bg-destructive'
                          }`}
                          style={{ width: `${skill.estimatedMastery}%` }}
                        />
                      </div>

                      {/* Expandable Multi-Source Evidence Audit Tray */}
                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-muted/20 border border-border space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-muted-foreground">
                              <ShieldCheck size={14} className="text-primary" /> Verified Evidence Trail ({skill.evidenceSources.length})
                            </span>
                            {skill.recommendedModule && (
                              <span className="text-xs text-muted-foreground">
                                Recommended Bridge: <code className="font-mono text-primary font-medium">{skill.recommendedModule}</code>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {skill.evidenceSources.map((ev) => (
                              <div
                                key={ev.id}
                                className="evidence-source-card p-3 rounded-lg border border-border bg-card space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    {getEvidenceIcon(ev.type)}
                                    <span className="capitalize">{ev.type.replace('_', ' ')}</span>
                                  </div>
                                  <Badge
                                    variant={ev.verificationStatus === 'verified' ? 'success' : 'secondary'}
                                    className="text-[10px] uppercase font-bold"
                                  >
                                    {ev.verificationStatus}
                                  </Badge>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-foreground leading-snug">{ev.title}</h4>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{ev.providerOrIssuer}</p>
                                </div>

                                <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>{ev.date}</span>
                                  {ev.scoreOrLevel && (
                                    <strong className="text-primary font-medium">{ev.scoreOrLevel}</strong>
                                  )}
                                </div>

                                {ev.notes && (
                                  <p className="text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/40 italic">
                                    "{ev.notes}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
