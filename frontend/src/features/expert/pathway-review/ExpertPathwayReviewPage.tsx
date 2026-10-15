import * as React from 'react'
import {
  CheckCircle2,
  Compass,
  Eye,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
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
  expertReviewNotes?: string
  regenerationFeedback?: string
}

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
    regenerationFeedback: 'Expert requested deeper focus on Neo4j schema migrations rather than generic UI components.',
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
    expertReviewNotes: 'Approved by Dr. Sarah Chen. Pathway perfectly aligns with Q4 technical roadmap.',
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
  const [pathwayReviewNotes, setPathwayReviewNotes] = React.useState('')

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
    setPathwayReviewNotes(pathway.expertReviewNotes || '')
    setIsPathwayModalOpen(true)
  }

  // Toggle Module Inclusion
  const handleToggleModuleInclusion = (moduleId: string) => {
    setEditingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, included: !m.included } : m))
    )
  }

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
              expertReviewNotes: pathwayReviewNotes.trim() || undefined,
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
        {/* Actions Bar */}
        <PageHeader />

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
                <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  Review initial pathways generated from employee baseline assessments, customize module inclusions, request system replanning, and approve for learning.
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
                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">Employee & Occupation</th>
                    <th className="py-2.5 px-3">Target Role</th>
                    <th className="py-2.5 px-3 text-center">Active Modules</th>
                    <th className="py-2.5 px-3 text-center">Est. Duration</th>
                    <th className="py-2.5 px-3">Generated Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPathways.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                        No learning pathway records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedPathways.map((pathway) => {
                      const activeModules = pathway.modules.filter((m) => m.included)
                      const totalHours = activeModules.reduce((acc, m) => acc + m.estimatedHours, 0)
                      return (
                        <tr key={pathway.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">{pathway.employeeName}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-[10px] bg-muted px-1 rounded">{pathway.occupationCode}</span>
                              <span>{pathway.occupationTitle}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">{pathway.targetRoleTitle}</div>
                            <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{pathway.targetRoleCode}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Badge variant="primary" className="text-[10px] font-mono">
                              {activeModules.length} / {pathway.modules.length} active
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-foreground">
                            {totalHours} hrs
                          </td>
                          <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                            {pathway.generatedAt}
                          </td>
                          <td className="py-3 px-3">
                            {pathway.status === 'APPROVED' ? (
                              <Badge variant="success">APPROVED</Badge>
                            ) : pathway.status === 'REGENERATED_PENDING_REVIEW' ? (
                              <Badge variant="secondary" className="border-primary/30 text-primary">REGENERATED</Badge>
                            ) : (
                              <Badge variant="warning">AWAITING REVIEW</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
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
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Audit Initial Pathway: {selectedPathway?.employeeName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Assigned Occupation: <strong>{selectedPathway?.occupationTitle}</strong> ({selectedPathway?.occupationCode}) • Target Role: <strong>{selectedPathway?.targetRoleTitle}</strong>.
            Customize module inclusions, request replanning, or approve for the employee to begin learning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display previous regeneration feedback if present */}
          {selectedPathway?.regenerationFeedback && (
            <div className="p-3 rounded-xl bg-secondary/50 border border-primary/20 text-xs">
              <span className="font-bold text-primary flex items-center gap-1.5 mb-1">
                <RefreshCw size={13} /> Previous Regeneration Instructions:
              </span>
              <p className="text-muted-foreground">{selectedPathway.regenerationFeedback}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
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

            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
              {editingModules.map((mod, idx) => (
                <div
                  key={mod.id}
                  className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                    mod.included ? 'bg-card' : 'bg-muted/40 opacity-75'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs font-mono text-primary">Step {idx + 1}.</span>
                      <span
                        className={`text-xs font-semibold ${
                          mod.included ? 'text-foreground' : 'text-muted-foreground line-through'
                        }`}
                      >
                        {mod.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {mod.code}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {mod.reason} • <strong className="text-foreground">{mod.estimatedHours} hrs</strong>
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleModuleInclusion(mod.id)}
                    className={cn(
                      'text-xs font-semibold shrink-0 h-7 px-2.5 transition-all',
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
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Expert Review Notes for Employee
            </label>
            <textarea
              rows={2}
              placeholder="Guidance on pacing, prerequisites to focus on, or module priorities..."
              value={pathwayReviewNotes}
              onChange={(e) => setPathwayReviewNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
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
