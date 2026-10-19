import { CheckCircle2, ChevronRight, Lock, Sparkles, Zap } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { useToast } from '../../../shared/hooks/useToast'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { getActiveCompany } from '../../../shared/stores/companyStore'

export interface PathwayStep {
  id: string
  title: string
  code: string
  status: 'completed' | 'recommended' | 'remedy' | 'locked'
  estimatedHours: number
  skillsTaught: string[]
  prerequisite?: string
  score?: number
}

const INITIAL_PATHWAY: PathwayStep[] = [
  {
    id: 'step-1',
    code: 'MOD-101',
    title: 'Foundations of Knowledge Graphs & RDF Triples',
    status: 'completed',
    estimatedHours: 4,
    skillsTaught: ['RDF Data Model', 'SPARQL Query Basics'],
    score: 92,
  },
  {
    id: 'step-2',
    code: 'MOD-204',
    title: 'Property Graph Architecture with Neo4j & Cypher',
    status: 'completed',
    estimatedHours: 6,
    skillsTaught: ['Neo4j Cypher', 'Graph Schema Constraints'],
    score: 88,
  },
  {
    id: 'step-3',
    code: 'MOD-301',
    title: 'Graph Neural Networks & Node Embeddings (Fast-Track)',
    status: 'recommended',
    estimatedHours: 8,
    skillsTaught: ['Node2Vec', 'PyTorch Geometric', 'GCN Layers'],
    prerequisite: 'MOD-204',
  },
  {
    id: 'step-4',
    code: 'MOD-305',
    title: 'Adaptive Knowledge Tracing Engine Implementation',
    status: 'locked',
    estimatedHours: 10,
    skillsTaught: ['DKT Models', 'Hidden Markov Models for Skills'],
    prerequisite: 'MOD-301',
  },
  {
    id: 'step-5',
    code: 'MOD-401',
    title: 'Enterprise Competency Intelligence Platform Capstone',
    status: 'locked',
    estimatedHours: 12,
    skillsTaught: ['End-to-end Graph Recommendation Pipeline'],
    prerequisite: 'MOD-305',
  },
]

