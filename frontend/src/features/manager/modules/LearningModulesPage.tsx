import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Layers,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  INITIAL_MICRO_SKILLS,
  INITIAL_MODULES,
  type LearningModuleModel,
} from '../data/ldManagerMockData'

export function LearningModulesPage() {
  const { toast } = useToast()

  const [modules, setModules] = React.useState<LearningModuleModel[]>(INITIAL_MODULES)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'published' | 'draft' | 'archived'>('all')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isTeachesModalOpen, setIsTeachesModalOpen] = React.useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [selectedModule, setSelectedModule] = React.useState<LearningModuleModel | null>(null)

  // Module form state
  const [moduleForm, setModuleForm] = React.useState({
    code: '',
    title: '',
    durationMinutes: 45,
    sampleContentUri: '',
  })

  // Replacement selection for archive workflow
  const [replacementModuleId, setReplacementModuleId] = React.useState<string>('')

  // Filtered modules
  const filteredModules = modules.filter((m) => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Aggregate stats
  const totalModules = modules.length
  const publishedCount = modules.filter((m) => m.status === 'published').length
  const draftCount = modules.filter((m) => m.status === 'draft').length
  const totalEnrollments = modules.reduce((acc, m) => acc + m.activePlanEnrollments, 0)

  // ------------------------------------------------------------------
  // Create / Update Module Handlers
  // ------------------------------------------------------------------
  const handleOpenCreate = () => {
    setModuleForm({
      code: `MOD-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(
        Math.random() * 800 + 100,
      )}`,
      title: '',
      durationMinutes: 45,
      sampleContentUri: 'https://learning.adaptlearn.internal/modules/content/sample.html',
    })
    setSelectedModule(null)
    setIsCreateModalOpen(true)
  }

  const handleSaveModule = () => {
    // 1. Title & Code validation
    if (!moduleForm.code.trim() || !moduleForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Module Code and Title are required.',
        variant: 'destructive',
      })
      return
    }

    // 2. Positive duration validation
    if (moduleForm.durationMinutes <= 0) {
      toast({
        title: 'Invalid Duration',
        description: 'Duration must be a positive integer greater than 0 minutes.',
        variant: 'destructive',
      })
      return
    }

    // 3. Sample-content URI validation
    if (!moduleForm.sampleContentUri.trim()) {
      toast({
        title: 'Missing Content Reference',
        description: 'A valid sample-content URI or document reference is required.',
        variant: 'destructive',
      })
      return
    }

    if (selectedModule) {
      // Direct edit for draft
      setModules((prev) =>
        prev.map((m) =>
          m.id === selectedModule.id
            ? {
                ...m,
                title: moduleForm.title.trim(),
                durationMinutes: moduleForm.durationMinutes,
                sampleContentUri: moduleForm.sampleContentUri.trim(),
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : m,
        ),
      )
      toast({ title: 'Module Updated', description: `Saved changes to draft ${selectedModule.code}.`, variant: 'success' })
    } else {
      // Check duplicate code
      if (modules.some((m) => m.code.toUpperCase() === moduleForm.code.trim().toUpperCase())) {
        toast({ title: 'Duplicate Code', description: 'Module code must be globally unique.', variant: 'destructive' })
        return
      }

      const newMod: LearningModuleModel = {
        id: `mod-${Date.now()}`,
        stableId: `mod-uuid-${Date.now()}`,
        code: moduleForm.code.trim().toUpperCase(),
        title: moduleForm.title.trim(),
        version: '1.0',
        status: 'draft',
        durationMinutes: moduleForm.durationMinutes,
        sampleContentUri: moduleForm.sampleContentUri.trim(),
        teachesSkillIds: [],
        activePlanEnrollments: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
      }

      setModules([newMod, ...modules])
      toast({
        title: 'Draft Module Created',
        description: `Draft metadata for ${newMod.code} saved. Add taught skills before publishing.`,
        variant: 'success',
      })
    }
    setIsCreateModalOpen(false)
  }

  // Create Successor Draft (Protecting Learning History)
  const handleCreateSuccessorDraft = (mod: LearningModuleModel) => {
    const curVer = parseFloat(mod.version) || 1.0
    const nextVer = (curVer + 0.1).toFixed(1)

    const existingDraft = modules.find((m) => m.stableId === mod.stableId && m.status === 'draft')
    if (existingDraft) {
      toast({
        title: 'Successor Draft Exists',
        description: `Draft v${existingDraft.version} already exists for ${mod.code}.`,
        variant: 'warning',
      })
      return
    }

    const successor: LearningModuleModel = {
      ...mod,
      id: `mod-${Date.now()}`,
      version: nextVer,
      status: 'draft',
      activePlanEnrollments: 0, // Reset for new draft
      updatedAt: new Date().toISOString().slice(0, 10),
      title: `${mod.title} (Draft Revision)`,
    }

    setModules([successor, ...modules])
    toast({
      title: 'Successor Draft Created',
      description: `Created v${nextVer} draft for ${mod.code}. Historical student attempts remain safely linked to v${mod.version}.`,
      variant: 'success',
    })
  }

  // Delete Draft Module (initial or successor)
  const handleDeleteDraftModule = (mod: LearningModuleModel) => {
    if (mod.status !== 'draft') {
      toast({
        title: 'Action Rejected',
        description: 'Only draft modules can be deleted. Published modules must be archived.',
        variant: 'destructive',
      })
      return
    }

    setModules(modules.filter((m) => m.id !== mod.id))
    toast({
      title: 'Draft Module Deleted',
      description: `Draft module ${mod.code} (v${mod.version}) was permanently deleted.`,
      variant: 'default',
    })
  }

  // Toggle TEACHES Skill Link
  const handleToggleTeachesSkill = (mod: LearningModuleModel, skillId: string) => {
    if (mod.status === 'published') {
      toast({
        title: 'Published Version Locked',
        description: 'Cannot modify taught skills on a published module. Create a successor draft.',
        variant: 'warning',
      })
      return
    }

    const isLinked = mod.teachesSkillIds.includes(skillId)
    const updatedSkills = isLinked
      ? mod.teachesSkillIds.filter((id) => id !== skillId)
      : [...mod.teachesSkillIds, skillId]

    setModules((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, teachesSkillIds: updatedSkills, updatedAt: new Date().toISOString().slice(0, 10) } : m)),
    )

    if (selectedModule && selectedModule.id === mod.id) {
      setSelectedModule({ ...selectedModule, teachesSkillIds: updatedSkills })
    }

    toast({
      title: isLinked ? 'TEACHES Link Removed' : 'TEACHES Link Added',
      description: `${isLinked ? 'Detached' : 'Attached'} micro-skill link for ${mod.code}.`,
      variant: 'info',
    })
  }

  // Publish validation & execution
  const handlePublishModule = (mod: LearningModuleModel) => {
    if (mod.teachesSkillIds.length === 0) {
      toast({
        title: 'Publication Blocked',
        description: 'Publication strictly requires at least one taught micro-skill mapped via TEACHES relationship.',
        variant: 'destructive',
      })
      return
    }

    if (mod.durationMinutes <= 0) {
      toast({
        title: 'Publication Blocked',
        description: 'Module must have a positive duration greater than 0 minutes.',
        variant: 'destructive',
      })
      return
    }

    setModules((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, status: 'published', updatedAt: new Date().toISOString().slice(0, 10) } : m)),
    )
    setIsPublishModalOpen(false)
    toast({
      title: 'Learning Module Published',
      description: `${mod.code} (${mod.title} v${mod.version}) is now published and available for pathway synthesis.`,
      variant: 'success',
    })
  }

  // Archive workflow with replacement assignment
  const handleOpenArchiveModal = (mod: LearningModuleModel) => {
    setSelectedModule(mod)
    // Default replacement to first other published module
    const fallback = modules.find((m) => m.id !== mod.id && m.status === 'published')
    setReplacementModuleId(fallback ? fallback.id : '')
    setIsArchiveModalOpen(true)
  }

  const handleConfirmArchive = () => {
    if (!selectedModule) return

    // If active plan enrollments exist, require replacement
    if (selectedModule.activePlanEnrollments > 0 && !replacementModuleId) {
      toast({
        title: 'Replacement Required',
        description: `This module has ${selectedModule.activePlanEnrollments} active enrollments. You must select a replacement module.`,
        variant: 'destructive',
      })
      return
    }

    setModules((prev) =>
      prev.map((m) =>
        m.id === selectedModule.id
          ? {
              ...m,
              status: 'archived',
              replacementModuleId: replacementModuleId || undefined,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : m,
      ),
    )

    const replacement = modules.find((m) => m.id === replacementModuleId)

    setIsArchiveModalOpen(false)
    toast({
      title: 'Module Archived',
      description: `${selectedModule.code} excluded from future enrollments. ${
        selectedModule.activePlanEnrollments > 0
          ? `${selectedModule.activePlanEnrollments} active plans redirected to ${replacement?.code}.`
          : 'Historical progress retained.'
      }`,
      variant: 'warning',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Top Actions */}
        <div className="flex items-center justify-end pb-1 border-b border-border/60">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Create Learning Module (Draft)
          </Button>
        </div>

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            title="Total Learning Modules"
            value={totalModules.toString()}
            valueClassName="text-primary"
            description="In instructional catalog"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Published Modules"
            value={publishedCount.toString()}
            valueClassName="text-success"
            description="Active in adaptive pathways"
          />

          <StatCard
            variant="gradient"
            icon={<Clock className="h-4 w-4 text-warning" />}
            title="Draft In-Development"
            value={draftCount.toString()}
            valueClassName="text-warning"
            description="Pending TEACHES links"
          />

          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Active Plan Enrollments"
            value={totalEnrollments.toString()}
            valueClassName="text-primary"
            description="Learners currently studying"
          />
        </div>

        {/* Module Catalog Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Learning Modules Inventory
                </CardTitle>
                <CardDescription>
                  Instructional modules with positive duration, content reference, and TEACHES micro-skill links.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredModules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm font-semibold">No modules match the filter.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setStatusFilter('all')}>
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Module Code &amp; Version</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3 text-center">Duration</th>
                      <th className="py-2.5 px-3">Sample Content Reference</th>
                      <th className="py-2.5 px-3 text-center">Taught Skills</th>
                      <th className="py-2.5 px-3 text-center">Active Enrollments</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredModules.map((mod) => {
                      const isDraft = mod.status === 'draft'
                      const isPublished = mod.status === 'published'

                      return (
                        <tr key={mod.id} className="hover:bg-muted/20">
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-foreground">{mod.code}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                v{mod.version}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{mod.updatedAt}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground max-w-xs">{mod.title}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-foreground inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" />
                              {mod.durationMinutes}m
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <a
                              href={mod.sampleContentUri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline font-mono text-[11px] inline-flex items-center gap-1 max-w-[160px] truncate"
                              title={mod.sampleContentUri}
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {mod.sampleContentUri.replace('https://learning.adaptlearn.internal/modules/', '')}
                            </a>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedModule(mod)
                                setIsTeachesModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <Layers className="h-3 w-3" />
                              {mod.teachesSkillIds.length} TEACHES
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold">
                            {mod.activePlanEnrollments}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                isPublished ? 'success' : isDraft ? 'warning' : 'outline'
                              }
                            >
                              {mod.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDraft ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Edit3 className="h-3 w-3" />}
                                    onClick={() => {
                                      setSelectedModule(mod)
                                      setModuleForm({
                                        code: mod.code,
                                        title: mod.title,
                                        durationMinutes: mod.durationMinutes,
                                        sampleContentUri: mod.sampleContentUri,
                                      })
                                      setIsCreateModalOpen(true)
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    leftIcon={<CheckCircle2 className="h-3 w-3" />}
                                    onClick={() => {
                                      setSelectedModule(mod)
                                      setIsPublishModalOpen(true)
                                    }}
                                  >
                                    Publish
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                    onClick={() => handleDeleteDraftModule(mod)}
                                    title="Delete draft module"
                                  >
                                    Delete Draft
                                  </Button>
                                </>
                              ) : isPublished ? (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Copy className="h-3 w-3" />}
                                    onClick={() => handleCreateSuccessorDraft(mod)}
                                    title="Create successor draft without overwriting learning history"
                                  >
                                    Successor Draft
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10"
                                    leftIcon={<Archive className="h-3 w-3" />}
                                    onClick={() => handleOpenArchiveModal(mod)}
                                    title="Archive module and reassign active plans"
                                  >
                                    Archive
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Archived ({mod.replacementModuleId || 'Historical'})
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. CREATE / EDIT LEARNING MODULE MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedModule ? `Edit Draft Module (${selectedModule.code})` : 'Create Learning Module (Draft)'}
            </DialogTitle>
            <DialogDescription>
              Create draft metadata with a unique code, title, positive duration, and sample-content URI reference.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Unique Module Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MOD-GNN-201"
                  disabled={Boolean(selectedModule)}
                  value={moduleForm.code}
                  onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Expected Duration (Minutes &gt; 0) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={moduleForm.durationMinutes}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, durationMinutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Module Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Hands-on Geometric Deep Learning & Message Passing"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Sample-Content URI Reference <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. https://learning.adaptlearn.internal/modules/gnn-201/lab.ipynb"
                value={moduleForm.sampleContentUri}
                onChange={(e) => setModuleForm({ ...moduleForm, sampleContentUri: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>
                Module will be created in Draft status. At least one taught micro-skill is required before publication.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveModule}>
              {selectedModule ? 'Save Draft' : 'Create Module'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 2. MAINTAIN MODULE-SKILL MAPPINGS (TEACHES) MODAL */}
      {selectedModule && (
        <Dialog open={isTeachesModalOpen} onOpenChange={setIsTeachesModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Maintain Module–Skill Mappings (TEACHES): {selectedModule.code}
              </DialogTitle>
              <DialogDescription>
                Attach micro-skills taught by this module. Publication requires at least one verified taught skill.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 text-xs">
              {INITIAL_MICRO_SKILLS.map((skill) => {
                const isLinked = selectedModule.teachesSkillIds.includes(skill.id)

                return (
                  <div
                    key={skill.id}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                      isLinked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{skill.code}</span>
                        <span className="font-semibold text-foreground">{skill.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {skill.observableOutcome}
                      </p>
                    </div>

                    {selectedModule.status === 'published' ? (
                      <Badge variant={isLinked ? 'success' : 'outline'}>
                        {isLinked ? 'Linked (Locked)' : 'Unlinked'}
                      </Badge>
                    ) : (
                      <Button
                        variant={isLinked ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleTeachesSkill(selectedModule, skill.id)}
                      >
                        {isLinked ? 'Remove Link' : 'Link TEACHES'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            <DialogFooter>
              <Button variant="primary" size="sm" onClick={() => setIsTeachesModalOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 3. PUBLICATION VERIFICATION MODAL */}
      {selectedModule && (
        <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Publish Learning Module: {selectedModule.code}
              </DialogTitle>
              <DialogDescription>
                Verify module publication prerequisites before releasing to adaptive pathways.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="font-semibold text-foreground mb-1">Pre-Publication Validation</div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Title and Code Valid</span>
                  <span className="text-success font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Validated
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Positive Duration (&gt; 0 mins)</span>
                  {selectedModule.durationMinutes > 0 ? (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {selectedModule.durationMinutes} mins
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold">Invalid duration</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sample Content Reference</span>
                  {selectedModule.sampleContentUri ? (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Valid URI
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold">Missing URI</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">TEACHES Micro-skills (&ge; 1 required)</span>
                  {selectedModule.teachesSkillIds.length > 0 ? (
                    <span className="text-success font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> {selectedModule.teachesSkillIds.length} Linked
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold">0 Linked (Required)</span>
                  )}
                </div>
              </div>

              {selectedModule.teachesSkillIds.length === 0 && (
                <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Publication blocked: At least one taught micro-skill must be linked first.</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={selectedModule.teachesSkillIds.length === 0 || selectedModule.durationMinutes <= 0}
                onClick={() => handlePublishModule(selectedModule)}
              >
                Confirm &amp; Publish
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 4. ARCHIVE LEARNING MODULE MODAL (WITH REPLACEMENT SELECTOR) */}
      {selectedModule && (
        <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Archive className="h-5 w-5 text-destructive" />
                Archive Learning Module: {selectedModule.code}
              </DialogTitle>
              <DialogDescription>
                Exclude {selectedModule.title} (v{selectedModule.version}) from new use while preserving historical
                completion records.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              {selectedModule.activePlanEnrollments > 0 ? (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                  <div className="font-semibold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Impact Notice: {selectedModule.activePlanEnrollments} Active Learner Plans Affected
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    This module is currently enrolled in active employee pathways. You must designate an active
                    replacement module to transfer existing learners seamlessly.
                  </p>

                  <div className="pt-2">
                    <label className="font-semibold text-foreground block mb-1">Select Replacement Module</label>
                    <select
                      value={replacementModuleId}
                      onChange={(e) => setReplacementModuleId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {modules
                        .filter((m) => m.id !== selectedModule.id && m.status === 'published')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} - {m.title} (v{m.version})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground">
                  No active learners currently enrolled. Module will be moved to archive with historical records preserved.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsArchiveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleConfirmArchive}>
                Confirm Archive
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </WorkspaceLayout>
  )
}
