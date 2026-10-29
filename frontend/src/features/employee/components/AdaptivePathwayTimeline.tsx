import { CheckCircle2, ChevronRight, Lock, Sparkles, Zap } from 'lucide-react'
import * as React from 'react'
import type { PathwayView } from '../../../shared/api/initialPathway'
import { InitialPathwayDetails, type PathwayDetailSelection } from './InitialPathwayModules'
import { baselineTargetMet, pathwaySkill } from '../../../shared/api/initialPathwayMessages'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { useToast } from '../../../shared/hooks/useToast'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { normalizeRoleKey } from '../data/employeeOverviewData'

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

const BACKEND_PATHWAY: PathwayStep[] = [
  {
    id: 'step-be-1',
    code: 'MOD-108',
    title: 'Event-Driven Microservices & Kafka Stream Processing',
    status: 'completed',
    estimatedHours: 4,
    skillsTaught: ['Kafka Stream Processing', 'Outbox Relay Pattern'],
    score: 90,
  },
  {
    id: 'step-be-2',
    code: 'MOD-202',
    title: 'PostgreSQL Relational Schema Optimization & Indexing',
    status: 'completed',
    estimatedHours: 5,
    skillsTaught: ['PostgreSQL Indexing', 'Lock Contention Analysis'],
    score: 88,
  },
  {
    id: 'step-be-3',
    code: 'MOD-304',
    title: 'Distributed Consensus & Replication Protocols',
    status: 'recommended',
    estimatedHours: 6,
    skillsTaught: ['Raft Consensus', 'gRPC HTTP/2 Streaming'],
    prerequisite: 'MOD-108',
  },
  {
    id: 'step-be-4',
    code: 'MOD-402',
    title: 'Cloud-Native Container Orchestration & Telemetry',
    status: 'locked',
    estimatedHours: 8,
    skillsTaught: ['Kubernetes Workload Meshes', 'OpenTelemetry Tracing'],
    prerequisite: 'MOD-304',
  },
]

const DATA_SCIENTIST_PATHWAY: PathwayStep[] = [
  {
    id: 'step-ds-1',
    code: 'MOD-301',
    title: 'Geometric Deep Learning & Message Passing Networks',
    status: 'completed',
    estimatedHours: 5,
    skillsTaught: ['Graph Convolutional Networks', 'GraphSAGE Inductive Sampling'],
    score: 86,
  },
  {
    id: 'step-ds-2',
    code: 'MOD-302',
    title: 'Graph Representation Learning & Node Embeddings',
    status: 'recommended',
    estimatedHours: 6,
    skillsTaught: ['Node2Vec Biased Random Walks', 'Topological Hyperbolic Geometry'],
    prerequisite: 'MOD-301',
  },
  {
    id: 'step-ds-3',
    code: 'MOD-303',
    title: 'Heterogeneous Knowledge Graphs & Link Prediction',
    status: 'locked',
    estimatedHours: 6,
    skillsTaught: ['Translational Distance Embeddings (TransE / RotatE)', 'Entity Deduplication'],
    prerequisite: 'MOD-302',
  },
  {
    id: 'step-ds-4',
    code: 'MOD-403',
    title: 'Causal Inference & Graph Machine Learning Capstone',
    status: 'locked',
    estimatedHours: 8,
    skillsTaught: ['DAG Causal Discovery', 'GNN Explainer & Subgraph Attribution'],
    prerequisite: 'MOD-303',
  },
]

const SKILL_PATHWAY: PathwayStep[] = [
  {
    id: 'step-sk-1',
    code: 'MOD-CYP-101',
    title: 'Accelerated Cypher Querying & Pattern Traversal',
    status: 'recommended',
    estimatedHours: 3,
    skillsTaught: ['Declarative Cypher MATCH & MERGE', 'Cypher Query Profiling'],
    score: 85,
  },
]