export function AdaptivePathwayTimeline() {
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

  const defaultSteps: PathwayStep[] = React.useMemo(() => {
    if (activeCompany.id === 'comp-technova') {
      return INITIAL_PATHWAY
    }
    if (!activeCompany?.modules || activeCompany.modules.length === 0) {
      return []
    }
    return activeCompany.modules.map((m, idx) => ({
      id: `step-${m.id}`,
      code: m.code,
      title: m.title,
      status: idx === 0 ? ('completed' as const) : idx === 1 ? ('recommended' as const) : ('locked' as const),
      estimatedHours: Math.round((m.durationMinutes || 60) / 60) || 4,
      skillsTaught: [m.title],
      prerequisite: idx > 0 ? activeCompany.modules[idx - 1].code : undefined,
      score: idx === 0 ? 88 : undefined,
    }))
  }, [activeCompany])

  const [steps, setSteps] = React.useState<PathwayStep[]>(defaultSteps)
  React.useEffect(() => {
    setSteps(defaultSteps)
  }, [defaultSteps])

  const [hasTriggeredRemedy, setHasTriggeredRemedy] = React.useState(false)
  const { toast } = useToast()

  // Simulate Knowledge Tracing injecting a prerequisite remedy module dynamically
  const handleSimulateRemedyFallback = () => {
    if (hasTriggeredRemedy) {
      setSteps(defaultSteps)
      setHasTriggeredRemedy(false)
      toast({
        title: 'Pathway Reset',
        description: 'Returned to standard accelerated fast-track pathway.',
        variant: 'info',
      })
      return
    }

    const remedyStep: PathwayStep = {
      id: 'step-remedy-1',
      code: 'REM-102',
      title: 'Remedy: Foundation Diagnostic Review',
      status: 'remedy',
      estimatedHours: 3,
      skillsTaught: ['Target Concept Reinforcement'],
      prerequisite: 'Triggered by formative assessment check',
    }

    const updated = [
      steps[0],
      remedyStep,
      ...steps.slice(1).map((s) => ({ ...s, status: 'locked' as const })),
    ].filter(Boolean)

    setSteps(updated)
    setHasTriggeredRemedy(true)

    toast({
      title: 'Dynamic Pathway Adapted!',
      description: 'Knowledge Tracing detected a prerequisite gap in Linear Algebra. Remedy module REM-102 inserted into your route.',
      variant: 'warning',
    })
  }

  const { profile } = useEmployeeLearningState()
  const isSkillMode = profile.selectedViewType === 'skill'

  const skillSteps: PathwayStep[] = React.useMemo(() => {
    const currentSkillName = profile.targetSkill || 'Neo4j Cypher Traversal'
    return [
      {
        id: 'step-skill-cypher',
        code: 'MOD-CYP-101',
        title: 'Accelerated Cypher Querying & Pattern Traversal',
        status: 'recommended',
        estimatedHours: 1,
        skillsTaught: [currentSkillName],
        score: 85,
      },
    ]
  }, [profile.targetSkill])

  const effectiveSteps = isSkillMode ? skillSteps : steps

  if (effectiveSteps.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
        <Sparkles size={32} className="mx-auto text-muted-foreground/60 mb-2" />
        <h3 className="text-sm font-bold text-foreground">No Learning Modules in Pathway</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No learning modules have been configured or published for {activeCompany.name} yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Unified Big Container Design Matching Upcoming Pathway Quizzes */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Elevated Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                {isSkillMode
                  ? `Skill Pathway: ${profile.targetSkill || 'Neo4j Cypher Traversal'}`
                  : 'AI-Driven Adaptive Learning Pathway'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSkillMode
                ? 'Modular adaptive progression designed to achieve verified single-skill mastery'
                : 'Dynamic graph-traversal route continually recalculated based on real-time assessment performance'}
            </p>
          </div>

          {!isSkillMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateRemedyFallback}
              leftIcon={<Zap className="h-4 w-4 text-warning" />}
              className="self-start md:self-auto shadow-2xs font-semibold"
            >
              {hasTriggeredRemedy ? 'Reset Standard Route' : 'Simulate Prerequisite Gap Fallback'}
            </Button>
          )}
        </div>

        {/* Big Container Body: Continuous Adaptive Timeline Track */}
        <div className="p-5 sm:p-7 relative">
          <div className="relative">
            {/* Continuous Vertical Timeline Line Matching Upcoming Pathway Quizzes */}
            <div className="absolute left-[19px] sm:left-[21px] top-6 bottom-8 w-0.5 bg-border -translate-x-1/2 z-0" />

            <div className="space-y-6">
              {effectiveSteps.map((step) => {
                const isRecommended = step.status === 'recommended'
                const isRemedy = step.status === 'remedy'
                const isCompleted = step.status === 'completed'
                const isLocked = step.status === 'locked'

                return (
                  <div key={step.id} className="relative flex items-start gap-3.5 sm:gap-5 group">
                    {/* Timeline Node Bullet Pin Matching Upcoming Pathway Quizzes */}
                    <div
                      className={`relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                        isCompleted
                          ? 'border-success bg-success text-white shadow-2xs'
                          : isRecommended
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/20 animate-pulse'
                            : isRemedy
                              ? 'border-warning bg-warning text-white shadow-xs ring-4 ring-warning/20 animate-pulse'
                              : 'border-border bg-muted text-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : isRecommended ? (
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : isRemedy ? (
                        <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <Lock className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Timeline Step Content Surface Panel */}
                    <div
                      className={`flex-1 min-w-0 rounded-xl p-4 sm:p-5 border transition-all ${
                        isRecommended
                          ? 'border-primary/50 bg-secondary/35 shadow-xs ring-1 ring-primary/25 cursor-pointer hover:border-primary'
                          : isRemedy
                            ? 'border-warning/60 bg-amber-50/40 shadow-xs ring-1 ring-warning/30'
                            : isCompleted
                              ? 'border-border bg-card shadow-2xs hover:border-success/50'
                              : 'border-border bg-muted/20'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-bold shrink-0 ${
                              isLocked
                                ? 'text-muted-foreground bg-muted/60 border-border'
                                : isRecommended
                                  ? 'text-primary bg-secondary/60 border-primary/30'
                                  : isRemedy
                                    ? 'text-warning bg-amber-50 border-warning/40'
                                    : 'text-success bg-success/10 border-success/30'
                            }`}
                          >
                            {step.code}
                          </Badge>

                          {isCompleted && (
                            <Badge variant="success" className="gap-1 text-xs font-semibold shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed ({step.score}%)
                            </Badge>
                          )}

                          {isRecommended && (
                            <Badge variant="primary" className="gap-1 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0">
                              <Sparkles className="h-3 w-3" />
                              Next Best Action
                            </Badge>
                          )}

                          {isRemedy && (
                            <Badge variant="warning" className="gap-1 text-xs font-semibold bg-warning text-white shadow-xs shrink-0">
                              <Zap className="h-3 w-3" />
                              Remedy Fallback
                            </Badge>
                          )}

                          {isLocked && (
                            <Badge variant="outline" className="gap-1.5 text-xs font-semibold bg-muted text-foreground border-border shrink-0">
                              <Lock className="h-3 w-3 text-foreground" />
                              Locked Gate
                            </Badge>
                          )}

                          <span className="text-xs font-medium text-foreground truncate min-w-0">
                            {step.title}
                          </span>
                        </div>

                        <span className="text-xs text-muted-foreground font-semibold shrink-0 md:ml-auto">
                          {step.estimatedHours} hrs study
                        </span>
                      </div>

                      {/* Skills Tested Badges & Action CTA */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[11px] font-bold mr-1 text-muted-foreground">
                            Skills:
                          </span>
                          {step.skillsTaught.map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-[11px] px-2 py-0.5 font-semibold bg-muted/40 text-foreground border-border"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        {!isLocked && (
                          <Link to="/employee/modules/mod-cypher-mastery">
                            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                              <span>Open Module Lessons</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
