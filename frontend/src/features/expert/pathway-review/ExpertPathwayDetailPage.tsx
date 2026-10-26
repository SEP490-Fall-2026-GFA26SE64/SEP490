import * as React from 'react'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Filter,
  GripVertical,
  MinusCircle,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../shared/components/ui/Card'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { Input } from '../../../shared/components/ui/Input'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { cn } from '../../../shared/lib/utils'
import {
  AVAILABLE_CATALOG_MODULES,
  getStoredPathwayById,
  updateStoredPathway,
  type CatalogModuleItem,
  type InitialPathwayItem,
  type PathwayModuleItem,
} from './pathwayReviewStore'

type DragSourceType = 'pathway' | 'excluded' | 'catalog'

interface DragTransferData {
  source: DragSourceType
  id: string
  index: number
}

export function ExpertPathwayDetailPage() {
  const { pathwayId } = useParams<{ pathwayId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [pathway, setPathway] = React.useState<InitialPathwayItem | null>(() => {
    return pathwayId ? getStoredPathwayById(pathwayId) || null : null
  })

  // Synchronize state when store updates
  React.useEffect(() => {
    if (!pathwayId) return
    const handleUpdate = () => {
      const current = getStoredPathwayById(pathwayId)
      if (current) setPathway(current)
    }
    window.addEventListener('expert_pathway_list_updated', handleUpdate)
    return () => window.removeEventListener('expert_pathway_list_updated', handleUpdate)
  }, [pathwayId])

  // Cleanup dragging class on unmount
  React.useEffect(() => {
    return () => {
      document.body.classList.remove('cursor-grabbing-active')
    }
  }, [])

  // Catalog module search & filter
  const [catalogSearch, setCatalogSearch] = React.useState('')
  const [catalogDomainFilter, setCatalogDomainFilter] = React.useState('all')

  // Regeneration state
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = React.useState(false)
  const [regenerationInstructions, setRegenerationInstructions] = React.useState('')

  // Drag and drop state
  const [draggingItem, setDraggingItem] = React.useState<DragTransferData | null>(null)
  const [dragOverTarget, setDragOverTarget] = React.useState<{
    list: DragSourceType
    index: number | null
  } | null>(null)

  // Module addition from catalog
  const availableCatalog = React.useMemo(() => {
    if (!pathway) return []
    const existingCodes = new Set([
      ...pathway.modules.map((m) => m.code),
      ...pathway.excludedModules.map((m) => m.code),
    ])

    return AVAILABLE_CATALOG_MODULES.filter((m) => {
      const notExisting = !existingCodes.has(m.code)
      const q = catalogSearch.toLowerCase().trim()
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q)
      const matchesDomain =
        catalogDomainFilter === 'all' || m.domain === catalogDomainFilter
      return notExisting && matchesQuery && matchesDomain
    })
  }, [pathway, catalogSearch, catalogDomainFilter])

  // Handlers for modifying lists
  const handleExcludeModule = (moduleId: string) => {
    if (isRegenerating || !pathway) return
    const moduleToExclude = pathway.modules.find((m) => m.id === moduleId)
    if (!moduleToExclude) return

    updateStoredPathway(pathway.id, (prev) => ({
      ...prev,
      modules: prev.modules.filter((m) => m.id !== moduleId),
      excludedModules: [...prev.excludedModules, moduleToExclude],
    }))

    toast({
      title: 'Module Excluded',
      description: `"${moduleToExclude.title}" moved to excluded list. It will be remembered and skipped in future regenerations.`,
      variant: 'info',
    })
  }

  const handleIncludeModule = (moduleId: string) => {
    if (isRegenerating || !pathway) return
    const moduleToInclude = pathway.excludedModules.find((m) => m.id === moduleId)
    if (!moduleToInclude) return

    updateStoredPathway(pathway.id, (prev) => ({
      ...prev,
      excludedModules: prev.excludedModules.filter((m) => m.id !== moduleId),
      modules: [...prev.modules, moduleToInclude],
    }))

    toast({
      title: 'Module Restored to Pathway',
      description: `"${moduleToInclude.title}" added back into active learning steps.`,
      variant: 'success',
    })
  }

  const handleRemoveModule = (moduleId: string, fromList: DragSourceType) => {
    if (isRegenerating || !pathway) return
    updateStoredPathway(pathway.id, (prev) => ({
      ...prev,
      modules: fromList === 'pathway' ? prev.modules.filter((m) => m.id !== moduleId) : prev.modules,
      excludedModules:
        fromList === 'excluded'
          ? prev.excludedModules.filter((m) => m.id !== moduleId)
          : prev.excludedModules,
    }))

    toast({
      title: 'Module Removed',
      description: 'The learning module has been removed from this profile.',
      variant: 'default',
    })
  }

  const handleMoveStep = (fromIndex: number, direction: 'up' | 'down') => {
    if (isRegenerating || !pathway) return
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= pathway.modules.length) return

    updateStoredPathway(pathway.id, (prev) => {
      const updated = [...prev.modules]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return { ...prev, modules: updated }
    })
  }

  const handleAddCatalogModule = (mod: CatalogModuleItem, targetList: DragSourceType = 'pathway') => {
    if (isRegenerating || !pathway) return
    const newModule: PathwayModuleItem = {
      id: `mod-${Date.now()}-${mod.code.toLowerCase()}`,
      code: mod.code,
      title: mod.title,
      estimatedHours: mod.estimatedHours,
      domain: mod.domain,
      reason: mod.reason,
    }

    updateStoredPathway(pathway.id, (prev) => {
      if (targetList === 'pathway') {
        return { ...prev, modules: [...prev.modules, newModule] }
      }
      return { ...prev, excludedModules: [...prev.excludedModules, newModule] }
    })

    toast({
      title: targetList === 'pathway' ? 'Module Added to Pathway' : 'Module Added to Excluded List',
      description: `"${mod.title}" (${mod.code}) appended.`,
      variant: 'success',
    })
  }

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, source: DragSourceType, id: string, index: number) => {
    if (isRegenerating) {
      e.preventDefault()
      return
    }
    const transfer: DragTransferData = { source, id, index }
    setDraggingItem(transfer)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(transfer))
    document.body.classList.add('cursor-grabbing-active')
  }

  const handleItemDragOver = (e: React.DragEvent, targetList: DragSourceType, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    const rect = e.currentTarget.getBoundingClientRect()
    const isBottomHalf = e.clientY > rect.top + rect.height / 2
    const dropIdx = isBottomHalf ? index + 1 : index

    if (
      !dragOverTarget ||
      dragOverTarget.list !== targetList ||
      dragOverTarget.index !== dropIdx
    ) {
      setDragOverTarget({ list: targetList, index: dropIdx })
    }
  }

  const handleContainerDragOver = (e: React.DragEvent, targetList: DragSourceType) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOverTarget || dragOverTarget.list !== targetList) {
      const defaultLen =
        targetList === 'pathway'
          ? (pathway?.modules.length || 0)
          : targetList === 'excluded'
          ? (pathway?.excludedModules.length || 0)
          : null
      setDragOverTarget({ list: targetList, index: defaultLen })
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null)
    }
  }

  const handleDropOnList = (e: React.DragEvent, targetList: DragSourceType, dropIndex: number | null = null) => {
    e.preventDefault()
    e.stopPropagation()
    document.body.classList.remove('cursor-grabbing-active')

    if (!pathway || !draggingItem || isRegenerating) {
      setDraggingItem(null)
      setDragOverTarget(null)
      return
    }

    const { source, id, index: sourceIndex } = draggingItem

    // Case 1: Drop within same list (reordering)
    if (source === targetList) {
      if (source === 'catalog' || dropIndex === null) {
        setDraggingItem(null)
        setDragOverTarget(null)
        return
      }

      updateStoredPathway(pathway.id, (prev) => {
        const list = targetList === 'pathway' ? [...prev.modules] : [...prev.excludedModules]
        let finalIndex = dropIndex
        if (sourceIndex < dropIndex) {
          finalIndex = dropIndex - 1
        }
        if (finalIndex === sourceIndex || finalIndex < 0 || finalIndex >= list.length) {
          return prev
        }
        const [moved] = list.splice(sourceIndex, 1)
        list.splice(finalIndex, 0, moved)

        return targetList === 'pathway'
          ? { ...prev, modules: list }
          : { ...prev, excludedModules: list }
      })
    } else if (source === 'catalog') {
      // Case 2: Dragging a catalog module into Pathway or Excluded list
      const candidate = AVAILABLE_CATALOG_MODULES.find((m) => m.code === id)
      if (candidate) {
        const newModule: PathwayModuleItem = {
          id: `mod-${Date.now()}-${candidate.code.toLowerCase()}`,
          code: candidate.code,
          title: candidate.title,
          estimatedHours: candidate.estimatedHours,
          domain: candidate.domain,
          reason: candidate.reason,
        }

        updateStoredPathway(pathway.id, (prev) => {
          if (targetList === 'pathway') {
            const nextPathway = [...prev.modules]
            if (dropIndex !== null && dropIndex <= nextPathway.length) {
              nextPathway.splice(dropIndex, 0, newModule)
            } else {
              nextPathway.push(newModule)
            }
            return { ...prev, modules: nextPathway }
          } else if (targetList === 'excluded') {
            const nextExcluded = [...prev.excludedModules]
            if (dropIndex !== null && dropIndex <= nextExcluded.length) {
              nextExcluded.splice(dropIndex, 0, newModule)
            } else {
              nextExcluded.push(newModule)
            }
            return { ...prev, excludedModules: nextExcluded }
          }
          return prev
        })

        if (targetList === 'pathway') {
          toast({
            title: 'Catalog Module Added to Pathway',
            description: `"${candidate.title}" added to active Pathway steps via drag & drop.`,
            variant: 'success',
          })
        } else if (targetList === 'excluded') {
          toast({
            title: 'Catalog Module Excluded',
            description: `"${candidate.title}" placed directly into Excluded Modules via drag & drop.`,
            variant: 'info',
          })
        }
      }
    } else if (targetList === 'catalog') {
      // Case 3: Dragging an existing module from Pathway or Excluded back to Catalog
      const itemTitle =
        source === 'pathway'
          ? pathway.modules.find((m) => m.id === id)?.title
          : pathway.excludedModules.find((m) => m.id === id)?.title

      updateStoredPathway(pathway.id, (prev) => ({
        ...prev,
        modules: source === 'pathway' ? prev.modules.filter((m) => m.id !== id) : prev.modules,
        excludedModules:
          source === 'excluded' ? prev.excludedModules.filter((m) => m.id !== id) : prev.excludedModules,
      }))

      toast({
        title: 'Module Returned to Catalog',
        description: `"${itemTitle || 'Module'}" returned to available catalog modules.`,
        variant: 'default',
      })
    } else {
      // Case 4: Cross-list drag & drop (Pathway <-> Excluded)
      updateStoredPathway(pathway.id, (prev) => {
        if (source === 'pathway' && targetList === 'excluded') {
          // Moving from Pathway to Excluded
          const item = prev.modules.find((m) => m.id === id)
          if (!item) return prev
          const nextExcluded = [...prev.excludedModules]
          if (dropIndex !== null && dropIndex <= nextExcluded.length) {
            nextExcluded.splice(dropIndex, 0, item)
          } else {
            nextExcluded.push(item)
          }
          return {
            ...prev,
            modules: prev.modules.filter((m) => m.id !== id),
            excludedModules: nextExcluded,
          }
        } else if (source === 'excluded' && targetList === 'pathway') {
          // Moving from Excluded to Pathway
          const item = prev.excludedModules.find((m) => m.id === id)
          if (!item) return prev
          const nextPathway = [...prev.modules]
          if (dropIndex !== null && dropIndex <= nextPathway.length) {
            nextPathway.splice(dropIndex, 0, item)
          } else {
            nextPathway.push(item)
          }
          return {
            ...prev,
            excludedModules: prev.excludedModules.filter((m) => m.id !== id),
            modules: nextPathway,
          }
        }
        return prev
      })

      if (source === 'pathway' && targetList === 'excluded') {
        toast({
          title: 'Module Excluded via Drag',
          description: 'Module moved into the Excluded List. It will be excluded during the next pathway regeneration.',
          variant: 'info',
        })
      } else {
        toast({
          title: 'Module Included via Drag',
          description: 'Module restored into active pathway steps.',
          variant: 'success',
        })
      }
    }

    setDraggingItem(null)
    setDragOverTarget(null)
  }

  const handleDragEnd = () => {
    setDraggingItem(null)
    setDragOverTarget(null)
    document.body.classList.remove('cursor-grabbing-active')
  }

  // Open Regeneration Modal
  const handleOpenRegenerateDialog = () => {
    if (isRegenerating) return
    setRegenerationInstructions('')
    setIsRegenerateModalOpen(true)
  }

  // Trigger Pathway Regeneration with Spinning Icon & Lock
  const handleSubmitRegeneration = () => {
    if (!pathway) return
    setIsRegenerateModalOpen(false)
    setIsRegenerating(true)

    const instructions =
      regenerationInstructions.trim() ||
      'Expert requested adaptive replanning with updated prerequisite alignment.'

    // Remember the currently excluded modules:
    const currentlyExcluded = [...pathway.excludedModules]
    const excludedCodes = new Set(currentlyExcluded.map((m) => m.code))

    toast({
      title: 'Regeneration in Progress',
      description: `AI Replanner is recalibrating pathway for ${pathway.employeeName}. Strictly omitting ${currentlyExcluded.length} excluded modules.`,
      variant: 'default',
    })

    // Simulate async AI replanner execution
    setTimeout(() => {
      // Create regenerated modules sequence omitting excluded items
      const candidatePool: PathwayModuleItem[] = [
        {
          id: `mod-regen-auto-${Date.now()}-1`,
          code: 'MOD-REGEN-101',
          title: 'Advanced Graph Schema Evolution & Migrations',
          estimatedHours: 8,
          domain: 'Knowledge Systems',
          reason: `Adapted according to expert instructions: "${instructions}"`,
        },
        {
          id: `mod-regen-auto-${Date.now()}-2`,
          code: 'MOD-REGEN-202',
          title: 'Prerequisite Adaptive Refactoring & Lab Workshop',
          estimatedHours: 10,
          domain: 'AI & Data Science',
          reason: 'Algorithmic reinforcement based on assessment diagnostic delta.',
        },
      ]

      // Filter out any candidates that conflict with exclusions
      const approvedCandidates = candidatePool.filter((c) => !excludedCodes.has(c.code))

      updateStoredPathway(pathway.id, (prev) => ({
        ...prev,
        status: 'PENDING_EXPERT_CONFIRMATION',
        generatedAt: 'Just now (Regenerated)',
        regenerationFeedback: instructions,
        // Existing active modules that weren't excluded + new regenerated recommendation
        modules: [
          ...prev.modules.filter((m) => !excludedCodes.has(m.code)),
          ...(approvedCandidates.length > 0 ? [approvedCandidates[0]] : []),
        ],
        // The exclude list STILL has the list of excluded modules before, so user can rethink
        excludedModules: currentlyExcluded,
      }))

      setIsRegenerating(false)

      toast({
        title: 'Pathway Regenerated Successfully',
        description: `Adaptive pathway recalibrated! ${currentlyExcluded.length} excluded module${
          currentlyExcluded.length === 1 ? '' : 's'
        } remain preserved in your exclude list for further review.`,
        variant: 'success',
      })
    }, 1800)
  }

  // Approve Pathway for Learning
  const handleApprovePathway = () => {
    if (!pathway || isRegenerating) return

    updateStoredPathway(pathway.id, (prev) => ({
      ...prev,
      status: 'APPROVED',
    }))

    toast({
      title: 'Pathway Approved for Learning',
      description: `Initial learning pathway for ${pathway.employeeName} has been approved with ${pathway.modules.length} modules. Now unlocked for employee learning.`,
      variant: 'success',
    })
  }

  if (!pathway) {
    return (
      <WorkspaceLayout>
        <div className="py-16 text-center space-y-4">
          <EmptyState
            icon={<Compass className="h-8 w-8 text-muted-foreground" />}
            title="Pathway Not Found"
            description="The requested learning pathway could not be located in the review queue."
            action={
              <Button variant="primary" onClick={() => navigate('/expert/pathway-review')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Return to Review Queue
              </Button>
            }
          />
        </div>
      </WorkspaceLayout>
    )
  }

  const totalIncludedHours = pathway.modules.reduce((sum, m) => sum + m.estimatedHours, 0)
  const totalExcludedHours = pathway.excludedModules.reduce((sum, m) => sum + m.estimatedHours, 0)

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-20">
        {/* Top Navigation & Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div className="space-y-1">
            <Link
              to="/expert/pathway-review"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-semibold"
            >
              <ArrowLeft size={13} />
              <span>Back to Pathway Review Queue</span>
            </Link>
            <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary shrink-0" />
                Audit Initial Pathway: {pathway.employeeName}
              </h1>
              {pathway.status === 'APPROVED' ? (
                <Badge variant="success">APPROVED</Badge>
              ) : (
                <Badge variant="warning">AWAITING REVIEW</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Review, reorder, or exclude modules for this employee&apos;s adaptive study plan before final approval.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              onClick={handleOpenRegenerateDialog}
              className="text-xs font-semibold text-primary border-primary/30 hover:bg-secondary gap-1.5 h-9"
            >
              <RefreshCw
                size={14}
                className={cn('text-primary transition-all', isRegenerating && 'animate-spin')}
              />
              <span>{isRegenerating ? 'Regenerating Pathway...' : 'Regenerate Pathway'}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isRegenerating || pathway.status === 'APPROVED'}
              onClick={handleApprovePathway}
              className="text-xs font-semibold shadow-2xs gap-1.5 h-9"
            >
              <CheckCircle2 size={14} />
              <span>{pathway.status === 'APPROVED' ? 'Approved for Learning' : 'Approve for Learning'}</span>
            </Button>
          </div>
        </div>

        {/* Locked Regeneration Alert Banner */}
        {isRegenerating && (
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3 text-xs text-foreground animate-pulse shadow-sm">
            <RefreshCw size={16} className="text-primary animate-spin shrink-0" />
            <div className="flex-1">
              <strong className="font-semibold text-primary block">
                AI Replanning in Progress
              </strong>
              <span>
                Recalibrating prerequisite graph while strictly omitting {pathway.excludedModules.length} excluded
                module{pathway.excludedModules.length === 1 ? '' : 's'}. All edits are locked during regeneration.
              </span>
            </div>
          </div>
        )}

        {/* Employee Profile Metadata Summary Tile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              <User size={15} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-muted-foreground block">Employee</span>
              <span className="text-xs font-bold text-foreground truncate block">
                {pathway.employeeName}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Target Role</span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-foreground truncate">
                {pathway.targetRoleTitle}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                {pathway.targetRoleCode}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Occupation &amp; Code</span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-mono text-[10px] bg-muted px-1 rounded border border-border">
                {pathway.occupationCode}
              </span>
              <span className="text-xs text-foreground truncate">{pathway.occupationTitle}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Pathway Generation Date</span>
            <span className="text-xs font-mono text-foreground font-semibold">
              {pathway.generatedAt}
            </span>
          </div>
        </div>


        {/* Catalog Module Addition Accordion/Dock with Drag & Drop */}
        <Card
          onDragOver={(e) => handleContainerDragOver(e, 'catalog')}
          onDragLeave={handleContainerDragLeave}
          onDrop={(e) => handleDropOnList(e, 'catalog', null)}
          className={cn(
            'transition-all',
            isRegenerating && 'opacity-60 pointer-events-none',
            dragOverTarget?.list === 'catalog' && 'border-primary ring-2 ring-primary/25 bg-primary/5'
          )}
        >
          <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen size={15} className="text-primary shrink-0" />
                <span className="text-xs font-bold text-foreground">
                  Add Existing Catalog Module
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({availableCatalog.length} available • Drag &amp; drop directly into Pathway or Excluded tables below)
                </span>
              </div>

              {/* Search & Domain Filter */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-48 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search catalog module..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    disabled={isRegenerating}
                    className="h-7 pl-8 text-xs bg-background"
                  />
                </div>

                <div className="relative w-36">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <select
                    value={catalogDomainFilter}
                    onChange={(e) => setCatalogDomainFilter(e.target.value)}
                    disabled={isRegenerating}
                    aria-label="Filter Catalog by Domain"
                    className="w-full h-7 pl-6 pr-2 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="all">All Domains</option>
                    <option value="Graph Database">Graph Database</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Knowledge Systems">Knowledge Systems</option>
                    <option value="Distributed Systems">Distributed Systems</option>
                    <option value="Data Persistence">Data Persistence</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3">
            <div className="max-h-52 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-background shadow-2xs">
              {availableCatalog.length === 0 ? (
                <div className="p-5 text-center text-xs text-muted-foreground">
                  No catalog modules available or matching filter. Try clearing your search query.
                </div>
              ) : (
                availableCatalog.map((candidate, idx) => (
                  <div
                    key={candidate.code}
                    draggable={!isRegenerating}
                    onDragStart={(e) => handleDragStart(e, 'catalog', candidate.code, idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'p-2.5 px-3 flex items-center justify-between gap-3 transition-all select-none group',
                      !isRegenerating ? 'cursor-grab active:cursor-grabbing hover:bg-muted/30' : 'cursor-not-allowed',
                      draggingItem?.id === candidate.code && 'opacity-40 border-2 border-dashed border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/60 group-hover:text-primary transition-colors p-1 rounded hover:bg-muted shrink-0"
                        title="Drag into Pathway Learning Modules or Excluded Modules below"
                      >
                        <GripVertical size={14} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {candidate.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {candidate.code}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {candidate.domain}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {candidate.reason} •{' '}
                          <strong className="text-foreground">{candidate.estimatedHours} hrs</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRegenerating}
                        onClick={() => handleAddCatalogModule(candidate, 'pathway')}
                        className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary hover:text-white transition-colors"
                        title="Add directly to active Pathway (or drag & drop below)"
                      >
                        <Plus size={12} />
                        <span>Add to Pathway</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isRegenerating}
                        onClick={() => handleAddCatalogModule(candidate, 'excluded')}
                        className="h-7 text-xs font-semibold gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                        title="Add directly to Excluded list (or drag & drop below)"
                      >
                        <MinusCircle size={12} />
                        <span>Add to Exclude</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* PARALLEL DUAL TABLES: PATHWAY MODULES vs EXCLUDED MODULES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ===================== LEFT COLUMN: PATHWAY LEARNING MODULES ===================== */}
          <div
            className={cn(
              'space-y-3 transition-opacity',
              isRegenerating && 'opacity-60 pointer-events-none'
            )}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">Pathway Learning Modules</h2>
                  <Badge variant="primary" className="text-xs font-mono">
                    {pathway.modules.length} Included • {totalIncludedHours} hrs
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Drag steps to reorder, or drag/click Exclude to move into the Excluded table.
                </p>
              </div>

              <span className="text-[11px] font-semibold text-primary">Active Curriculum</span>
            </div>

            {/* Droppable Pathway Container */}
            <div
              onDragOver={(e) => handleContainerDragOver(e, 'pathway')}
              onDragLeave={handleContainerDragLeave}
              onDrop={(e) => handleDropOnList(e, 'pathway', dragOverTarget?.index ?? null)}
              className={cn(
                'min-h-[380px] divide-y divide-border border rounded-xl overflow-hidden bg-card shadow-2xs transition-all p-1.5 space-y-1',
                dragOverTarget?.list === 'pathway' && dragOverTarget.index === null
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                  : 'border-border'
              )}
            >
              {pathway.modules.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <Compass className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No active modules in pathway</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                    Drag modules from the Excluded table or use the catalog above to add learning modules.
                  </p>
                </div>
              ) : (
                <>
                  {pathway.modules.map((mod, idx) => (
                    <React.Fragment key={mod.id}>
                      {/* Insertion Indicator before item idx */}
                      {dragOverTarget?.list === 'pathway' &&
                        dragOverTarget.index === idx &&
                        draggingItem &&
                        !(
                          draggingItem.source === 'pathway' &&
                          (draggingItem.index === idx || draggingItem.index === idx - 1)
                        ) && (
                          <div className="relative py-1 my-0.5 pointer-events-none transition-all">
                            <div className="h-1 bg-primary rounded-full w-full shadow-sm animate-pulse" />
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-xs flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}

                      <div
                        draggable={!isRegenerating}
                        onDragStart={(e) => handleDragStart(e, 'pathway', mod.id, idx)}
                        onDragOver={(e) => handleItemDragOver(e, 'pathway', idx)}
                        onDrop={(e) => handleDropOnList(e, 'pathway', dragOverTarget?.index ?? idx)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'p-3 rounded-lg flex items-center justify-between gap-3 transition-all select-none border border-transparent',
                          !isRegenerating
                            ? 'cursor-grab active:cursor-grabbing hover:bg-muted/30 hover:border-border'
                            : 'cursor-not-allowed',
                          draggingItem?.id === mod.id &&
                            'opacity-35 border-2 border-dashed border-primary bg-primary/5 scale-[0.99]'
                        )}
                      >
                        {/* Drag Handle & Reorder arrows */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                            title="Drag to reorder or drag to Excluded table"
                          >
                            <GripVertical size={15} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={isRegenerating || idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              className="text-muted-foreground hover:text-primary disabled:opacity-20 p-0.5 rounded hover:bg-muted"
                              title="Move step up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={isRegenerating || idx === pathway.modules.length - 1}
                              onClick={() => handleMoveStep(idx, 'down')}
                              className="text-muted-foreground hover:text-primary disabled:opacity-20 p-0.5 rounded hover:bg-muted"
                              title="Move step down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Step details */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[11px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                              Step {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {mod.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                              {mod.code}
                            </Badge>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {mod.domain}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {mod.reason} •{' '}
                            <strong className="text-foreground">{mod.estimatedHours} hrs</strong>
                          </p>
                        </div>

                        {/* Action buttons: Exclude & Remove */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRegenerating}
                            onClick={() => handleExcludeModule(mod.id)}
                            className="text-xs font-semibold h-7 px-2.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all gap-1"
                            title="Move to Excluded table"
                          >
                            <MinusCircle size={12} className="text-destructive" />
                            <span>Exclude</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isRegenerating}
                            onClick={() => handleRemoveModule(mod.id, 'pathway')}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove module completely"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Insertion Indicator at end of list */}
                  {dragOverTarget?.list === 'pathway' &&
                    dragOverTarget.index === pathway.modules.length &&
                    draggingItem &&
                    !(
                      draggingItem.source === 'pathway' &&
                      draggingItem.index === pathway.modules.length - 1
                    ) && (
                      <div className="relative py-1 my-0.5 pointer-events-none transition-all">
                        <div className="h-1 bg-primary rounded-full w-full shadow-sm animate-pulse" />
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-xs flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>

          {/* ===================== RIGHT COLUMN: EXCLUDED MODULES ===================== */}
          <div
            className={cn(
              'space-y-3 transition-opacity',
              isRegenerating && 'opacity-60 pointer-events-none'
            )}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">Excluded Modules</h2>
                  <Badge variant="outline" className="text-xs font-mono text-muted-foreground border-border">
                    {pathway.excludedModules.length} Excluded • {totalExcludedHours} hrs
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Remembered for future regenerations. Drag back or click Include if you change your mind.
                </p>
              </div>

              <span className="text-[11px] font-semibold text-muted-foreground">Excluded from AI</span>
            </div>

            {/* Droppable Excluded Container */}
            <div
              onDragOver={(e) => handleContainerDragOver(e, 'excluded')}
              onDragLeave={handleContainerDragLeave}
              onDrop={(e) => handleDropOnList(e, 'excluded', dragOverTarget?.index ?? null)}
              className={cn(
                'min-h-[380px] divide-y divide-border border rounded-xl overflow-hidden bg-card/60 shadow-2xs transition-all p-1.5 space-y-1',
                dragOverTarget?.list === 'excluded' && dragOverTarget.index === null
                  ? 'border-destructive ring-2 ring-destructive/20 bg-destructive/5'
                  : 'border-border border-dashed'
              )}
            >
              {pathway.excludedModules.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <MinusCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No excluded modules yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                    Click &ldquo;Exclude&rdquo; on any pathway module or drag it here. Excluded modules will be strictly
                    bypassed by the AI replanner on future regenerations.
                  </p>
                </div>
              ) : (
                <>
                  {pathway.excludedModules.map((mod, idx) => (
                    <React.Fragment key={mod.id}>
                      {/* Insertion Indicator before item idx */}
                      {dragOverTarget?.list === 'excluded' &&
                        dragOverTarget.index === idx &&
                        draggingItem &&
                        !(
                          draggingItem.source === 'excluded' &&
                          (draggingItem.index === idx || draggingItem.index === idx - 1)
                        ) && (
                          <div className="relative py-1 my-0.5 pointer-events-none transition-all">
                            <div className="h-1 bg-destructive rounded-full w-full shadow-sm animate-pulse" />
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-destructive border-2 border-background shadow-xs flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            </div>
                          </div>
                        )}

                      <div
                        draggable={!isRegenerating}
                        onDragStart={(e) => handleDragStart(e, 'excluded', mod.id, idx)}
                        onDragOver={(e) => handleItemDragOver(e, 'excluded', idx)}
                        onDrop={(e) => handleDropOnList(e, 'excluded', dragOverTarget?.index ?? idx)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'p-3 rounded-lg flex items-center justify-between gap-3 transition-all select-none bg-muted/40 border border-transparent',
                          !isRegenerating
                            ? 'cursor-grab active:cursor-grabbing hover:bg-muted/70 hover:border-border'
                            : 'cursor-not-allowed',
                          draggingItem?.id === mod.id &&
                            'opacity-35 border-2 border-dashed border-destructive bg-destructive/5 scale-[0.99]'
                        )}
                      >
                        {/* Drag Handle */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div
                            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                            title="Drag back into Pathway"
                          >
                            <GripVertical size={15} />
                          </div>
                        </div>

                        {/* Step details */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="destructive" className="text-[10px] font-mono shrink-0">
                              EXCLUDED
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground line-through truncate">
                              {mod.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono shrink-0 opacity-70">
                              {mod.code}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {mod.domain}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {mod.reason} •{' '}
                            <strong className="text-foreground">{mod.estimatedHours} hrs</strong>
                          </p>
                        </div>

                        {/* Action buttons: Include back & Remove */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isRegenerating}
                            onClick={() => handleIncludeModule(mod.id)}
                            className="text-xs font-semibold h-7 px-2.5 border-primary/40 text-primary bg-primary/5 hover:bg-primary/15 transition-all gap-1"
                            title="Restore module back to active pathway"
                          >
                            <PlusCircle size={12} className="text-primary" />
                            <span>Include</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isRegenerating}
                            onClick={() => handleRemoveModule(mod.id, 'excluded')}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remove module completely"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Insertion Indicator at end of list */}
                  {dragOverTarget?.list === 'excluded' &&
                    dragOverTarget.index === pathway.excludedModules.length &&
                    draggingItem &&
                    !(
                      draggingItem.source === 'excluded' &&
                      draggingItem.index === pathway.excludedModules.length - 1
                    ) && (
                      <div className="relative py-1 my-0.5 pointer-events-none transition-all">
                        <div className="h-1 bg-destructive rounded-full w-full shadow-sm animate-pulse" />
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-destructive border-2 border-background shadow-xs flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* REGENERATE INSTRUCTIONS MODAL */}
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
            Provide guidance for {pathway.employeeName}&apos;s learning pathway. The {pathway.excludedModules.length}{' '}
            currently excluded module{pathway.excludedModules.length === 1 ? '' : 's'} will be strictly skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              Adjustment Notes &amp; Guidance (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="E.g., Emphasize foundational graph indexing; focus strictly on core architecture; optimize sequence pacing..."
              value={regenerationInstructions}
              onChange={(e) => setRegenerationInstructions(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50 border border-border space-y-1">
            <span className="font-semibold text-foreground block">
              Excluded Constraints ({pathway.excludedModules.length} modules):
            </span>
            {pathway.excludedModules.length === 0 ? (
              <span className="text-[11px] text-muted-foreground italic">No modules currently excluded.</span>
            ) : (
              <div className="flex flex-wrap gap-1 pt-1">
                {pathway.excludedModules.map((m) => (
                  <Badge key={m.id} variant="outline" className="text-[10px] font-mono">
                    {m.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsRegenerateModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitRegeneration}
            className="font-semibold shadow-2xs gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Start Regeneration</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}
