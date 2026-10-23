import * as React from 'react'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export interface SubmissionItem {
  id: string
  code: string
  title: string
  type: 'module' | 'assessment'
  occupation: string
  submittedBy: string
  submittedAt: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REVISION_REQUESTED'
  microSkillsMapped: string[]
  itemDetails: string
  revisionNotes?: string
}

const INITIAL_SUBMISSIONS: SubmissionItem[] = [
  {
    id: 'sub-01',
    code: 'MOD-004',
    title: 'Graph Neural Networks & Relational Inductive Biases',
    type: 'module',
    occupation: 'Software Developers',
    submittedBy: 'Dr. Sarah Chen',
    submittedAt: '2026-10-13 16:30',
    status: 'PENDING_REVIEW',
    microSkillsMapped: ['MS-004 (Graph Neural Networks)', 'MS-007 (Relational Inductive Biases)'],
    itemDetails: '18 Interactive exercises, 1 Capstone coding notebook.',
  },
  {
    id: 'sub-02',
    code: 'ASMT-009',
    title: 'Dynamic Knowledge Tracing Assessment Blueprint',
    type: 'assessment',
    occupation: 'Software Developers',
    submittedBy: 'Chen Wei',
    submittedAt: '2026-10-13 14:15',
    status: 'PENDING_REVIEW',
    microSkillsMapped: ['MS-008 (DKT Modeling)', 'MS-002 (Knowledge State Tracking)'],
    itemDetails: '12 MCQ Questions, 3 Difficulty Tiers, 80% Mastery Threshold.',
  },
  {
    id: 'sub-03',
    code: 'MOD-005',
    title: 'High-Concurrency Outbox Pattern in Spring Boot',
    type: 'module',
    occupation: 'Computer Systems Engineers/Architects',
    submittedBy: 'Chen Wei',
    submittedAt: '2026-10-12 11:20',
    status: 'PENDING_REVIEW',
    microSkillsMapped: ['MS-012 (Transactional Outbox)', 'MS-015 (Hexagonal Architecture)'],
    itemDetails: '4 Lessons, 90 mins total duration, 1 integration test verification step.',
  },
  {
    id: 'sub-04',
    code: 'MOD-001',
    title: 'Foundations of Knowledge Graphs & Cypher Querying',
    type: 'module',
    occupation: 'Database Architects',
    submittedBy: 'Dr. Sarah Chen',
    submittedAt: '2026-10-10 09:00',
    status: 'APPROVED',
    microSkillsMapped: ['MS-001 (Graph Theory Basics)', 'MS-003 (Cypher Fundamentals)'],
    itemDetails: 'Instructional module approved for enterprise onboarding pathways.',
  },
]