export function AdaptivePathwayTimeline({ pathway, search = '' }: { pathway?: PathwayView; search?: string } = {}) {
  return pathway ? <ApprovedPathwayTimeline pathway={pathway} search={search} /> : <LegacyAdaptivePathwayTimeline />
}
function ApprovedPathwayTimeline({ pathway, search }: { pathway: PathwayView; search: string }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key), ui = (key: string) => tr('display.' + key)
  const [selection, setSelection] = React.useState<PathwayDetailSelection>(null), query = search.trim().toLocaleLowerCase()
  return <>
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/20"><div className="flex items-center gap-2"><Sparkles className="size-5 shrink-0 text-primary" /><Heading level={2} size="subsection">{t('pathway.adaptiveTimeline')}</Heading></div><Text variant="body-sm">{pathway.status?.displayState === 'PREVIEW' ? tr('reviewFlow.previewHelp') : ui('orderHelp')}</Text></CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="relative"><div className="pointer-events-none absolute bottom-6 left-5 top-6 w-px bg-border" aria-hidden="true" /><ol className="relative space-y-6">
          {pathway.modules.map(({ module, accessState }) => {
            const matches = !query || `${module.id} ${module.title} ${module.targets.map(target => pathwaySkill(pathway, target.skillId)?.name ?? target.skillId).join(' ')}`.toLocaleLowerCase().includes(query)
            return <li key={module.id} className={`relative flex min-w-0 items-start gap-3 sm:gap-5 ${matches ? '' : 'opacity-40'}`}>
              <span className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border-2 ${accessState === 'AVAILABLE' || accessState === 'PREVIEW' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>{accessState === 'AVAILABLE' || accessState === 'PREVIEW' ? module.ordinal : <Lock className="size-4" />}</span>
              <div className="min-w-0 flex-1 space-y-4 rounded-xl border border-border bg-card p-4 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1 basis-48"><Text variant="caption" className="break-all font-mono">{module.id}</Text><Button variant="link" className="h-auto max-w-full whitespace-normal p-0 text-left text-[length:var(--text-card)] font-semibold text-foreground [&>span]:whitespace-normal" onClick={() => setSelection({ kind: 'module', id: module.id })}>{module.ordinal}. {module.title}</Button></div><Badge variant={accessState === 'AVAILABLE' ? 'success' : 'warning'} className="max-w-full whitespace-normal">{accessState === 'PREVIEW' ? tr('reviewFlow.draft') : tr('state.' + accessState)}</Badge></div>
                <div className="flex flex-wrap gap-4"><Text variant="caption">{(module.durationMinutes / 60).toLocaleString(language, { maximumFractionDigits: 2 })} {ui('hours')}</Text><Text variant="caption">{module.priceVnd.toLocaleString(language)} {tr('price')}</Text></div>
                <div className="flex min-w-0 flex-wrap gap-2">{module.targets.map(target => { const skill = pathwaySkill(pathway, target.skillId); return <Button key={target.skillId} variant="outline" size="sm" className={`h-auto min-h-9 max-w-full whitespace-normal py-2 text-left [&>span]:whitespace-normal ${baselineTargetMet(skill) ? 'border-success/30 bg-success/10' : 'bg-secondary/40'}`} onClick={() => setSelection({ kind: 'skill', id: target.skillId })}>{baselineTargetMet(skill) && <CheckCircle2 className="size-3 shrink-0 text-success" />}<span className="min-w-0 break-words">{skill?.name ?? target.skillId}</span></Button> })}</div>
                {module.targets.some(target => target.expertAttention) && <Badge variant="warning">{tr('expertAttention')}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => setSelection({ kind: 'module', id: module.id })}>{t('upskillingUi.showDetails')}<ChevronRight className="size-4" /></Button>
              </div>
            </li>
          })}
        </ol></div>
      </CardContent>
    </Card>
    <InitialPathwayDetails pathway={pathway} selection={selection} onClose={() => setSelection(null)} />
  </>
}
function LegacyAdaptivePathwayTimeline() {
  const [activeCompany, setActiveCompany] = React.useState(getActiveCompany)
  const { profile } = useEmployeeLearningState()
  const isSkillMode = profile.selectedViewType === 'skill'

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
      const isSkillMode = profile.selectedViewType === 'skill'
      const roleKey = normalizeRoleKey(profile.targetRole)
      if (isSkillMode) return SKILL_PATHWAY
      if (roleKey === 'senior-backend-engineer') return BACKEND_PATHWAY
      if (roleKey === 'graph-data-scientist') return DATA_SCIENTIST_PATHWAY
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
  }, [activeCompany, profile.selectedViewType, profile.targetRole])

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
