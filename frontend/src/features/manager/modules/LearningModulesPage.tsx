import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CornerDownRight,
  Edit3,
  ExternalLink,
  Eye,
  Layers,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  QuickConfigImportModal,
  type ImportPreset,
} from '../../../shared/components/import/QuickConfigImportModal'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
} from '../../../shared/stores/companyStore'
import {
  type LearningModuleModel,
} from '../data/ldManagerMockData'
import {
  getApprovedLearningContents,
  subscribeToLearningContents,
  type LearningContentPackage,
} from '../../../shared/stores/learningContentStore'

const MODULE_PRESETS: ImportPreset[] = [
  {
    id: 'preset-deep-learning-modules',
    name: 'Advanced Foundation & LLM Systems (3 Modules)',
    description: 'Covers Attention Implementations, Distributed Inference, and Vector RAG Pipelines.',
    badge: 'AI Curricula',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { code: 'MOD-ATTN-101', title: 'Attention Mechanism & Tensor Workflows', durationMinutes: 60 },
        { code: 'MOD-VLLM-201', title: 'High-Concurrency LLM Inference Engines', durationMinutes: 75 },
        { code: 'MOD-RAG-301', title: 'Vector Retrieval & Knowledge Grounding', durationMinutes: 90 },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `mod-${Date.now()}-1`,
        stableId: `mod-uuid-attn-1`,
        code: 'MOD-ATTN-101',
        title: 'Attention Mechanism & Tensor Workflows',
        version: '1.0',
        status: 'published' as const,
        durationMinutes: 60,
        sampleContentUri: 'https://learning.adaptlearn.internal/modules/content/attention.html',
        teachesSkillIds: ['skill-attn-01'],
        activePlanEnrollments: 8,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: `mod-${Date.now()}-2`,
        stableId: `mod-uuid-vllm-2`,
        code: 'MOD-VLLM-201',
        title: 'High-Concurrency LLM Inference Engines',
        version: '1.0',
        status: 'draft' as const,
        durationMinutes: 75,
        sampleContentUri: 'https://learning.adaptlearn.internal/modules/content/vllm.html',
        teachesSkillIds: ['skill-kv-01'],
        activePlanEnrollments: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: `mod-${Date.now()}-3`,
        stableId: `mod-uuid-rag-3`,
        code: 'MOD-RAG-301',
        title: 'Vector Retrieval & Knowledge Grounding',
        version: '1.0',
        status: 'published' as const,
        durationMinutes: 90,
        sampleContentUri: 'https://learning.adaptlearn.internal/modules/content/rag.html',
        teachesSkillIds: ['skill-vec-01'],
        activePlanEnrollments: 5,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    ],
  },
]

function compareVersions(v1: string, v2: string): number {
  const p1 = (v1 || '1.0').split('.').map((n) => parseInt(n, 10) || 0)
  const p2 = (v2 || '1.0').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] ?? 0
    const num2 = p2[i] ?? 0
    if (num1 !== num2) return num1 - num2
  }
  return 0
}

