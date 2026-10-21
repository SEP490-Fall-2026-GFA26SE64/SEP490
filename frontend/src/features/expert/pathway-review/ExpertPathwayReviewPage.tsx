import * as React from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Filter,
  GripVertical,
  MinusCircle,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { useToast } from '../../../shared/hooks/useToast'
import { cn } from '../../../shared/lib/utils'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export interface PathwayModuleItem {
  id: string
  code: string
  title: string
  estimatedHours: number
  included: boolean
  reason: string
}

export interface InitialPathwayItem {
  id: string
  employeeId: string
  employeeName: string
  occupationCode: string
  occupationTitle: string
  targetRoleCode: string
  targetRoleTitle: string
  generatedAt: string
  status: 'PENDING_EXPERT_CONFIRMATION' | 'REGENERATED_PENDING_REVIEW' | 'APPROVED'
  modules: PathwayModuleItem[]
  regenerationFeedback?: string
}

export const AVAILABLE_CATALOG_MODULES: {
  id: string
  code: string
  title: string
  estimatedHours: number
  domain: string
  reason: string
}[] = [
  {
    id: 'cat-cyp-101',
    code: 'MOD-CYP-101',
    title: 'Accelerated Cypher Querying & Pattern Traversal',
    estimatedHours: 6,
    domain: 'Graph Database',
    reason: 'Declarative Cypher path matching and pattern traversal optimization.',
  },
  {
    id: 'cat-gnn-201',
    code: 'MOD-GNN-201',
    title: 'Hands-on Geometric Deep Learning & Message Passing',
    estimatedHours: 8,
    domain: 'AI & Data Science',
    reason: 'Graph convolutional networks, PyTorch Geometric, and localized embeddings.',
  },
  {
    id: 'cat-ont-301',
    code: 'MOD-ONT-301',
    title: 'Enterprise Ontology Modeling with OWL 2 & Protege',
    estimatedHours: 6,
    domain: 'Knowledge Systems',
    reason: 'Axiom reasoning, semantic taxonomies, and description logic verification.',
  },
  {
    id: 'cat-dkt-401',
    code: 'MOD-DKT-401',
    title: 'Personalized Cognitive Modeling with Transformer DKT',
    estimatedHours: 10,
    domain: 'AI & Data Science',
    reason: 'Deep knowledge tracing and latent learner state forecasting.',
  },
  {
    id: 'cat-kaf-108',
    code: 'MOD-KAF-108',
    title: 'Event-Driven Microservices & Kafka Stream Processing',
    estimatedHours: 8,
    domain: 'Distributed Systems',
    reason: 'Transactional outbox event streaming and partition consumer semantics.',
  },
  {
    id: 'cat-pg-202',
    code: 'MOD-PG-202',
    title: 'PostgreSQL Relational Schema Optimization & Indexing',
    estimatedHours: 6,
    domain: 'Data Persistence',
    reason: 'Query planner optimization, MVCC isolation, and partial index architectures.',
  },
  {
    id: 'cat-dist-304',
    code: 'MOD-DIST-304',
    title: 'Distributed Consensus & Replication Protocols',
    estimatedHours: 8,
    domain: 'Distributed Systems',
    reason: 'Raft consensus protocols, leader election, and gRPC streaming.',
  },
  {
    id: 'cat-k8s-402',
    code: 'MOD-K8S-402',
    title: 'Cloud-Native Container Orchestration & Telemetry',
    estimatedHours: 10,
    domain: 'Infrastructure',
    reason: 'Kubernetes workload topology, Istio service meshes, and OpenTelemetry spans.',
  },
  {
    id: 'cat-sec-105',
    code: 'MOD-SEC-105',
    title: 'Zero-Trust Architecture & Identity Federation',
    estimatedHours: 6,
    domain: 'Security',
    reason: 'OAuth2/OIDC token verification, mTLS encryption, and role-based access control.',
  },
  {
    id: 'cat-ai-405',
    code: 'MOD-AI-405',
    title: 'Foundation Model Fine-Tuning & Quantization (LoRA / QLoRA)',
    estimatedHours: 12,
    domain: 'AI & Data Science',
    reason: 'Parameter-efficient fine-tuning, 4-bit quantization, and evaluation benchmarks.',
  },
]

