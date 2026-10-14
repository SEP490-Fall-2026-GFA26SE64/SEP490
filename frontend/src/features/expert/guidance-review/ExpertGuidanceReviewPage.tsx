import * as React from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  Compass,
  Edit3,
  Eye,
  MinusCircle,
  PlusCircle,
  Search,
  Target,
  ThumbsDown,
  ThumbsUp,
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
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

interface RoleOption {
  code: string
  title: string
}

const AVAILABLE_ROLE_OPTIONS: RoleOption[] = [
  { code: 'TR-001', title: 'AI Knowledge Architect' },
  { code: 'TR-002', title: 'Ontology & Graph Engineer' },
  { code: 'TR-003', title: 'Senior Cognitive Systems Specialist' },
  { code: 'TR-004', title: 'Fullstack Machine Learning Engineer' },
  { code: 'TR-005', title: 'L&D Cognitive Technologist' },
]

// 1. AI Role Guidance Data Interface
export interface AIRoleGuidanceItem {
  id: string
  employeeId: string
  employeeName: string
  department: string
  suggestedRoleCode: string
  suggestedRoleTitle: string
  aiConfidence: number
  baselineScore: number
  riasecTopTraits: string[]
  aiExplanation: string
  status: 'AWAITING_EXPERT_REVIEW' | 'CONFIRMED' | 'REVISED' | 'REJECTED'
  expertNotes?: string
  reviewedRoleTitle?: string
  submittedAt: string
}

// 2. Initial Learning Pathway Review Interface
export interface InitialPathwayItem {
  id: string
  employeeId: string
  employeeName: string
  targetRoleTitle: string
  generatedAt: string
  status: 'PENDING_EXPERT_CONFIRMATION' | 'REVIEWED_AND_CONFIRMED'
  modules: {
    id: string
    code: string
    title: string
    estimatedHours: number
    included: boolean
    reason: string
  }[]
  expertReviewNotes?: string
}

const INITIAL_GUIDANCE_ITEMS: AIRoleGuidanceItem[] = [
  {
    id: 'guidance-01',
    employeeId: 'emp-alex',
    employeeName: 'Alex Chen',
    department: 'Machine Learning & Cognitive Architecture',
    suggestedRoleCode: 'TR-001',
    suggestedRoleTitle: 'AI Knowledge Architect',
    aiConfidence: 94,
    baselineScore: 92,
    riasecTopTraits: ['Investigative (88%)', 'Artistic (76%)', 'Realistic (64%)'],
    aiExplanation:
      'High baseline diagnostic performance in graph theory and neural representations combined with strong Investigative RIASEC profile. Exhibits optimal cognitive readiness for ontology construction and knowledge engineering.',
    status: 'AWAITING_EXPERT_REVIEW',
    submittedAt: '2026-10-13 15:30',
  },
  {
    id: 'guidance-02',
    employeeId: 'emp-liam',
    employeeName: "Liam O'Connor",
    department: 'Software Engineering',
    suggestedRoleCode: 'TR-002',
    suggestedRoleTitle: 'Senior Machine Learning Engineer',
    aiConfidence: 87,
    baselineScore: 78,
    riasecTopTraits: ['Conventional (82%)', 'Investigative (79%)', 'Enterprising (60%)'],
    aiExplanation:
      'Balanced procedural rigor and deep algorithmic skills. Strong fit for scalable inference pipelines and production model serving workloads.',
    status: 'AWAITING_EXPERT_REVIEW',
    submittedAt: '2026-10-13 14:10',
  },
  {
    id: 'guidance-03',
    employeeId: 'emp-zoe',
    employeeName: 'Zoe Martinez',
    department: 'Distributed Systems',
    suggestedRoleCode: 'TR-003',
    suggestedRoleTitle: 'Full-Stack Knowledge Engineer',
    aiConfidence: 91,
    baselineScore: 84,
    riasecTopTraits: ['Artistic (85%)', 'Realistic (78%)', 'Investigative (72%)'],
    aiExplanation:
      'High interface visualization aptitude with demonstrated expertise in React and Vis.js graph exploration.',
    status: 'CONFIRMED',
    expertNotes: 'Confirmed by Dr. Sarah Chen. Matches department career ladder.',
    reviewedRoleTitle: 'Full-Stack Knowledge Engineer',
    submittedAt: '2026-10-12 11:00',
  },
]

