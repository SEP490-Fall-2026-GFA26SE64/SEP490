import React, { useState, useMemo } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Filter,
  GraduationCap,
  Layers,
  Play,
  Plus,
  Search,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/components/ui/Card'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Progress } from '../../../shared/components/ui/Progress'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../shared/components/ui/Dialog'

export interface ElectiveSkillItem {
  id: string
  code: string
  name: string
  domain: string
  macroCompetency: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedHours: number
  mappedModuleId: string
  mappedModuleCode: string
  mappedModuleTitle: string
  masteryScore: number // 0 - 100
  isEnrolled: boolean
  isMastered: boolean
  description: string
}

const STORAGE_KEY = 'alg_employee_elective_skills_v1'

const INITIAL_SKILLS: ElectiveSkillItem[] = [
  {
    id: 'skill-cypher',
    code: 'SKILL-CYPHER-01',
    name: 'Neo4j Cypher Traversal & Pattern Querying',
    domain: 'Software Engineering',
    macroCompetency: 'Graph Database Engineering',
    difficulty: 'Intermediate',
    estimatedHours: 4,
    mappedModuleId: 'mod-cypher-mastery',
    mappedModuleCode: 'MOD-CYP-101',
    mappedModuleTitle: 'Accelerated Cypher Querying & Pattern Traversal',
    masteryScore: 88,
    isEnrolled: true,
    isMastered: true,
    description: 'Declarative graph querying, multi-hop relationship paths, and performance profiling.',
  },
  {
    id: 'skill-gnn',
    code: 'SKILL-GNN-01',
    name: 'Graph Neural Networks & Message Passing',
    domain: 'Data & AI',
    macroCompetency: 'Geometric Deep Learning',
    difficulty: 'Advanced',
    estimatedHours: 6,
    mappedModuleId: 'mod-gnn-fundamentals',
    mappedModuleCode: 'MOD-GNN-201',
    mappedModuleTitle: 'Hands-on Geometric Deep Learning & Message Passing',
    masteryScore: 45,
    isEnrolled: true,
    isMastered: false,
    description: 'Graph convolutional networks, PyTorch Geometric, and topological node embeddings.',
  },
  {
    id: 'skill-owl',
    code: 'SKILL-OWL-01',
    name: 'Enterprise Ontology Modeling with OWL 2 & Protege',
    domain: 'Data & AI',
    macroCompetency: 'Semantic Knowledge Representation',
    difficulty: 'Intermediate',
    estimatedHours: 5,
    mappedModuleId: 'mod-owl-foundations',
    mappedModuleCode: 'MOD-ONT-301',
    mappedModuleTitle: 'Enterprise Ontology Modeling with OWL 2 & Protege',
    masteryScore: 0,
    isEnrolled: false,
    isMastered: false,
    description: 'Axiom authoring, description logics, taxonomic hierarchies, and reasoner validation.',
  },
  {
    id: 'skill-docker',
    code: 'SKILL-DOCKER-01',
    name: 'Containerization & Multi-Stage Docker Builds',
    domain: 'Cloud & Infrastructure',
    macroCompetency: 'Container & Runtime Orchestration',
    difficulty: 'Beginner',
    estimatedHours: 3,
    mappedModuleId: 'mod-cypher-mastery',
    mappedModuleCode: 'MOD-DOC-101',
    mappedModuleTitle: 'Cloud Native Microservices with Docker',
    masteryScore: 70,
    isEnrolled: true,
    isMastered: false,
    description: 'Optimizing container layer caching, non-root security contexts, and minimal images.',
  },
  {
    id: 'skill-dkt',
    code: 'SKILL-DKT-01',
    name: 'Bayesian & Deep Knowledge Tracing Engines',
    domain: 'Data & AI',
    macroCompetency: 'Adaptive Learning Analytics',
    difficulty: 'Advanced',
    estimatedHours: 8,
    mappedModuleId: 'mod-gnn-fundamentals',
    mappedModuleCode: 'MOD-DKT-401',
    mappedModuleTitle: 'Personalized Cognitive Modeling with Transformer DKT',
    masteryScore: 0,
    isEnrolled: false,
    isMastered: false,
    description: 'Mathematical formulation of skill acquisition curves, guessing/slipping parameters, and DKT.',
  },
  {
    id: 'skill-spring',
    code: 'SKILL-SPRING-01',
    name: 'Reactive Microservices with Spring Boot & WebFlux',
    domain: 'Software Engineering',
    macroCompetency: 'High-Concurrency Backend Systems',
    difficulty: 'Intermediate',
    estimatedHours: 5,
    mappedModuleId: 'mod-cypher-mastery',
    mappedModuleCode: 'MOD-SPR-201',
    mappedModuleTitle: 'Asynchronous Event-Driven Architectures with Spring',
    masteryScore: 20,
    isEnrolled: false,
    isMastered: false,
    description: 'Non-blocking I/O event loops, Project Reactor publishers, and backpressure management.',
  },
]