export function ContentApprovalQueuePage() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = React.useState<'offerings' | 'baseline'>('offerings')
  const [submissions, setSubmissions] = React.useState<SubmissionItem[]>(INITIAL_SUBMISSIONS)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')

  // Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = React.useState(false)
  const [selectedSubmission, setSelectedSubmission] = React.useState<SubmissionItem | null>(null)
  const [revisionFeedback, setRevisionFeedback] = React.useState('')

  // Baseline Config State
  const [baselineQuestionCount, setBaselineQuestionCount] = React.useState('15')
  const [baselinePassThreshold, setBaselinePassThreshold] = React.useState('70')
  const [baselineSelectionMode, setBaselineSelectionMode] = React.useState('ADAPTIVE_DIAGNOSTIC')
  const [isSavingBaseline, setIsSavingBaseline] = React.useState(false)

  // Filter submissions
  const filteredSubmissions = submissions.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.submittedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.occupation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  // Approve Offering
  const handleApprove = (item: SubmissionItem) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, status: 'APPROVED' } : s))
    )
    toast({
      title: 'Learning Offering Approved',
      description: `${item.title} (${item.code}) is approved for organizational use in pathways and individual learning.`,
      variant: 'success',
    })
  }

  // Open Revision Dialog
  const handleOpenRevision = (item: SubmissionItem) => {
    setSelectedSubmission(item)
    setRevisionFeedback('')
    setIsRevisionModalOpen(true)
  }

  // Submit Revision Notes
  const handleSubmitRevision = () => {
    if (!selectedSubmission || !revisionFeedback.trim()) return

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === selectedSubmission.id
          ? { ...s, status: 'REVISION_REQUESTED', revisionNotes: revisionFeedback.trim() }
          : s
      )
    )

    toast({
      title: 'Revision Feedback Returned',
      description: `Returned ${selectedSubmission.code} to ${selectedSubmission.submittedBy} with revision feedback.`,
      variant: 'warning',
    })
    setIsRevisionModalOpen(false)
  }

  const [currentPage, setCurrentPage] = React.useState(1)
  const [viewingSubmission, setViewingSubmission] = React.useState<SubmissionItem | null>(null)
  const pageSize = 10

  const paginatedSubmissions = filteredSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Save Baseline Config
  const handleSaveBaselineConfig = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingBaseline(true)
    setTimeout(() => {
      setIsSavingBaseline(false)
      toast({
        title: 'Baseline Assessment Rules Applied',
        description: 'Question distribution and scoring parameters updated for employee onboarding assessments.',
        variant: 'success',
      })
    }, 400)
  }

  // KPI Calculations
  const pendingCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length
  const revisionCount = submissions.filter((s) => s.status === 'REVISION_REQUESTED').length

  const getTypeBadge = (type: SubmissionItem['type']) => {
    switch (type) {
      case 'module':
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
            Module
          </Badge>
        )
      case 'assessment':
        return (
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
            Assessment
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: SubmissionItem['status']) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">PENDING</Badge>
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>
      case 'REVISION_REQUESTED':
        return <Badge variant="destructive">REVISION</Badge>
    }
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'offerings' | 'baseline')}>
          {/* Actions Bar with Right-aligned Tabs */}
          <PageHeader
            actions={
              <div className="w-full flex items-center justify-end gap-2.5">
                <TabsList className="w-auto bg-muted/70 p-1">
                  <TabsTrigger
                    value="offerings"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <BookOpen size={14} className="text-primary" />
                    <span>Approval Queue ({pendingCount})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="baseline"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card"
                  >
                    <Settings size={14} className="text-primary" />
                    <span>Baseline Config</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            }
          />

          {/* Aggregate KPI StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              variant="gradient"
              icon={<Clock className="h-4 w-4 text-warning" />}
              title="Pending Offerings"
              value={`${pendingCount} Awaiting Review`}
              valueClassName="text-warning"
              description="Submitted by domain experts"
            />

            <StatCard
              variant="gradient"
              icon={<CheckCircle2 className="h-4 w-4 text-success" />}
              title="Approved Offerings"
              value={`${approvedCount} Offerings`}
              valueClassName="text-success"
              description="Live in organizational catalog"
            />

            <StatCard
              variant="gradient"
              icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
              title="Revision Requested"
              value={`${revisionCount} Returned`}
              description="Awaiting expert adjustments"
            />

            <StatCard
              variant="gradient"
              icon={<Award className="h-4 w-4 text-primary" />}
              title="Baseline Diagnostic"
              value={`${baselineQuestionCount} Questions`}
              description={`${baselinePassThreshold}% Readiness benchmark`}
            />
          </div>

          {/* TAB 1: APPROVAL QUEUE */}
          <TabsContent value="offerings" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Learning Offering Governance Catalog
                    </CardTitle>
                    <CardDescription>
                      Review and approve modules and assessments submitted by Experts.
                    </CardDescription>
                  </div>

                  {/* Search, Type, and Status Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search offerings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        aria-label="Filter by Offering Type"
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="ALL">All Offering Types</option>
                        <option value="module">Modules</option>
                        <option value="assessment">Assessments</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        aria-label="Filter by Status"
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="ALL">All Statuses ({submissions.length})</option>
                        <option value="PENDING_REVIEW">Pending Approval ({pendingCount})</option>
                        <option value="APPROVED">Approved ({approvedCount})</option>
                        <option value="REVISION_REQUESTED">Revision Requested ({revisionCount})</option>
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
                        <th className="py-2.5 px-3">OFFERING CODE</th>
                        <th className="py-2.5 px-3">TITLE</th>
                        <th className="py-2.5 px-3">TYPE</th>
                        <th className="py-2.5 px-3">OCCUPATION &amp; EXPERT</th>
                        <th className="py-2.5 px-3">MICRO-SKILLS MAPPED</th>
                        <th className="py-2.5 px-3">STATUS</th>
                        <th className="py-2.5 px-3 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6">
                            <EmptyState
                              icon={<CheckCircle2 className="h-10 w-10 text-success" />}
                              title="All Pathways and Offerings Processed"
                              description="There are currently no learning offerings or pathways awaiting review. Any new submissions from domain experts will appear here."
                              action={
                                searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSearchQuery('')
                                      setTypeFilter('ALL')
                                      setStatusFilter('ALL')
                                    }}
                                  >
                                    Reset Filters
                                  </Button>
                                ) : undefined
                              }
                            />
                          </td>
                        </tr>
                      ) : (
                        paginatedSubmissions.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-foreground block text-xs">{item.code}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-foreground text-xs">{item.title}</div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Submitted {item.submittedAt}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {getTypeBadge(item.type)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="text-xs font-semibold text-foreground">
                                {item.occupation.replace(/\s*\(\d{2}-\d{4}\.\d{2}\)/g, '')}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">By {item.submittedBy}</div>
                            </td>
                            <td className="py-3 px-3">
                              {item.microSkillsMapped.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className="text-xs font-medium text-foreground"
                                    title={item.microSkillsMapped[0]}
                                  >
                                    {item.microSkillsMapped[0]}
                                  </span>
                                  {item.microSkillsMapped.length > 1 && (
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-default"
                                      title={`+${item.microSkillsMapped.length - 1} more: ${item.microSkillsMapped.slice(1).join(', ')}`}
                                    >
                                      +{item.microSkillsMapped.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {getStatusBadge(item.status)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setViewingSubmission(item)}
                                title="View Details"
                                aria-label="View Details"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredSubmissions.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredSubmissions.length / pageSize) || 1}
                    totalItems={filteredSubmissions.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    itemLabel="offerings"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: BASELINE ASSESSMENT CONFIGURATION */}
          <TabsContent value="baseline" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Baseline Competency Diagnostic Configuration
                </CardTitle>
                <CardDescription>
                  Define the question distribution, scoring algorithm, and benchmark readiness for the diagnostic assessment.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-7">
                <form onSubmit={handleSaveBaselineConfig} className="max-w-2xl space-y-5">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Question Selection Strategy
                      </label>
                      <select
                        value={baselineSelectionMode}
                        onChange={(e) => setBaselineSelectionMode(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                      >
                        <option value="ADAPTIVE_DIAGNOSTIC">Adaptive Item Response (Dynamic Difficulty Scaling)</option>
                        <option value="STRATIFIED_RANDOM">Stratified Random (Even Coverage Across All Occupations)</option>
                        <option value="FIXED_BENCHMARK">Standard Fixed Curricular Benchmark</option>
                      </select>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        Determines how questions are pulled from Expert assessment banks for new employees.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1.5">
                          Total Diagnostic Questions
                        </label>
                        <Input
                          type="number"
                          min="5"
                          max="50"
                          value={baselineQuestionCount}
                          onChange={(e) => setBaselineQuestionCount(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1.5">
                          Readiness Benchmark Threshold (%)
                        </label>
                        <Input
                          type="number"
                          min="50"
                          max="100"
                          value={baselinePassThreshold}
                          onChange={(e) => setBaselinePassThreshold(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                      <strong className="text-foreground flex items-center gap-1.5">
                        <Sparkles size={13} className="text-primary" />
                        Dynamic Knowledge Tracing Integration
                      </strong>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        Upon assessment completion, the DKT model computes prior competency estimates and identifies skill gaps, which feed directly into AI-assisted role guidance and adaptive pathways.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSavingBaseline}
                      leftIcon={<CheckCircle2 size={14} />}
                      className="font-semibold shadow-2xs"
                    >
                      {isSavingBaseline ? 'Saving Configuration...' : 'Save Baseline Assessment Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* REVISION FEEDBACK DIALOG */}
      <Dialog open={isRevisionModalOpen} onOpenChange={setIsRevisionModalOpen} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {selectedSubmission?.title || 'Request Revision'}
            </DialogTitle>
            {selectedSubmission && (
              <Badge variant="warning">
                REVISION
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Provide actionable curricular feedback for {selectedSubmission?.submittedBy} ({selectedSubmission?.code}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Revision Instructions & Feedback <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Please refine questions #3 and #7 to better target practical scenario analysis..."
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsRevisionModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmitRevision}
            disabled={!revisionFeedback.trim()}
            className="font-semibold"
          >
            Send Revision Feedback
          </Button>
        </DialogFooter>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={Boolean(viewingSubmission)} onOpenChange={(open) => !open && setViewingSubmission(null)} className="max-w-xl">
        {viewingSubmission && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {viewingSubmission.title}
                </DialogTitle>
                <div className="flex items-center gap-1.5">
                  {getTypeBadge(viewingSubmission.type)}
                  {getStatusBadge(viewingSubmission.status)}
                </div>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Review curricular submission details, structural attributes, and pedagogical criteria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1 text-xs">
              {/* Scope & Structure Box */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-primary/20 space-y-1.5">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Scope &amp; Learning Structure
                </span>
                <p className="text-foreground text-xs font-semibold leading-relaxed">
                  {viewingSubmission.itemDetails}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Occupation</span>
                  <strong className="text-foreground text-xs">
                    {viewingSubmission.occupation.replace(/\s*\(\d{2}-\d{4}\.\d{2}\)/g, '')}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Submitted By</span>
                  <strong className="text-foreground text-xs">{viewingSubmission.submittedBy}</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-[11px] text-muted-foreground block">Submitted At</span>
                  <strong className="text-foreground text-xs">{viewingSubmission.submittedAt}</strong>
                </div>
              </div>

              {/* Mapped Micro-Skills */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Mapped Micro-Skills ({viewingSubmission.microSkillsMapped.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingSubmission.microSkillsMapped.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md bg-secondary/70 text-foreground font-mono text-[11px] border border-primary/20 font-medium inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Revision Notes if already returned */}
              {viewingSubmission.revisionNotes && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
                  <strong className="block font-semibold">Revision Feedback Sent:</strong>
                  <p>{viewingSubmission.revisionNotes}</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setViewingSubmission(null)}>
                Close
              </Button>

              {viewingSubmission.status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const item = viewingSubmission
                      setViewingSubmission(null)
                      handleOpenRevision(item)
                    }}
                    leftIcon={<ThumbsDown size={14} />}
                    className="font-semibold shadow-2xs"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const item = viewingSubmission
                      setViewingSubmission(null)
                      handleApprove(item)
                    }}
                    leftIcon={<ThumbsUp size={14} />}
                    className="font-semibold shadow-2xs"
                  >
                    Approve
                  </Button>
                </div>
              )}

              {viewingSubmission.status === 'REVISION_REQUESTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const item = viewingSubmission
                    setViewingSubmission(null)
                    handleOpenRevision(item)
                  }}
                  leftIcon={<MessageSquare size={14} className="text-warning" />}
                  className="font-semibold"
                >
                  Update Revision Notes
                </Button>
              )}
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </WorkspaceLayout>
  )
}
