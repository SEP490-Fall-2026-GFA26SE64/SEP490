import { ArrowUpRight, Award, CheckCircle2, Clock, Target, TrendingUp } from 'lucide-react'

import { Badge } from '../../../shared/components/ui/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Progress } from '../../../shared/components/ui/Progress'

export interface CompetencySkill {
  id: string
  name: string
  category: string
  currentLevel: number // 0 to 100
  requiredLevel: number // 0 to 100
  priority: 'high' | 'medium' | 'low'
  bridgeModule: string
}

const SAMPLE_SKILLS: CompetencySkill[] = [
  {
    id: 's1',
    name: 'Knowledge Graph Modeling (RDF/OWL & Cypher)',
    category: 'Graph Architecture',
    currentLevel: 30,
    requiredLevel: 85,
    priority: 'high',
    bridgeModule: 'MOD-204: Neo4j Semantic Modeling',
  },
  {
    id: 's2',
    name: 'Graph Neural Networks & Embeddings',
    category: 'AI / Data Science',
    currentLevel: 45,
    requiredLevel: 90,
    priority: 'high',
    bridgeModule: 'MOD-301: Node2Vec & GraphSAGE in PyTorch Geometric',
  },
  {
    id: 's3',
    name: 'Adaptive Knowledge Tracing (BKT / DKT)',
    category: 'AI / Data Science',
    currentLevel: 20,
    requiredLevel: 80,
    priority: 'high',
    bridgeModule: 'MOD-305: Bayesian Knowledge Tracing Algorithms',
  },
  {
    id: 's4',
    name: 'Event-Driven Microservices (Kafka / RabbitMQ)',
    category: 'Distributed Systems',
    currentLevel: 75,
    requiredLevel: 85,
    priority: 'medium',
    bridgeModule: 'MOD-108: Kafka Event Processing Patterns',
  },
  {
    id: 's5',
    name: 'Relational Schema Optimization (PostgreSQL)',
    category: 'Data Persistence',
    currentLevel: 90,
    requiredLevel: 85,
    priority: 'low',
    bridgeModule: 'Mastered — Fast-tracked',
  },
]

export function CompetencyGapAnalysis() {
  const targetRole = 'AI Knowledge Architect'

  const totalRequired = SAMPLE_SKILLS.reduce((acc, s) => acc + s.requiredLevel, 0)
  const totalCurrent = SAMPLE_SKILLS.reduce((acc, s) => acc + s.currentLevel, 0)
  const readinessPercentage = Math.round((totalCurrent / totalRequired) * 100)

  return (
    <div className="space-y-6">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Target className="h-4 w-4 text-primary" /> Target Role
            </CardDescription>
            <CardTitle className="text-xl">{targetRole}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Transition from: Senior Backend Engineer</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Role Readiness
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {readinessPercentage}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={readinessPercentage} variant="primary" />
            <p className="text-xs text-muted-foreground mt-1.5">3 critical gaps remaining to bridge</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" /> Training Efficiency
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">38.5 Hours Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Adaptive graph skips modules for already mastered competencies.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Granular Micro-skill Gap Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span>Competency Gap Breakdown vs Target Role</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">5 Micro-skills Evaluated</span>
          </CardTitle>
          <CardDescription>
            Calculated by the Competency Intelligence Engine using diagnostic assessments and work evidence.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="divide-y divide-border">
            {SAMPLE_SKILLS.map((skill) => {
              const gap = Math.max(0, skill.requiredLevel - skill.currentLevel)
              const isMastered = skill.currentLevel >= skill.requiredLevel

              return (
                <div key={skill.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{skill.name}</span>
                        <Badge
                          variant={
                            skill.priority === 'high'
                              ? 'destructive'
                              : skill.priority === 'medium'
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {skill.priority === 'high' ? 'Critical Gap' : skill.priority === 'medium' ? 'Moderate Gap' : 'Mastered'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{skill.category}</span>
                    </div>

                    <div className="text-xs text-muted-foreground sm:text-right">
                      <span>Current: <strong className="text-foreground">{skill.currentLevel}%</strong> / Req: <strong className="text-foreground">{skill.requiredLevel}%</strong></span>
                    </div>
                  </div>

                  {/* Dual comparison bar with green, yellow, and red status colors */}
                  <div className="space-y-1">
                    <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      {/* Target level background indicator */}
                      <div
                        className="absolute h-full bg-border rounded-full"
                        style={{ width: `${skill.requiredLevel}%` }}
                      />
                      {/* Current level fill: Green (Mastered/Low Gap), Yellow (Moderate Gap), Red (Critical Gap) */}
                      <div
                        className={`absolute h-full rounded-full transition-all duration-500 ${
                          isMastered
                            ? 'bg-success'
                            : skill.priority === 'high'
                              ? 'bg-destructive'
                              : skill.priority === 'medium'
                                ? 'bg-warning'
                                : 'bg-success'
                        }`}
                        style={{ width: `${skill.currentLevel}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      {isMastered ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success inline" /> Mastered — Ready for Target Role
                        </>
                      ) : (
                        <>
                          Recommended Bridge: <code className="font-mono text-primary font-medium">{skill.bridgeModule}</code>
                        </>
                      )}
                    </span>
                    {!isMastered && (
                      <span className="font-semibold text-destructive flex items-center">
                        Gap: -{gap}% <ArrowUpRight className="h-3 w-3 ml-0.5" />
                      </span>
                    )}
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
