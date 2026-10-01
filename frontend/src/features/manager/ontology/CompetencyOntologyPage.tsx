import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Edit3,
  Eye,
  Filter,
  GitBranch,
  Layers,
  Network as NetworkIcon,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import * as React from 'react'
import { Network, type Options } from 'vis-network'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
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
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
} from '../../../shared/stores/companyStore'
import {
  fetchMicroSkills,
  fetchMacroCompetencies,
} from '../../../shared/api/microSkillApi'
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
  const [skillSortBy, setSkillSortBy] = React.useState<'latest' | 'title' | 'code'>('latest')
  const [skillCurrentPage, setSkillCurrentPage] = React.useState(1)
  const [skillPageSize] = React.useState(10)

  React.useEffect(() => {
    setSkillCurrentPage(1)
  }, [skillSearchQuery, skillMacroFilter, skillSortBy])

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
        const [liveSkills, liveMacros] = await Promise.all([
          fetchMicroSkills(orgId).catch(() => []),
          fetchMacroCompetencies(orgId).catch(() => []),
        ])

        if (liveSkills && liveSkills.length > 0) {
          const mappedSkills: MicroSkillModel[] = liveSkills.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            description: s.description || '',
            status: (s.status as any) || 'ACTIVE',
            macroCompetencyCode: (s.macroCompetencyCode as any) || 'KNOWLEDGE',
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          }))
          setMicroSkills(mappedSkills)
        } else {
          setMicroSkills(active?.microSkills ?? [])
        }

        if (liveMacros && liveMacros.length > 0) {
          const mappedComps: CompetencyModel[] = liveMacros.map((m) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            description: m.description || '',
            status: (m.status as any) || 'ACTIVE',
            skillIds: [],
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }))
          setCompetencies(mappedComps)
        } else {
          setCompetencies(active?.competencies ?? [])
        }
      } catch {
        setMicroSkills(active?.microSkills ?? [])
        setCompetencies(active?.competencies ?? [])
      }

      setPrerequisites(active?.prerequisites ?? [])
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

  const handleImportOntology = (payload: any) => {
    const rawComps = Array.isArray(payload) ? payload : payload.competencies || []
    const rawSkills = payload.microSkills || []
    const rawPrereqs = payload.prerequisites || []

    const normalizedComps: CompetencyModel[] = rawComps.map((c: any, idx: number) => ({
      id: c.id || `comp-${Date.now()}-${idx}`,
      code: (c.code || `COMP-${idx + 1}`).trim().toUpperCase(),
      name: (c.name || 'Untitled Competency Domain').trim(),
      description: (c.description || c.definition || 'Domain description and scope.').trim(),
      status: (c.status === 'DRAFT' || c.status === 'RETIRED' || c.status === 'draft' || c.status === 'archived') ? c.status : 'ACTIVE',
      skillIds: Array.isArray(c.skillIds) ? c.skillIds : [],
      createdAt: c.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: c.updatedAt || new Date().toISOString().slice(0, 10),
    }))

    const normalizedSkills: MicroSkillModel[] = rawSkills.map((s: any, idx: number) => ({
      id: s.id || `skill-${Date.now()}-${idx}`,
      code: (s.code || `SKILL-${idx + 1}`).trim().toUpperCase(),
      name: (s.name || 'Untitled Micro-skill').trim(),
      description: (s.description || s.observableOutcome || 'Skill description and scope.').trim(),
      status: (s.status === 'DRAFT' || s.status === 'RETIRED' || s.status === 'draft' || s.status === 'archived') ? s.status : 'ACTIVE',
      macroCompetencyCode: s.macroCompetencyCode || 'KNOWLEDGE',
      createdAt: s.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: s.updatedAt || new Date().toISOString().slice(0, 10),
    }))

    const normalizedPrereqs: PrerequisiteEdge[] = rawPrereqs.map((p: any, idx: number) => ({
      id: p.id || `edge-${Date.now()}-${idx}`,
      sourceSkillId: p.sourceSkillId || '',
      targetSkillId: p.targetSkillId || '',
      relationshipType: p.relationshipType || 'strictly_requires',
      rationale: p.rationale || 'Prerequisite dependency',
      pedagogicalWeight: typeof p.pedagogicalWeight === 'number' ? p.pedagogicalWeight : 1.0,
      createdAt: p.createdAt || new Date().toISOString().slice(0, 10),
    }))

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
  const [deletingEdgeId, setDeletingEdgeId] = React.useState<string | null>(null)

  // Selection states
  const [selectedSkill, setSelectedSkill] = React.useState<MicroSkillModel | null>(null)

  // Micro-Skill Form (Strictly aligned with neo4j_schema.md)
  const [skillForm, setSkillForm] = React.useState({
    code: '',
    name: '',
    description: '',
    macroCompetencyCode: 'KNOWLEDGE' as 'KNOWLEDGE' | 'COMMUNICATION' | 'INNOVATION',
  })

  // Prerequisite Form
  const [prereqForm, setPrereqForm] = React.useState({
    sourceSkillId: '',
    targetSkillId: '',
    requiredThreshold: 75,
    type: 'hard_prerequisite' as 'hard_prerequisite' | 'recommended',
    ruleRef: 'PREREQ-PEDAGOGY-01',
  })

  // Graph state
  const graphContainerRef = React.useRef<HTMLDivElement>(null)
  const networkRef = React.useRef<Network | null>(null)
  const [graphInspectorNode, setGraphInspectorNode] = React.useState<any | null>(null)
  const [graphFilterType, setGraphFilterType] = React.useState<string>('all')
  const [graphLayoutMode, setGraphLayoutMode] = React.useState<'hierarchical' | 'organic'>('hierarchical')
  const [focusCompetencyId, setFocusCompetencyId] = React.useState<string>('all')

  // ------------------------------------------------------------------
  // Micro-Skill Handlers
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
    if (!skillForm.code.trim() || !skillForm.name.trim() || !skillForm.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Code, Name, and Description are strictly required.',
        variant: 'destructive',
      })
      return
    }

    if (selectedSkill) {
      saveAndSetMicroSkills((prev) =>
        prev.map((s) =>
          s.id === selectedSkill.id
            ? {
                ...s,
                name: skillForm.name.trim(),
                description: skillForm.description.trim(),
                macroCompetencyCode: skillForm.macroCompetencyCode,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      )
      toast({ title: 'Micro-skill Updated', description: `Saved changes to ${skillForm.code}.`, variant: 'success' })
      setIsSkillModalOpen(false)
    } else {
      if (microSkills.some((s) => s.code.toUpperCase() === skillForm.code.trim().toUpperCase())) {
        toast({ title: 'Duplicate Code', description: 'Skill code must be globally unique.', variant: 'destructive' })
        return
      }

      const active = getActiveCompany()
      const orgId = active?.id || 'default-org'
      let generatedId = `skill-${Date.now()}`

      try {
        const res = await fetch(`/api/v1/organizations/${orgId}/micro-skills`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': 'DOMAIN_EXPERT',
          },
          body: JSON.stringify({
            code: skillForm.code.trim().toUpperCase(),
            name: skillForm.name.trim(),
            description: skillForm.description.trim(),
            macroCompetencyCode: skillForm.macroCompetencyCode || 'KNOWLEDGE',
          }),
        })

        if (res.status === 409) {
          toast({
            title: 'Duplicate Micro-skill Code',
            description: `Micro-skill code ${skillForm.code} already exists for this organization.`,
            variant: 'destructive',
          })
          return
        }

        if (res.ok) {
          const data = await res.json()
          if (data.id) generatedId = data.id
        }
      } catch {
        // Fallback for standalone offline client
      }

      const newSkill: MicroSkillModel = {
        id: generatedId,
        code: skillForm.code.trim().toUpperCase(),
        name: skillForm.name.trim(),
        description: skillForm.description.trim(),
        macroCompetencyCode: skillForm.macroCompetencyCode || 'KNOWLEDGE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      saveAndSetMicroSkills([newSkill, ...microSkills])
      setIsSkillModalOpen(false)

      toast({
        title: 'Micro-skill Created',
        description: `Registered ${newSkill.code} under ${skillForm.macroCompetencyCode || 'KNOWLEDGE'}.`,
        variant: 'success',
      })
    }
  }

  // ------------------------------------------------------------------
  // Prerequisite Edge Handlers (Self-edge & Cycle Detection)
  // ------------------------------------------------------------------
  const handleSavePrerequisite = () => {
    const { sourceSkillId, targetSkillId, requiredThreshold, type, ruleRef } = prereqForm

    // 1. Reject self-edges
    if (sourceSkillId === targetSkillId) {
      toast({
        title: 'Self-Edge Rejected',
        description: 'A micro-skill cannot be a prerequisite of itself.',
        variant: 'destructive',
      })
      return
    }

    // 2. Reject duplicates
    const exists = prerequisites.some(
      (p) => p.sourceSkillId === sourceSkillId && p.targetSkillId === targetSkillId,
    )
    if (exists) {
      toast({
        title: 'Duplicate Edge Rejected',
        description: 'A prerequisite edge between these two skills already exists.',
        variant: 'destructive',
      })
      return
    }

    // 3. Cycle Detection
    // Breadth-first search to check if sourceSkillId is reachable from targetSkillId
    const isReachable = (start: string, goal: string): boolean => {
      const visited = new Set<string>()
      const queue = [start]
      while (queue.length > 0) {
        const current = queue.shift()!
        if (current === goal) return true
        visited.add(current)
        for (const edge of prerequisites) {
          if (edge.sourceSkillId === current && !visited.has(edge.targetSkillId)) {
            queue.push(edge.targetSkillId)
          }
        }
      }
      return false
    }

    if (isReachable(targetSkillId, sourceSkillId)) {
      toast({
        title: 'Cycle Detected & Blocked',
        description: 'Adding this edge would form a circular prerequisite dependency loop!',
        variant: 'destructive',
      })
      return
    }

    // 4. Threshold validation
    if (requiredThreshold < 1 || requiredThreshold > 100) {
      toast({
        title: 'Invalid Threshold',
        description: 'Required threshold must be between 1% and 100%.',
        variant: 'destructive',
      })
      return
    }

    const newEdge: PrerequisiteEdge = {
      id: `pre-${Date.now()}`,
      sourceSkillId,
      targetSkillId,
      requiredThreshold,
      type,
      ruleRef: ruleRef || 'PEDAGOGY-SEQ',
    }

    saveAndSetPrerequisites([...prerequisites, newEdge])
    setIsPrereqModalOpen(false)

    const sourceSkill = microSkills.find((s) => s.id === sourceSkillId)
    const targetSkill = microSkills.find((s) => s.id === targetSkillId)

    toast({
      title: 'Prerequisite Edge Created',
      description: `${sourceSkill?.code} -> ${targetSkill?.code} (Threshold: ${requiredThreshold}%).`,
      variant: 'success',
    })
  }

  const handleDeletePrereq = (id: string) => {
    saveAndSetPrerequisites((prev) => prev.filter((p) => p.id !== id))
    toast({ title: 'Edge Removed', description: 'Prerequisite edge deleted.', variant: 'info' })
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
    const nodes: any[] = []
    const edges: any[] = []

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
          data: { ...c, nodeCategory: 'Competency' },
        })
      }
    })

    // Micro-skill nodes
    microSkills.forEach((s) => {
      if (!allowedSkillIds.has(s.id)) return
      if (graphFilterType === 'all' || graphFilterType === 'skill') {
        nodes.push({
          id: s.id,
          label: `<b>${s.code}</b>\n${s.name}`,
          shape: 'box',
          shapeProperties: { borderRadius: 16 },
          widthConstraint: { maximum: 155 },
          margin: { top: 8, right: 12, bottom: 8, left: 12 },
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
          data: { ...s, nodeCategory: 'Micro-Skill' },
        })
      }
    })

    // HAS_SKILL edges (Uncluttered: sleek line with arrow and tooltip, avoiding heavy text collisions)
    activeCompetencies.forEach((c) => {
      c.skillIds.forEach((sId) => {
        const hasSource = nodes.some((n) => n.id === c.id)
        const hasTarget = nodes.some((n) => n.id === sId)
        if (hasSource && hasTarget) {
          edges.push({
            id: `has-skill-${c.id}-${sId}`,
            from: c.id,
            to: sId,
            title: `Relationship: ${c.code} contains skill ${sId}`,
            color: { color: '#CBD5E1', highlight: '#EA580C', hover: '#94A3B8' },
            arrows: { to: { enabled: true, scaleFactor: 0.7 } },
            dashes: false,
            width: 1.5,
          })
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
          label: `≥ ${p.requiredThreshold}%`,
          title: `Prerequisite Requirement: ${p.requiredThreshold}% mastery required`,
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
          sortMethod: 'directed',
          levelSeparation: 140,
          nodeSpacing: 210,
          treeSpacing: 240,
          blockShifting: true,
          edgeMinimization: true,
          parentCentralization: true,
        },
      },
      physics:
        graphLayoutMode === 'hierarchical'
          ? {
              solver: 'hierarchicalRepulsion',
              hierarchicalRepulsion: {
                centralGravity: 0.0,
                springLength: 160,
                springConstant: 0.01,
                nodeDistance: 210,
                damping: 0.09,
              },
              stabilization: {
                iterations: 150,
                updateInterval: 25,
              },
            }
          : {
              solver: 'barnesHut',
              barnesHut: {
                gravitationalConstant: -18000,
                centralGravity: 0.15,
                springLength: 230,
                springConstant: 0.03,
                damping: 0.12,
                avoidOverlap: 1,
              },
              stabilization: {
                iterations: 180,
                updateInterval: 25,
              },
            },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true,
        dragView: true,
        dragNodes: true,
      },
    }

    const timer = setTimeout(() => {
      if (!graphContainerRef.current) return
      networkInstance = new Network(graphContainerRef.current, { nodes, edges }, options)
      networkRef.current = networkInstance

      networkInstance.once('stabilizationIterationsDone', () => {
        networkInstance?.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } })
      })

      setTimeout(() => {
        networkInstance?.fit()
      }, 150)

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
    }, 40)

    return () => {
      clearTimeout(timer)
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
    const source = microSkills.find((s) => s.id === edge.sourceSkillId)
    const target = microSkills.find((s) => s.id === edge.targetSkillId)
    const matchesSearch =
      (source?.code.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (source?.name.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (target?.code.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      (target?.name.toLowerCase().includes(prereqSearchQuery.toLowerCase()) ?? false) ||
      edge.ruleRef.toLowerCase().includes(prereqSearchQuery.toLowerCase())
    const matchesType = prereqTypeFilter === 'all' || edge.type === prereqTypeFilter
    return matchesSearch && matchesType
  })

  const prereqTotalPages = Math.ceil(filteredPrerequisites.length / prereqPageSize) || 1
  const paginatedPrerequisites = filteredPrerequisites.slice(
    (prereqCurrentPage - 1) * prereqPageSize,
    prereqCurrentPage * prereqPageSize
  )

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
                  Create Micro-skill
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
                  Create Prerequisite Edge
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
            title="Atomic Micro-skills"
            value={microSkills.length.toString()}
            valueClassName="text-primary"
            description="With observable learning outcomes"
          />

          <StatCard
            variant="gradient"
            icon={<GitBranch className="h-4 w-4 text-warning" />}
            title="Prerequisite Edges"
            value={prerequisites.length.toString()}
            valueClassName="text-warning"
            description="Acyclic dependency relationships"
          />

          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-success" />}
            title="Macro Competencies"
            value="3"
            valueClassName="text-success"
            description="Knowledge · Communication · Innovation"
          />

          <StatCard
            variant="gradient"
            icon={<Filter className="h-4 w-4 text-primary" />}
            title="Taxonomy Depth"
            value="6 Levels"
            valueClassName="text-primary"
            description="Bloom: Remember to Create"
          />
        </div>

        {/* Tabbed Console - Natural flex-wrap width prevents overlap */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="inline-flex flex-wrap h-auto p-1 bg-muted/80 rounded-lg gap-1 border border-border">
            <TabsTrigger value="skills" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Micro-skills
            </TabsTrigger>
            <TabsTrigger value="prerequisites" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Skill Prerequisites
            </TabsTrigger>
            <TabsTrigger value="graph" className="px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap">
              Explore Graph
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ATOMIC MICRO-SKILLS */}
          <TabsContent value="skills" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Atomic Micro-skills Catalog
                    </CardTitle>
                    <CardDescription>
                      Measurable learning outcomes classified by Bloom taxonomy and provenance citation.
                    </CardDescription>
                  </div>

                  {/* Search and Filter Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search skills or outcomes..."
                        value={skillSearchQuery}
                        onChange={(e) => {
                          setSkillSearchQuery(e.target.value)
                          setSkillCurrentPage(1)
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <select
                        value={skillMacroFilter}
                        onChange={(e) => {
                          setSkillMacroFilter(e.target.value)
                          setSkillCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Competencies ({microSkills.length})</option>
                        <option value="KNOWLEDGE">Knowledge</option>
                        <option value="COMMUNICATION">Communication</option>
                        <option value="INNOVATION">Innovation</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-1">
                      <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                      <select
                        value={skillSortBy}
                        onChange={(e) => setSkillSortBy(e.target.value as any)}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="latest">Latest Created</option>
                        <option value="title">Skill Title (A–Z)</option>
                        <option value="code">Skill Code</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredMicroSkills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No micro-skills match your search or filter.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSkillSearchQuery('')
                        setSkillMacroFilter('all')
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
                            <th className="py-2.5 px-3">Skill Code &amp; Name</th>
                            <th className="py-2.5 px-3">Macro Competency</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paginatedMicroSkills.map((skill) => (
                            <tr key={skill.id} className="hover:bg-muted/20">
                              <td className="py-3 px-3">
                                <div className="font-mono font-bold text-foreground">{skill.code}</div>
                                <div className="font-semibold text-foreground">{skill.name}</div>
                              </td>
                              <td className="py-3 px-3">
                                <Badge variant="outline" className="font-mono text-[10px] uppercase font-semibold">
                                  {skill.macroCompetencyCode || 'KNOWLEDGE'}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-muted-foreground max-w-sm">
                                {skill.description}
                              </td>
                              <td className="py-3 px-3 text-right">
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
                                        macroCompetencyCode: (skill.macroCompetencyCode as 'KNOWLEDGE' | 'COMMUNICATION' | 'INNOVATION') || 'KNOWLEDGE',
                                      })
                                      setIsSkillModalOpen(true)
                                    }}
                                    title="Edit Micro-skill"
                                    aria-label="Edit Micro-skill"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Skill Prerequisite Edges &amp; Thresholds
                    </CardTitle>
                    <CardDescription>
                      Directed dependency constraints. System automatically blocks self-edges, duplicates, and cycles.
                    </CardDescription>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Filter prereq edges..."
                        value={prereqSearchQuery}
                        onChange={(e) => {
                          setPrereqSearchQuery(e.target.value)
                          setPrereqCurrentPage(1)
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <Filter className="h-3 w-3 text-muted-foreground" />
                      <select
                        value={prereqTypeFilter}
                        onChange={(e) => {
                          setPrereqTypeFilter(e.target.value)
                          setPrereqCurrentPage(1)
                        }}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Prereq Types</option>
                        <option value="hard_prerequisite">Hard Prerequisite</option>
                        <option value="recommended">Recommended</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {filteredPrerequisites.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-sm font-semibold">No prerequisite edges match your search or filter.</p>
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
                            <th className="py-2.5 px-3 text-center">Required Threshold</th>
                            <th className="py-2.5 px-3">Rule Reference</th>
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
                                  <span className="font-mono text-primary font-bold mr-1.5">{source?.code}</span>
                                  {source?.name}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    PREREQUISITE_FOR <ArrowRight className="h-3 w-3 text-primary" />
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-semibold text-foreground">
                                  <span className="font-mono text-primary font-bold mr-1.5">{target?.code}</span>
                                  {target?.name}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <Badge variant="primary" className="font-bold">
                                    {edge.requiredThreshold}% Mastery
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                                  {edge.ruleRef}
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
                                      onClick={() => setDeletingEdgeId(edge.id)}
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
            <Card>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <NetworkIcon className="h-4 w-4 text-primary" />
                      Interactive Ontology Graph Explorer
                    </CardTitle>
                    <CardDescription>
                      Hierarchical visualizer of domain competencies, atomic micro-skills, and prerequisite pathways.
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
                        Hierarchical Flow
                      </button>
                      <button
                        type="button"
                        onClick={() => setGraphLayoutMode('organic')}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          graphLayoutMode === 'organic'
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Force-directed organic network with collision avoidance"
                      >
                        Spacious Network
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
                        <option value="all">All Domains (Overview)</option>
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
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Graph Canvas */}
                  <div className="lg:col-span-2 border border-border rounded-lg bg-background/50 h-[560px] relative overflow-hidden shadow-inner">
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
                                              <span>{source?.code || p.sourceSkillId}</span>
                                              <span>req ≥{p.requiredThreshold}%</span>
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
                            Inspect definition, Bloom taxonomy, provenance, and connected edges.
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
        </Tabs>
      </div>


      {/* CREATE / EDIT MICRO-SKILL MODAL */}
      <Dialog open={isSkillModalOpen} onOpenChange={setIsSkillModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {selectedSkill ? `Edit Micro-skill (${selectedSkill.code})` : 'Create Micro-skill'}
            </DialogTitle>
            <DialogDescription>
              Define an atomic micro-skill with an observable learning outcome categorized under its parent macro-competency.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Unique Atomic Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SKILL-CYPHER-01"
                  disabled={Boolean(selectedSkill)}
                  value={skillForm.code}
                  onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Skill Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Neo4j Cypher DDL"
                  value={skillForm.name}
                  onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Macro-Competency Group</label>
              <select
                value={skillForm.macroCompetencyCode}
                onChange={(e) => setSkillForm({ ...skillForm, macroCompetencyCode: e.target.value as any })}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="KNOWLEDGE">KNOWLEDGE (Cognitive / Technical)</option>
                <option value="COMMUNICATION">COMMUNICATION (Interpersonal)</option>
                <option value="INNOVATION">INNOVATION (Creative / Problem Solving)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Description of what learner needs to know or do (e.g. Formulate declarative Cypher queries including MATCH and MERGE)..."
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-3 rounded-lg bg-secondary border border-border/80 text-[11.5px] text-foreground space-y-1">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Domain Expert Micro-Skill Scope (REQ-012-F01)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                As a Domain Expert, you are defining an atomic skill categorized under <strong>{skillForm.macroCompetencyCode}</strong>. Linking this micro-skill to Target Roles and setting required proficiencies will be handled in Sprint 3 (REQ-015).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSkillModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveSkill}>
              Save Micro-skill
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ADD PREREQUISITE EDGE MODAL (WITH CYCLE PREVENTION) */}
      <Dialog open={isPrereqModalOpen} onOpenChange={setIsPrereqModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Add Skill Prerequisite Edge
            </DialogTitle>
            <DialogDescription>
              Define a directed dependency constraint. The engine strictly rejects self-edges, duplicates, and cycles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Source Skill (Prerequisite) <span className="text-destructive">*</span>
              </label>
              <select
                value={prereqForm.sourceSkillId}
                onChange={(e) => setPrereqForm({ ...prereqForm, sourceSkillId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {microSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded">
                MUST BE MASTERED BEFORE <ArrowRight className="h-3 w-3" />
              </span>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Target Skill (Dependent) <span className="text-destructive">*</span>
              </label>
              <select
                value={prereqForm.targetSkillId}
                onChange={(e) => setPrereqForm({ ...prereqForm, targetSkillId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {microSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Required Threshold (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={prereqForm.requiredThreshold}
                  onChange={(e) =>
                    setPrereqForm({ ...prereqForm, requiredThreshold: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Rule Citation</label>
                <input
                  type="text"
                  value={prereqForm.ruleRef}
                  onChange={(e) => setPrereqForm({ ...prereqForm, ruleRef: e.target.value })}
                  placeholder="e.g. PEDAGOGY-SEQ-05"
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>Acyclic graph validation is executed automatically before edge persistence.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsPrereqModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSavePrerequisite}>
              Create Edge
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 6. VIEW MICRO-SKILL DETAILS MODAL (Miro Flow) */}
      <Dialog
        open={Boolean(viewingSkillDetails)}
        onOpenChange={(open) => !open && setViewingSkillDetails(null)}
        className="max-w-2xl"
      >
        {viewingSkillDetails && (() => {
          const parentComps = competencies.filter((c) => c.skillIds.includes(viewingSkillDetails.id))
          const incomingPrereqs = prerequisites.filter((p) => p.targetSkillId === viewingSkillDetails.id)
          const outgoingPrereqs = prerequisites.filter((p) => p.sourceSkillId === viewingSkillDetails.id)

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
                  Atomic micro-skill definition following the Neo4j schema.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Skill Code</span>
                    <strong className="font-mono text-foreground font-bold text-sm">{viewingSkillDetails.code}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Macro Competency</span>
                    <Badge variant="outline" className="font-semibold text-xs mt-0.5 uppercase">
                      {viewingSkillDetails.macroCompetencyCode || 'KNOWLEDGE'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Status</span>
                    <span className="text-foreground font-semibold">{viewingSkillDetails.status || 'ACTIVE'}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
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

                {/* Graph Placement: Parents, Incoming Prereqs, Outgoing Prereqs */}
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="font-semibold text-foreground block mb-1.5">
                      Parent Macro Competencies ({parentComps.length})
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="font-semibold text-foreground block mb-1.5">
                        Prerequisites Required ({incomingPrereqs.length})
                      </span>
                      {incomingPrereqs.length === 0 ? (
                        <div className="p-2.5 rounded bg-muted/20 border border-border text-muted-foreground text-[11px]">
                          Foundational skill (no prerequisites required).
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {incomingPrereqs.map((p) => {
                            const srcSkill = microSkills.find((s) => s.id === p.sourceSkillId)
                            return (
                              <div
                                key={p.id}
                                className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between"
                              >
                                <span className="truncate">
                                  <strong className="font-mono text-primary mr-1">{srcSkill?.code}</strong>
                                  {srcSkill?.name}
                                </span>
                                <Badge variant="primary" className="text-[10px] shrink-0">
                                  {p.requiredThreshold}%
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="font-semibold text-foreground block mb-1.5">
                        Skills Unlocked ({outgoingPrereqs.length})
                      </span>
                      {outgoingPrereqs.length === 0 ? (
                        <div className="p-2.5 rounded bg-muted/20 border border-border text-muted-foreground text-[11px]">
                          Terminal skill (does not gate further skills).
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {outgoingPrereqs.map((p) => {
                            const tgtSkill = microSkills.find((s) => s.id === p.targetSkillId)
                            return (
                              <div
                                key={p.id}
                                className="p-2 rounded bg-card border border-border text-[11px] flex items-center justify-between"
                              >
                                <span className="truncate">
                                  <strong className="font-mono text-primary mr-1">{tgtSkill?.code}</strong>
                                  {tgtSkill?.name}
                                </span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {p.requiredThreshold}%
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
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
        className="max-w-xl"
      >
        {viewingEdgeDetails && (() => {
          const source = microSkills.find((s) => s.id === viewingEdgeDetails.sourceSkillId)
          const target = microSkills.find((s) => s.id === viewingEdgeDetails.targetSkillId)

          return (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <DialogTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary shrink-0" />
                    <span>Prerequisite Edge Details</span>
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="primary" className="font-bold">
                      {viewingEdgeDetails.requiredThreshold}% Mastery
                    </Badge>
                    <Badge variant={viewingEdgeDetails.type === 'hard_prerequisite' ? 'destructive' : 'secondary'}>
                      {viewingEdgeDetails.type === 'hard_prerequisite' ? 'HARD PREREQUISITE' : 'RECOMMENDED'}
                    </Badge>
                  </div>
                </div>
                <DialogDescription>
                  Directed dependency relationship enforcing knowledge sequencing and curriculum progression.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Visual Flow diagram */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="flex-1 p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Source Skill</span>
                    <strong className="font-mono text-primary font-bold block">{source?.code}</strong>
                    <span className="text-foreground font-semibold text-xs line-clamp-1">{source?.name}</span>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[10px] font-mono text-primary font-bold">{viewingEdgeDetails.requiredThreshold}% req</span>
                    <ArrowRight className="h-5 w-5 text-primary" />
                    <span className="text-[9px] text-muted-foreground uppercase">{viewingEdgeDetails.type}</span>
                  </div>

                  <div className="flex-1 p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Target Skill</span>
                    <strong className="font-mono text-primary font-bold block">{target?.code}</strong>
                    <span className="text-foreground font-semibold text-xs line-clamp-1">{target?.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-card border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Rule Citation Reference</span>
                    <strong className="font-mono text-foreground font-bold text-xs">{viewingEdgeDetails.ruleRef}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Enforcement Policy</span>
                    <span className="text-foreground font-medium">
                      {viewingEdgeDetails.type === 'hard_prerequisite'
                        ? 'Strict pathway gate blocking unlock'
                        : 'Advisory guidance warning'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded bg-muted/30 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <span className="font-mono text-primary font-bold">{source?.code}</span>
                      Description:
                    </span>
                    <p className="text-muted-foreground text-xs">{source?.description}</p>
                  </div>

                  <div className="p-3 rounded bg-muted/30 border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <span className="font-mono text-primary font-bold">{target?.code}</span>
                      Description:
                    </span>
                    <p className="text-muted-foreground text-xs">{target?.description}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-secondary/40 border border-primary/20 text-foreground space-y-1">
                  <strong className="text-xs font-semibold text-primary block">Adaptive Engine Behavior</strong>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When an engineer's diagnostic assessment score on <span className="font-mono font-bold text-foreground">{source?.code}</span> is below {viewingEdgeDetails.requiredThreshold}%, the adaptive pathway generator automatically schedules remediation modules before unlocking <span className="font-mono font-bold text-foreground">{target?.code}</span>.
                  </p>
                </div>
              </div>

              <DialogFooter>
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
        open={Boolean(deletingEdgeId)}
        onOpenChange={(open) => !open && setDeletingEdgeId(null)}
        title="Delete Prerequisite Edge?"
        description="Are you sure you want to remove this directed prerequisite constraint? Learners on adaptive pathways will no longer be gated by this skill sequencing threshold."
        confirmText="Delete Edge"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deletingEdgeId) {
            handleDeletePrereq(deletingEdgeId)
            setDeletingEdgeId(null)
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