function sortModulesWithDraftsBelowPublished(
  list: LearningModuleModel[],
  sortBy: 'latest' | 'title' = 'latest'
): LearningModuleModel[] {
  const groups = new Map<string, LearningModuleModel[]>()
  for (const m of list) {
    const key = m.stableId || m.code
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(m)
  }

  const isPureDraftLineage = (groupModules: LearningModuleModel[]): boolean => {
    return groupModules.every((m) => m.status !== 'published')
  }

  const getLineageBaseTime = (groupModules: LearningModuleModel[]): number => {
    const published = groupModules.filter((m) => m.status === 'published')
    if (published.length > 0) {
      let baseTime = Infinity
      for (const m of published) {
        const t = m.updatedAt ? new Date(m.updatedAt).getTime() : 0
        if (!isNaN(t) && t > 0 && t < baseTime) {
          baseTime = t
        }
      }
      return baseTime === Infinity ? 0 : baseTime
    }

    let latest = 0
    for (const m of groupModules) {
      const t = m.updatedAt ? new Date(m.updatedAt).getTime() : 0
      if (!isNaN(t) && t > latest) {
        latest = t
      }
    }
    return latest
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const modsA = groups.get(a)!
    const modsB = groups.get(b)!
    const modA = modsA[0]
    const modB = modsB[0]

    if (sortBy === 'latest') {
      const isPureDraftA = isPureDraftLineage(modsA)
      const isPureDraftB = isPureDraftLineage(modsB)

      // Rule: Brand-new pure draft modules appear on top
      if (isPureDraftA && !isPureDraftB) return -1
      if (isPureDraftB && !isPureDraftA) return 1

      const timeA = getLineageBaseTime(modsA)
      const timeB = getLineageBaseTime(modsB)
      if (timeB !== timeA) {
        return timeB - timeA
      }
      return (modB?.id || '').localeCompare(modA?.id || '')
    }

    return (modA?.title || '').localeCompare(modB?.title || '')
  })

  const result: LearningModuleModel[] = []
  for (const key of sortedKeys) {
    const groupMods = groups.get(key)!
    const published = groupMods
      .filter((m) => m.status === 'published')
      .sort((a, b) => compareVersions(b.version, a.version))

    const newestPublished = published[0]
    const olderPublished = published.slice(1).sort((a, b) => compareVersions(a.version, b.version))
    const nonPublished = groupMods
      .filter((m) => m.status !== 'published')
      .sort((a, b) => compareVersions(a.version, b.version))

    if (newestPublished) {
      result.push(newestPublished, ...olderPublished, ...nonPublished)
    } else {
      result.push(...nonPublished)
    }
  }

  return result
}

