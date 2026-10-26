import * as React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  Video,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getStoredLearningContents,
  saveOrUpdateContentPackage,
  deleteContentPackage,
  submitContentForApproval,
  subscribeToLearningContents,
  type LearningContentPackage,
} from '../../../shared/stores/learningContentStore'
import { type CourseraLessonItem } from '../../employee/modules/LearningModuleReaderPage'
import { fetchMicroSkills, type MicroSkillDto } from '../../../shared/api/microSkillApi'
import { getActiveCompany } from '../../../shared/stores/companyStore'

export function LearningContentAuthoringPage() {
  const { toast } = useToast()
  const activeCompany = getActiveCompany()
  const orgId = activeCompany?.id || 'comp-technova'

  const [contents, setContents] = React.useState<LearningContentPackage[]>(() =>
    getStoredLearningContents()
  )
  const [microSkills, setMicroSkills] = React.useState<MicroSkillDto[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')

  // Listen to store updates
  React.useEffect(() => {
    return subscribeToLearningContents(() => {
      setContents(getStoredLearningContents())
    })
  }, [])

  // Fetch available micro skills for mapping
  React.useEffect(() => {
    fetchMicroSkills(orgId)
      .then((res) => {
        if (res && res.length > 0) setMicroSkills(res)
      })
      .catch(() => {
        // Fallback standard micro-skills from ontology
      })
  }, [orgId])

  // Modals state
  const [isAuthorModalOpen, setIsAuthorModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false)
  const [selectedPackage, setSelectedPackage] = React.useState<LearningContentPackage | null>(null)

  // Form State for Authoring / Editing
  const [formId, setFormId] = React.useState('')
  const [formCode, setFormCode] = React.useState('')
  const [formTitle, setFormTitle] = React.useState('')
  const [formSkillCode, setFormSkillCode] = React.useState('MS-FS04')
  const [formSkillName, setFormSkillName] = React.useState('use query languages')
  const [formOccupation, setFormOccupation] = React.useState('Software Developers')
  const [formDuration, setFormDuration] = React.useState('45')
  const [formDescription, setFormDescription] = React.useState('')
  const [formLessons, setFormLessons] = React.useState<CourseraLessonItem[]>([])
  const [editingLessonIndex, setEditingLessonIndex] = React.useState<number | null>(null)

  // Reset or initialize authoring form
  const handleOpenCreate = () => {
    setSelectedPackage(null)
    setFormId(`mod-pkg-${Date.now()}`)
    setFormCode(`MOD-CUSTOM-${Math.floor(100 + Math.random() * 900)}`)
    setFormTitle('')
    setFormSkillCode(microSkills[0]?.code || 'MS-CORE01')
    setFormSkillName(microSkills[0]?.name || 'Implement programs and scripts')
    setFormOccupation('Software Developers')
    setFormDuration('45')
    setFormDescription('')
    setFormLessons([
      {
        id: `lesson-${Date.now()}-1`,
        title: 'Core Concepts and Implementation Patterns',
        type: 'reading',
        durationMinutes: 10,
        leadParagraph:
          'Structured programmatic techniques and conceptual foundations required for production systems.',
        readingSections: [
          {
            heading: 'Key Principles & System Design',
            content:
              'Detailing high-throughput structures, verified inputs, and defensive implementation boundaries.',
            bulletPoints: [
              { label: 'Interface Separation', text: 'Decouple domain logic from concrete database storage.' },
              { label: 'Defensive Checks', text: 'Validate boundary constraints prior to processing.' },
            ],
          },
        ],
      },
    ])
    setEditingLessonIndex(0)
    setIsAuthorModalOpen(true)
  }

  const handleOpenEdit = (pkg: LearningContentPackage) => {
    setSelectedPackage(pkg)
    setFormId(pkg.id)
    setFormCode(pkg.code)
    setFormTitle(pkg.title)
    setFormSkillCode(pkg.skillCode)
    setFormSkillName(pkg.skillName)
    setFormOccupation(pkg.occupation || 'Software Developers')
    setFormDuration(String(pkg.estimatedDuration || 45))
    setFormDescription(pkg.description || '')
    setFormLessons(pkg.lessons || [])
    setEditingLessonIndex(pkg.lessons.length > 0 ? 0 : null)
    setIsAuthorModalOpen(true)
  }

  // Handle adding a new lesson
  const handleAddLesson = (type: 'reading' | 'video') => {
    const newLesson: CourseraLessonItem = {
      id: `lesson-${Date.now()}-${formLessons.length + 1}`,
      title: type === 'reading' ? `Structured Reading ${formLessons.length + 1}` : `Video Lecture ${formLessons.length + 1}`,
      type,
      durationMinutes: type === 'reading' ? 10 : 15,
      leadParagraph: type === 'reading' ? 'Executive overview of key operational concepts.' : undefined,
      videoDuration: type === 'video' ? '14:20' : undefined,
      videoSummary: type === 'video' ? 'Deep-dive walkthrough of architectural components and execution flows.' : undefined,
      videoHighlights: type === 'video' ? ['Concept foundation', 'Live pattern walkthrough', 'Best practice summary'] : undefined,
      readingSections: type === 'reading' ? [
        {
          heading: 'Core Architecture',
          content: 'Narrative content describing technical patterns and domain rules.',
        },
      ] : undefined,
    }
    const updated = [...formLessons, newLesson]
    setFormLessons(updated)
    setEditingLessonIndex(updated.length - 1)
  }

  // Remove lesson
  const handleRemoveLesson = (idx: number) => {
    if (formLessons.length <= 1) {
      toast({
        title: 'At least one lesson required',
        description: 'A learning content module must have at least one instructional lesson.',
        variant: 'destructive',
      })
      return
    }
    const next = formLessons.filter((_, i) => i !== idx)
    setFormLessons(next)
    setEditingLessonIndex(Math.max(0, idx - 1))
  }

  // Update specific lesson field
  const updateActiveLesson = (updates: Partial<CourseraLessonItem>) => {
    if (editingLessonIndex === null || !formLessons[editingLessonIndex]) return
    const next = [...formLessons]
    next[editingLessonIndex] = { ...next[editingLessonIndex], ...updates }
    setFormLessons(next)
  }

  // Save form as draft or update
  const handleSaveDraft = () => {
    if (!formTitle.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please specify a title for this learning content package.',
        variant: 'destructive',
      })
      return
    }

    const totalDuration = formLessons.reduce((acc, l) => acc + (l.durationMinutes || 0), 0)

    const updatedPackage: LearningContentPackage = {
      id: formId,
      code: formCode.trim().toUpperCase(),
      title: formTitle.trim(),
      skillCode: formSkillCode,
      skillName: formSkillName,
      occupation: formOccupation,
      estimatedDuration: totalDuration || parseInt(formDuration, 10) || 45,
      description: formDescription.trim(),
      lessons: formLessons,
      status: selectedPackage ? selectedPackage.status : 'DRAFT',
      version: selectedPackage?.version || '1.0',
      submittedBy: selectedPackage?.submittedBy || 'Domain Expert (Dr. Sarah Chen)',
      createdAt: selectedPackage?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveOrUpdateContentPackage(updatedPackage)
    setContents(getStoredLearningContents())
    setIsAuthorModalOpen(false)

    toast({
      title: 'Content Package Saved',
      description: `Draft for ${updatedPackage.title} (${updatedPackage.code}) updated successfully.`,
      variant: 'success',
    })
  }

  // Submit to L&D Manager Approval Queue
  const handleConfirmSubmit = () => {
    if (!selectedPackage) return
    submitContentForApproval(selectedPackage.id, 'Dr. Sarah Chen (Domain Expert)')
    setContents(getStoredLearningContents())
    setIsSubmitModalOpen(false)

    toast({
      title: 'Submitted to L&D Manager',
      description: `${selectedPackage.title} (${selectedPackage.code}) has been queued at /ld-manager/approvals for review.`,
      variant: 'success',
    })
  }

  // Delete Package
  const handleConfirmDelete = () => {
    if (!selectedPackage) return
    deleteContentPackage(selectedPackage.id)
    setContents(getStoredLearningContents())
    setIsDeleteModalOpen(false)

    toast({
      title: 'Content Package Deleted',
      description: `${selectedPackage.title} (${selectedPackage.code}) removed from content studio.`,
      variant: 'success',
    })
  }

  // Filter content packages
  const filteredContents = contents.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.occupation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // KPI stats
  const totalPackages = contents.length
  const approvedCount = contents.filter((c) => c.status === 'APPROVED').length
  const pendingCount = contents.filter((c) => c.status === 'PENDING_APPROVAL').length
  const draftCount = contents.filter((c) => c.status === 'DRAFT' || c.status === 'REVISION_REQUESTED').length

  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 8
  const paginatedContents = filteredContents.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const activeLesson = editingLessonIndex !== null ? formLessons[editingLessonIndex] : null

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <PageHeader
          title="Learning Content Studio"
          description="Design, author, and submit structured interactive reading lessons and video curricula for L&D Manager approval before module publication."
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              leftIcon={<Plus size={16} />}
              className="shadow-xs font-semibold"
            >
              Author New Content
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Content Packages"
            value={totalPackages}
            description="Catalog lesson packages"
            icon={<BookOpen size={18} className="text-primary" />}
          />
          <StatCard
            title="Approved & Ready"
            value={approvedCount}
            description="Available for learning modules"
            icon={<CheckCircle2 size={18} className="text-success" />}
          />
          <StatCard
            title="Pending L&D Review"
            value={pendingCount}
            description="Awaiting manager sign-off"
            icon={<Clock size={18} className="text-warning" />}
          />
          <StatCard
            title="Drafts & Revisions"
            value={draftCount}
            description="In authoring or revision"
            icon={<Edit3 size={18} className="text-muted-foreground" />}
          />
        </div>

        {/* Filter and Search Bar */}
        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Search packages, skills, codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'APPROVED', 'PENDING_APPROVAL', 'REVISION_REQUESTED', 'DRAFT'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All'
                    : st === 'PENDING_APPROVAL'
                    ? 'Pending Review'
                    : st === 'REVISION_REQUESTED'
                    ? 'Revisions'
                    : st === 'APPROVED'
                    ? 'Approved'
                    : 'Drafts'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Packages Table */}
        <Card className="border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Content Package</th>
                  <th className="py-2.5 px-3">Mapped Micro-Skill</th>
                  <th className="py-2.5 px-3">Curriculum Outline</th>
                  <th className="py-2.5 px-3">L&amp;D Approval Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedContents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <BookOpen size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-semibold text-foreground">No learning content packages found</p>
                      <p className="text-xs mt-1">Author your first rich curriculum package or adjust your search filter.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedContents.map((pkg) => {
                    const readingCount = pkg.lessons.filter((l) => l.type === 'reading').length
                    const videoCount = pkg.lessons.filter((l) => l.type === 'video').length

                    return (
                      <tr key={pkg.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground text-xs">{pkg.code}</span>
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                v{pkg.version}
                              </Badge>
                            </div>
                            <div className="font-semibold text-foreground text-xs">{pkg.title}</div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{pkg.description}</p>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="space-y-0.5">
                            <div className="font-mono text-xs font-semibold text-foreground">
                              {pkg.skillCode}
                            </div>
                            <p className="text-xs text-foreground">{pkg.skillName}</p>
                            <span className="text-[11px] text-muted-foreground block">{pkg.occupation}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <span>{pkg.lessons.length} Lessons</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                                <Clock size={11} /> {pkg.estimatedDuration} mins
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {readingCount > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <FileText size={11} /> {readingCount} Reading
                                </span>
                              )}
                              {videoCount > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Video size={11} /> {videoCount} Video
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top">
                          <div className="space-y-1.5">
                            {pkg.status === 'APPROVED' && (
                              <Badge variant="success">APPROVED</Badge>
                            )}
                            {pkg.status === 'PENDING_APPROVAL' && (
                              <Badge variant="warning">IN REVIEW</Badge>
                            )}
                            {pkg.status === 'REVISION_REQUESTED' && (
                              <Badge variant="destructive">REVISION</Badge>
                            )}
                            {pkg.status === 'DRAFT' && (
                              <Badge variant="outline">DRAFT</Badge>
                            )}

                            {pkg.feedbackNotes && (
                              <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-[11px] text-destructive flex items-start gap-1.5">
                                <MessageSquare size={13} className="shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{pkg.feedbackNotes}</span>
                              </div>
                            )}

                            {pkg.reviewedBy && (
                              <span className="text-[10px] text-muted-foreground block">
                                Reviewed by {pkg.reviewedBy}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/employee/modules/${pkg.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview Full Lessons in Reader View"
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                <Eye size={15} />
                              </Button>
                            </a>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(pkg)}
                              title="Edit Content"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            >
                              <Edit3 size={15} />
                            </Button>

                            {pkg.status !== 'APPROVED' && pkg.status !== 'PENDING_APPROVAL' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPackage(pkg)
                                  setIsSubmitModalOpen(true)
                                }}
                                className="h-8 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-secondary/40"
                              >
                                <Send size={12} />
                                <span>Submit</span>
                              </Button>
                            )}

                            {pkg.status === 'APPROVED' && (
                              <span className="text-[11px] font-semibold text-success flex items-center gap-1 px-2">
                                <CheckCircle2 size={13} /> Ready
                              </span>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg)
                                setIsDeleteModalOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={15} />
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

          {filteredContents.length > pageSize && (
            <div className="p-4 border-t border-border flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredContents.length / pageSize)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>

        {/* ========================================================= */}
        {/* AUTHORING & EDITING MODAL (STUDIO)                        */}
        {/* ========================================================= */}
        <Dialog open={isAuthorModalOpen} onOpenChange={setIsAuthorModalOpen}>
          <div className="w-full max-w-4xl p-6 bg-card rounded-2xl border border-border shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {selectedPackage ? 'Edit Learning Content Package' : 'Author New Learning Content Package'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Build rich Coursera-grade lessons with formatted reading sections, code snippets, and video lectures.
                  </DialogDescription>
                </div>
                <Badge variant="primary" className="font-mono text-xs">
                  {formCode}
                </Badge>
              </div>
            </DialogHeader>

            {/* Top Package Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Module Title *</label>
                <Input
                  placeholder="e.g., Accelerated Cypher Querying & Pattern Traversal"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Module Code *</label>
                <Input
                  placeholder="e.g., MOD-CYP-101"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="font-mono text-xs sm:text-sm uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Target Micro-Skill (Teaches 1-1) *</label>
                <select
                  value={formSkillCode}
                  onChange={(e) => {
                    const sel = microSkills.find((s) => s.code === e.target.value)
                    setFormSkillCode(e.target.value)
                    if (sel) setFormSkillName(sel.name)
                  }}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {microSkills.length > 0 ? (
                    microSkills.map((sk) => (
                      <option key={sk.code} value={sk.code}>
                        {sk.code} — {sk.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="MS-CORE01">MS-CORE01 — Implement programs and scripts</option>
                      <option value="MS-CORE02">MS-CORE02 — Manage source changes with version control</option>
                      <option value="MS-FS04">MS-FS04 — use query languages</option>
                      <option value="MS-ARC01">MS-ARC01 — Model solution components and boundaries</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Overview & Syllabus Description</label>
                <textarea
                  rows={2}
                  placeholder="Summary of architectural topics and mastery objectives covered in this module..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-md border border-border bg-card p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Lessons Builder Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Curriculum Lessons ({formLessons.length})</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add Reading sections or Video lectures. Learners consume these directly in the employee portal.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLesson('reading')}
                    leftIcon={<FileText size={13} className="text-primary" />}
                    className="text-xs font-semibold"
                  >
                    + Add Reading
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLesson('video')}
                    leftIcon={<Video size={13} className="text-primary" />}
                    className="text-xs font-semibold"
                  >
                    + Add Video
                  </Button>
                </div>
              </div>

              {/* Lesson Tabs / Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border">
                {formLessons.map((l, idx) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setEditingLessonIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      editingLessonIndex === idx
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {l.type === 'reading' ? <FileText size={12} /> : <Video size={12} />}
                    <span>
                      {idx + 1}. {l.title.slice(0, 20)}...
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Lesson Editor */}
              {activeLesson && editingLessonIndex !== null && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={activeLesson.type === 'reading' ? 'secondary' : 'primary'} className="uppercase text-[10px]">
                        {activeLesson.type} Lesson
                      </Badge>
                      <span className="text-xs font-bold text-foreground">Lesson #{editingLessonIndex + 1}</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLesson(editingLessonIndex)}
                      className="text-destructive hover:bg-destructive/10 text-xs gap-1 font-semibold h-7"
                    >
                      <Trash2 size={13} /> Delete Lesson
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-semibold text-foreground">Lesson Title *</label>
                      <Input
                        value={activeLesson.title}
                        onChange={(e) => updateActiveLesson({ title: e.target.value })}
                        className="text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Duration (Minutes)</label>
                      <Input
                        type="number"
                        value={activeLesson.durationMinutes}
                        onChange={(e) => updateActiveLesson({ durationMinutes: parseInt(e.target.value, 10) || 5 })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Reading Specific Fields */}
                  {activeLesson.type === 'reading' && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Lead Paragraph / Summary</label>
                        <textarea
                          rows={2}
                          value={activeLesson.leadParagraph || ''}
                          onChange={(e) => updateActiveLesson({ leadParagraph: e.target.value })}
                          placeholder="Introductory paragraph introducing the key concepts..."
                          className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      </div>

                      {/* Sections */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Structured Sections</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const curr = activeLesson.readingSections || []
                              updateActiveLesson({
                                readingSections: [
                                  ...curr,
                                  {
                                    heading: `Section ${curr.length + 1}`,
                                    content: 'Explain the technical concept in detail here.',
                                  },
                                ],
                              })
                            }}
                            className="text-xs text-primary font-semibold h-7"
                          >
                            + Add Section
                          </Button>
                        </div>

                        {(activeLesson.readingSections || []).map((sec, sIdx) => (
                          <div key={sIdx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <Input
                                placeholder="Section Heading"
                                value={sec.heading || ''}
                                onChange={(e) => {
                                  const nextSecs = [...(activeLesson.readingSections || [])]
                                  nextSecs[sIdx] = { ...nextSecs[sIdx], heading: e.target.value }
                                  updateActiveLesson({ readingSections: nextSecs })
                                }}
                                className="text-xs font-bold w-3/4"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const nextSecs = (activeLesson.readingSections || []).filter((_, i) => i !== sIdx)
                                  updateActiveLesson({ readingSections: nextSecs })
                                }}
                                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>

                            <textarea
                              rows={3}
                              placeholder="Narrative explanation of the concept..."
                              value={sec.content || ''}
                              onChange={(e) => {
                                const nextSecs = [...(activeLesson.readingSections || [])]
                                nextSecs[sIdx] = { ...nextSecs[sIdx], content: e.target.value }
                                updateActiveLesson({ readingSections: nextSecs })
                              }}
                              className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video Specific Fields */}
                  {activeLesson.type === 'video' && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Video Duration Display</label>
                          <Input
                            placeholder="e.g., 14:20"
                            value={activeLesson.videoDuration || '14:20'}
                            onChange={(e) => updateActiveLesson({ videoDuration: e.target.value })}
                            className="text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Video Summary</label>
                        <textarea
                          rows={2}
                          value={activeLesson.videoSummary || ''}
                          onChange={(e) => updateActiveLesson({ videoSummary: e.target.value })}
                          placeholder="What will learners learn in this video lecture..."
                          className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => setIsAuthorModalOpen(false)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveDraft} className="font-semibold shadow-xs">
                  Save Content Package
                </Button>
              </div>
            </DialogFooter>
          </div>
        </Dialog>

        {/* Submit to L&D Approval Confirmation Modal */}
        <ConfirmationModal
          open={isSubmitModalOpen}
          onOpenChange={setIsSubmitModalOpen}
          onConfirm={handleConfirmSubmit}
          title="Submit to L&D Manager Approval Queue"
          description={`Are you ready to submit "${selectedPackage?.title}" (${selectedPackage?.code}) to http://localhost:8088/ld-manager/approvals? Once approved, it will be unlocked for inclusion in learning modules.`}
          confirmText="Submit for Approval"
          cancelText="Cancel"
          variant="primary"
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Learning Content"
          description={`Are you sure you want to permanently delete "${selectedPackage?.title}" (${selectedPackage?.code})? This action cannot be undone.`}
          confirmText="Delete Package"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </WorkspaceLayout>
  )
}