export const IndividualSkillCatalogPage: React.FC = () => {
  const [skills, setSkills] = useState<ElectiveSkillItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : INITIAL_SKILLS
    } catch {
      return INITIAL_SKILLS
    }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Selected skill for enrollment modal
  const [enrollTargetSkill, setEnrollTargetSkill] = useState<ElectiveSkillItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const saveSkills = (updated: ElectiveSkillItem[]) => {
    setSkills(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
  }

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.macroCompetency.toLowerCase().includes(searchQuery.toLowerCase())

      const matchDomain = selectedDomain === 'ALL' || s.domain === selectedDomain

      let matchStatus = true
      if (selectedStatus === 'ENROLLED') matchStatus = s.isEnrolled
      else if (selectedStatus === 'MASTERED') matchStatus = s.isMastered
      else if (selectedStatus === 'AVAILABLE') matchStatus = !s.isEnrolled

      return matchSearch && matchDomain && matchStatus
    })
  }, [skills, searchQuery, selectedDomain, selectedStatus])

  // KPIs
  const totalCount = skills.length
  const enrolledCount = skills.filter((s) => s.isEnrolled).length
  const masteredCount = skills.filter((s) => s.isMastered).length

  const handleConfirmEnroll = () => {
    if (!enrollTargetSkill) return
    const updated = skills.map((s) =>
      s.id === enrollTargetSkill.id ? { ...s, isEnrolled: true } : s
    )
    saveSkills(updated)
    setToastMessage(`Enrolled in "${enrollTargetSkill.name}". Independent learning context created!`)
    setTimeout(() => setToastMessage(null), 3500)
    setEnrollTargetSkill(null)
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-primary/10 border border-primary/20 text-foreground px-4 py-3 rounded-lg flex items-center justify-between text-body-sm shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-muted-foreground hover:text-foreground text-caption font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Independent Micro-Skill Catalog"
        description="Explore and master technical micro-skills at your own pace without altering your primary Target Role pathway (REQ-055)."
      >
        <div className="flex items-center gap-2">
          <Link to="/employee/pathway">
            <Button variant="outline" size="sm">
              View Target Role Pathway
            </Button>
          </Link>
          <Link to="/employee/riasec">
            <Button variant="primary" size="sm">
              <Sparkles className="w-4 h-4 mr-1.5" />
              RIASEC Career Profiler
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Top StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catalog Inventory"
          value={`${totalCount} Micro-Skills`}
          description="Approved by L&D offering review"
          icon={<BookOpen className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Active Independent Studies"
          value={`${enrolledCount} Enrolled`}
          description="In-progress elective learning"
          icon={<GraduationCap className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Mastered Electives"
          value={`${masteredCount} Completed`}
          description=">= 80% mastery score achieved"
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
        />
        <StatCard
          title="Independent Context"
          value="Isolated"
          description="Does not alter role milestone gates"
          icon={<Layers className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Search and Filters Bar */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search micro-skills by name, code, or competency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-body-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-body-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Domains</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="Data & AI">Data & AI</option>
              <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-1.5 text-body-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Status</option>
              <option value="ENROLLED">Enrolled (Active)</option>
              <option value="MASTERED">Mastered</option>
              <option value="AVAILABLE">Not Enrolled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Skills Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSkills.map((skill) => (
          <Card
            key={skill.id}
            className={`border transition-all flex flex-col justify-between ${
              skill.isMastered
                ? 'border-success/30 bg-success/5'
                : skill.isEnrolled
                ? 'border-primary/30 bg-card shadow-xs'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <CardHeader className="pb-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {skill.code}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      skill.difficulty === 'Beginner'
                        ? 'outline'
                        : skill.difficulty === 'Intermediate'
                        ? 'primary'
                        : 'warning'
                    }
                    className="text-[10px]"
                  >
                    {skill.difficulty}
                  </Badge>
                  {skill.isMastered && (
                    <Badge variant="success" className="text-[10px]">
                      Mastered ✓
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <CardTitle className="text-card font-semibold text-foreground line-clamp-1">
                  {skill.name}
                </CardTitle>
                <div className="text-caption text-primary font-medium mt-0.5">
                  {skill.macroCompetency}
                </div>
              </div>

              <CardDescription className="text-caption line-clamp-2">
                {skill.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-4">
              {/* Progress Bar & Mapped Module Indicator */}
              <div className="space-y-1.5 border-t border-border/60 pt-3">
                <div className="flex justify-between text-caption font-semibold">
                  <span className="text-muted-foreground">Estimated Mastery:</span>
                  <span
                    className={
                      skill.masteryScore >= 80
                        ? 'text-success'
                        : skill.masteryScore > 0
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }
                  >
                    {skill.masteryScore}%
                  </span>
                </div>
                <Progress value={skill.masteryScore} className="h-1.5" />
              </div>

              {/* Mapped Learning Content Link (REQ-055-F03) */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-caption space-y-1">
                <div className="text-muted-foreground flex items-center justify-between">
                  <span className="font-semibold text-foreground">Mapped Module:</span>
                  <span>{skill.estimatedHours} hrs</span>
                </div>
                <div className="font-medium text-foreground truncate">
                  {skill.mappedModuleTitle}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                {skill.isEnrolled ? (
                  <Link
                    to={`/employee/modules/${skill.mappedModuleId}`}
                    className="w-full"
                  >
                    <Button variant="primary" size="sm" className="w-full">
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Study Module
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEnrollTargetSkill(skill)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Enroll Elective
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal: Enroll in Elective Skill Dialog */}
      <Dialog
        open={enrollTargetSkill !== null}
        onOpenChange={(open) => {
          if (!open) setEnrollTargetSkill(null)
        }}
        className="max-w-xl"
      >
        {enrollTargetSkill && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Zap className="h-5 w-5 text-primary shrink-0" />
                  <span>Enroll in Elective Micro-Skill</span>
                </DialogTitle>
                <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
                  INDEPENDENT STUDY
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                You are about to start self-directed study for an individual skill outside your primary pathway.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Micro-Skill Metadata Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Skill Code</span>
                  <strong className="font-mono text-foreground font-bold text-xs">{enrollTargetSkill.code}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Domain</span>
                  <strong className="font-bold text-foreground text-xs truncate block">{enrollTargetSkill.domain}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Difficulty</span>
                  <strong className="text-foreground font-bold text-xs uppercase">{enrollTargetSkill.difficulty}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Est. Effort</span>
                  <strong className="font-mono text-foreground font-bold text-xs">{enrollTargetSkill.estimatedHours} hrs</strong>
                </div>
              </div>

              {/* Target Skill Information Box */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-sm">{enrollTargetSkill.name}</h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {enrollTargetSkill.macroCompetency}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {enrollTargetSkill.description}
                </p>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Mapped Learning Module:</span>
                  <span className="font-semibold text-primary">
                    {enrollTargetSkill.mappedModuleCode} • {enrollTargetSkill.mappedModuleTitle}
                  </span>
                </div>
              </div>

              {/* Architectural Isolation Callout (REQ-055) */}
              <div className="p-3 rounded-xl bg-secondary/50 border border-primary/20 text-xs space-y-1.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" />
                  <span>Architectural Isolation Policy (REQ-055)</span>
                </div>
                <ul className="text-muted-foreground text-[11px] space-y-1 list-disc pl-4 leading-relaxed">
                  <li>Elective skill study operates in an <strong>independent context</strong> and will not overwrite or alter your role pathway.</li>
                  <li>Assessment results are credited directly to your skill competency profile in the Neo4j graph.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnrollTargetSkill(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmEnroll}
                className="flex items-center gap-1.5"
              >
                <Play size={12} className="fill-current" />
                <span>Confirm & Enroll</span>
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  )
}
export default IndividualSkillCatalogPage
