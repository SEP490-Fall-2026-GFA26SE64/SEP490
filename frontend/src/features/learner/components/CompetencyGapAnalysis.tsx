import { useState } from 'react'
import { AlertCircle, ArrowUpRight, Award, Calendar, CheckCircle2, Filter, Search, Target, TrendingUp } from 'lucide-react'

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
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [search, setSearch] = useState('')
  const targetRole = 'AI Knowledge Architect'

  const totalRequired = SAMPLE_SKILLS.reduce((acc, s) => acc + s.requiredLevel, 0)
  const totalCurrent = SAMPLE_SKILLS.reduce((acc, s) => acc + s.currentLevel, 0)
  const readinessPercentage = Math.round((totalCurrent / totalRequired) * 100)

  const filteredSkills = SAMPLE_SKILLS.filter((skill) => {
    if (filter !== 'all' && skill.priority !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return skill.name.toLowerCase().includes(q) || skill.category.toLowerCase().includes(q) || skill.bridgeModule.toLowerCase().includes(q)
    }
    return true
  })

  const criticalCount = SAMPLE_SKILLS.filter((s) => s.priority === 'high').length
  const moderateCount = SAMPLE_SKILLS.filter((s) => s.priority === 'medium').length
  const masteredCount = SAMPLE_SKILLS.filter((s) => s.priority === 'low').length

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
              <Calendar className="h-4 w-4 text-primary" /> Time Left
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">24 Days Remaining</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Start: <strong className="text-foreground font-semibold">Aug 15, 2026</strong></span>
              <span className="text-muted-foreground">Target: <strong className="text-primary font-semibold">Oct 15, 2026</strong></span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Target role deployment deadline set by organization.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unified Big Container Design for Competency Gap Breakdown */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Elevated Header with Filter Pills */}
        <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Competency Gap Breakdown vs Target Role
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Calculated by the Competency Intelligence Engine using diagnostic assessments and work evidence
            </p>
          </div>

          {/* Interactive Status Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/80 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-card text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>All ({SAMPLE_SKILLS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('high')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'high'
                  ? 'bg-destructive/15 text-destructive font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <AlertCircle className="h-3 w-3 text-destructive" />
              <span>Critical Gaps ({criticalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('medium')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'medium'
                  ? 'bg-warning/15 text-warning font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span>Moderate ({moderateCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter('low')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'low'
                  ? 'bg-success/15 text-success font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span>Mastered ({masteredCount})</span>
            </button>
          </div>
        </div>

        {/* Quick Search Toolbar */}
        <div className="p-3.5 border-b border-border bg-muted/5 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search skill name, category, or bridge module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors"
            />
          </div>
          <span className="text-[11px] text-muted-foreground font-mono ml-auto pr-2">
            Showing {filteredSkills.length} of {SAMPLE_SKILLS.length} micro-skills
          </span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-border">
          {filteredSkills.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <div className="text-sm font-semibold text-foreground">No matching competencies found</div>
              <p className="text-xs text-muted-foreground">Try adjusting your filter or search query.</p>
              <button
                type="button"
                onClick={() => {
                  setFilter('all')
                  setSearch('')
                }}
                className="text-xs text-primary underline font-medium cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredSkills.map((skill) => {
              const gap = Math.max(0, skill.requiredLevel - skill.currentLevel)
              const isMastered = skill.currentLevel >= skill.requiredLevel

              return (
                <div key={skill.id} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{skill.name}</span>
                        <Badge
                          variant={
                            skill.priority === 'high'
                              ? 'destructive'
                              : skill.priority === 'medium'
                                ? 'warning'
                                : 'success'
                          }
                          className="text-[11px] font-semibold"
                        >
                          {skill.priority === 'high' ? 'Critical Gap' : skill.priority === 'medium' ? 'Moderate Gap' : 'Mastered'}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          {skill.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground sm:text-right font-mono">
                      <span>Current: <strong className="text-foreground">{skill.currentLevel}%</strong> / Req: <strong className="text-foreground">{skill.requiredLevel}%</strong></span>
                    </div>
                  </div>

                  {/* Dual comparison progress bar */}
                  <div className="space-y-1">
                    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="absolute h-full bg-border rounded-full"
                        style={{ width: `${skill.requiredLevel}%` }}
                      />
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
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      {isMastered ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success inline" />
                          <span className="font-medium text-success">Mastered &bull; Ready for Target Role</span>
                        </>
                      ) : (
                        <>
                          <span>Recommended Bridge:</span>
                          <code className="font-mono text-primary font-semibold bg-secondary/50 px-1.5 py-0.5 rounded border border-primary/20">
                            {skill.bridgeModule}
                          </code>
                        </>
                      )}
                    </span>
                    {!isMastered && (
                      <span className="font-semibold text-destructive flex items-center gap-0.5">
                        Deficit: -{gap}% <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
