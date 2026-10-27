import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  Edit3,
  Eye,
  Filter,
  GitBranch,
  Layers,
  Maximize2,
  Minimize2,
  Network as NetworkIcon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as React from 'react'
import { Network, type Options, type Node, type Edge } from 'vis-network'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Progress } from '../../../shared/components/ui/Progress'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import {
  QuickConfigImportModal,
  type ImportPreset,
} from '../../../shared/components/import/QuickConfigImportModal'
import { useToast } from '../../../shared/hooks/useToast'
import { cn } from '../../../shared/lib/utils'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
} from '../../../shared/stores/companyStore'
import {
  fetchMicroSkills,
  createMicroSkill,
  updateMicroSkill,
  deleteMicroSkill,
} from '../../../shared/api/microSkillApi'
import {
  fetchCompetencies,
  createCompetency,
  updateCompetency,
  deleteCompetency,
} from '../../../shared/api/competencyApi'
import {
  fetchPrerequisites,
  createPrerequisite,
  deletePrerequisite,
} from '../../../shared/api/prerequisiteApi'
import {
  type CompetencyModel,
  type MicroSkillModel,
  type PrerequisiteEdge,
} from '../data/ldManagerMockData'

const ONTOLOGY_PRESETS: ImportPreset[] = [
  {
    id: 'preset-foundation-models',
    name: 'Foundation Models & LLM Engineering',
    description: '2 Macro Competencies, 4 Micro-skills, and 2 Prerequisite edges based on Stanford CS324.',
    badge: 'AI Curricula',
    itemCount: 6,
    previewSnippet: JSON.stringify(
      {
        competencies: [
          { code: 'COMP-LLM-01', name: 'Transformer Architectures & Attention Mechanisms' },
          { code: 'COMP-RAG-01', name: 'Retrieval Augmented Generation & Vector Indices' },
        ],
        microSkills: [
          { code: 'SKILL-ATTN-01', name: 'Implement Multi-Head Scaled Dot-Product Attention' },
          { code: 'SKILL-KV-01', name: 'Configure KV-Cache Quantization & PagedAttention' },
        ],
      },
      null,
      2
    ),
    payload: {
      competencies: [
        {
          id: 'comp-llm-01',
          code: 'COMP-LLM-01',
          name: 'Transformer Architectures & Attention Mechanisms',
          description: 'Deep understanding of self-attention matrices, positional encodings, and modern transformer layers.',
          status: 'ACTIVE',
          skillIds: ['skill-attn-01', 'skill-kv-01'],
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: 'comp-rag-01',
          code: 'COMP-RAG-01',
          name: 'Retrieval Augmented Generation & Vector Indices',
          description: 'Engineering neural search indexing, re-ranking filters, and hybrid lexical-semantic retrieval.',
          status: 'ACTIVE',
          skillIds: ['skill-vec-01', 'skill-rr-01'],
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      microSkills: [
        {
          id: 'skill-attn-01',
          code: 'SKILL-ATTN-01',
          name: 'Implement Multi-Head Scaled Dot-Product Attention',
          description: 'Derives queries, keys, values tensors and computes masked softmax weights without memory leakage.',
          status: 'ACTIVE',
          macroCompetencyCode: 'KNOWLEDGE',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: 'skill-kv-01',
          code: 'SKILL-KV-01',
          name: 'Configure KV-Cache Quantization & PagedAttention',
          description: 'Profiles vLLM chunked prefill memory allocations under high token concurrency.',
          status: 'ACTIVE',
          macroCompetencyCode: 'KNOWLEDGE',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: 'skill-vec-01',
          code: 'SKILL-VEC-01',
          name: 'Construct HNSW Vector Graph Embedding Pipeline',
          description: 'Builds approximate nearest neighbor graph index with recall@10 >= 0.95.',
          status: 'ACTIVE',
          macroCompetencyCode: 'KNOWLEDGE',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: 'skill-rr-01',
          code: 'SKILL-RR-01',
          name: 'Integrate Cross-Encoder Reciprocal Rank Fusion',
          description: 'Applies reranking scoring to boost precision on complex domain queries.',
          status: 'ACTIVE',
          macroCompetencyCode: 'KNOWLEDGE',
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      prerequisites: [
        {
          id: 'pre-attn-kv',
          sourceSkillId: 'skill-attn-01',
          targetSkillId: 'skill-kv-01',
          requiredThreshold: 80,
          type: 'hard_prerequisite',
          ruleRef: 'ATTN-PREQ',
        },
        {
          id: 'pre-vec-rr',
          sourceSkillId: 'skill-vec-01',
          targetSkillId: 'skill-rr-01',
          requiredThreshold: 75,
          type: 'recommended',
          ruleRef: 'VEC-PREQ',
        },
      ],
    },
  },
]

export function CompetencyOntologyPage() {
  const { toast } = useToast()

  // State for active tab
  const [activeTab, setActiveTab] = React.useState('skills')

  // Search, filter, and pagination states for Tab 1 (Micro-skills)
  const [skillSearchQuery, setSkillSearchQuery] = React.useState('')
  const [skillMacroFilter, setSkillMacroFilter] = React.useState('all')
  const [skillStatusFilter, setSkillStatusFilter] = React.useState('all')
  const [skillSortBy, setSkillSortBy] = React.useState<'latest' | 'title' | 'code'>('latest')
  const [skillCurrentPage, setSkillCurrentPage] = React.useState(1)
  const [skillPageSize] = React.useState(10)

  const formatDate = React.useCallback((isoString?: string): string => {
    if (!isoString) return 'Recent'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Recent'
    }
  }, [])

  React.useEffect(() => {
    setSkillCurrentPage(1)
  }, [skillSearchQuery, skillMacroFilter, skillStatusFilter, skillSortBy])

  // Search, filter, and pagination states for Tab: Competencies
  const [competencySearchQuery, setCompetencySearchQuery] = React.useState('')
  const [competencyStatusFilter, setCompetencyStatusFilter] = React.useState('all')
  const [competencySortBy, setCompetencySortBy] = React.useState<'latest' | 'title' | 'code'>('latest')
  const [competencyCurrentPage, setCompetencyCurrentPage] = React.useState(1)
  const [competencyPageSize] = React.useState(10)

  // Competency CRUD Modals
  const [isCompetencyModalOpen, setIsCompetencyModalOpen] = React.useState(false)
  const [selectedCompetency, setSelectedCompetency] = React.useState<CompetencyModel | null>(null)
  const [deletingCompetency, setDeletingCompetency] = React.useState<CompetencyModel | null>(null)
  const [viewingCompetencyDetails, setViewingCompetencyDetails] = React.useState<CompetencyModel | null>(null)

  const [competencyForm, setCompetencyForm] = React.useState({
    code: '',
    name: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
    skillIds: [] as string[],
  })

  // Search, filter, and pagination states for Tab 2 (Prerequisites)
  const [prereqSearchQuery, setPrereqSearchQuery] = React.useState('')
  const [prereqTypeFilter, setPrereqTypeFilter] = React.useState('all')
  const [prereqCurrentPage, setPrereqCurrentPage] = React.useState(1)
  const [prereqPageSize] = React.useState(10)

  // State for entities
  const [competencies, setCompetencies] = React.useState<CompetencyModel[]>(() => getActiveCompany()?.competencies ?? [])
  const [microSkills, setMicroSkills] = React.useState<MicroSkillModel[]>(() => getActiveCompany()?.microSkills ?? [])
  const [prerequisites, setPrerequisites] = React.useState<PrerequisiteEdge[]>(() => getActiveCompany()?.prerequisites ?? [])

  // Synchronize state when active company scope changes & fetch live from Neo4j
  React.useEffect(() => {
    const handleSync = async () => {
      const active = getActiveCompany()
      const orgId = active?.id || 'default-org'

      try {
        const [liveSkills, liveComps, livePrereqs] = await Promise.all([
          fetchMicroSkills(orgId).catch(() => []),
          fetchCompetencies(orgId).catch(() => []),
          fetchPrerequisites(orgId).catch(() => []),
        ])

        let resolvedSkills: MicroSkillModel[] = active?.microSkills ?? []
        if (liveSkills && liveSkills.length > 0) {
          resolvedSkills = liveSkills.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            description: s.description || '',
            status: (s.status as MicroSkillModel['status']) || 'ACTIVE',
            macroCompetencyCode: s.macroCompetencyCode || 'KNOWLEDGE',
            createdAt: s.createdAt || (active?.microSkills || []).find((item) => item.id === s.id || item.code === s.code)?.createdAt || '2026-01-01T00:00:00.000Z',
            updatedAt: s.updatedAt || new Date().toISOString(),
          }))
          setMicroSkills(resolvedSkills)
        } else {
          setMicroSkills(resolvedSkills)
        }

        if (liveComps && liveComps.length > 0) {
          const mappedComps: CompetencyModel[] = liveComps.map((c) => ({
            id: c.id,
            code: c.code || c.id,
            name: c.name,
            description: c.description || '',
            status: (c.status as CompetencyModel['status']) || 'ACTIVE',
            skillIds: c.skillIds || [],
            levelCodes: c.levelCodes || [],
            createdAt: (c as unknown as Record<string, unknown>).createdAt ? String((c as unknown as Record<string, unknown>).createdAt) : (active?.competencies || []).find((item) => item.id === c.id || item.code === c.code)?.createdAt || '2026-01-01T00:00:00.000Z',
            updatedAt: (c as unknown as Record<string, unknown>).updatedAt ? String((c as unknown as Record<string, unknown>).updatedAt) : new Date().toISOString(),
          }))
          const customComps = active?.competencies || []
          const mergedComps = [...mappedComps]
          for (const custom of customComps) {
            if (!mergedComps.some((c) => c.id === custom.id || (custom.code && c.code === custom.code))) {
              mergedComps.unshift(custom)
            }
          }
          setCompetencies(mergedComps)
        } else {
          setCompetencies(active?.competencies ?? [])
        }

        if (livePrereqs && livePrereqs.length > 0) {
          const mappedPrereqs: PrerequisiteEdge[] = livePrereqs.map((p) => ({
            id: `edge-${p.sourceSkillId}-${p.targetSkillId}`,
            sourceSkillId: p.sourceSkillId,
            sourceSkillCode: p.sourceSkillCode,
            sourceSkillName: p.sourceSkillName,
            targetSkillId: p.targetSkillId,
            targetSkillCode: p.targetSkillCode,
            targetSkillName: p.targetSkillName,
            minMastery: p.minMastery,
            status: p.status,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          }))
          setPrerequisites(mappedPrereqs)
        } else {
          setPrerequisites(active?.prerequisites ?? [])
        }
      } catch {
        setMicroSkills(active?.microSkills ?? [])
        setCompetencies(active?.competencies ?? [])
        setPrerequisites(active?.prerequisites ?? [])
      }
    }

    handleSync()
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [])



  const saveAndSetMicroSkills = React.useCallback(
    (updater: MicroSkillModel[] | ((prev: MicroSkillModel[]) => MicroSkillModel[])) => {
      setMicroSkills((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({ ...c, microSkills: next }))
        return next
      })
    },
    []
  )

  const saveAndSetPrerequisites = React.useCallback(
    (updater: PrerequisiteEdge[] | ((prev: PrerequisiteEdge[]) => PrerequisiteEdge[])) => {
      setPrerequisites((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({ ...c, prerequisites: next }))
        return next
      })
    },
    []
  )

  // Modals state
  const [isSkillModalOpen, setIsSkillModalOpen] = React.useState(false)
  const [isPrereqModalOpen, setIsPrereqModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  const handleImportOntology = (payload: unknown) => {
    const payloadObj = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>
    const rawComps: unknown[] = Array.isArray(payload) ? payload : Array.isArray(payloadObj.competencies) ? (payloadObj.competencies as unknown[]) : []
    const rawSkills: unknown[] = Array.isArray(payloadObj.microSkills) ? (payloadObj.microSkills as unknown[]) : []
    const rawPrereqs: unknown[] = Array.isArray(payloadObj.prerequisites) ? (payloadObj.prerequisites as unknown[]) : []

    const normalizedComps: CompetencyModel[] = rawComps.map((compRecord: unknown, idx: number) => {
      const c = (typeof compRecord === 'object' && compRecord !== null ? compRecord : {}) as Record<string, unknown>
      return {
        id: String(c.id || `comp-${Date.now()}-${idx}`),
        code: String(c.code || `COMP-${idx + 1}`).trim().toUpperCase(),
        name: String(c.name || 'Untitled Competency Domain').trim(),
        description: String(c.description || c.definition || 'Domain description and scope.').trim(),
        status: (c.status === 'DRAFT' || c.status === 'RETIRED' || c.status === 'draft' || c.status === 'archived') ? c.status : 'ACTIVE',
        skillIds: Array.isArray(c.skillIds) ? (c.skillIds as string[]) : [],
        createdAt: String(c.createdAt || new Date().toISOString().slice(0, 10)),
        updatedAt: String(c.updatedAt || new Date().toISOString().slice(0, 10)),
      }
    })

    const normalizedSkills: MicroSkillModel[] = rawSkills.map((skillRecord: unknown, idx: number) => {
      const s = (typeof skillRecord === 'object' && skillRecord !== null ? skillRecord : {}) as Record<string, unknown>
      return {
        id: String(s.id || `skill-${Date.now()}-${idx}`),
        code: String(s.code || `SKILL-${idx + 1}`).trim().toUpperCase(),
        name: String(s.name || 'Untitled Micro-skill').trim(),
        description: String(s.description || s.observableOutcome || 'Skill description and scope.').trim(),
        status: (s.status === 'DRAFT' || s.status === 'RETIRED' || s.status === 'draft' || s.status === 'archived') ? s.status : 'ACTIVE',
        macroCompetencyCode: String(s.macroCompetencyCode || 'KNOWLEDGE'),
        createdAt: String(s.createdAt || new Date().toISOString().slice(0, 10)),
        updatedAt: String(s.updatedAt || new Date().toISOString().slice(0, 10)),
      }
    })

    const normalizedPrereqs: PrerequisiteEdge[] = rawPrereqs.map((prereqRecord: unknown, idx: number) => {
      const p = (typeof prereqRecord === 'object' && prereqRecord !== null ? prereqRecord : {}) as Record<string, unknown>
      return {
        id: String(p.id || `edge-${Date.now()}-${idx}`),
        sourceSkillId: String(p.sourceSkillId || ''),
        targetSkillId: String(p.targetSkillId || ''),
        relationshipType: String(p.relationshipType || 'strictly_requires'),
        rationale: String(p.rationale || 'Prerequisite dependency'),
        pedagogicalWeight: typeof p.pedagogicalWeight === 'number' ? p.pedagogicalWeight : 1.0,
        minMastery: typeof p.minMastery === 'number' ? p.minMastery : 0.75,
        createdAt: String(p.createdAt || new Date().toISOString().slice(0, 10)),
      }
    })

    const updatedComps = [...normalizedComps, ...competencies]
    const updatedSkills = [...normalizedSkills, ...microSkills]
    const updatedPrereqs = [...normalizedPrereqs, ...prerequisites]

    setCompetencies(updatedComps)
    setMicroSkills(updatedSkills)
    setPrerequisites(updatedPrereqs)
    updateActiveCompany((c) => ({
      ...c,
      competencies: updatedComps,
      microSkills: updatedSkills,
      prerequisites: updatedPrereqs,
    }))
  }

  // Details Modals state (Miro Flow)
  const [viewingSkillDetails, setViewingSkillDetails] = React.useState<MicroSkillModel | null>(null)
  const [viewingEdgeDetails, setViewingEdgeDetails] = React.useState<PrerequisiteEdge | null>(null)

  // Deletion confirmation state
  const [deletingEdge, setDeletingEdge] = React.useState<PrerequisiteEdge | null>(null)
  const [deletingSkill, setDeletingSkill] = React.useState<MicroSkillModel | null>(null)

  // Selection states
  const [selectedSkill, setSelectedSkill] = React.useState<MicroSkillModel | null>(null)

  // Micro-Skill Form (Strictly aligned with neo4j_schema.md)
  const [skillForm, setSkillForm] = React.useState({
    code: '',
    name: '',
    description: '',
    macroCompetencyCode: 'KNOWLEDGE' as 'KNOWLEDGE' | 'COMMUNICATION' | 'INNOVATION',
  })

  // Prerequisite Form (Strictly aligned with neo4j_schema.md PREREQUISITE_OF { minMastery })
  const [prereqForm, setPrereqForm] = React.useState({
    sourceSkillId: '',
    targetSkillId: '',
    minMasteryPercent: 75,
  })

  // Graph state
  const graphContainerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)
  const [graphInspectorNode, setGraphInspectorNode] = React.useState<any | null>(null)
  const [graphFilterType, setGraphFilterType] = React.useState<string>('all')
  const [graphLayoutMode, setGraphLayoutMode] = React.useState<'hierarchical' | 'organic'>('hierarchical')
  const [focusCompetencyId, setFocusCompetencyId] = React.useState<string>('all')
  const [isGraphFullscreen, setIsGraphFullscreen] = React.useState(false)

  // ------------------------------------------------------------------
  // Micro-Skill Handlers (REQ-012)
  // ------------------------------------------------------------------
  const handleOpenCreateSkill = () => {
    setSkillForm({
      code: `SKILL-${Math.random().toString(36).substring(2, 5).toUpperCase()}-01`,
      name: '',
      description: '',
      macroCompetencyCode: 'KNOWLEDGE',
    })
    setSelectedSkill(null)
    setIsSkillModalOpen(true)
  }

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim() || !skillForm.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and Description are strictly required.',
        variant: 'destructive',
      })
      return
    }

    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'

    if (selectedSkill) {
      try {
        const updated = await updateMicroSkill(orgId, selectedSkill.id, {
          name: skillForm.name.trim(),
          description: skillForm.description.trim(),
        })

        saveAndSetMicroSkills((prev) =>
          prev.map((s) =>
            s.id === selectedSkill.id
              ? {
                  ...s,
                  name: updated.name,
                  description: updated.description || '',
                  updatedAt: updated.updatedAt || new Date().toISOString(),
                }
              : s
          )
        )
        toast({ title: 'Micro-skill Updated', description: `Saved changes to ${selectedSkill.code}.`, variant: 'success' })
        setIsSkillModalOpen(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update micro-skill on server.'
        toast({
          title: 'Update Failed',
          description: message,
          variant: 'destructive',
        })
      }
    } else {
      if (!skillForm.code.trim()) {
        toast({ title: 'Validation Error', description: 'Skill code is strictly required.', variant: 'destructive' })
        return
      }

      if (microSkills.some((s) => s.code.toUpperCase() === skillForm.code.trim().toUpperCase())) {
        toast({ title: 'Duplicate Code', description: 'Skill code must be globally unique.', variant: 'destructive' })
        return
      }

      try {
        const created = await createMicroSkill(orgId, {
          code: skillForm.code.trim().toUpperCase(),
          name: skillForm.name.trim(),
          description: skillForm.description.trim(),
          macroCompetencyCode: skillForm.macroCompetencyCode || 'KNOWLEDGE',
        })

        const newSkill: MicroSkillModel = {
          id: created.id,
          code: created.code,
          name: created.name,
          description: created.description || '',
          macroCompetencyCode: created.macroCompetencyCode || 'KNOWLEDGE',
          status: 'ACTIVE',
          createdAt: created.createdAt || new Date().toISOString(),
          updatedAt: created.updatedAt || new Date().toISOString(),
        }

        saveAndSetMicroSkills([newSkill, ...microSkills])
        setIsSkillModalOpen(false)

        toast({
          title: 'Micro-skill Created',
          description: `Registered ${newSkill.code} under ${skillForm.macroCompetencyCode || 'KNOWLEDGE'}.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create micro-skill on server.'
        toast({
          title: 'Create Failed',
          description: message,
          variant: 'destructive',
        })
      }
    }
  }

  const handleDeleteSkill = async (skill: MicroSkillModel) => {
    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'

    try {
      await deleteMicroSkill(orgId, skill.id)
      saveAndSetMicroSkills((prev) => prev.filter((s) => s.id !== skill.id))
      saveAndSetPrerequisites((prev) => prev.filter((p) => p.sourceSkillId !== skill.id && p.targetSkillId !== skill.id))
      toast({
        title: 'Micro-skill Deleted',
        description: `Successfully deleted ${skill.code}.`,
        variant: 'success',
      })
      setDeletingSkill(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Micro-skill is currently in use or required by a target role.'
      toast({
        title: 'Cannot Delete Micro-skill',
        description: message,
        variant: 'destructive',
      })
      setDeletingSkill(null)
    }
  }

  // ------------------------------------------------------------------
  // Prerequisite Edge Handlers (REQ-018-F02: Self-edge & Cycle Detection)
  // ------------------------------------------------------------------
  const handleSavePrerequisite = async () => {
    const { sourceSkillId, targetSkillId, minMasteryPercent } = prereqForm

    // 1. Reject self-edges
    if (sourceSkillId === targetSkillId) {
      toast({
        title: 'Self-Edge Rejected',
        description: 'A micro-skill cannot be a prerequisite of itself.',
        variant: 'destructive',
      })
      return
    }

    // 2. Threshold validation
    if (minMasteryPercent < 1 || minMasteryPercent > 100) {
      toast({
        title: 'Invalid Mastery Threshold',
        description: 'Minimum required mastery must be between 1% and 100%.',
        variant: 'destructive',
      })
      return
    }

    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'
    const minMastery = minMasteryPercent / 100.0

    try {
      const created = await createPrerequisite(orgId, {
        sourceSkillId,
        targetSkillId,
        minMastery,
      })

      const newEdge: PrerequisiteEdge = {
        id: `edge-${created.sourceSkillId}-${created.targetSkillId}`,
        sourceSkillId: created.sourceSkillId,
        sourceSkillCode: created.sourceSkillCode,
        sourceSkillName: created.sourceSkillName,
        targetSkillId: created.targetSkillId,
        targetSkillCode: created.targetSkillCode,
        targetSkillName: created.targetSkillName,
        minMastery: created.minMastery,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      }

      saveAndSetPrerequisites([...prerequisites, newEdge])
      setIsPrereqModalOpen(false)

      const sourceSkill = microSkills.find((s) => s.id === sourceSkillId)
      const targetSkill = microSkills.find((s) => s.id === targetSkillId)

      toast({
        title: 'Prerequisite Edge Created',
        description: `${sourceSkill?.code || created.sourceSkillCode} -> ${targetSkill?.code || created.targetSkillCode} (Min Mastery: ${minMasteryPercent}%).`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create prerequisite edge on server.'
      toast({
        title: 'Prerequisite Rejected',
        description: message,
        variant: 'destructive',
      })
    }
  }

  const handleDeletePrereq = async (edge: PrerequisiteEdge) => {
    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'

    try {
      await deletePrerequisite(orgId, edge.sourceSkillId, edge.targetSkillId)
      saveAndSetPrerequisites((prev) =>
        prev.filter((p) => !(p.sourceSkillId === edge.sourceSkillId && p.targetSkillId === edge.targetSkillId))
      )
      toast({ title: 'Edge Removed', description: 'Prerequisite edge deleted.', variant: 'info' })
      setDeletingEdge(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not delete prerequisite edge from server.'
      toast({
        title: 'Failed to Delete Edge',
        description: message,
        variant: 'destructive',
      })
      setDeletingEdge(null)
    }
  }

  // ------------------------------------------------------------------
  // Interactive vis-network Graph Explorer
  // ------------------------------------------------------------------
  React.useEffect(() => {
    if (activeTab !== 'graph' || !graphContainerRef.current) return

    let networkInstance: Network | null = null

    // Filter competencies and micro-skills
    const activeCompetencies =
      focusCompetencyId === 'all'
        ? competencies
        : competencies.filter((c) => c.id === focusCompetencyId)

    // Allowed skill IDs based on focused competency
    const allowedSkillIds = new Set<string>()
    if (focusCompetencyId === 'all') {
      microSkills.forEach((s) => allowedSkillIds.add(s.id))
    } else {
      activeCompetencies.forEach((c) => c.skillIds.forEach((id) => allowedSkillIds.add(id)))
      // Include prerequisite skills connected to these skills for context
      prerequisites.forEach((p) => {
        if (allowedSkillIds.has(p.sourceSkillId) || allowedSkillIds.has(p.targetSkillId)) {
          allowedSkillIds.add(p.sourceSkillId)
          allowedSkillIds.add(p.targetSkillId)
        }
      })
    }

    // Transform competencies and micro-skills into graph nodes
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Competency nodes
    activeCompetencies.forEach((c) => {
      if (graphFilterType === 'all' || graphFilterType === 'competency') {
        nodes.push({
          id: c.id,
          label: `<b>${c.code}</b>\n${c.name}`,
          shape: 'box',
          shapeProperties: { borderRadius: 6 },
          widthConstraint: { maximum: 170 },
          margin: { top: 10, right: 14, bottom: 10, left: 14 },
          level: 0,
          color: {
            background: '#FFF7ED',
            border: '#EA580C',
            highlight: { background: '#FFEDD5', border: '#C2410C' },
            hover: { background: '#FFEDD5', border: '#EA580C' },
          },
          font: {
            multi: 'html',
            color: '#0F172A',
            size: 11,
            face: 'IBM Plex Sans, sans-serif',
          },
          borderWidth: 2,
          shadow: { enabled: true, color: 'rgba(0,0,0,0.06)', size: 4, x: 0, y: 2 },
        })
      }
    })

    // Micro-skill nodes
    microSkills.forEach((s) => {
      if (!allowedSkillIds.has(s.id)) return
      if (graphFilterType === 'all' || graphFilterType === 'skill') {
        const hasIncomingPrereq = prerequisites.some((p) => p.targetSkillId === s.id || p.targetSkillCode === s.code)
        const level = hasIncomingPrereq ? 2 : 1
        nodes.push({
          id: s.id,
          label: `<b>${s.code}</b>\n${s.name}`,
          shape: 'box',
          shapeProperties: { borderRadius: 16 },
          widthConstraint: { maximum: 155 },
          margin: { top: 8, right: 12, bottom: 8, left: 12 },
          level,
          color: {
            background: '#F0FDF4',
            border: '#16A34A',
            highlight: { background: '#DCFCE7', border: '#15803D' },
            hover: { background: '#DCFCE7', border: '#16A34A' },
          },
          font: {
            multi: 'html',
            color: '#0F172A',
            size: 10.5,
            face: 'IBM Plex Sans, sans-serif',
          },
          borderWidth: 1.5,
          shadow: { enabled: true, color: 'rgba(0,0,0,0.05)', size: 3, x: 0, y: 1 },
        })
      }
    })

    // HAS_SKILL edges (Connect via c.skillIds or matching macroCompetencyCode)
    activeCompetencies.forEach((c) => {
      microSkills.forEach((s) => {
        const belongsToComp =
          c.skillIds.includes(s.id) ||
          c.skillIds.includes(s.code) ||
          (s.macroCompetencyCode && s.macroCompetencyCode.toUpperCase() === c.code.toUpperCase())
        if (belongsToComp) {
          const hasSource = nodes.some((n) => n.id === c.id)
          const hasTarget = nodes.some((n) => n.id === s.id)
          if (hasSource && hasTarget && !edges.some((e) => e.from === c.id && e.to === s.id)) {
            edges.push({
              id: `has-skill-${c.id}-${s.id}`,
              from: c.id,
              to: s.id,
              title: `Domain Scope: ${c.name} includes ${s.code}`,
              color: { color: '#CBD5E1', highlight: '#EA580C', hover: '#94A3B8' },
              arrows: { to: { enabled: true, scaleFactor: 0.7 } },
              dashes: false,
              width: 1.5,
            })
          }
        }
      })
    })

    // PREREQUISITE edges (Dashed crimson with clean badge threshold label)
    prerequisites.forEach((p) => {
      const hasSource = nodes.some((n) => n.id === p.sourceSkillId)
      const hasTarget = nodes.some((n) => n.id === p.targetSkillId)
      if (hasSource && hasTarget) {
        edges.push({
          id: `prereq-${p.id}`,
          from: p.sourceSkillId,
          to: p.targetSkillId,
          label: `≥ ${Math.round(p.minMastery * 100)}%`,
          title: `Prerequisite Requirement: ${Math.round(p.minMastery * 100)}% mastery required`,
          font: {
            size: 9,
            color: '#DC2626',
            background: '#FEF2F2',
            strokeWidth: 0,
            align: 'horizontal',
          },
          color: { color: '#F87171', highlight: '#DC2626', hover: '#DC2626' },
          arrows: { to: { enabled: true, scaleFactor: 0.8 } },
          dashes: [5, 5],
          width: 2,
        })
      }
    })

    const options: Options = {
      nodes: {
        borderWidth: 2,
      },
      edges: {
        width: 1.5,
        smooth:
          graphLayoutMode === 'hierarchical'
            ? { enabled: true, type: 'cubicBezier', forceDirection: 'vertical', roundness: 0.5 }
            : { enabled: true, type: 'continuous', roundness: 0.4 },
      },
      layout: {
        hierarchical: {
          enabled: graphLayoutMode === 'hierarchical',
          direction: 'UD',
          sortMethod: 'hubsize',
          levelSeparation: 160,
          nodeSpacing: 280,
          treeSpacing: 320,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      },
      physics: {
        enabled: true,
        solver: graphLayoutMode === 'hierarchical' ? 'hierarchicalRepulsion' : 'barnesHut',
        hierarchicalRepulsion: {
          nodeDistance: 280,
          centralGravity: 0.0,
          springLength: 160,
          springConstant: 0.01,
          damping: 0.09,
          avoidOverlap: 1,
        },
        barnesHut: {
          gravitationalConstant: -4000,
          centralGravity: 0.2,
          springLength: 160,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 1,
        },
        stabilization: {
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
    }

    let resizeObserver: ResizeObserver | null = null

    const timer = setTimeout(() => {
      if (!graphContainerRef.current) return
      networkInstance = new Network(graphContainerRef.current, { nodes, edges }, options)
      networkRef.current = networkInstance

      networkInstance.once('stabilizationIterationsDone', () => {
        networkInstance?.fit()
      })

      setTimeout(() => {
        networkInstance?.redraw()
        networkInstance?.fit()
      }, 100)

      networkInstance.on('click', (params) => {
        if (params.nodes && params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const comp = competencies.find((c) => c.id === nodeId)
          if (comp) {
            setGraphInspectorNode({ ...comp, nodeCategory: 'Competency' })
            return
          }
          const skill = microSkills.find((s) => s.id === nodeId)
          if (skill) {
            setGraphInspectorNode({ ...skill, nodeCategory: 'Micro-Skill' })
            return
          }
        } else {
          setGraphInspectorNode(null)
        }
      })

      if (graphContainerRef.current && window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          if (networkInstance && graphContainerRef.current) {
            if (graphContainerRef.current.clientWidth > 0 && graphContainerRef.current.clientHeight > 0) {
              networkInstance.redraw()
              networkInstance.fit()
            }
          }
        })
        resizeObserver.observe(graphContainerRef.current)
      }
    }, 40)

    return () => {
      clearTimeout(timer)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (networkInstance) {
        networkInstance.destroy()
      }
    }
  }, [
    activeTab,
    competencies,
    microSkills,
    prerequisites,
    graphFilterType,
    graphLayoutMode,
    focusCompetencyId,
  ])

  // Computed filter & pagination for Tab 1 (Micro-skills)
  const filteredMicroSkills = React.useMemo(() => {
    return microSkills
      .filter((skill) => {
        const matchesSearch =
          skill.code.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
          skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
          (skill.description || '').toLowerCase().includes(skillSearchQuery.toLowerCase())
        const matchesMacro =
          skillMacroFilter === 'all' || (skill.macroCompetencyCode || 'KNOWLEDGE') === skillMacroFilter
        return matchesSearch && matchesMacro
      })
      .sort((a, b) => {
        if (skillSortBy === 'title') return a.name.localeCompare(b.name)
        if (skillSortBy === 'code') return a.code.localeCompare(b.code)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return b.id.localeCompare(a.id)
      })
  }, [microSkills, skillSearchQuery, skillMacroFilter, skillSortBy])

  const skillTotalPages = Math.ceil(filteredMicroSkills.length / skillPageSize) || 1
  const paginatedMicroSkills = filteredMicroSkills.slice(
    (skillCurrentPage - 1) * skillPageSize,
    skillCurrentPage * skillPageSize
  )

  // Computed filter & pagination for Tab 2 (Prerequisites)
  const filteredPrerequisites = prerequisites.filter((edge) => {
    const source = microSkills.find((s) => s.id === edge.sourceSkillId || s.code === edge.sourceSkillId)
    const target = microSkills.find((s) => s.id === edge.targetSkillId || s.code === edge.targetSkillId)
    const matchesSearch =
      (source?.code.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (source?.name.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (target?.code.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (target?.name.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (edge.sourceSkillCode?.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (edge.targetSkillCode?.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false)
    const matchesType = prereqTypeFilter === 'all' || (edge.status || 'ACTIVE') === prereqTypeFilter
    return matchesSearch && matchesType
  })

  const prereqTotalPages = Math.ceil(filteredPrerequisites.length / prereqPageSize) || 1
  const paginatedPrerequisites = filteredPrerequisites.slice(
    (prereqCurrentPage - 1) * prereqPageSize,
    prereqCurrentPage * prereqPageSize
  )

  // Computed filter & pagination for Tab: Competencies
  const filteredCompetencies = React.useMemo(() => {
    return competencies
      .filter((c) => {
        const q = competencySearchQuery.toLowerCase().trim()
        const matchesSearch =
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        const matchesStatus =
          competencyStatusFilter === 'all' ||
          (c.status || 'ACTIVE').toUpperCase() === competencyStatusFilter.toUpperCase()
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (competencySortBy === 'title') return a.name.localeCompare(b.name)
        if (competencySortBy === 'code') return a.code.localeCompare(b.code)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (timeA !== timeB) return timeB - timeA
        return (b.id || '').localeCompare(a.id || '')
      })
  }, [competencies, competencySearchQuery, competencyStatusFilter, competencySortBy])

  const competencyTotalPages = Math.max(1, Math.ceil(filteredCompetencies.length / competencyPageSize))
  const paginatedCompetencies = React.useMemo(() => {
    const start = (competencyCurrentPage - 1) * competencyPageSize
    return filteredCompetencies.slice(start, start + competencyPageSize)
  }, [filteredCompetencies, competencyCurrentPage, competencyPageSize])

  const handleOpenCreateCompetency = () => {
    setCompetencyForm({
      code: `COMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-01`,
      name: '',
      description: '',
      status: 'ACTIVE',
      skillIds: [],
    })
    setSelectedCompetency(null)
    setIsCompetencyModalOpen(true)
  }

  const handleOpenEditCompetency = (comp: CompetencyModel) => {
    setSelectedCompetency(comp)
    setCompetencyForm({
      code: comp.code,
      name: comp.name,
      description: comp.description || '',
      status: comp.status?.toUpperCase() === 'DRAFT' ? 'DRAFT' : 'ACTIVE',
      skillIds: comp.skillIds || [],
    })
    setIsCompetencyModalOpen(true)
  }

  const handleSaveCompetency = async () => {
    if (!competencyForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Competency name is strictly required.',
        variant: 'destructive',
      })
      return
    }

    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'

    try {
      if (selectedCompetency) {
        const updated = await updateCompetency(orgId, selectedCompetency.id, {
          name: competencyForm.name.trim(),
          description: competencyForm.description.trim(),
          status: competencyForm.status,
          skillIds: competencyForm.skillIds,
        })
        const updatedComp: CompetencyModel = {
          ...selectedCompetency,
          name: updated.name,
          description: updated.description || '',
          status: (updated.status as CompetencyModel['status']) || 'ACTIVE',
          skillIds: updated.skillIds || [],
          updatedAt: new Date().toISOString(),
        }
        setCompetencies((prev) =>
          prev.map((c) => (c.id === selectedCompetency.id ? updatedComp : c))
        )
        updateActiveCompany((c) => ({
          ...c,
          competencies: (c.competencies || []).map((item) =>
            item.id === selectedCompetency.id ? updatedComp : item
          ),
        }))
        toast({
          title: 'Competency Updated',
          description: `Saved changes to ${selectedCompetency.code}.`,
          variant: 'success',
        })
      } else {
        const created = await createCompetency(orgId, {
          code: competencyForm.code.trim().toUpperCase(),
          name: competencyForm.name.trim(),
          description: competencyForm.description.trim(),
          status: competencyForm.status,
          skillIds: competencyForm.skillIds,
        })
        const newComp: CompetencyModel = {
          id: created.id,
          code: created.code || competencyForm.code.trim().toUpperCase(),
          name: created.name,
          description: created.description || '',
          status: (created.status as CompetencyModel['status']) || 'ACTIVE',
          skillIds: created.skillIds || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setCompetencies((prev) => [newComp, ...prev])
        updateActiveCompany((c) => ({
          ...c,
          competencies: [newComp, ...(c.competencies || []).filter((item) => item.id !== newComp.id)],
        }))
        toast({
          title: 'Competency Created',
          description: `Registered ${newComp.code} successfully.`,
          variant: 'success',
        })
      }
      setIsCompetencyModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save competency.'
      toast({
        title: 'Save Failed',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteCompetency = async (comp: CompetencyModel) => {
    const active = getActiveCompany()
    const orgId = active?.id || 'default-org'

    try {
      await deleteCompetency(orgId, comp.id)
      setCompetencies((prev) => prev.filter((c) => c.id !== comp.id))
      updateActiveCompany((c) => ({
        ...c,
        competencies: (c.competencies || []).filter((item) => item.id !== comp.id),
      }))
      toast({
        title: 'Competency Deleted',
        description: `Successfully removed ${comp.code}.`,
        variant: 'success',
      })
      setDeletingCompetency(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot delete competency while referenced.'
      toast({
        title: 'Delete Failed',
        description: msg,
        variant: 'destructive',
      })
      setDeletingCompetency(null)
    }
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
              {activeTab === 'skills' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenCreateSkill}
                  className="font-semibold shadow-2xs"
                >
                  Create
                </Button>
              )}
              {activeTab === 'competencies' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenCreateCompetency}
                  className="font-semibold shadow-2xs"
                >
                  Create
                </Button>
              )}
              {activeTab === 'prerequisites' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setIsPrereqModalOpen(true)}
                  className="font-semibold shadow-2xs"
                >
                  Create
                </Button>
              )}
            </div>
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Layers className="h-4 w-4 text-primary" />}
            title="Micro-skills"
            value={microSkills.length.toString()}
            valueClassName="text-primary"
            description="Target learning objectives and skills"
          />

          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-success" />}
            title="Competencies"
            value={competencies.length.toString()}
            valueClassName="text-success"
            description="Role & level competency mappings"
          />

          <StatCard
            variant="gradient"
            icon={<GitBranch className="h-4 w-4 text-warning" />}
            title="Skill Prerequisites"
            value={prerequisites.length.toString()}
            valueClassName="text-warning"
            description="Foundational learning sequences"
          />

          <StatCard
            variant="gradient"
            icon={<Filter className="h-4 w-4 text-primary" />}
            title="Seniority Levels"
            value="3 Tiers"
            valueClassName="text-primary"
            description="Junior · Middle · Senior"
          />
        </div>

        {/* Tabbed Console - Natural flex-wrap width prevents overlap */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="inline-flex flex-wrap h-auto p-1 bg-muted/80 rounded-lg gap-1 border border-border">
            <TabsTrigger value="skills" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Micro-skills
            </TabsTrigger>
            <TabsTrigger value="competencies" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Competencies ({competencies.length})
            </TabsTrigger>
            <TabsTrigger value="prerequisites" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Skill Prerequisites
            </TabsTrigger>
            <TabsTrigger value="graph" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Explore Graph
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MICRO-SKILLS */}
          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary shrink-0" />
                      <span>Micro-skills Catalog</span>
                    </CardTitle>
                    <CardDescription>
                      Explore and manage technical micro-skills, competency alignments, and required learning prerequisites.
                    </CardDescription>
                  </div>

                  {/* Search and Filter Controls - Guaranteed 1 Single Row */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
                    <div className="relative w-44 sm:w-52 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search skills..."
                        value={skillSearchQuery}
                        onChange={(e) => {
                          setSkillSearchQuery(e.target.value)
                          setSkillCurrentPage(1)
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Competency:</span>
                      <select
                        value={skillMacroFilter}
                        onChange={(e) => {
                          setSkillMacroFilter(e.target.value)
                          setSkillCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All ({microSkills.length})</option>
                        <option value="KNOWLEDGE">Knowledge</option>
                        <option value="COMMUNICATION">Communication</option>
                        <option value="INNOVATION">Innovation</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                      <select
                        value={skillStatusFilter}
                        onChange={(e) => {
                          setSkillStatusFilter(e.target.value)
                          setSkillCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                      <select
                        value={skillSortBy}
                        onChange={(e) => setSkillSortBy(e.target.value as 'latest' | 'title' | 'code')}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="latest">Latest</option>
                        <option value="title">Title (A–Z)</option>
                        <option value="code">Code (A–Z)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredMicroSkills.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No micro-skills match your search or filter.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSkillSearchQuery('')
                        setSkillMacroFilter('all')
                        setSkillStatusFilter('all')
                        setSkillCurrentPage(1)
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                            <th className="py-2.5 px-3">Skill Code</th>
                            <th className="py-2.5 px-3">Title &amp; Observable Scope</th>
                            <th className="py-2.5 px-3">Competency</th>
                            <th className="py-2.5 px-3 text-center">Prerequisites</th>
                            <th className="py-2.5 px-3 text-center">Role Bindings</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedMicroSkills.map((skill) => {
                            const prereqCount = prerequisites.filter(
                              (p) => p.targetSkillId === skill.id || p.targetSkillId === skill.code
                            ).length
                            const macro = (skill.macroCompetencyCode || 'KNOWLEDGE').toUpperCase()
                            const companyRoles = getActiveCompany()?.targetRoles || []
                            const boundRolesCount = companyRoles.filter((r) =>
                              (r.skillTargets || []).some(
                                (st) => st.skillId === skill.id || st.skillCode === skill.code
                              )
                            ).length

                            return (
                              <tr
                                key={skill.id}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-3 px-3 font-mono font-bold text-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <span>{skill.code}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                    <span>{skill.name}</span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="truncate max-w-sm">
                                      {skill.description || 'Verified micro-skill objective and domain scope.'}
                                    </span>
                                    <span className="text-muted-foreground/60">• Updated {formatDate(skill.updatedAt || skill.createdAt)}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className="font-bold tracking-wider text-[10px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2.5 py-0.5"
                                  >
                                    {macro}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className="font-mono text-xs font-semibold text-foreground">
                                    {prereqCount}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className="font-mono text-xs font-semibold text-foreground">
                                    {boundRolesCount}
                                  </span>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <Badge
                                    variant={skill.status === 'ACTIVE' || skill.status === 'published' ? 'success' : 'secondary'}
                                    className="text-[10px] font-semibold"
                                  >
                                    {skill.status || 'ACTIVE'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {skill.status !== 'draft' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setViewingSkillDetails(skill)}
                                        title="View Details"
                                        aria-label="View Details"
                                      >
                                        <Eye className="h-4 w-4 text-primary" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setSelectedSkill(skill)
                                        setSkillForm({
                                          code: skill.code,
                                          name: skill.name,
                                          description: skill.description || '',
                                          macroCompetencyCode: (skill.macroCompetencyCode === 'COMMUNICATION' || skill.macroCompetencyCode === 'INNOVATION') ? skill.macroCompetencyCode : 'KNOWLEDGE',
                                        })
                                        setIsSkillModalOpen(true)
                                      }}
                                      title="Edit Micro-skill"
                                      aria-label="Edit Micro-skill"
                                    >
                                      <Edit3 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                                      onClick={() => setDeletingSkill(skill)}
                                      title="Delete Micro-skill"
                                      aria-label="Delete Micro-skill"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredMicroSkills.length > 0 && (
                      <Pagination
                        currentPage={skillCurrentPage}
                        totalPages={skillTotalPages}
                        totalItems={filteredMicroSkills.length}
                        pageSize={skillPageSize}
                        onPageChange={setSkillCurrentPage}
                        itemLabel="micro-skills"
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: SKILL PREREQUISITES */}
          <TabsContent value="prerequisites" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary shrink-0" />
                      <span>Skill Prerequisites &amp; Readiness</span>
                    </CardTitle>
                    <CardDescription>
                      Define foundational skill dependencies to guide adaptive learning sequences and readiness.
                    </CardDescription>
                  </div>

                  {/* Search and Filters - Guaranteed 1 Single Row */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
                    <div className="relative w-48 sm:w-56 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search prerequisites..."
                        value={prereqSearchQuery}
                        onChange={(e) => {
                          setPrereqSearchQuery(e.target.value)
                          setPrereqCurrentPage(1)
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                      <select
                        value={prereqTypeFilter}
                        onChange={(e) => {
                          setPrereqTypeFilter(e.target.value)
                          setPrereqCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredPrerequisites.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No skill prerequisites match your search or filter.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setPrereqSearchQuery('')
                        setPrereqTypeFilter('all')
                        setPrereqCurrentPage(1)
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                            <th className="py-2.5 px-3">Source Prerequisite Skill</th>
                            <th className="py-2.5 px-3 text-center">Relationship</th>
                            <th className="py-2.5 px-3">Target Dependent Skill</th>
                            <th className="py-2.5 px-3 text-center">Minimum Mastery</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedPrerequisites.map((edge) => {
                            const source = microSkills.find((s) => s.id === edge.sourceSkillId || s.code === edge.sourceSkillId)
                            const target = microSkills.find((s) => s.id === edge.targetSkillId || s.code === edge.targetSkillId)

                            return (
                              <tr key={edge.id} className="hover:bg-muted/20">
                                <td className="py-3 px-3 font-semibold text-foreground">
                                  <span className="font-mono text-primary font-bold mr-1.5">{source?.code || edge.sourceSkillCode}</span>
                                  {source?.name || edge.sourceSkillName}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    PREREQUISITE_OF <ArrowRight className="h-3 w-3 text-primary" />
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-foreground">
                                  <span className="font-mono text-primary font-bold mr-1.5">{target?.code || edge.targetSkillCode}</span>
                                  {target?.name || edge.targetSkillName}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <Badge
                                    variant="outline"
                                    className="font-bold tracking-wider text-[10px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2.5 py-0.5"
                                  >
                                    {Math.round(edge.minMastery * 100)}% Mastery
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <Badge variant={edge.status === 'ACTIVE' ? 'success' : 'outline'} className="font-mono text-[10px]">
                                    {edge.status || 'ACTIVE'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setViewingEdgeDetails(edge)}
                                      title="View Details"
                                      aria-label="View Details"
                                    >
                                      <Eye className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setDeletingEdge(edge)}
                                      title="Delete Edge"
                                      aria-label="Delete Edge"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredPrerequisites.length > 0 && (
                      <Pagination
                        currentPage={prereqCurrentPage}
                        totalPages={prereqTotalPages}
                        totalItems={filteredPrerequisites.length}
                        pageSize={prereqPageSize}
                        onPageChange={setPrereqCurrentPage}
                        itemLabel="prerequisite edges"
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: EXPLORE ONTOLOGY GRAPH */}
          <TabsContent value="graph" className="space-y-4">
            <Card className={isGraphFullscreen ? 'fixed inset-0 z-50 rounded-none m-0 border-0 flex flex-col p-4 bg-background overflow-hidden shadow-2xl' : ''}>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <NetworkIcon className="h-4 w-4 text-primary" />
                      Competency &amp; Skill Graph Explorer
                    </CardTitle>
                    <CardDescription>
                      Visualize the relationships between competencies, micro-skills, and foundational learning pathways.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Layout Mode Segmented Control */}
                    <div className="flex items-center bg-muted/60 border border-border rounded-lg p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setGraphLayoutMode('hierarchical')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          graphLayoutMode === 'hierarchical'
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Top-down structured DAG hierarchy"
                      >
                        Hierarchical
                      </button>
                      <button
                        type="button"
                        onClick={() => setGraphLayoutMode('organic')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          graphLayoutMode === 'organic'
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Force-directed network with collision avoidance"
                      >
                        Network
                      </button>
                    </div>

                    {/* Focus Domain Dropdown */}
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1 text-xs">
                      <span className="text-muted-foreground">Focus:</span>
                      <select
                        value={focusCompetencyId}
                        onChange={(e) => setFocusCompetencyId(e.target.value)}
                        className="bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium text-xs max-w-[170px] truncate"
                      >
                        <option value="all">All Competencies (Overview)</option>
                        {competencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} – {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Node Type Dropdown */}
                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1 text-xs">
                      <span className="text-muted-foreground">Type:</span>
                      <select
                        value={graphFilterType}
                        onChange={(e) => setGraphFilterType(e.target.value)}
                        className="bg-transparent text-foreground border-0 focus:outline-none cursor-pointer text-xs"
                      >
                        <option value="all">All Nodes</option>
                        <option value="competency">Competencies</option>
                        <option value="skill">Micro-skills</option>
                      </select>
                    </div>

                    {/* Zoom & Fit Controls */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ZoomIn className="h-3.5 w-3.5" />}
                        onClick={() => {
                          const scale = networkRef.current?.getScale() || 1
                          networkRef.current?.moveTo({
                            scale: scale * 1.3,
                            animation: { duration: 250, easingFunction: 'easeInOutQuad' },
                          })
                        }}
                        title="Zoom In"
                      >
                        Zoom In
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ZoomOut className="h-3.5 w-3.5" />}
                        onClick={() => {
                          const scale = networkRef.current?.getScale() || 1
                          networkRef.current?.moveTo({
                            scale: scale * 0.7,
                            animation: { duration: 250, easingFunction: 'easeInOutQuad' },
                          })
                        }}
                        title="Zoom Out"
                      >
                        Zoom Out
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() =>
                          networkRef.current?.fit({
                            animation: { duration: 400, easingFunction: 'easeInOutQuad' },
                          })
                        }
                        title="Fit graph to view"
                      >
                        Reset View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={isGraphFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setIsGraphFullscreen((prev) => !prev)
                          setTimeout(() => networkRef.current?.fit(), 100)
                        }}
                        title={isGraphFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                      >
                        {isGraphFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={isGraphFullscreen ? 'flex-1 pt-4 overflow-hidden flex flex-col min-h-0' : 'pt-4'}>
                <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${isGraphFullscreen ? 'flex-1 min-h-0' : ''}`}>
                  {/* Graph Canvas */}
                  <div className={`lg:col-span-2 border border-border rounded-lg bg-background/50 relative overflow-hidden shadow-inner flex flex-col ${isGraphFullscreen ? 'h-full min-h-[400px]' : 'h-[560px]'}`}>
                    <div ref={graphContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                    
                    {/* Visual Legend */}
                    <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-3 bg-card/95 backdrop-blur px-3 py-1.5 rounded-md border border-border text-[11px] text-muted-foreground shadow-sm">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="h-2.5 w-2.5 rounded-sm bg-primary/20 border border-primary inline-block" />
                        <span>Competency</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="h-2.5 w-4 rounded-full bg-success/20 border border-success inline-block" />
                        <span>Micro-skill</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-0.5 w-3 bg-slate-400 inline-block" />
                        <span>Contains Skill</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-0.5 w-3 bg-destructive border-dashed inline-block" />
                        <span className="text-destructive font-medium">Prerequisite (≥ %)</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspector Panel */}
                  <div className="border border-border rounded-lg p-4 bg-muted/20 flex flex-col justify-between h-[560px] overflow-y-auto">
                    <div className="space-y-3.5">
                      <div className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center justify-between pb-2 border-b border-border/60">
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span>Node Inspector</span>
                        </div>
                        {graphInspectorNode && (
                          <Badge variant="outline" className="text-[10px]">
                            {graphInspectorNode.nodeCategory}
                          </Badge>
                        )}
                      </div>

                      {graphInspectorNode ? (
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="font-mono text-primary font-bold text-sm block">
                              {graphInspectorNode.code}
                            </span>
                            <span className="font-semibold text-foreground text-sm block mt-0.5">
                              {graphInspectorNode.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge
                                variant={graphInspectorNode.status === 'ACTIVE' || graphInspectorNode.status === 'published' ? 'success' : 'warning'}
                                className="text-[10px]"
                              >
                                {graphInspectorNode.status || 'ACTIVE'}
                              </Badge>
                            </div>
                          </div>

                          <div className="p-3 rounded-md bg-card border border-border">
                            <span className="text-[11px] text-muted-foreground block font-semibold mb-1">
                              Description
                            </span>
                            <p className="text-foreground text-[11px] leading-relaxed">
                              {graphInspectorNode.description || 'No description provided.'}
                            </p>
                          </div>

                          {/* Connected Relationships */}
                          <div className="p-3 rounded-md bg-card border border-border space-y-2 text-[11px]">
                            <div className="text-muted-foreground font-semibold">Connected Relationships</div>
                            {graphInspectorNode.nodeCategory === 'Competency' ? (
                              <div>
                                <span className="text-muted-foreground text-[10px] block mb-1">
                                  Included Micro-skills ({graphInspectorNode.skillIds?.length || 0}):
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {graphInspectorNode.skillIds?.map((sId: string) => {
                                    const skill = microSkills.find((s) => s.id === sId)
                                    return (
                                      <span
                                        key={sId}
                                        className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border"
                                      >
                                        {skill ? skill.code : sId}
                                      </span>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div>
                                  <span className="text-muted-foreground text-[10px] block">Parent Competencies:</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {competencies
                                      .filter((c) => c.skillIds.includes(graphInspectorNode.id))
                                      .map((c) => (
                                        <span
                                          key={c.id}
                                          className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono"
                                        >
                                          {c.code}
                                        </span>
                                      ))}
                                  </div>
                                </div>

                                <div>
                                  <span className="text-muted-foreground text-[10px] block">Prerequisites Required:</span>
                                  {prerequisites.filter((p) => p.targetSkillId === graphInspectorNode.id).length > 0 ? (
                                    <div className="space-y-1 mt-0.5">
                                      {prerequisites
                                        .filter((p) => p.targetSkillId === graphInspectorNode.id)
                                        .map((p) => {
                                          const source = microSkills.find((s) => s.id === p.sourceSkillId)
                                          return (
                                            <div
                                              key={p.id}
                                              className="flex items-center justify-between text-[10px] bg-destructive/5 text-destructive border border-destructive/20 rounded px-1.5 py-0.5 font-mono"
                                            >
                                              <span>{source?.code || p.sourceSkillCode || p.sourceSkillId}</span>
                                              <span>req ≥{Math.round(p.minMastery * 100)}%</span>
                                            </div>
                                          )
                                        })}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">None (Entry-level skill)</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 text-muted-foreground text-xs">
                          <NetworkIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="font-semibold text-foreground">Click any node in the graph</p>
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            Inspect definition, competency tier, and connected dependencies.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                      Tip: Use mouse wheel to zoom, drag background to pan, and drag nodes to customize layout.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: COMPETENCIES */}
          <TabsContent value="competencies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span>Domain Competencies Catalog</span>
                    </CardTitle>
                    <CardDescription>
                      Explore, define, and govern domain competencies and their member micro-skills across proficiency levels.
                    </CardDescription>
                  </div>

                  {/* Search and Filter Controls */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
                    <div className="relative w-44 sm:w-52 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search competencies..."
                        value={competencySearchQuery}
                        onChange={(e) => {
                          setCompetencySearchQuery(e.target.value)
                          setCompetencyCurrentPage(1)
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                      <select
                        value={competencyStatusFilter}
                        onChange={(e) => {
                          setCompetencyStatusFilter(e.target.value)
                          setCompetencyCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All ({competencies.length})</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                      <select
                        value={competencySortBy}
                        onChange={(e) => setCompetencySortBy(e.target.value as 'latest' | 'title' | 'code')}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="latest">Latest</option>
                        <option value="title">Name (A–Z)</option>
                        <option value="code">Code (A–Z)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredCompetencies.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No competencies match your search or filter.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setCompetencySearchQuery('')
                        setCompetencyStatusFilter('all')
                        setCompetencyCurrentPage(1)
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                            <th className="py-2.5 px-3">Competency Code</th>
                            <th className="py-2.5 px-3">Title &amp; Scope</th>
                            <th className="py-2.5 px-3">Seniority Levels</th>
                            <th className="py-2.5 px-3 text-center">Member Micro-skills</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedCompetencies.map((comp) => {
                            const isDraft = comp.status?.toUpperCase() === 'DRAFT'
                            return (
                              <tr key={comp.id} className="hover:bg-muted/20">
                                <td className="py-3 px-3 font-mono font-bold text-primary">
                                  {comp.code}
                                </td>
                                <td className="py-3 px-3 max-w-sm">
                                  <div className="font-semibold text-foreground text-xs">{comp.name}</div>
                                  <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {comp.description || 'Domain competency capability scope.'}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {comp.levelCodes && comp.levelCodes.length > 0 ? (
                                      comp.levelCodes.map((lvl) => (
                                        <Badge key={lvl} variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                                          {lvl}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground italic">General</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-[10px] py-0 px-2 cursor-pointer hover:bg-secondary-hover"
                                    onClick={() => setViewingCompetencyDetails(comp)}
                                    title="Click to view member skills"
                                  >
                                    {comp.skillIds?.length || 0} skills
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <Badge variant={isDraft ? 'warning' : 'success'} className="font-mono text-[10px]">
                                    {comp.status || 'ACTIVE'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setViewingCompetencyDetails(comp)}
                                      title="View Details"
                                      aria-label="View Details"
                                    >
                                      <Eye className="h-4 w-4 text-primary" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleOpenEditCompetency(comp)}
                                      title="Edit Competency"
                                      aria-label="Edit Competency"
                                    >
                                      <Edit3 className="h-4 w-4 text-foreground" />
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setDeletingCompetency(comp)}
                                      title="Delete Competency"
                                      aria-label="Delete Competency"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredCompetencies.length > 0 && (
                      <Pagination
                        currentPage={competencyCurrentPage}
                        totalPages={competencyTotalPages}
                        totalItems={filteredCompetencies.length}
                        pageSize={competencyPageSize}
                        onPageChange={setCompetencyCurrentPage}
                        itemLabel="competencies"
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>


      {/* CREATE / EDIT MICRO-SKILL MODAL */}
      {/* CREATE / EDIT MICRO-SKILL MODAL */}
      <Dialog
        open={isSkillModalOpen}
        onOpenChange={setIsSkillModalOpen}
        className="max-w-xl w-full p-6 sm:p-7 overflow-hidden"
      >
        <div className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>{selectedSkill ? 'Edit Micro-skill' : 'Create New Micro-skill'}</span>
                  {selectedSkill && (
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 bg-primary/5">
                      {selectedSkill.code}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Define an atomic micro-skill and align it with its macro competency domain.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Code & Title Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  Micro-skill code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SKILL-CYPHER-01"
                  disabled={Boolean(selectedSkill)}
                  value={skillForm.code}
                  onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:opacity-60 disabled:bg-muted/50 transition-all shadow-2xs"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  {selectedSkill ? 'Skill code is immutable.' : 'Uppercase identifier for graph indexing.'}
                </span>
              </div>

              <div>
                <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  Skill Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neo4j Cypher DDL"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Clear, action-oriented capability title.
                </span>
              </div>
            </div>

            {/* Competency Group Selection Cards */}
            <div>
              <label className="font-semibold text-foreground block mb-1.5">
                Competency Group <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    code: 'KNOWLEDGE' as const,
                    label: 'Knowledge',
                    desc: 'Technical & Cognitive',
                  },
                  {
                    code: 'COMMUNICATION' as const,
                    label: 'Communication',
                    desc: 'Interpersonal & Team',
                  },
                  {
                    code: 'INNOVATION' as const,
                    label: 'Innovation',
                    desc: 'Creative Problem Solving',
                  },
                ].map((item) => {
                  const isSelected = skillForm.macroCompetencyCode === item.code
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSkillForm({ ...skillForm, macroCompetencyCode: item.code })}
                      className={cn(
                        'p-2.5 rounded-lg border text-left transition-all cursor-pointer select-none flex flex-col justify-between h-full',
                        isSelected
                          ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary shadow-2xs'
                          : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn('text-xs font-bold uppercase', isSelected ? 'text-primary' : 'text-foreground')}>
                          {item.label}
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-[10.5px] text-muted-foreground leading-tight">
                        {item.desc}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                Description &amp; Observable Scope <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe what learners will know, understand, or perform upon mastering this micro-skill (e.g., Formulate declarative Cypher queries including MATCH and MERGE)..."
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSkillModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!skillForm.code.trim() || !skillForm.name.trim() || !skillForm.description.trim()}
              onClick={handleSaveSkill}
              className="gap-1.5 font-semibold shadow-2xs"
            >
              <Check size={14} />
              <span>{selectedSkill ? 'Save Changes' : 'Create Micro-skill'}</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ADD PREREQUISITE EDGE MODAL (WITH CYCLE PREVENTION) */}
      <Dialog
        open={isPrereqModalOpen}
        onOpenChange={setIsPrereqModalOpen}
        className="max-w-xl w-full p-6 sm:p-7 overflow-hidden"
      >
        {(() => {
          const selectedSourceSkill = microSkills.find((s) => s.id === prereqForm.sourceSkillId)
          const selectedTargetSkill = microSkills.find((s) => s.id === prereqForm.targetSkillId)
          const isSelfPrereq = Boolean(
            prereqForm.sourceSkillId && prereqForm.sourceSkillId === prereqForm.targetSkillId
          )

          return (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base font-bold text-foreground">
                      Add Skill Prerequisite Edge
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Define directed learning sequences between micro-skills to enforce prerequisite mastery before progression.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Visual Sequence Card */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  {/* Step 1: Source Skill */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                          1
                        </span>
                        <span>Source Skill (Must Master First)</span>
                        <span className="text-destructive">*</span>
                      </label>
                      {selectedSourceSkill && (
                        <Badge
                          variant="outline"
                          className="font-bold tracking-wider text-[9.5px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2 py-0"
                        >
                          {selectedSourceSkill.macroCompetencyCode || 'KNOWLEDGE'}
                        </Badge>
                      )}
                    </div>
                    <select
                      value={prereqForm.sourceSkillId}
                      onChange={(e) => setPrereqForm({ ...prereqForm, sourceSkillId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs"
                    >
                      {microSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                    {selectedSourceSkill?.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic px-0.5">
                        "{selectedSourceSkill.description}"
                      </p>
                    )}
                  </div>

                  {/* Directional Connector Bridge */}
                  <div className="flex items-center justify-center my-0.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-[10px] font-bold tracking-wider shadow-2xs">
                      <span>MUST BE MASTERED BEFORE</span>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Step 2: Target Skill */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                          2
                        </span>
                        <span>Target Skill (Unlocked Next)</span>
                        <span className="text-destructive">*</span>
                      </label>
                      {selectedTargetSkill && (
                        <Badge
                          variant="outline"
                          className="font-bold tracking-wider text-[9.5px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2 py-0"
                        >
                          {selectedTargetSkill.macroCompetencyCode || 'KNOWLEDGE'}
                        </Badge>
                      )}
                    </div>
                    <select
                      value={prereqForm.targetSkillId}
                      onChange={(e) => setPrereqForm({ ...prereqForm, targetSkillId: e.target.value })}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg bg-background border text-foreground text-xs font-medium focus:outline-none focus:ring-2 transition-all shadow-2xs',
                        isSelfPrereq
                          ? 'border-destructive focus:ring-destructive/25 focus:border-destructive'
                          : 'border-border focus:ring-primary/25 focus:border-primary'
                      )}
                    >
                      {microSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                    {isSelfPrereq ? (
                      <p className="text-[11px] text-destructive font-medium px-0.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Source and target skills cannot be identical.
                      </p>
                    ) : selectedTargetSkill?.description ? (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 italic px-0.5">
                        "{selectedTargetSkill.description}"
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Minimum Required Mastery Threshold */}
                <div className="space-y-2.5 rounded-xl border border-border bg-card p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-semibold text-foreground flex items-center gap-1">
                        Minimum Required Mastery (%) <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[11px] text-muted-foreground block mt-0.5">
                        Benchmark score learners must reach on the source skill to unlock the target skill.
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-primary text-base">
                        {prereqForm.minMasteryPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons & Input slider */}
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={prereqForm.minMasteryPercent}
                      onChange={(e) =>
                        setPrereqForm({ ...prereqForm, minMasteryPercent: parseInt(e.target.value) || 0 })
                      }
                      className="flex-1 accent-primary cursor-pointer h-2 bg-muted rounded-lg"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {[60, 70, 75, 80, 90].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPrereqForm({ ...prereqForm, minMasteryPercent: preset })}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold transition-all cursor-pointer',
                            prereqForm.minMasteryPercent === preset
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          )}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Automatic Graph Validation Banner */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Acyclic Graph Guard:</strong> Automated cycle detection verifies this edge will not create circular dependency deadlocks before saving.
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsPrereqModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={
                    isSelfPrereq ||
                    !prereqForm.sourceSkillId ||
                    !prereqForm.targetSkillId ||
                    prereqForm.minMasteryPercent < 1
                  }
                  onClick={handleSavePrerequisite}
                  className="gap-1.5 font-semibold shadow-2xs"
                >
                  <Check size={14} />
                  <span>Create Edge</span>
                </Button>
              </DialogFooter>
            </div>
          )
        })()}
      </Dialog>

      {/* 6. VIEW MICRO-SKILL DETAILS MODAL (Miro Flow) */}
      <Dialog
        open={Boolean(viewingSkillDetails)}
        onOpenChange={(open) => !open && setViewingSkillDetails(null)}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {viewingSkillDetails && (() => {
          const parentComps = competencies.filter((c) => c.skillIds.includes(viewingSkillDetails.id))
          const incomingPrereqs = prerequisites.filter(
            (p) => p.targetSkillId === viewingSkillDetails.id || p.targetSkillId === viewingSkillDetails.code
          )
          const companyRoles = getActiveCompany()?.targetRoles || []
          const boundRoles = companyRoles.filter((r) =>
            (r.skillTargets || []).some(
              (st) => st.skillId === viewingSkillDetails.id || st.skillCode === viewingSkillDetails.code
            )
          )
          const companyModules = getActiveCompany()?.modules || []
          const boundModules = companyModules.filter((m) =>
            (m.teachesSkillIds || []).some(
              (tId) => tId === viewingSkillDetails.id || tId === viewingSkillDetails.code
            )
          )

          return (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <DialogTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary shrink-0" />
                    <span>Micro-skill Details: {viewingSkillDetails.name}</span>
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={viewingSkillDetails.status === 'ACTIVE' || viewingSkillDetails.status === 'published' ? 'success' : 'warning'}
                    >
                      {viewingSkillDetails.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </div>
                <DialogDescription>
                  View micro-skill details, mapped competencies, and role prerequisites.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Skill Code</span>
                    <strong className="font-mono text-foreground font-bold text-sm">{viewingSkillDetails.code}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status</span>
                    <span className="text-foreground font-semibold">{viewingSkillDetails.status || 'ACTIVE'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Skill Name</span>
                    <strong className="text-foreground text-sm font-semibold">{viewingSkillDetails.name}</strong>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Description</label>
                  <div className="p-3 rounded-lg bg-card border border-border text-foreground leading-relaxed text-xs">
                    {viewingSkillDetails.description || 'No description provided.'}
                  </div>
                </div>

                {/* Parent Competencies */}
                {parentComps.length > 0 && (
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">
                      Parent Competencies ({parentComps.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {parentComps.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-card border border-border text-[11px] text-foreground font-medium"
                        >
                          <BookOpen className="h-3 w-3 text-primary" />
                          <strong className="font-mono">{c.code}</strong> - {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relationship Lists: Prerequisites, Target Roles, Modules */}
                <div className="space-y-3 pt-1">
                  {/* 1. Prerequisites */}
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">
                      Prerequisites ({incomingPrereqs.length})
                    </span>
                    {incomingPrereqs.length === 0 ? (
                      <div className="p-2.5 rounded bg-muted/20 border border-border text-muted-foreground text-[11px]">
                        0 prerequisites required (foundational micro-skill).
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {incomingPrereqs.map((p) => {
                          const srcSkill = microSkills.find(
                            (s) => s.id === p.sourceSkillId || s.code === p.sourceSkillId || s.code === p.sourceSkillCode
                          )
                          return (
                            <div
                              key={p.id}
                              className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between"
                            >
                              <span className="truncate">
                                <strong className="font-mono text-primary mr-1">
                                  {srcSkill?.code || p.sourceSkillCode || p.sourceSkillId}
                                </strong>
                                {srcSkill?.name || p.sourceSkillName || 'Prerequisite Skill'}
                              </span>
                              <Badge variant="primary" className="text-[10px] shrink-0 font-mono">
                                ≥ {Math.round((p.minMastery || 0) * 100)}%
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Target Role Bindings */}
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">
                      Target Role Bindings ({boundRoles.length})
                    </span>
                    {boundRoles.length === 0 ? (
                      <div className="p-2.5 rounded bg-muted/20 border border-border text-muted-foreground text-[11px]">
                        0 target roles bound to this micro-skill.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {boundRoles.map((role) => {
                          const target = (role.skillTargets || []).find(
                            (st) => st.skillId === viewingSkillDetails.id || st.skillCode === viewingSkillDetails.code
                          )
                          return (
                            <div
                              key={role.id}
                              className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                <strong className="font-mono text-primary mr-1">{role.code}</strong>
                                {role.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {target && (
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    Target: {target.threshold}%
                                  </Badge>
                                )}
                                <Badge
                                  variant={role.status === 'published' ? 'success' : 'secondary'}
                                  className="text-[10px] capitalize"
                                >
                                  {role.status}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Module Bindings */}
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">
                      Module Bindings ({boundModules.length})
                    </span>
                    {boundModules.length === 0 ? (
                      <div className="p-2.5 rounded bg-muted/20 border border-border text-muted-foreground text-[11px]">
                        0 learning modules bound to teach this micro-skill.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {boundModules.map((mod) => (
                          <div
                            key={mod.id}
                            className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              <strong className="font-mono text-primary mr-1">{mod.code}</strong>
                              {mod.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground font-mono">
                                v{mod.version}
                              </span>
                              <Badge
                                variant={mod.status === 'published' ? 'success' : 'secondary'}
                                className="text-[10px] capitalize"
                              >
                                {mod.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setViewingSkillDetails(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Edit3 className="h-3 w-3" />}
                  onClick={() => {
                    const skill = viewingSkillDetails
                    setViewingSkillDetails(null)
                    setSelectedSkill(skill)
                    setSkillForm({
                      code: skill.code,
                      name: skill.name,
                      description: skill.description || '',
                      macroCompetencyCode: (skill.macroCompetencyCode as 'KNOWLEDGE' | 'COMMUNICATION' | 'INNOVATION') || 'KNOWLEDGE',
                    })
                    setIsSkillModalOpen(true)
                  }}
                >
                  Edit Micro-skill
                </Button>
              </DialogFooter>
            </div>
          )
        })()}
      </Dialog>

      {/* 7. VIEW PREREQUISITE EDGE DETAILS MODAL (Miro Flow) */}
      <Dialog
        open={Boolean(viewingEdgeDetails)}
        onOpenChange={(open) => !open && setViewingEdgeDetails(null)}
        className="max-w-xl w-full p-6 sm:p-7 overflow-hidden"
      >
        {viewingEdgeDetails && (() => {
          const source = microSkills.find(
            (s) => s.id === viewingEdgeDetails.sourceSkillId || s.code === viewingEdgeDetails.sourceSkillId
          )
          const target = microSkills.find(
            (s) => s.id === viewingEdgeDetails.targetSkillId || s.code === viewingEdgeDetails.targetSkillId
          )
          const masteryPct = Math.round((viewingEdgeDetails.minMastery || 0) * 100)

          return (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-foreground">
                        Prerequisite Relationship Details
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        Directed learning sequence governing skill progression and curriculum unlocks.
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className="font-bold tracking-wider text-[10px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2.5 py-0.5"
                    >
                      ≥ {masteryPct}% Mastery
                    </Badge>
                    <Badge
                      variant={viewingEdgeDetails.status === 'ACTIVE' ? 'success' : 'outline'}
                      className="text-[10px] uppercase font-semibold"
                    >
                      {viewingEdgeDetails.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Visual Sequence Pipeline Flow Banner */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/80">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Source Card */}
                    <div className="flex-1 p-3.5 rounded-lg bg-card border border-border/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Foundational Prerequisite
                        </span>
                        <Badge
                          variant="outline"
                          className="font-bold tracking-wider text-[9.5px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2 py-0"
                        >
                          {source?.macroCompetencyCode || 'KNOWLEDGE'}
                        </Badge>
                      </div>
                      <strong className="font-mono text-primary font-bold text-sm block">
                        {source?.code || viewingEdgeDetails.sourceSkillCode}
                      </strong>
                      <span className="text-foreground font-semibold text-xs mt-0.5 line-clamp-1">
                        {source?.name || viewingEdgeDetails.sourceSkillName}
                      </span>
                    </div>

                    {/* Arrow Connector with Mastery Badge */}
                    <div className="flex sm:flex-col items-center justify-center shrink-0 px-2 gap-1 text-center">
                      <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                        ≥ {masteryPct}% req
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary hidden sm:block mt-0.5" />
                      <ArrowDown className="h-4 w-4 text-primary sm:hidden" />
                      <span className="text-[9.5px] text-muted-foreground uppercase font-bold tracking-wider">
                        Unlocks
                      </span>
                    </div>

                    {/* Target Card */}
                    <div className="flex-1 p-3.5 rounded-lg bg-card border border-border/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Dependent Target
                        </span>
                        <Badge
                          variant="outline"
                          className="font-bold tracking-wider text-[9.5px] uppercase border-border/80 bg-background text-foreground shadow-2xs px-2 py-0"
                        >
                          {target?.macroCompetencyCode || 'KNOWLEDGE'}
                        </Badge>
                      </div>
                      <strong className="font-mono text-primary font-bold text-sm block">
                        {target?.code || viewingEdgeDetails.targetSkillCode}
                      </strong>
                      <span className="text-foreground font-semibold text-xs mt-0.5 line-clamp-1">
                        {target?.name || viewingEdgeDetails.targetSkillName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] font-medium">Minimum Required Mastery</span>
                      <span className="font-mono font-bold text-primary text-sm">{masteryPct}%</span>
                    </div>
                    <Progress value={masteryPct} max={100} variant="primary" className="h-2" />
                    <span className="text-[10.5px] text-muted-foreground block">
                      Learners must score at or above this proficiency threshold.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex flex-col justify-between">
                    <div>
                      <span className="text-muted-foreground text-[11px] font-medium block">Relationship Status</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant={viewingEdgeDetails.status === 'ACTIVE' ? 'success' : 'outline'}
                          className="text-xs font-semibold"
                        >
                          {viewingEdgeDetails.status || 'ACTIVE'}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">Enforced in adaptive graph</span>
                      </div>
                    </div>
                    <span className="text-[10.5px] text-muted-foreground/80 mt-2 block">
                      Updated {formatDate(viewingEdgeDetails.updatedAt || viewingEdgeDetails.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Skill Descriptions Section */}
                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span>Prerequisite:</span>
                        <span className="font-mono text-primary font-bold">
                          {source?.code || viewingEdgeDetails.sourceSkillCode}
                        </span>
                        <span className="text-muted-foreground">
                          — {source?.name || viewingEdgeDetails.sourceSkillName}
                        </span>
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed pt-1">
                      {source?.description || 'Foundational prerequisite capability and knowledge scope.'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span>Target:</span>
                        <span className="font-mono text-primary font-bold">
                          {target?.code || viewingEdgeDetails.targetSkillCode}
                        </span>
                        <span className="text-muted-foreground">
                          — {target?.name || viewingEdgeDetails.targetSkillName}
                        </span>
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed pt-1">
                      {target?.description || 'Advanced competency requiring verified mastery of prerequisite skill.'}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const edgeToDelete = viewingEdgeDetails
                    setViewingEdgeDetails(null)
                    setDeletingEdge(edgeToDelete)
                  }}
                >
                  Delete Edge
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewingEdgeDetails(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )
        })()}
      </Dialog>

      {/* CONFIRMATION PROMPTS */}

      <ConfirmationModal
        open={Boolean(deletingEdge)}
        onOpenChange={(open) => !open && setDeletingEdge(null)}
        title="Delete Prerequisite Edge?"
        description={`Are you sure you want to remove the prerequisite relationship between ${deletingEdge?.sourceSkillCode || deletingEdge?.sourceSkillId} and ${deletingEdge?.targetSkillCode || deletingEdge?.targetSkillId}?`}
        confirmText="Delete Edge"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deletingEdge) {
            handleDeletePrereq(deletingEdge)
          }
        }}
      />

      <ConfirmationModal
        open={Boolean(deletingSkill)}
        onOpenChange={(open) => !open && setDeletingSkill(null)}
        title={`Delete Micro-skill ${deletingSkill?.code}?`}
        description={`Are you sure you want to delete ${deletingSkill?.name}? If this micro-skill is referenced by prerequisite dependencies or assigned to target roles, deletion will be blocked.`}
        confirmText="Delete Micro-skill"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deletingSkill) {
            handleDeleteSkill(deletingSkill)
          }
        }}
      />

      {/* CREATE / EDIT COMPETENCY MODAL */}
      <Dialog
        open={isCompetencyModalOpen}
        onOpenChange={setIsCompetencyModalOpen}
        className="max-w-xl w-full p-6 sm:p-7 overflow-hidden"
      >
        <div className="space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>{selectedCompetency ? 'Edit Competency' : 'Create New Competency'}</span>
                  {selectedCompetency && (
                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 bg-primary/5">
                      {selectedCompetency.code}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Define a domain competency and associate required member technical micro-skills.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Code & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  Competency Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. COMP-SEC-01"
                  disabled={Boolean(selectedCompetency)}
                  value={competencyForm.code}
                  onChange={(e) => setCompetencyForm({ ...competencyForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary disabled:opacity-60 disabled:bg-muted/50 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                  Status
                </label>
                <select
                  value={competencyForm.status}
                  onChange={(e) => setCompetencyForm({ ...competencyForm, status: e.target.value as 'ACTIVE' | 'DRAFT' })}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs font-medium cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                Competency Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Network Security Architecture & Perimeter Defense"
                value={competencyForm.name}
                onChange={(e) => setCompetencyForm({ ...competencyForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs"
              />
            </div>

            {/* Description */}
            <div>
              <label className="font-semibold text-foreground flex items-center gap-1 mb-1.5">
                Description &amp; Knowledge Scope
              </label>
              <textarea
                rows={3}
                placeholder="Describe the domain competency scope, capabilities, and observable mastery..."
                value={competencyForm.description}
                onChange={(e) => setCompetencyForm({ ...competencyForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs leading-relaxed"
              />
            </div>

            {/* Member Micro-skills Multi-selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  Member Micro-skills ({competencyForm.skillIds.length} selected)
                </label>
                <span className="text-[10.5px] text-muted-foreground">Select skills belonging to this competency</span>
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted/20 space-y-1">
                {microSkills.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No micro-skills available in catalog.</p>
                ) : (
                  microSkills.map((s) => {
                    const isChecked = competencyForm.skillIds.includes(s.id) || competencyForm.skillIds.includes(s.code)
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer text-xs transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompetencyForm({ ...competencyForm, skillIds: [...competencyForm.skillIds, s.id] })
                            } else {
                              setCompetencyForm({
                                ...competencyForm,
                                skillIds: competencyForm.skillIds.filter((id) => id !== s.id && id !== s.code),
                              })
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="font-mono text-primary font-bold">{s.code}</span>
                        <span className="text-foreground truncate">{s.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCompetencyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!competencyForm.code.trim() || !competencyForm.name.trim()}
              onClick={handleSaveCompetency}
              className="gap-1.5 font-semibold shadow-2xs"
            >
              <Check size={14} />
              <span>{selectedCompetency ? 'Save Changes' : 'Create Competency'}</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* VIEW COMPETENCY DETAILS MODAL */}
      <Dialog
        open={Boolean(viewingCompetencyDetails)}
        onOpenChange={(open) => !open && setViewingCompetencyDetails(null)}
        className="max-w-xl max-h-[90vh] overflow-y-auto"
      >
        {viewingCompetencyDetails && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary shrink-0" />
                  <span>{viewingCompetencyDetails.name}</span>
                </DialogTitle>
                <Badge variant={viewingCompetencyDetails.status?.toUpperCase() === 'DRAFT' ? 'warning' : 'success'} className="font-mono text-[10px]">
                  {viewingCompetencyDetails.status || 'ACTIVE'}
                </Badge>
              </div>
              <DialogDescription className="text-xs font-mono text-primary font-bold">
                {viewingCompetencyDetails.code}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
                <span className="text-muted-foreground text-[10.5px] uppercase font-bold tracking-wider block mb-1">
                  Scope &amp; Description
                </span>
                <p className="text-foreground leading-relaxed">
                  {viewingCompetencyDetails.description || 'No description provided.'}
                </p>
              </div>

              {viewingCompetencyDetails.levelCodes && viewingCompetencyDetails.levelCodes.length > 0 && (
                <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
                  <span className="text-muted-foreground text-[10.5px] uppercase font-bold tracking-wider block mb-1.5">
                    Associated Seniority Levels
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {viewingCompetencyDetails.levelCodes.map((lvl) => (
                      <Badge key={lvl} variant="outline" className="text-xs font-mono">
                        {lvl}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-card border border-border shadow-2xs">
                <span className="text-muted-foreground text-[10.5px] uppercase font-bold tracking-wider block mb-2">
                  Member Micro-skills ({viewingCompetencyDetails.skillIds?.length || 0})
                </span>
                {(!viewingCompetencyDetails.skillIds || viewingCompetencyDetails.skillIds.length === 0) ? (
                  <p className="text-muted-foreground italic">No micro-skills mapped yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {viewingCompetencyDetails.skillIds.map((sId) => {
                      const skill = microSkills.find((s) => s.id === sId || s.code === sId)
                      return (
                        <div key={sId} className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/60">
                          <span className="font-mono text-primary font-bold text-xs">{skill?.code || sId}</span>
                          <span className="text-foreground text-xs truncate">{skill?.name || 'Micro-skill'}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-border mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const comp = viewingCompetencyDetails
                  setViewingCompetencyDetails(null)
                  handleOpenEditCompetency(comp)
                }}
              >
                Edit Competency
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewingCompetencyDetails(null)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>

      <ConfirmationModal
        open={Boolean(deletingCompetency)}
        onOpenChange={(open) => !open && setDeletingCompetency(null)}
        title={`Delete Competency ${deletingCompetency?.code}?`}
        description={`Are you sure you want to delete ${deletingCompetency?.name}? This action will remove its associations with skills and levels.`}
        confirmText="Delete Competency"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deletingCompetency) {
            handleDeleteCompetency(deletingCompetency)
          }
        }}
      />

      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Ontology & Skill Blueprint"
        entityName="Competencies & Skills"
        description="Select an industry blueprint to rapidly provision competencies, micro-skills, and prerequisite dependencies for your organization."
        presets={ONTOLOGY_PRESETS}
        onImport={handleImportOntology}
        sampleJsonPlaceholder={`{\n  "competencies": [\n    {\n      "code": "COMP-LLM-01",\n      "name": "Transformer Architectures & Attention Mechanisms",\n      "description": "Deep understanding of self-attention matrices and transformer layers."\n    }\n  ],\n  "microSkills": [\n    {\n      "code": "SKILL-ATTN-01",\n      "name": "Implement Multi-Head Scaled Dot-Product Attention",\n      "description": "Derives queries, keys, values tensors and computes masked softmax weights.",\n      "macroCompetencyCode": "KNOWLEDGE"\n    }\n  ]\n}`}
      />
    </WorkspaceLayout>
  )
}