const INITIAL_PATHWAY_ITEMS: InitialPathwayItem[] = [
  {
    id: 'pathway-rev-01',
    employeeId: 'emp-alex',
    employeeName: 'Alex Chen',
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-001',
    targetRoleTitle: 'AI Knowledge Architect',
    generatedAt: '2026-10-15 09:30',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-1',
        code: 'MOD-001',
        title: 'Foundations of Knowledge Graphs & Cypher Querying',
        estimatedHours: 8,
        included: true,
        reason: 'Essential prerequisite baseline for graph querying in assigned occupation.',
      },
      {
        id: 'mod-2',
        code: 'MOD-002',
        title: 'Graph Neural Networks & Relational Inductive Biases',
        estimatedHours: 14,
        included: true,
        reason: 'Key competency for AI Knowledge Architect target role.',
      },
      {
        id: 'mod-3',
        code: 'MOD-003',
        title: 'Transactional Microservice Architecture in Spring Boot',
        estimatedHours: 10,
        included: false,
        reason: 'Elective engineering module - recommend exclusion to focus on core AI Graph path.',
      },
      {
        id: 'mod-4',
        code: 'MOD-004',
        title: 'Dynamic Knowledge Tracing & Pedagogical Modeling',
        estimatedHours: 12,
        included: true,
        reason: 'Direct target threshold competency gap identified in baseline assessment.',
      },
    ],
  },
  {
    id: 'pathway-rev-02',
    employeeId: 'emp-liam',
    employeeName: "Liam O'Connor",
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-002',
    targetRoleTitle: 'Senior Machine Learning Engineer',
    generatedAt: '2026-10-15 08:45',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-5',
        code: 'MOD-ML-101',
        title: 'Production Model Serving & Triton Architecture',
        estimatedHours: 10,
        included: true,
        reason: 'High priority competency gap from diagnostic assessment.',
      },
      {
        id: 'mod-6',
        code: 'MOD-ML-201',
        title: 'Feature Store Engineering with Feast & Redis',
        estimatedHours: 8,
        included: true,
        reason: 'Production MLOps pipeline requirement.',
      },
      {
        id: 'mod-7',
        code: 'MOD-ML-301',
        title: 'Distributed Model Training with Ray & PyTorch',
        estimatedHours: 16,
        included: true,
        reason: 'Target role core requirement.',
      },
    ],
  },
  {
    id: 'pathway-rev-03',
    employeeId: 'emp-zoe',
    employeeName: 'Zoe Martinez',
    occupationCode: '15-1243.00',
    occupationTitle: 'Database Architects',
    targetRoleCode: 'TR-003',
    targetRoleTitle: 'Full-Stack Knowledge Engineer',
    generatedAt: '2026-10-14 14:20',
    status: 'REGENERATED_PENDING_REVIEW',
    regenerationFeedback: 'Expert requested deeper focus on enterprise graph schema migrations rather than generic UI components.',
    modules: [
      {
        id: 'mod-8',
        code: 'MOD-KG-101',
        title: 'Enterprise Neo4j Cluster Configuration & Constraints',
        estimatedHours: 10,
        included: true,
        reason: 'Refined by replanner per expert request for database architecture focus.',
      },
      {
        id: 'mod-9',
        code: 'MOD-KG-202',
        title: 'Ontology Versioning and Cypher Refactoring Pipelines',
        estimatedHours: 12,
        included: true,
        reason: 'Added following expert regeneration guidance.',
      },
      {
        id: 'mod-10',
        code: 'MOD-KG-303',
        title: 'GraphQL & Semantic Graph API Gateways',
        estimatedHours: 8,
        included: true,
        reason: 'Cross-functional knowledge distribution.',
      },
    ],
  },
  {
    id: 'pathway-rev-04',
    employeeId: 'emp-marcus',
    employeeName: 'Marcus Vance',
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-004',
    targetRoleTitle: 'Senior Cognitive Systems Specialist',
    generatedAt: '2026-10-13 11:15',
    status: 'APPROVED',
    modules: [
      {
        id: 'mod-11',
        code: 'MOD-COG-101',
        title: 'Cognitive Architecture Foundations',
        estimatedHours: 10,
        included: true,
        reason: 'Core prerequisite.',
      },
      {
        id: 'mod-12',
        code: 'MOD-COG-201',
        title: 'Neuro-Symbolic Reasoning Engines',
        estimatedHours: 14,
        included: true,
        reason: 'Target role competency.',
      },
    ],
  },
]

