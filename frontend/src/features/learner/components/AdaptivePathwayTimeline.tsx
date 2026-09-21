import { ArrowRight, CheckCircle2, Lock, Sparkles, Zap } from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { useToast } from '../../../shared/hooks/useToast'
import { cn } from '../../../shared/lib/utils'

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
  const [steps, setSteps] = React.useState<PathwayStep[]>(INITIAL_PATHWAY)
  const [hasTriggeredRemedy, setHasTriggeredRemedy] = React.useState(false)
  const { toast } = useToast()

  // Simulate Knowledge Tracing injecting a prerequisite remedy module dynamically
  const handleSimulateRemedyFallback = () => {
    if (hasTriggeredRemedy) {
      setSteps(INITIAL_PATHWAY)
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
      title: 'Remedy: Sparse Matrix Operations & Graph Adjacency',
      status: 'remedy',
      estimatedHours: 3,
      skillsTaught: ['Adjacency Matrices', 'Eigenvector Centrality'],
      prerequisite: 'Triggered by failed GNN Diagnostic Quiz',
    }

    const updated = [
      steps[0],
      steps[1],
      remedyStep,
      { ...steps[2], status: 'locked' as const },
      steps[3],
      steps[4],
    ]

    setSteps(updated)
    setHasTriggeredRemedy(true)

    toast({
      title: 'Dynamic Pathway Adapted!',
      description: 'Knowledge Tracing detected a prerequisite gap in Linear Algebra. Remedy module REM-102 inserted into your route.',
      variant: 'warning',
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>AI-Driven Adaptive Learning Pathway</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Dynamic graph-traversal route continually recalculated based on real-time assessment performance.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateRemedyFallback}
            leftIcon={<Zap className="h-4 w-4 text-warning" />}
          >
            {hasTriggeredRemedy ? 'Reset Standard Route' : 'Simulate Prerequisite Gap Fallback'}
          </Button>
        </CardHeader>

        <CardContent>
          <div className="relative pl-6 sm:pl-8 border-l-2 border-border space-y-8 my-2">
            {steps.map((step) => {
              const isRecommended = step.status === 'recommended'
              const isRemedy = step.status === 'remedy'
              const isCompleted = step.status === 'completed'


              return (
                <div key={step.id} className="relative group">
                  {/* Timeline indicator node */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? 'border-success bg-success text-white'
                        : isRecommended
                          ? 'border-primary bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                          : isRemedy
                            ? 'border-warning bg-warning text-white ring-4 ring-warning/20'
                            : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isRecommended || isRemedy ? (
                      <Zap className="h-4 w-4" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Step Card Content */}
                  <div
                    className={`rounded-lg border p-4 sm:p-5 transition-all ${
                      isRecommended
                        ? 'border-primary/50 bg-secondary/30 shadow-md ring-1 ring-primary/30'
                        : isRemedy
                          ? 'border-warning/60 bg-amber-50/50 shadow-md ring-1 ring-warning/40'
                          : isCompleted
                            ? 'border-border bg-card'
                            : 'border-border bg-muted/40 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                            {step.code}
                          </code>
                          <span className="font-semibold text-foreground text-sm sm:text-base">{step.title}</span>
                          <Badge
                            variant={
                              isCompleted
                                ? 'success'
                                : isRecommended
                                  ? 'primary'
                                  : isRemedy
                                    ? 'warning'
                                    : 'secondary'
                            }
                            className={cn(
                              !isCompleted && !isRecommended && !isRemedy && 'gap-1 text-xs font-medium text-muted-foreground'
                            )}
                          >
                            {isCompleted ? (
                              `Completed (${step.score}%)`
                            ) : isRecommended ? (
                              'Next Best Action'
                            ) : isRemedy ? (
                              'Knowledge Tracing Remedy'
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Prerequisites Locked
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      <span className="text-xs text-muted-foreground shrink-0">{step.estimatedHours} hrs study</span>
                    </div>

                    {step.prerequisite && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Prerequisite: <span className="font-medium text-foreground">{step.prerequisite}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground mr-1">Skills:</span>
                        {step.skillsTaught.map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-0.5 rounded-full bg-card border border-border text-foreground font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      {(isRecommended || isRemedy) && (
                        <Button
                          size="sm"
                          variant={isRemedy ? 'secondary' : 'primary'}
                          rightIcon={<ArrowRight className="h-4 w-4" />}
                          onClick={() => {
                            toast({
                              title: `Launching ${step.code}`,
                              description: `Starting active learning session for ${step.title}`,
                              variant: 'success',
                            })
                          }}
                        >
                          {isRemedy ? 'Bridge Gap Now' : 'Start Module'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