const INITIAL_PATHWAY_ITEMS: InitialPathwayItem[] = [
  {
    id: 'pathway-rev-01',
    employeeId: 'emp-alex',
    employeeName: 'Alex Chen',
    targetRoleTitle: 'AI Knowledge Architect',
    generatedAt: '2026-10-13 16:00',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-1',
        code: 'MOD-001',
        title: 'Foundations of Knowledge Graphs & Cypher Querying',
        estimatedHours: 8,
        included: true,
        reason: 'Essential prerequisite baseline for graph querying.',
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
        reason: 'Direct target threshold competency.',
      },
    ],
  },
  {
    id: 'pathway-rev-02',
    employeeId: 'emp-liam',
    employeeName: "Liam O'Connor",
    targetRoleTitle: 'Senior Machine Learning Engineer',
    generatedAt: '2026-10-13 14:45',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-5',
        code: 'MOD-ML-101',
        title: 'Production Model Serving & Triton Architecture',
        estimatedHours: 10,
        included: true,
        reason: 'High priority competency gap.',
      },
      {
        id: 'mod-6',
        code: 'MOD-ML-201',
        title: 'Feature Store Engineering with Feast & Redis',
        estimatedHours: 8,
        included: true,
        reason: 'Production MLOps requirement.',
      },
    ],
  },
]

const formatRiasecTrait = (trait: string) => {
  // e.g. "Investigative (88%)" -> "I (88%)"
  const match = trait.match(/^([A-Za-z])[a-zA-Z\s]*(\(\d+%\))$/)
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  return trait
}