export function ExpertPathwayReviewPage() {
  const { toast } = useToast()

  const [pathwayList, setPathwayList] = React.useState<InitialPathwayItem[]>(INITIAL_PATHWAY_ITEMS)
  const [selectedPathway, setSelectedPathway] = React.useState<InitialPathwayItem | null>(null)
  const [isPathwayModalOpen, setIsPathwayModalOpen] = React.useState(false)
  const [editingModules, setEditingModules] = React.useState<PathwayModuleItem[]>([])

  // Module addition from catalog state
  const [moduleSearchQuery, setModuleSearchQuery] = React.useState('')
  const [moduleDomainFilter, setModuleDomainFilter] = React.useState('all')

  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null)

  // Regeneration sub-dialog state
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = React.useState(false)
  const [regenerationInstructions, setRegenerationInstructions] = React.useState('')

  // Filters & Pagination
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Open Pathway Review Modal
  const handleOpenPathwayReview = (pathway: InitialPathwayItem) => {
    setSelectedPathway(pathway)
    setEditingModules([...pathway.modules])
    setModuleSearchQuery('')
    setModuleDomainFilter('all')
    setDraggedIndex(null)
    setDragOverIndex(null)
    setIsPathwayModalOpen(true)
  }

  // Toggle Module Inclusion
  const handleToggleModuleInclusion = (moduleId: string) => {
    setEditingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, included: !m.included } : m))
    )
  }

  // Remove a module from the pathway
  const handleRemoveModule = (moduleId: string) => {
    setEditingModules((prev) => prev.filter((m) => m.id !== moduleId))
  }

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }
    setEditingModules((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(draggedIndex, 1)
      updated.splice(dropIndex, 0, moved)
      return updated
    })
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Keyboard / arrow reordering fallback
  const handleMoveStep = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= editingModules.length) return
    setEditingModules((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }

  // Add existing module from catalog
  const handleAddModule = (mod: typeof AVAILABLE_CATALOG_MODULES[number]) => {
    const newStep: PathwayModuleItem = {
      id: `mod-${Date.now()}-${mod.code.toLowerCase()}`,
      code: mod.code,
      title: mod.title,
      estimatedHours: mod.estimatedHours,
      included: true,
      reason: mod.reason,
    }
    setEditingModules((prev) => [...prev, newStep])
    toast({
      title: 'Module Added to Pathway',
      description: `"${mod.title}" (${mod.code}) appended to pathway sequence.`,
      variant: 'success',
    })
  }

  // Available candidate modules not yet in editingModules
  const availableModules = React.useMemo(() => {
    const existingCodes = new Set(editingModules.map((m) => m.code))
    return AVAILABLE_CATALOG_MODULES.filter((m) => {
      const notAlreadyAdded = !existingCodes.has(m.code)
      const q = moduleSearchQuery.toLowerCase().trim()
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q)
      const matchesDomain =
        moduleDomainFilter === 'all' || m.domain === moduleDomainFilter
      return notAlreadyAdded && matchesQuery && matchesDomain
    })
  }, [editingModules, moduleSearchQuery, moduleDomainFilter])

  // Open Regenerate Dialog
  const handleOpenRegenerateDialog = () => {
    setRegenerationInstructions('')
    setIsRegenerateModalOpen(true)
  }

  // Submit Pathway Regeneration Request
  const handleSubmitRegeneration = () => {
    if (!selectedPathway) return
    const instructions = regenerationInstructions.trim() || 'Expert requested pathway recalibration with adjusted module prerequisites.'

    setPathwayList((prev) =>
      prev.map((p) =>
        p.id === selectedPathway.id
          ? {
              ...p,
              status: 'REGENERATED_PENDING_REVIEW',
              regenerationFeedback: instructions,
              generatedAt: 'Just now (Regenerated)',
              modules: [
                ...editingModules.filter((m) => m.included),
                {
                  id: `mod-regen-${Date.now()}`,
                  code: 'MOD-ADAPT-202',
                  title: 'Targeted Prerequisites & Practical Applied Lab',
                  estimatedHours: 8,
                  included: true,
                  reason: `System regenerated based on expert feedback: "${instructions}"`,
                },
              ],
            }
          : p
      )
    )

    toast({
      title: 'Pathway Regeneration Triggered',
      description: `The system has regenerated the adaptive pathway for ${selectedPathway.employeeName} based on your instructions. Ready for re-review.`,
      variant: 'info',
    })

    setIsRegenerateModalOpen(false)
    setIsPathwayModalOpen(false)
  }

  // Approve Pathway for Employee Learning
  const handleApprovePathway = () => {
    if (!selectedPathway) return

    setPathwayList((prev) =>
      prev.map((p) =>
        p.id === selectedPathway.id
          ? {
              ...p,
              status: 'APPROVED',
              modules: editingModules,
            }
          : p
      )
    )

    const activeCount = editingModules.filter((m) => m.included).length
    toast({
      title: 'Pathway Approved for Learning',
      description: `Initial pathway for ${selectedPathway.employeeName} approved with ${activeCount} active modules. Unlocked in employee portal.`,
      variant: 'success',
    })

    setIsPathwayModalOpen(false)
  }

  // Filter logic
  const filteredPathways = React.useMemo(() => {
    return pathwayList.filter((p) => {
      const matchesSearch =
        p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        p.targetRoleTitle.toLowerCase().includes(search.toLowerCase()) ||
        p.occupationTitle.toLowerCase().includes(search.toLowerCase()) ||
        p.occupationCode.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [pathwayList, search, statusFilter])

  const paginatedPathways = filteredPathways.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // KPIs
  const pendingCount = pathwayList.filter((p) => p.status === 'PENDING_EXPERT_CONFIRMATION').length
  const regeneratedCount = pathwayList.filter((p) => p.status === 'REGENERATED_PENDING_REVIEW').length
  const approvedCount = pathwayList.filter((p) => p.status === 'APPROVED').length

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Compass className="h-4 w-4 text-warning" />}
            title="Pending Review"
            value={`${pendingCount} To Review`}
            valueClassName="text-warning"
            description="Initial pathways awaiting expert review"
          />

          <StatCard
            variant="gradient"
            icon={<RefreshCw className="h-4 w-4 text-primary" />}
            title="Regenerated Pathways"
            value={`${regeneratedCount} In Re-Review`}
            valueClassName="text-primary"
            description="Replanned per expert instructions"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Approved Pathways"
            value={`${approvedCount} Active`}
            valueClassName="text-success"
            description="Employees actively learning"
          />

          <StatCard
            variant="gradient"
            icon={<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
            title="Total In Queue"
            value={`${pathwayList.length} Total`}
            description="100% compliant with O*NET standard"
          />
        </div>

        {/* Pathway Catalog & Review Queue */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary shrink-0" />
                  <span>Initial Learning Pathway Queue</span>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  Review adaptive learning pathways tailored for employees, adjust recommended modules, and approve personalized study plans.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar - Strict 1 line matching Occupations page */}
              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
                <div className="relative w-56 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search employee, occupation, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by Status"
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="all">All Statuses ({pathwayList.length})</option>
                    <option value="PENDING_EXPERT_CONFIRMATION">Pending Review ({pendingCount})</option>
                    <option value="REGENERATED_PENDING_REVIEW">Regenerated - Re-Review ({regeneratedCount})</option>
                    <option value="APPROVED">Approved ({approvedCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-xs font-semibold tracking-wider">
                    <th className="py-3 px-4">Employee & Occupation</th>
                    <th className="py-3 px-4">Target Role</th>
                    <th className="py-3 px-4 text-center">Active Modules</th>
                    <th className="py-3 px-4 text-center">Est. Duration</th>
                    <th className="py-3 px-4">Generated Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPathways.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        {pathwayList.length === 0 ? (
                          <EmptyState
                            bordered={false}
                            icon={<CheckCircle2 className="h-6 w-6 text-success" />}
                            title="All Pathways Processed"
                            description="All learning pathways have been reviewed and approved. New pathways will appear here once employees complete their baseline diagnostic assessments."
                          />
                        ) : (
                          <EmptyState
                            bordered={false}
                            icon={<Compass className="h-6 w-6 text-muted-foreground" />}
                            title="No Pathways Match Filters"
                            description="No learning pathways match your current search query or filter selection."
                            action={
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearch('')
                                  setStatusFilter('all')
                                }}
                              >
                                Clear Active Filters
                              </Button>
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedPathways.map((pathway) => {
                      const activeModules = pathway.modules.filter((m) => m.included)
                      const totalHours = activeModules.reduce((acc, m) => acc + m.estimatedHours, 0)
                      return (
                        <tr key={pathway.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-sm">{pathway.employeeName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border/50">{pathway.occupationCode}</span>
                              <span>{pathway.occupationTitle}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground text-sm">{pathway.targetRoleTitle}</div>
                            <div className="font-mono text-xs text-muted-foreground mt-0.5">{pathway.targetRoleCode}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="primary" className="text-xs font-mono font-medium">
                              {activeModules.length} / {pathway.modules.length} active
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono text-foreground text-sm">
                            {totalHours} hrs
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                            {pathway.generatedAt}
                          </td>
                          <td className="py-3.5 px-4">
                            {pathway.status === 'APPROVED' ? (
                              <Badge variant="success">APPROVED</Badge>
                            ) : pathway.status === 'REGENERATED_PENDING_REVIEW' ? (
                              <Badge variant="secondary" className="border-primary/30 text-primary">REGENERATED</Badge>
                            ) : (
                              <Badge variant="warning">AWAITING REVIEW</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-semibold"
                              onClick={() => handleOpenPathwayReview(pathway)}
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span>{pathway.status === 'APPROVED' ? 'Inspect' : 'Review'}</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredPathways.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredPathways.length / pageSize) || 1}
                totalItems={filteredPathways.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="pathways"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* PATHWAY AUDIT & MODULE INCLUSION MODAL */}
      <Dialog
        open={isPathwayModalOpen}
        onOpenChange={setIsPathwayModalOpen}
        className="max-w-4xl lg:max-w-5xl w-full max-h-[92vh] flex flex-col p-6 sm:p-7 overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Audit Initial Pathway: {selectedPathway?.employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto pr-1 flex-1">
          {/* Display previous regeneration feedback if present */}
          {selectedPathway?.regenerationFeedback && (
            <div className="p-3 rounded-xl bg-secondary/50 border border-primary/20 text-xs">
              <span className="font-bold text-primary flex items-center gap-1.5 mb-1">
                <RefreshCw size={13} /> Previous Regeneration Instructions:
              </span>
              <p className="text-muted-foreground">{selectedPathway.regenerationFeedback}</p>
            </div>
          )}

          {/* Add Existing Module from Catalog (Always Open) */}
          <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" />
                Add Existing Catalog Module
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {availableModules.length} module{availableModules.length === 1 ? '' : 's'} available to add
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-7 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search module title, code, or keyword..."
                  value={moduleSearchQuery}
                  onChange={(e) => setModuleSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-card"
                />
              </div>
              <div className="sm:col-span-5 relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={moduleDomainFilter}
                  onChange={(e) => setModuleDomainFilter(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                >
                  <option value="all">All Domains</option>
                  <option value="AI Architecture">AI Architecture</option>
                  <option value="Data Engineering">Data Engineering</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                </select>
              </div>
            </div>

            {/* Available Modules List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-card shadow-2xs">
              {availableModules.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching catalog modules available to add. Try adjusting your search query or domain filter.
                </div>
              ) : (
                availableModules.map((candidate) => (
                  <div
                    key={candidate.code}
                    className="p-2.5 px-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          {candidate.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {candidate.code}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {candidate.domain}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {candidate.reason} • <strong className="text-foreground">{candidate.estimatedHours} hrs</strong>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddModule(candidate)}
                      className="h-7 text-xs font-semibold shrink-0 gap-1 text-primary border-primary/30 hover:bg-primary hover:text-white transition-colors"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pathway Learning Modules Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Pathway Learning Modules ({editingModules.filter((m) => m.included).length} Included • {editingModules.filter((m) => m.included).reduce((acc, m) => acc + m.estimatedHours, 0)} hrs)
              </label>
              <button
                type="button"
                onClick={handleOpenRegenerateDialog}
                className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw size={12} />
                <span>Request Replanning</span>
              </button>
            </div>

            {/* Draggable Pathway Learning Modules List */}
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
              {editingModules.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No modules in pathway. Use the catalog above to add learning modules.
                </div>
              ) : (
                editingModules.map((mod, idx) => (
                  <div
                    key={mod.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'p-3 flex items-center justify-between gap-3 transition-all cursor-move select-none',
                      mod.included ? 'bg-card' : 'bg-muted/40 opacity-70',
                      draggedIndex === idx && 'opacity-40 border-2 border-dashed border-primary',
                      dragOverIndex === idx && draggedIndex !== idx && 'bg-primary/5 border-t-2 border-primary'
                    )}
                  >
                    {/* Drag Handle & Reorder Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                        title="Drag to reorder module"
                      >
                        <GripVertical size={15} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 rounded hover:bg-muted"
                          title="Move step up"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === editingModules.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          className="text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground p-0.5 rounded hover:bg-muted"
                          title="Move step down"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Step details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          Step {idx + 1}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold truncate',
                            mod.included ? 'text-foreground' : 'text-muted-foreground line-through'
                          )}
                        >
                          {mod.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {mod.code}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {mod.reason} • <strong className="text-foreground">{mod.estimatedHours} hrs</strong>
                      </p>
                    </div>

                    {/* Action buttons: Include/Exclude and Remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleModuleInclusion(mod.id)}
                        className={cn(
                          'text-xs font-semibold h-7 px-2.5 transition-all',
                          mod.included
                            ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5'
                            : 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                        )}
                      >
                        {mod.included ? (
                          <span className="flex items-center gap-1 text-muted-foreground hover:text-destructive">
                            <MinusCircle size={12} className="text-destructive" /> Exclude
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-primary">
                            <PlusCircle size={12} /> Include
                          </span>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveModule(mod.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove module from pathway"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer: Clear separation between secondary left action and primary right actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border mt-4 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenRegenerateDialog}
            className="text-xs text-primary border-primary/30 hover:bg-secondary font-semibold gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Regenerate Pathway</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPathwayModalOpen(false)}
              className="text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApprovePathway}
              className="font-semibold shadow-2xs gap-1.5 text-xs"
            >
              <CheckCircle2 size={14} />
              <span>Approve for Learning</span>
            </Button>
          </div>
        </div>
      </Dialog>

      {/* REGENERATE PATHWAY INSTRUCTIONS DIALOG */}
      <Dialog
        open={isRegenerateModalOpen}
        onOpenChange={setIsRegenerateModalOpen}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Request Pathway Regeneration
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Provide guidance to the automated planner on how to replan the learning pathway for {selectedPathway?.employeeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Replanning Instructions for System
            </label>
            <textarea
              rows={4}
              placeholder="E.g., Emphasize foundational graph theory and schema constraints; exclude generic microservice modules; prioritize shorter modules for faster pacing..."
              value={regenerationInstructions}
              onChange={(e) => setRegenerationInstructions(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            The planner will recalculate the micro-skill prerequisite graph and generate an updated pathway draft for your re-review.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsRegenerateModalOpen(false)}>
            Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitRegeneration}
            className="font-semibold shadow-2xs gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Generate New Pathway Draft</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}