export function LearningModulesPage() {
  const { toast } = useToast()

  const [modules, setModules] = React.useState<LearningModuleModel[]>(() => getActiveCompany()?.modules ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'published' | 'draft' | 'archived'>('all')

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      const active = getActiveCompany()
      setModules(active?.modules ?? [])
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [])

  // Explicit persistence helper to prevent circular re-render loops
  const saveAndSetModules = React.useCallback(
    (updater: LearningModuleModel[] | ((prev: LearningModuleModel[]) => LearningModuleModel[])) => {
      setModules((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({
          ...c,
          modules: next,
        }))
        return next
      })
    },
    []
  )

  const activeComp = getActiveCompany()
  const companyMicroSkills = activeComp?.microSkills || []

  // Approved Learning Content Packages from Content Studio
  const [approvedPackages, setApprovedPackages] = React.useState<LearningContentPackage[]>(() =>
    getApprovedLearningContents()
  )

  React.useEffect(() => {
    return subscribeToLearningContents(() => {
      setApprovedPackages(getApprovedLearningContents())
    })
  }, [])

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isTeachesModalOpen, setIsTeachesModalOpen] = React.useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = React.useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedModule, setSelectedModule] = React.useState<LearningModuleModel | null>(null)
  const [viewingDetailsModule, setViewingDetailsModule] = React.useState<LearningModuleModel | null>(null)
  const [deletingDraftModule, setDeletingDraftModule] = React.useState<LearningModuleModel | null>(null)

  const handleImportModules = (data: unknown) => {
    const list = Array.isArray(data)
      ? data
      : (typeof data === 'object' && data !== null && 'modules' in data && Array.isArray((data as Record<string, unknown>).modules))
      ? ((data as Record<string, unknown>).modules as unknown[])
      : []
    const normalized: LearningModuleModel[] = list.map((itemRecord: unknown, idx: number) => {
      const item = (typeof itemRecord === 'object' && itemRecord !== null ? itemRecord : {}) as Record<string, unknown>
      return {
        id: (item.id as string) || `mod-${Date.now()}-${idx}`,
        stableId: (item.stableId as string) || `mod-uuid-${Date.now()}-${idx}`,
        code: String(item.code || `MOD-IMP-${idx + 1}`).trim().toUpperCase(),
        title: String(item.title || 'Untitled Module').trim(),
        version: String(item.version || '1.0'),
        status: (item.status === 'draft' || item.status === 'archived') ? item.status : 'published',
        durationMinutes: Number(item.durationMinutes) || 45,
        sampleContentUri: String(item.sampleContentUri || 'content/modules/sample.md'),
        teachesSkillIds: Array.isArray(item.teachesSkillIds) ? (item.teachesSkillIds as string[]) : [],
        activePlanEnrollments: Number(item.activePlanEnrollments) || 0,
        updatedAt: String(item.updatedAt || new Date().toISOString().slice(0, 10)),
        moduleType: 'LESSON_AND_PRACTICE',
        contentType: 'application/json',
        contentVersion: '1.0',
        reviewStatus: 'APPROVED',
      }
    })
    saveAndSetModules((prev) => [...normalized, ...prev])
  }

  // Module form state matching Neo4j schema
  const [moduleForm, setModuleForm] = React.useState({
    code: '',
    title: '',
    durationMinutes: 45,
    sampleContentUri: '',
    moduleType: 'LESSON_AND_PRACTICE' as 'LESSON_AND_PRACTICE' | 'RESOURCE_GUIDED_PRACTICE',
    contentType: 'application/json',
    contentVersion: '1.0',
    reviewStatus: 'APPROVED' as 'NEEDS_EXPERT_REVIEW' | 'APPROVED' | 'REJECTED',
    selectedContentPackageId: '',
    teachesSkillId: '',
  })

  // Replacement selection for archive workflow
  const [replacementModuleId, setReplacementModuleId] = React.useState<string>('')

  // Sorting & pagination states
  const [sortBy, setSortBy] = React.useState<'latest' | 'title'>('latest')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy])

  // Filtered and sorted modules
  const filteredModules = React.useMemo(() => {
    const list = modules.filter((m) => {
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })

    return sortModulesWithDraftsBelowPublished(list, sortBy)
  }, [modules, statusFilter, searchQuery, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredModules.length / pageSize))
  const paginatedModules = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredModules.slice(start, start + pageSize)
  }, [filteredModules, currentPage, pageSize])

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
      sampleContentUri: 'content/modules/sample.json',
      moduleType: 'LESSON_AND_PRACTICE',
      contentType: 'application/json',
      contentVersion: '1.0',
      reviewStatus: 'APPROVED',
      selectedContentPackageId: '',
      teachesSkillId: companyMicroSkills[0]?.id || '',
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
      saveAndSetModules((prev) =>
        prev.map((m) =>
          m.id === selectedModule.id
            ? {
                ...m,
                title: moduleForm.title.trim(),
                durationMinutes: moduleForm.durationMinutes,
                sampleContentUri: moduleForm.sampleContentUri.trim(),
                moduleType: moduleForm.moduleType,
                contentType: moduleForm.contentType,
                contentVersion: moduleForm.contentVersion,
                reviewStatus: moduleForm.reviewStatus,
                learningContentId: moduleForm.selectedContentPackageId || m.learningContentId,
                teachesSkillIds: moduleForm.teachesSkillId ? [moduleForm.teachesSkillId] : m.teachesSkillIds,
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
        sampleContentUri: moduleForm.sampleContentUri.trim() || `content/modules/${moduleForm.code.trim().toUpperCase()}.json`,
        teachesSkillIds: moduleForm.teachesSkillId ? [moduleForm.teachesSkillId] : [],
        activePlanEnrollments: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
        moduleType: moduleForm.moduleType,
        contentType: moduleForm.contentType,
        contentVersion: moduleForm.contentVersion,
        reviewStatus: moduleForm.reviewStatus,
        learningContentId: moduleForm.selectedContentPackageId || undefined,
      }

      saveAndSetModules([newMod, ...modules])
      toast({
        title: 'Draft Module Created',
        description: `Draft metadata for ${newMod.code} saved with Neo4j schema attributes.`,
        variant: 'success',
      })
    }
    setIsCreateModalOpen(false)
  }

  // Create Successor Draft (Protecting Learning History)
  const handleCreateSuccessorDraft = (mod: LearningModuleModel) => {
    const curVer = parseFloat(mod.version) || 1.0
    const nextVer = (curVer + 0.1).toFixed(1)

    const existingDraft = modules.find(
      (m) => (m.stableId === mod.stableId || m.code === mod.code) && m.status === 'draft'
    )
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
      stableId: mod.stableId || `mod-uuid-${mod.code}`,
      version: nextVer,
      status: 'draft',
      activePlanEnrollments: 0, // Reset for new draft
      updatedAt: new Date().toISOString().slice(0, 10),
      title: `${mod.title} (Draft Revision)`,
    }

    saveAndSetModules((prev) => [...prev, successor])
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

    saveAndSetModules(modules.filter((m) => m.id !== mod.id))
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

    saveAndSetModules((prev) =>
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

    saveAndSetModules((prev) =>
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

    saveAndSetModules((prev) =>
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
        {/* Actions Bar */}
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setIsImportModalOpen(true)}
                className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs"
              >
                Import
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreate}
                className="font-semibold shadow-2xs"
              >
                Create
              </Button>
            </div>
          }
        />

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
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft' | 'archived')}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses ({totalModules})</option>
                    <option value="published">Published ({publishedCount})</option>
                    <option value="draft">Draft ({draftCount})</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'title')}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="latest">Latest Created / Updated</option>
                    <option value="title">Module Title (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                      <th className="py-2.5 px-3">Title &amp; Schema Type</th>
                      <th className="py-2.5 px-3 text-center">Duration</th>
                      <th className="py-2.5 px-3">Content Reference</th>
                      <th className="py-2.5 px-3 text-center">Taught Skills (1-1)</th>
                      <th className="py-2.5 px-3 text-center">Active Enrollments</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredModules.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                          No learning modules registered yet for this company. Click "+ New Module" or import blueprint modules to begin.
                        </td>
                      </tr>
                    ) : (
                      paginatedModules.map((mod) => {
                        const isDraft = mod.status === 'draft'
                        const isPublished = mod.status === 'published'
                        const predecessorPublished = modules.find(
                          (m) =>
                            (m.stableId === mod.stableId || m.code === mod.code) &&
                            m.status === 'published' &&
                            m.id !== mod.id
                        )
                        const isSuccessor = !isPublished && Boolean(predecessorPublished)

                        return (
                          <tr
                            key={mod.id}
                            className={`transition-colors ${
                              isSuccessor
                                ? 'bg-muted/10 border-l-2 border-l-primary/60 hover:bg-muted/25'
                                : 'hover:bg-muted/20'
                            }`}
                          >
                            <td className="py-3 px-3">
                              {isSuccessor ? (
                                <div
                                  className="flex items-center gap-1.5 pl-3"
                                  title="Successor draft positioned below published version"
                                >
                                  <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span className="font-mono font-bold text-foreground">{mod.code}</span>
                                </div>
                              ) : (
                                <div className="font-mono font-bold text-foreground">{mod.code}</div>
                              )}
                              <div className={`flex items-center gap-1.5 mt-0.5 ${isSuccessor ? 'pl-8' : ''}`}>
                                <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                  v{mod.version}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{mod.updatedAt}</span>
                              </div>
                            </td>
                          <td className="py-3 px-3 max-w-xs">
                            <span className="font-semibold text-foreground block">{mod.title}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                                {mod.moduleType || 'LESSON_AND_PRACTICE'}
                              </Badge>
                              {mod.reviewStatus === 'APPROVED' ? (
                                <Badge variant="success" className="text-[10px] py-0 px-1">
                                  APPROVED
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px] py-0 px-1">
                                  NEEDS REVIEW
                                </Badge>
                              )}
                            </div>
                          </td>
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
                              <a
                                href={`/employee/modules/${mod.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Preview Full Lessons in Reader View"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                  title="Preview Lessons"
                                  aria-label="Preview Lessons"
                                >
                                  <BookOpen className="h-4 w-4 text-primary" />
                                </Button>
                              </a>
                              {!isDraft && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setViewingDetailsModule(mod)}
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {isDraft ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedModule(mod)
                                      setModuleForm({
                                        code: mod.code,
                                        title: mod.title,
                                        durationMinutes: mod.durationMinutes,
                                        sampleContentUri: mod.sampleContentUri,
                                        moduleType: mod.moduleType || 'LESSON_AND_PRACTICE',
                                        contentType: mod.contentType || 'application/json',
                                        contentVersion: mod.contentVersion || '1.0',
                                        reviewStatus: mod.reviewStatus || 'APPROVED',
                                        selectedContentPackageId: mod.learningContentId || '',
                                        teachesSkillId: mod.teachesSkillIds[0] || '',
                                      })
                                      setIsCreateModalOpen(true)
                                    }}
                                    title="Edit Draft"
                                    aria-label="Edit Draft"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-success hover:bg-success/10"
                                    onClick={() => {
                                      setSelectedModule(mod)
                                      setIsPublishModalOpen(true)
                                    }}
                                    title="Publish Module"
                                    aria-label="Publish Module"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setDeletingDraftModule(mod)}
                                    title="Delete Draft"
                                    aria-label="Delete Draft"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : isPublished ? (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleCreateSuccessorDraft(mod)}
                                    title="Create Draft"
                                    aria-label="Create Draft"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleOpenArchiveModal(mod)}
                                    title="Archive Module"
                                    aria-label="Archive Module"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredModules.length > 0 && (
              <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filteredModules.length)} of {filteredModules.length} modules
                </span>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
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

            {/* 1. Approved Learning Content Package Selector */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-secondary/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Select Approved Learning Content Package
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {approvedPackages.length} Approved Packages Available
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Bind an L&D Manager approved curriculum package from Content Studio with structured reading sections and video lectures.
              </p>

              <select
                value={moduleForm.selectedContentPackageId}
                onChange={(e) => {
                  const pkgId = e.target.value
                  const pkg = approvedPackages.find((p) => p.id === pkgId)
                  if (!pkg) {
                    setModuleForm({ ...moduleForm, selectedContentPackageId: '' })
                    return
                  }
                  const matchedSkill = companyMicroSkills.find(
                    (s) =>
                      s.code.toLowerCase() === pkg.skillCode.toLowerCase() ||
                      s.name.toLowerCase() === pkg.skillName.toLowerCase()
                  )
                  setModuleForm({
                    ...moduleForm,
                    selectedContentPackageId: pkg.id,
                    code: moduleForm.code || pkg.code,
                    title: moduleForm.title || pkg.title,
                    durationMinutes: pkg.estimatedDuration || moduleForm.durationMinutes,
                    sampleContentUri: `content/modules/${pkg.code}.json`,
                    contentType: 'application/json',
                    contentVersion: pkg.version || '1.0',
                    reviewStatus: 'APPROVED',
                    teachesSkillId: matchedSkill ? matchedSkill.id : (companyMicroSkills[0]?.id || ''),
                  })
                }}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="">-- Choose Approved Content Package (Optional) --</option>
                {approvedPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    [{pkg.code}] {pkg.title} ({pkg.lessons.length} Lessons, {pkg.estimatedDuration}m) — {pkg.skillName}
                  </option>
                ))}
              </select>

              {moduleForm.selectedContentPackageId && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-semibold text-success flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Approved by L&D Manager — Ready for delivery
                  </span>
                  <a
                    href={`/employee/modules/${moduleForm.selectedContentPackageId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview Lessons
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Module Type (Neo4j Schema) <span className="text-destructive">*</span>
                </label>
                <select
                  value={moduleForm.moduleType}
                  onChange={(e) =>
                    setModuleForm({
                      ...moduleForm,
                      moduleType: e.target.value as 'LESSON_AND_PRACTICE' | 'RESOURCE_GUIDED_PRACTICE',
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="LESSON_AND_PRACTICE">LESSON_AND_PRACTICE</option>
                  <option value="RESOURCE_GUIDED_PRACTICE">RESOURCE_GUIDED_PRACTICE</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Review Status (Neo4j Schema) <span className="text-destructive">*</span>
                </label>
                <select
                  value={moduleForm.reviewStatus}
                  onChange={(e) =>
                    setModuleForm({
                      ...moduleForm,
                      reviewStatus: e.target.value as 'NEEDS_EXPERT_REVIEW' | 'APPROVED',
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="APPROVED">APPROVED (Catalog Ready)</option>
                  <option value="NEEDS_EXPERT_REVIEW">NEEDS_EXPERT_REVIEW</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Content URI (File/Reference) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. content/modules/MOD-MS-CORE02.md"
                  value={moduleForm.sampleContentUri}
                  onChange={(e) => setModuleForm({ ...moduleForm, sampleContentUri: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Content Version (contentVersion) <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1.0 or 2.0"
                  value={moduleForm.contentVersion}
                  onChange={(e) => setModuleForm({ ...moduleForm, contentVersion: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>
                Conforms strictly to Ontology v0.8.0 with 1–1 TEACHES relationship and content URI references.
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
              {companyMicroSkills.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                  No micro-skills registered for this company yet. Define micro-skills in Competency Ontology first.
                </div>
              ) : (
                companyMicroSkills.map((skill) => {
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
                        {skill.description}
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
              }))}
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

      {/* LEARNING MODULE DETAILS MODAL (Miro Flow: Learning Modules Screen -> Learning Module Details) */}
      {viewingDetailsModule && (
        <Dialog
          open={Boolean(viewingDetailsModule)}
          onOpenChange={(open) => !open && setViewingDetailsModule(null)}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary shrink-0" />
                  <span>Learning Module Details: {viewingDetailsModule.title}</span>
                </DialogTitle>
                <Badge
                  variant={
                    viewingDetailsModule.status === 'published'
                      ? 'success'
                      : viewingDetailsModule.status === 'draft'
                        ? 'warning'
                        : 'outline'
                  }
                  className="font-bold text-xs"
                >
                  {viewingDetailsModule.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                Curriculum specifications, duration, content endpoints, and mapped TEACHES competency relationships.
              </DialogDescription>
            </DialogHeader>

            {/* Archived Info Panel if module is archived */}
            {viewingDetailsModule.status === 'archived' && (
              <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-50">
                <div className="flex items-start gap-2.5">
                  <Archive className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-warning">Archived Curriculum Asset</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This module is archived from new pathway generation. Historical completions and attempts remain permanently recorded in the learner ledger.
                    </p>
                  </div>
                </div>
                {viewingDetailsModule.replacementModuleId ? (
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">
                      Recommended Replacement
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {viewingDetailsModule.replacementModuleId}
                    </Badge>
                  </div>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                    Historical Record
                  </Badge>
                )}
              </div>
            )}

            {/* Module Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Module Code</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsModule.code}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsModule.version}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Estimated Time</span>
                <span className="font-mono font-bold text-primary mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {viewingDetailsModule.durationMinutes} Mins
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Active Learners</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">
                  {viewingDetailsModule.activePlanEnrollments} Enrolled
                </span>
              </div>
            </div>


            {/* Taught Micro-Skills Section */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Taught Micro-skills with Observable Outcomes ({viewingDetailsModule.teachesSkillIds.length})
              </span>
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-lg border border-border p-2">
                {viewingDetailsModule.teachesSkillIds.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    No micro-skills linked yet. Link skills via TEACHES modal.
                  </div>
                ) : (
                  viewingDetailsModule.teachesSkillIds.map((skId) => {
                    const skill = companyMicroSkills.find((s) => s.id === skId)
                    return (
                      <div
                        key={skId}
                        className="p-2.5 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-primary">{skill?.code}</span>
                            <span className="font-semibold text-foreground">{skill?.name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {skill?.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] font-semibold">
                          {skill?.status || 'ACTIVE'}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewingDetailsModule(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const m = viewingDetailsModule
                  setViewingDetailsModule(null)
                  setSelectedModule(m)
                  setIsTeachesModalOpen(true)
                }}
                leftIcon={<Layers className="h-3 w-3" />}
              >
                Link Micro-skill
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
      {/* CONFIRMATION PROMPT TO DISCARD DRAFT MODULE */}
      <ConfirmationModal
        open={Boolean(deletingDraftModule)}
        onOpenChange={(open) => !open && setDeletingDraftModule(null)}
        title="Discard Draft Module?"
        description={
          deletingDraftModule ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to discard the draft version for{' '}
                <strong className="text-foreground font-semibold">
                  {deletingDraftModule.code} - {deletingDraftModule.title} (v{deletingDraftModule.version})
                </strong>
                ?
              </p>
              <p className="text-muted-foreground">
                All uncommitted curriculum bindings and module settings for this draft will be removed.
              </p>
            </div>
          ) : null
        }
        confirmText="Delete Draft"
        cancelText="Keep Draft"
        variant="destructive"
        onConfirm={() => {
          if (deletingDraftModule) {
            handleDeleteDraftModule(deletingDraftModule)
            setDeletingDraftModule(null)
          }
        }}
      />

      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Learning Module Catalog"
        entityName="Learning Modules"
        description="Select an industry module catalog or upload custom curriculum JSON to rapidly populate instructional modules for your organization."
        presets={MODULE_PRESETS}
        onImport={handleImportModules}
        sampleJsonPlaceholder={`[\n  {\n    "code": "MOD-ATTN-101",\n    "title": "Attention Mechanism & Tensor Workflows",\n    "durationMinutes": 60,\n    "sampleContentUri": "https://learning.adaptlearn.internal/modules/content/sample.html"\n  }\n]`}
      />
    </WorkspaceLayout>
  )
}