export function ExpertGuidanceReviewPage() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = React.useState<'guidance' | 'pathways'>('guidance')

  // Guidance Review State
  const [guidanceList, setGuidanceList] = React.useState<AIRoleGuidanceItem[]>(INITIAL_GUIDANCE_ITEMS)
  const [selectedGuidance, setSelectedGuidance] = React.useState<AIRoleGuidanceItem | null>(null)
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = React.useState(false)
  const [guidanceDecision, setGuidanceDecision] = React.useState<'confirm' | 'revise' | 'reject'>('confirm')
  const [revisedRoleCode, setRevisedRoleCode] = React.useState('TR-001')
  const [expertGuidanceNotes, setExpertGuidanceNotes] = React.useState('')

  // Pathway Review State
  const [pathwayList, setPathwayList] = React.useState<InitialPathwayItem[]>(INITIAL_PATHWAY_ITEMS)
  const [selectedPathway, setSelectedPathway] = React.useState<InitialPathwayItem | null>(null)
  const [isPathwayModalOpen, setIsPathwayModalOpen] = React.useState(false)
  const [editingModules, setEditingModules] = React.useState<InitialPathwayItem['modules']>([])
  const [pathwayReviewNotes, setPathwayReviewNotes] = React.useState('')

  // Open Guidance Decision Modal
  const handleOpenGuidanceModal = (item: AIRoleGuidanceItem, decision: 'confirm' | 'revise' | 'reject') => {
    setSelectedGuidance(item)
    setGuidanceDecision(decision)
    setRevisedRoleCode(item.suggestedRoleCode)
    setExpertGuidanceNotes('')
    setIsGuidanceModalOpen(true)
  }

  // Submit Guidance Review
  const handleSubmitGuidanceDecision = () => {
    if (!selectedGuidance) return

    const selectedRoleObj = AVAILABLE_ROLE_OPTIONS.find((r) => r.code === revisedRoleCode)
    const newStatus =
      guidanceDecision === 'confirm'
        ? 'CONFIRMED'
        : guidanceDecision === 'revise'
        ? 'REVISED'
        : 'REJECTED'

    const finalRoleTitle =
      guidanceDecision === 'revise' && selectedRoleObj
        ? selectedRoleObj.title
        : selectedGuidance.suggestedRoleTitle

    setGuidanceList((prev) =>
      prev.map((g) =>
        g.id === selectedGuidance.id
          ? {
              ...g,
              status: newStatus,
              reviewedRoleTitle: finalRoleTitle,
              expertNotes: expertGuidanceNotes.trim() || undefined,
            }
          : g
      )
    )

    toast({
      title: `AI Guidance ${newStatus === 'CONFIRMED' ? 'Confirmed' : newStatus === 'REVISED' ? 'Revised' : 'Rejected'}`,
      description: `Target role guidance for ${selectedGuidance.employeeName} updated (${finalRoleTitle}).`,
      variant: newStatus === 'CONFIRMED' ? 'success' : newStatus === 'REVISED' ? 'info' : 'warning',
    })

    setIsGuidanceModalOpen(false)
  }

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

  // Confirm Reviewed Pathway
  const handleConfirmPathway = () => {
    if (!selectedPathway) return

    setPathwayList((prev) =>
      prev.map((p) =>
        p.id === selectedPathway.id
          ? {
              ...p,
              status: 'REVIEWED_AND_CONFIRMED',
              modules: editingModules,
              expertReviewNotes: pathwayReviewNotes.trim() || undefined,
            }
          : p
      )
    )

    const activeCount = editingModules.filter((m) => m.included).length
    toast({
      title: 'Initial Pathway Confirmed',
      description: `Pathway for ${selectedPathway.employeeName} confirmed with ${activeCount} active modules. Ready for employee execution.`,
      variant: 'success',
    })
    setIsPathwayModalOpen(false)
  }

  // Filters & Pagination for Guidance
  const [guidanceSearch, setGuidanceSearch] = React.useState('')
  const [guidanceStatusFilter, setGuidanceStatusFilter] = React.useState('all')
  const [guidancePage, setGuidancePage] = React.useState(1)
  const [viewingGuidance, setViewingGuidance] = React.useState<AIRoleGuidanceItem | null>(null)
  const pageSize = 10

  const filteredGuidance = React.useMemo(() => {
    return guidanceList.filter((item) => {
      const matchesSearch =
        item.employeeName.toLowerCase().includes(guidanceSearch.toLowerCase()) ||
        item.suggestedRoleTitle.toLowerCase().includes(guidanceSearch.toLowerCase()) ||
        item.suggestedRoleCode.toLowerCase().includes(guidanceSearch.toLowerCase()) ||
        item.department.toLowerCase().includes(guidanceSearch.toLowerCase())
      const matchesStatus = guidanceStatusFilter === 'all' || item.status === guidanceStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [guidanceList, guidanceSearch, guidanceStatusFilter])

  const paginatedGuidance = filteredGuidance.slice((guidancePage - 1) * pageSize, guidancePage * pageSize)

  // Filters & Pagination for Pathways
  const [pathwaySearch, setPathwaySearch] = React.useState('')
  const [pathwayStatusFilter, setPathwayStatusFilter] = React.useState('all')
  const [pathwayPage, setPathwayPage] = React.useState(1)

  const filteredPathways = React.useMemo(() => {
    return pathwayList.filter((p) => {
      const matchesSearch =
        p.employeeName.toLowerCase().includes(pathwaySearch.toLowerCase()) ||
        p.targetRoleTitle.toLowerCase().includes(pathwaySearch.toLowerCase())
      const matchesStatus = pathwayStatusFilter === 'all' || p.status === pathwayStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [pathwayList, pathwaySearch, pathwayStatusFilter])

  const paginatedPathways = filteredPathways.slice((pathwayPage - 1) * pageSize, pathwayPage * pageSize)

  // KPIs
  const pendingGuidanceCount = guidanceList.filter((g) => g.status === 'AWAITING_EXPERT_REVIEW').length
  const pendingPathwayCount = pathwayList.filter((p) => p.status === 'PENDING_EXPERT_CONFIRMATION').length

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<BrainCircuit className="h-4 w-4 text-primary" />}
            title="AI Guidance Reviews"
            value={`${pendingGuidanceCount} Awaiting Review`}
            valueClassName="text-primary"
            description="Diagnostic & RIASEC suggestions"
          />

          <StatCard
            variant="gradient"
            icon={<Compass className="h-4 w-4 text-warning" />}
            title="Initial Pathways"
            value={`${pendingPathwayCount} To Validate`}
            valueClassName="text-warning"
            description="Pre-enrollment pathway reviews"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Confirmed Pathways"
            value={`${pathwayList.filter((p) => p.status === 'REVIEWED_AND_CONFIRMED').length} Active`}
            valueClassName="text-success"
            description="Employees actively learning"
          />

          <StatCard
            variant="gradient"
            icon={<Target className="h-4 w-4 text-primary" />}
            title="Guidance Accuracy"
            value="92% AI Match"
            description="Validated by domain experts"
          />
        </div>

        {/* Big Container with Tabs */}
        <Card>
          {/* Header & Tabs */}
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Clinical Guidance & Pathway Catalog
                </CardTitle>
                <CardDescription>
                  Validate AI recommendations and personalized learning pathways.
                </CardDescription>
              </div>

              {/* Mode Switcher & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('guidance')}
                    className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'guidance'
                        ? 'bg-card text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    <span>AI Guidance ({pendingGuidanceCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pathways')}
                    className={`px-3 py-1 rounded font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 'pathways'
                        ? 'bg-card text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Pathways ({pendingPathwayCount})</span>
                  </button>
                </div>

                {activeTab === 'guidance' ? (
                  <>
                    <div className="relative min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search guidance..."
                        value={guidanceSearch}
                        onChange={(e) => setGuidanceSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={guidanceStatusFilter}
                      onChange={(e) => setGuidanceStatusFilter(e.target.value)}
                      className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses ({guidanceList.length})</option>
                      <option value="AWAITING_EXPERT_REVIEW">Awaiting Review</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="REVISED">Revised</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </>
                ) : (
                  <>
                    <div className="relative min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search pathways..."
                        value={pathwaySearch}
                        onChange={(e) => setPathwaySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <select
                      value={pathwayStatusFilter}
                      onChange={(e) => setPathwayStatusFilter(e.target.value)}
                      className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses ({pathwayList.length})</option>
                      <option value="PENDING_EXPERT_CONFIRMATION">Awaiting Review</option>
                      <option value="REVIEWED_AND_CONFIRMED">Confirmed</option>
                    </select>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* TAB 1: AI ROLE GUIDANCE REVIEW TABLE */}
            {activeTab === 'guidance' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Employee</th>
                        <th className="py-2.5 px-3">Suggested Role</th>
                        <th className="py-2.5 px-3">RIASEC Traits</th>
                        <th className="py-2.5 px-3 text-center">AI Confidence</th>
                        <th className="py-2.5 px-3 text-center">Diagnostic Score</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedGuidance.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                            No AI role guidance records match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedGuidance.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-foreground">{item.employeeName}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">{item.department}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-foreground">
                                {item.reviewedRoleTitle || item.suggestedRoleTitle}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                                {item.suggestedRoleCode}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {item.riasecTopTraits.map((trait) => (
                                  <span
                                    key={trait}
                                    title={trait}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground border border-border font-medium font-mono whitespace-nowrap"
                                  >
                                    {formatRiasecTrait(trait)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge variant="primary" className="text-[10px] font-mono">
                                {item.aiConfidence}% match
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-center font-bold font-mono text-foreground">
                              {item.baselineScore}%
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={
                                  item.status === 'CONFIRMED'
                                    ? 'success'
                                    : item.status === 'REVISED'
                                    ? 'secondary'
                                    : item.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'warning'
                                }
                              >
                                {item.status.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setViewingGuidance(item)}
                                  title="View Diagnostic Reasoning"
                                  aria-label="View Diagnostic Reasoning"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                                {item.status === 'AWAITING_EXPERT_REVIEW' ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleOpenGuidanceModal(item, 'confirm')}
                                      title="Confirm Target Role"
                                      aria-label="Confirm Target Role"
                                    >
                                      <ThumbsUp className="h-4 w-4 text-success" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleOpenGuidanceModal(item, 'revise')}
                                      title="Revise Target Role"
                                      aria-label="Revise Target Role"
                                    >
                                      <Edit3 className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleOpenGuidanceModal(item, 'reject')}
                                      title="Reject Recommendation"
                                      aria-label="Reject Recommendation"
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleOpenGuidanceModal(item, 'revise')}
                                    title="Modify Review"
                                    aria-label="Modify Review"
                                  >
                                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredGuidance.length > 0 && (
                  <Pagination
                    currentPage={guidancePage}
                    totalPages={Math.ceil(filteredGuidance.length / pageSize) || 1}
                    totalItems={filteredGuidance.length}
                    pageSize={pageSize}
                    onPageChange={setGuidancePage}
                    itemLabel="guidance records"
                  />
                )}
              </>
            )}

            {/* TAB 2: INITIAL LEARNING PATHWAY REVIEW TABLE */}
            {activeTab === 'pathways' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Employee</th>
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
                            No learning pathway items match your filter criteria.
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
                                <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{pathway.employeeId}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-semibold text-foreground">{pathway.targetRoleTitle}</div>
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
                                <Badge variant={pathway.status === 'REVIEWED_AND_CONFIRMED' ? 'success' : 'warning'}>
                                  {pathway.status === 'REVIEWED_AND_CONFIRMED' ? 'CONFIRMED' : 'AWAITING REVIEW'}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleOpenPathwayReview(pathway)}
                                    title={pathway.status === 'REVIEWED_AND_CONFIRMED' ? 'Inspect / Edit Modules' : 'Review & Confirm Pathway'}
                                    aria-label="Review & Confirm Pathway"
                                  >
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>
                                </div>
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
                    currentPage={pathwayPage}
                    totalPages={Math.ceil(filteredPathways.length / pageSize) || 1}
                    totalItems={filteredPathways.length}
                    pageSize={pageSize}
                    onPageChange={setPathwayPage}
                    itemLabel="pathways"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GUIDANCE DECISION MODAL */}
      <Dialog open={isGuidanceModalOpen} onOpenChange={setIsGuidanceModalOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            {guidanceDecision === 'confirm'
              ? `Confirm Target Role for ${selectedGuidance?.employeeName}`
              : guidanceDecision === 'revise'
              ? `Revise Target Role for ${selectedGuidance?.employeeName}`
              : `Reject Target Role Guidance`}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Your clinical judgment takes precedence over automated AI recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {guidanceDecision === 'revise' && (
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Select Alternate Target Role
              </label>
              <select
                value={revisedRoleCode}
                onChange={(e) => setRevisedRoleCode(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
              >
                {AVAILABLE_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.title} ({opt.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Expert Clinical Feedback & Advice
            </label>
            <textarea
              rows={3}
              placeholder="Enter clinical rationale, skill preparation advice, or development goals..."
              value={expertGuidanceNotes}
              onChange={(e) => setExpertGuidanceNotes(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsGuidanceModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmitGuidanceDecision} className="font-semibold shadow-2xs">
            Confirm Decision
          </Button>
        </DialogFooter>
      </Dialog>

      {/* PATHWAY AUDIT & MODULE INCLUSION MODAL */}
      <Dialog open={isPathwayModalOpen} onOpenChange={setIsPathwayModalOpen} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Audit Initial Pathway: {selectedPathway?.employeeName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Target Role: <strong>{selectedPathway?.targetRoleTitle}</strong>. Include or exclude suggested modules before the employee starts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Recommended Learning Modules ({editingModules.filter((m) => m.included).length} Included)
            </label>
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
                      <span className={`text-xs font-semibold ${mod.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
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
                    variant={mod.included ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleModuleInclusion(mod.id)}
                    className="text-xs font-semibold shrink-0 h-8"
                  >
                    {mod.included ? (
                      <span className="text-destructive flex items-center gap-1">
                        <MinusCircle size={13} /> Exclude
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <PlusCircle size={13} /> Include
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

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsPathwayModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleConfirmPathway} className="font-semibold shadow-2xs">
            Confirm Reviewed Pathway
          </Button>
        </DialogFooter>
      </Dialog>

      {/* VIEW DIAGNOSTIC REASONING MODAL */}
      <Dialog open={Boolean(viewingGuidance)} onOpenChange={(open) => !open && setViewingGuidance(null)} className="max-w-lg">
        {viewingGuidance && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                AI Role Recommendation: {viewingGuidance.employeeName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Detailed diagnostic evidence and psychometric RIASEC profile breakdown.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Suggested Target Role</span>
                  <strong className="text-foreground text-sm font-bold">{viewingGuidance.suggestedRoleTitle}</strong>
                  <span className="font-mono text-[10px] text-muted-foreground block mt-0.5">{viewingGuidance.suggestedRoleCode}</span>
                </div>
                <Badge variant="primary" className="font-mono text-xs">
                  {viewingGuidance.aiConfidence}% AI Match
                </Badge>
              </div>

              <div>
                <span className="font-semibold text-foreground block mb-1">RIASEC Traits Attainment</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingGuidance.riasecTopTraits.map((t) => (
                    <span key={t} title={t} className="px-2 py-0.5 rounded bg-card border border-border text-[11px] font-medium text-foreground">
                      <span className="font-bold text-primary mr-1">{formatRiasecTrait(t)}</span>
                      <span className="text-muted-foreground">({t.split(' ')[0]})</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-foreground block mb-1">AI Diagnostic Reasoning</span>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border">
                  {viewingGuidance.aiExplanation}
                </p>
              </div>

              {viewingGuidance.expertNotes && (
                <div>
                  <span className="font-semibold text-foreground block mb-1">Expert Clinical Notes</span>
                  <div className="text-xs text-foreground bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                    {viewingGuidance.expertNotes}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setViewingGuidance(null)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </WorkspaceLayout>
  )
}
export const ExpertPathwayReviewPage = ExpertGuidanceReviewPage
