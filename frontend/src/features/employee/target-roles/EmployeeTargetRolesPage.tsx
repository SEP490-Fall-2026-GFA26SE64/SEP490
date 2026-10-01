import * as React from 'react'
import {
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Filter,
  Layers,
  Search,
  Sparkles,
  Star,
  Target,
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
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import { TargetRoleSelector } from '../../../shared/components/ui/TargetRoleSelector'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { TargetRoleBrowsePanel } from './TargetRoleBrowsePanel'
import './EmployeeTargetRolesPage.css'

export interface CatalogTargetRole {
  id: string
  title: string
  department: string
  track: 'ai' | 'engineering' | 'ontology' | 'cloud'
  level: string
  levelRank: number // 4, 5, 6
  readinessMatch: number
  benchmarkScore: number
  estimatedMonths: number
  competencyCount: number
  publishedVersion: string
  description: string
  keySkills: string[]
  coreDomains: { name: string; required: number; current: number }[]
}

const DEFAULT_TARGET_ROLE_CATALOG: CatalogTargetRole[] = [
  {
    id: 'role-ai-knowledge-architect',
    title: 'AI Knowledge Architect',
    department: 'Machine Learning & Cognitive Architecture',
    track: 'ai',
    level: 'Senior (L5)',
    levelRank: 5,
    readinessMatch: 78,
    benchmarkScore: 85,
    estimatedMonths: 4,
    competencyCount: 12,
    publishedVersion: 'v2.4 (Latest - Published 2026-06)',
    description:
      'Designs end-to-end neuro-symbolic cognitive architectures, GNN embedding pipelines, and semantic ontology knowledge graphs in enterprise production.',
    keySkills: [
      'Graph Neural Networks',
      'Knowledge Tracing',
      'Neo4j Bolt',
      'OWL 2 / SHACL',
      'Vector Embeddings',
      'Cypher Semantics',
    ],
    coreDomains: [
      { name: 'Graph Architecture', required: 85, current: 75 },
      { name: 'Knowledge Tracing', required: 90, current: 45 },
      { name: 'Semantic Web', required: 85, current: 80 },
      { name: 'Graph Neural Networks', required: 85, current: 55 },
      { name: 'Distributed Systems', required: 80, current: 90 },
      { name: 'Data Persistence', required: 75, current: 88 },
    ],
  },
  {
    id: 'role-senior-backend-engineer',
    title: 'Senior Backend Engineer',
    department: 'Core Platform Engineering',
    track: 'engineering',
    level: 'Senior (L5)',
    levelRank: 5,
    readinessMatch: 94,
    benchmarkScore: 90,
    estimatedMonths: 2,
    competencyCount: 12,
    publishedVersion: 'v3.1 (Latest - Published 2026-07)',
    description:
      'Architects high-throughput event-driven microservices, distributed CQRS persistence, and transactional outbox pipelines with sub-millisecond latencies.',
    keySkills: [
      'Distributed Systems',
      'Kafka / RabbitMQ',
      'PostgreSQL Optimization',
      'Event Sourcing',
      'High-Concurrency APIs',
      'gRPC / Protocol Buffers',
    ],
    coreDomains: [
      { name: 'Distributed Systems', required: 90, current: 90 },
      { name: 'Data Persistence', required: 90, current: 88 },
      { name: 'Graph Architecture', required: 65, current: 75 },
      { name: 'Semantic Web', required: 60, current: 80 },
      { name: 'Knowledge Tracing', required: 50, current: 45 },
      { name: 'Graph Neural Networks', required: 60, current: 55 },
    ],
  },
  {
    id: 'role-machine-learning-engineer',
    title: 'Machine Learning Engineer',
    department: 'Applied AI Engineering',
    track: 'ai',
    level: 'Mid-Senior (L4)',
    levelRank: 4,
    readinessMatch: 82,
    benchmarkScore: 80,
    estimatedMonths: 3,
    competencyCount: 10,
    publishedVersion: 'v3.0 (Latest - Published 2026-08)',
    description:
      'Constructs dynamic knowledge tracing models (BKT/DKT), real-time feature stores, and automated continuous calibration pipelines for adaptive learning.',
    keySkills: [
      'Bayesian Knowledge Tracing',
      'PyTorch Geometric',
      'MLflow Model Governance',
      'Feature Engineering',
      'Inference Latency Tuning',
    ],
    coreDomains: [
      { name: 'Knowledge Tracing', required: 85, current: 45 },
      { name: 'Graph Neural Networks', required: 80, current: 55 },
      { name: 'Data Persistence', required: 75, current: 88 },
      { name: 'Distributed Systems', required: 75, current: 90 },
      { name: 'Graph Architecture', required: 70, current: 75 },
      { name: 'Semantic Web', required: 65, current: 80 },
    ],
  },
  {
    id: 'role-full-stack-knowledge-engineer',
    title: 'Full-Stack Knowledge Engineer',
    department: 'Enterprise Knowledge Systems',
    track: 'engineering',
    level: 'Senior (L5)',
    levelRank: 5,
    readinessMatch: 88,
    benchmarkScore: 88,
    estimatedMonths: 3,
    competencyCount: 14,
    publishedVersion: 'v2.0 (Latest - Published 2026-05)',
    description:
      'Bridges expressive graph querying (Cypher & SPARQL) with responsive reactive frontends and distributed CQRS persistence layers.',
    keySkills: [
      'React & TypeScript',
      'Cypher & SPARQL',
      'GraphQL & REST',
      'Neo4j Driver Optimization',
      'State Orchestration',
    ],
    coreDomains: [
      { name: 'Graph Architecture', required: 85, current: 75 },
      { name: 'Data Persistence', required: 85, current: 88 },
      { name: 'Distributed Systems', required: 80, current: 90 },
      { name: 'Semantic Web', required: 75, current: 80 },
      { name: 'Knowledge Tracing', required: 60, current: 45 },
      { name: 'Graph Neural Networks', required: 60, current: 55 },
    ],
  },
  {
    id: 'role-graph-data-scientist',
    title: 'Graph Data Scientist',
    department: 'Research & Advanced Analytics',
    track: 'ai',
    level: 'Senior (L5)',
    levelRank: 5,
    readinessMatch: 69,
    benchmarkScore: 85,
    estimatedMonths: 5,
    competencyCount: 13,
    publishedVersion: 'v2.5 (Latest - Published 2026-07)',
    description:
      'Conducts topological graph analytics, link prediction, community detection, and high-dimensional vector representations across knowledge networks.',
    keySkills: [
      'Node2Vec & GraphSAGE',
      'NetworkX / igraph',
      'Link Prediction',
      'Statistical Significance Testing',
      'Jupyter / MLflow',
    ],
    coreDomains: [
      { name: 'Graph Neural Networks', required: 95, current: 55 },
      { name: 'Knowledge Tracing', required: 85, current: 45 },
      { name: 'Graph Architecture', required: 80, current: 75 },
      { name: 'Semantic Web', required: 70, current: 80 },
      { name: 'Data Persistence', required: 70, current: 88 },
      { name: 'Distributed Systems', required: 65, current: 90 },
    ],
  },
  {
    id: 'role-graph-data-ontologist',
    title: 'Graph Data Ontologist',
    department: 'Corporate Ontology & Governance',
    track: 'ontology',
    level: 'Lead (L5)',
    levelRank: 5,
    readinessMatch: 84,
    benchmarkScore: 82,
    estimatedMonths: 3,
    competencyCount: 9,
    publishedVersion: 'v2.2 (Latest - Published 2026-07)',
    description:
      'Defines formal enterprise taxonomy triples, OWL/RDFS ontologies, and semantic SHACL validation constraints adhering to W3C open standards.',
    keySkills: [
      'Protégé & OWL 2 DL',
      'SHACL Validation Rules',
      'SPARQL 1.1 Query Engine',
      'TripleStore Indexing',
      'Taxonomy Governance',
    ],
    coreDomains: [
      { name: 'Semantic Web', required: 95, current: 80 },
      { name: 'Graph Architecture', required: 85, current: 75 },
      { name: 'Data Persistence', required: 80, current: 88 },
      { name: 'Knowledge Tracing', required: 65, current: 45 },
      { name: 'Distributed Systems', required: 65, current: 90 },
      { name: 'Graph Neural Networks', required: 60, current: 55 },
    ],
  },
  {
    id: 'role-cloud-solutions-architect',
    title: 'Cloud Solutions Architect',
    department: 'Cloud Infrastructure & SRE',
    track: 'cloud',
    level: 'Staff (L6)',
    levelRank: 6,
    readinessMatch: 72,
    benchmarkScore: 90,
    estimatedMonths: 6,
    competencyCount: 11,
    publishedVersion: 'v1.8 (Latest - Published 2026-04)',
    description:
      'Architects resilient hybrid cloud infrastructures, multi-region Neo4j causal clustering, Kubernetes orchestration, and zero-trust service meshes.',
    keySkills: [
      'Kubernetes / Helm',
      'Terraform Infrastructure',
      'Neo4j Causal Clustering',
      'Zero-Trust Security',
      'Chaos Engineering',
    ],
    coreDomains: [
      { name: 'Distributed Systems', required: 95, current: 90 },
      { name: 'Data Persistence', required: 85, current: 88 },
      { name: 'Graph Architecture', required: 75, current: 75 },
      { name: 'Semantic Web', required: 60, current: 80 },
      { name: 'Knowledge Tracing', required: 50, current: 45 },
      { name: 'Graph Neural Networks', required: 50, current: 55 },
    ],
  },
]

export function EmployeeTargetRolesPage() {
  const { profile, selectTargetRole } = useEmployeeLearningState()
  const { toast } = useToast()
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

  const rolesCatalog: CatalogTargetRole[] = React.useMemo(() => {
    if (!activeCompany?.targetRoles || activeCompany.targetRoles.length === 0) {
      return []
    }
    return activeCompany.targetRoles.map((tr) => {
      const existing = DEFAULT_TARGET_ROLE_CATALOG.find(
        (d) => d.title.toLowerCase() === tr.title.toLowerCase() || d.id === tr.id
      )
      if (existing) {
        return {
          ...existing,
          title: tr.title,
          department: tr.department || existing.department,
          description: tr.description || existing.description,
          publishedVersion: tr.version ? `v${tr.version} (Published)` : existing.publishedVersion,
        }
      }
      const trAny = tr as any
      return {
        id: tr.id,
        title: tr.title,
        department: tr.department || 'Enterprise Learning',
        track: (trAny.track as any) || 'ai',
        level: trAny.level || (trAny.levelRank ? `L${trAny.levelRank}` : 'Senior (L5)'),
        levelRank: trAny.levelRank || 5,
        readinessMatch: trAny.readinessMatch || (tr.skillTargets?.length ? Math.min(95, 60 + tr.skillTargets.length * 5) : 78),
        benchmarkScore: trAny.benchmarkScore || (tr.skillTargets?.[0]?.threshold ?? 85),
        estimatedMonths: trAny.estimatedMonths || 4,
        competencyCount: tr.competencyIds?.length || trAny.competencyCount || (tr.skillTargets?.length ? tr.skillTargets.length : 6),
        publishedVersion: `v${tr.version || '1.0'} (Published)`,
        description: tr.description || 'Target competency role curriculum for your organization.',
        keySkills: trAny.keySkills || (tr.skillTargets?.map((st) => st.skillName) ?? ['Core Competencies']),
        coreDomains:
          trAny.coreDomains ||
          (tr.skillTargets?.slice(0, 6).map((st) => ({
            name: st.skillName,
            required: st.threshold,
            current: Math.max(30, st.threshold - 20),
          })) ?? [{ name: 'Core Domain', required: 85, current: 70 }]),
      }
    })
  }, [activeCompany])

  // Filters & State
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedTrack, setSelectedTrack] = React.useState<string>('all')
  const [selectedLevel, setSelectedLevel] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<'match' | 'level' | 'title'>('match')

  // Modal dialog states
  const [confirmingRole, setConfirmingRole] = React.useState<CatalogTargetRole | null>(null)
  const [targetDeadline, setTargetDeadline] = React.useState('2026-12-31')
  const [targetBenchmark, setTargetBenchmark] = React.useState<number>(85)
  const [inspectingRole, setInspectingRole] = React.useState<CatalogTargetRole | null>(null)

  // Open confirmation modal
  const handleOpenConfirm = (role: CatalogTargetRole) => {
    setConfirmingRole(role)
    setTargetBenchmark(role.benchmarkScore)
    // Compute default date based on estimated months
    const date = new Date()
    date.setMonth(date.getMonth() + role.estimatedMonths)
    setTargetDeadline(date.toISOString().split('T')[0])
  }

  // Confirm selection
  const handleConfirmSelectRole = () => {
    if (!confirmingRole) return

    selectTargetRole(
      confirmingRole.title,
      confirmingRole.publishedVersion,
      targetDeadline,
      targetBenchmark,
      `Learner chosen target role track in ${confirmingRole.department}`
    )

    toast({
      title: 'Target Role Activated! 🎯',
      description: `You have chosen "${confirmingRole.title}" as your active target goal. Your adaptive learning pathway has been recalibrated.`,
      variant: 'success',
    })

    setConfirmingRole(null)
  }

  // Filtered & sorted roles
  const filteredRoles = rolesCatalog.filter((role) => {
    const matchesSearch =
      role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.keySkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTrack = selectedTrack === 'all' || role.track === selectedTrack
    const matchesLevel =
      selectedLevel === 'all' ||
      (selectedLevel === 'l4' && role.levelRank === 4) ||
      (selectedLevel === 'l5' && role.levelRank === 5) ||
      (selectedLevel === 'l6' && role.levelRank === 6)

    return matchesSearch && matchesTrack && matchesLevel
  }).sort((a, b) => {
    if (sortBy === 'match') return b.readinessMatch - a.readinessMatch
    if (sortBy === 'level') return b.levelRank - a.levelRank
    return a.title.localeCompare(b.title)
  })

  // Find active target role in catalog
  const activeRoleInCatalog = rolesCatalog.find(
    (r) => r.title.toLowerCase() === (profile.targetRole || '').toLowerCase()
  ) || rolesCatalog[0] || null
  const showLegacySelectionCatalog = false

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16 target-roles-catalog-container">
        {/* Actions Bar */}
        <PageHeader
          actions={
            <TargetRoleSelector />
          }
        />

        {/* =========================================================================
            ACTIVE GOAL HERO OR EMPTY STATE
           ========================================================================= */}
        {activeRoleInCatalog ? (
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-secondary/80 via-card to-card p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="primary" className="font-bold text-xs uppercase tracking-wide">
                    <Star size={12} className="mr-1 fill-primary-foreground text-primary-foreground" />
                    Your Active Target Role
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {profile.targetRoleVersion || 'v2.4'}
                  </Badge>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {profile.targetRole || activeRoleInCatalog.title}
                </h1>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeRoleInCatalog.description}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Target Benchmark:</span>
                    <span className="font-bold text-foreground font-mono">
                      {profile.targetReadinessScore}% Minimum
                    </span>
                  </div>
                  <span className="text-border">&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Estimated Match:</span>
                    <span className="font-bold text-primary font-mono">
                      {activeRoleInCatalog.readinessMatch}% Competency Fit
                    </span>
                  </div>
                  <span className="text-border">&bull;</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium text-foreground">{activeRoleInCatalog.department}</span>
                  </div>
                </div>
              </div>

              {/* Active Goal Readiness Summary Tile */}
              <div className="flex sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <div className="p-4 rounded-xl bg-card/90 border border-primary/20 flex flex-col items-center justify-center text-center min-w-[190px] shadow-2xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Competency Fit
                  </span>
                  <span className="text-3xl font-extrabold text-primary font-mono my-1">
                    {activeRoleInCatalog.readinessMatch}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Target Benchmark: <strong className="text-foreground font-mono">{profile.targetReadinessScore}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <TargetRoleBrowsePanel />

        {/* =========================================================================
            LEGACY SELECTION CATALOG — isolated until REQ-001-F02 is implemented
           ========================================================================= */}
        {showLegacySelectionCatalog && rolesCatalog.length > 0 && (
          <>
            <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Compass size={18} className="text-primary" />
                  <span>Explore &amp; Select Target Roles</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Browse official career paths. Selecting any role will automatically generate your adaptive curriculum map.
                </p>
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                Showing <strong>{filteredRoles.length}</strong> of {rolesCatalog.length} Available Roles
              </span>
            </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-2xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search target roles by title, department, or required skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
              />
            </div>

            {/* Track Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
                <Filter size={12} /> Track:
              </span>
              {[
                { key: 'all', label: 'All Tracks' },
                { key: 'ai', label: 'AI & Cognitive' },
                { key: 'engineering', label: 'Engineering' },
                { key: 'ontology', label: 'Ontologies' },
                { key: 'cloud', label: 'Cloud & SRE' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setSelectedTrack(pill.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedTrack === pill.key
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Sort & Level Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Filter by level"
              >
                <option value="all">All Levels</option>
                <option value="l4">Mid-Senior (L4)</option>
                <option value="l5">Senior (L5)</option>
                <option value="l6">Staff / Lead (L6)</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Sort roles"
              >
                <option value="match">Sort: Best Match</option>
                <option value="level">Sort: Highest Level</option>
                <option value="title">Sort: Alphabetical</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROLE CARDS GRID
           ========================================================================= */}
        {filteredRoles.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
            <Compass size={32} className="mx-auto text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-bold text-foreground">No Target Roles Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No target roles match &ldquo;{searchQuery}&rdquo;. Try resetting your filters or search keywords.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSelectedTrack('all')
                setSelectedLevel('all')
              }}
              className="mt-4"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRoles.map((role) => {
              const isActive =
                (profile.targetRole || '').toLowerCase() === role.title.toLowerCase()

              return (
                <Card
                  key={role.id}
                  className={`flex flex-col justify-between transition-all duration-200 ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/20 bg-gradient-to-b from-primary/5 via-card to-card shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:shadow-xs'
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-border/70 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          role.track === 'ai'
                            ? 'primary'
                            : role.track === 'engineering'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px] font-bold uppercase tracking-wider"
                      >
                        {role.level}
                      </Badge>

                      {/* Match percentage pill */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-mono">Match:</span>
                        <Badge
                          variant={
                            role.readinessMatch >= 85
                              ? 'success'
                              : role.readinessMatch >= 75
                              ? 'primary'
                              : 'warning'
                          }
                          className="font-mono text-xs font-bold px-2 py-0.5"
                        >
                          {role.readinessMatch}%
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-foreground">
                          {role.title}
                        </CardTitle>
                        {isActive && (
                          <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold shrink-0">
                            ACTIVE
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">
                        {role.department}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3.5 pb-4 space-y-4 flex-1 flex flex-col justify-between text-xs">
                    {/* Role Description */}
                    <p className="text-muted-foreground leading-relaxed line-clamp-3">
                      {role.description}
                    </p>

                    {/* Progress Bar towards Benchmark */}
                    <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-lg border border-border/60">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-muted-foreground">Current Readiness</span>
                        <span className="font-bold text-foreground">
                          {role.readinessMatch}% <span className="text-muted-foreground font-normal">/ {role.benchmarkScore}% req</span>
                        </span>
                      </div>
                      <Progress
                        value={role.readinessMatch}
                        variant={role.readinessMatch >= role.benchmarkScore ? 'success' : 'primary'}
                        className="h-1.5"
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> Est: {role.estimatedMonths} months
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers size={11} /> {role.competencyCount} competencies
                        </span>
                      </div>
                    </div>

                    {/* Key Skill Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Core Competency Tags:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.keySkills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium text-[10.5px] border border-border/60"
                          >
                            {skill}
                          </span>
                        ))}
                        {role.keySkills.length > 4 && (
                          <span className="px-1.5 py-0.5 rounded-md text-muted-foreground text-[10px]">
                            +{role.keySkills.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-border/70 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingRole(role)}
                        className="text-xs flex-1 font-semibold hover:border-primary/40 text-foreground"
                      >
                        Inspect Details
                      </Button>

                      {isActive ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled
                          className="text-xs flex-1 font-bold text-primary opacity-90 cursor-default"
                          leftIcon={<Check size={14} className="text-success" />}
                        >
                          Active Goal
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenConfirm(role)}
                          className="text-xs flex-1 font-bold shadow-2xs"
                          rightIcon={<Target size={14} />}
                        >
                          Choose as Goal
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
          </>
        )}

        {/* =========================================================================
            MODAL 1: CONFIRM TARGET ROLE SELECTION
           ========================================================================= */}
        <Dialog open={!!confirmingRole} onOpenChange={(open) => !open && setConfirmingRole(null)}>
          {confirmingRole && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                    <Target size={22} />
                  </div>
                  <div>
                    <DialogTitle>Activate Target Role Goal</DialogTitle>
                    <DialogDescription>
                      Set <strong className="text-foreground">{confirmingRole.title}</strong> as your active career advancement objective.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Role Summary Callout */}
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{confirmingRole.title}</span>
                    <Badge variant="primary" className="text-[10px] font-mono">
                      {confirmingRole.level}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {confirmingRole.description}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
                    <span>Published: {confirmingRole.publishedVersion.split(' ')[0]}</span>
                    <span>&bull;</span>
                    <span>Current Match: <strong className="text-primary">{confirmingRole.readinessMatch}%</strong></span>
                  </div>
                </div>

                {/* Target Deadline Picker */}
                <div>
                  <label htmlFor="target-date" className="font-bold text-foreground block mb-1.5">
                    Target Completion Milestone Date
                  </label>
                  <div className="relative">
                    <input
                      id="target-date"
                      type="date"
                      value={targetDeadline}
                      onChange={(e) => setTargetDeadline(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    Estimated timeframe based on curriculum: ~{confirmingRole.estimatedMonths} months
                  </span>
                </div>

                {/* Target Readiness Benchmark Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="target-benchmark" className="font-bold text-foreground">
                      Target Readiness Score Benchmark
                    </label>
                    <span className="font-mono font-bold text-primary text-xs">
                      {targetBenchmark}% Minimum
                    </span>
                  </div>
                  <input
                    id="target-benchmark"
                    type="range"
                    min="70"
                    max="95"
                    step="1"
                    value={targetBenchmark}
                    onChange={(e) => setTargetBenchmark(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                    <span>70% (Core)</span>
                    <span>85% (Recommended)</span>
                    <span>95% (Excellence)</span>
                  </div>
                </div>

                {/* Impact Notice */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" /> What happens when you confirm:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Your Adaptive Learning Pathway is re-sequenced for this role&apos;s ontology.</li>
                    <li>All verified competencies &amp; evidence artifacts remain permanently preserved.</li>
                    <li>Baseline diagnostic evaluation is calibrated for new gap detection.</li>
                  </ul>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingRole(null)}
                >
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold shadow-2xs"
                  onClick={handleConfirmSelectRole}
                  rightIcon={<CheckCircle2 size={15} />}
                >
                  Confirm &amp; Set Active Goal
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* =========================================================================
            MODAL 2: INSPECT ROLE DETAILS & COMPETENCY BREAKDOWN
           ========================================================================= */}
        <Dialog open={!!inspectingRole} onOpenChange={(open) => !open && setInspectingRole(null)}>
          {inspectingRole && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle>{inspectingRole.title}</DialogTitle>
                      <Badge variant="primary" className="text-[10px] font-bold">
                        {inspectingRole.level}
                      </Badge>
                    </div>
                    <DialogDescription>{inspectingRole.department}</DialogDescription>
                  </div>

                  <Badge variant="success" className="font-mono text-sm px-2.5 py-1">
                    {inspectingRole.readinessMatch}% Fit
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
                {/* Description */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Role Objective &amp; Scope
                  </span>
                  <p className="text-foreground leading-relaxed">
                    {inspectingRole.description}
                  </p>
                </div>

                {/* Domain Benchmark Breakdown */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Domain Alignment Breakdown (Current vs Required)
                  </span>

                  <div className="space-y-2">
                    {inspectingRole.coreDomains.map((dom) => (
                      <div
                        key={dom.name}
                        className="p-2.5 rounded-lg border border-border bg-card flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{dom.name}</span>
                          <span className="font-mono text-xs">
                            <strong className="text-primary">{dom.current}%</strong>{' '}
                            <span className="text-muted-foreground">/ {dom.required}% required</span>
                          </span>
                        </div>
                        <Progress
                          value={dom.current}
                          variant={dom.current >= dom.required ? 'success' : 'primary'}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Key Skills */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Competencies &amp; Technologies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectingRole.keySkills.map((sk) => (
                      <span
                        key={sk}
                        className="px-2.5 py-1 rounded-md bg-secondary text-primary font-medium text-xs border border-primary/20"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectingRole(null)}
                >
                  Close
                </Button>

                {profile.targetRole?.toLowerCase() !== inspectingRole.title.toLowerCase() && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-bold shadow-2xs"
                    onClick={() => {
                      const r = inspectingRole
                      setInspectingRole(null)
                      handleOpenConfirm(r)
                    }}
                    rightIcon={<Target size={14} />}
                  >
                    Select this Target Role
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}

export const LearnerTargetRolesPage = EmployeeTargetRolesPage;
