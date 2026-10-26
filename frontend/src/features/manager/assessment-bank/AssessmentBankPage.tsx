import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Edit3,
  Eye,
  FileQuestion,
  Layers,
  Plus,
  Search,
  Sliders,
  Trash2,
  Upload,
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
  type AssessmentBlueprintModel,
  type BlueprintSkillRequirement,
  INITIAL_MICRO_SKILLS,
  INITIAL_MODULES,
  INITIAL_TARGET_ROLES,
  type QuizQuestionModel,
} from '../data/ldManagerMockData'

const QUESTION_PRESETS: ImportPreset[] = [
  {
    id: 'preset-foundation-diagnostic',
    name: 'Foundation & LLM Diagnostic Bank (3 Items)',
    description: 'Multiple choice items targeting Attention Mechanisms, KV-Cache and Vector Indexing.',
    badge: 'Diagnostic Pack',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { code: 'QST-ATTN-01', prompt: 'In multi-head attention, what does scaling by 1/sqrt(d_k) accomplish?' },
        { code: 'QST-KV-01', prompt: 'How does PagedAttention prevent GPU VRAM fragmentation during generation?' },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `qst-${Date.now()}-1`,
        stableId: `qst-uuid-attn-01`,
        code: 'QST-ATTN-01',
        prompt: 'In scaled dot-product attention, what mathematical challenge is mitigated by dividing QK^T by sqrt(d_k)?',
        options: [
          'Prevents gradient vanishing in the softmax function caused by extremely large dot products in high dimensions.',
          'Eliminates the requirement for positional encodings in self-attention.',
          'Compresses the key vectors to minimize GPU tensor memory bandwidth.',
          'Enforces an upper bound threshold on causal masking.',
        ],
        correctAnswerIndex: 0,
        feedback: 'For large values of d_k, the dot products grow large in magnitude, pushing the softmax into regions with extremely small gradients. Dividing by sqrt(d_k) counters this effect.',
        assessedSkillId: 'skill-attn-01',
        difficulty: 'Medium' as const,
        version: '1.0',
        status: 'published' as const,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: `qst-${Date.now()}-2`,
        stableId: `qst-uuid-kv-01`,
        code: 'QST-KV-01',
        prompt: 'How does PagedAttention eliminate physical memory fragmentation during autoregressive decoding?',
        options: [
          'Allocates non-contiguous physical memory blocks mapped via virtual page tables, inspired by OS virtual memory.',
          'Recomputes attention matrices on every step to bypass KV-cache storage.',
          'Converts all float16 tensors into 1-bit integer quantization.',
          'Truncates context history strictly at 512 tokens.',
        ],
        correctAnswerIndex: 0,
        feedback: 'PagedAttention partitions the continuous key-value cache into discrete virtual blocks, allowing non-contiguous allocation and near-zero memory waste.',
        assessedSkillId: 'skill-kv-01',
        difficulty: 'Hard' as const,
        version: '1.0',
        status: 'published' as const,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      {
        id: `qst-${Date.now()}-3`,
        stableId: `qst-uuid-vec-01`,
        code: 'QST-VEC-01',
        prompt: 'Which heuristic in HNSW graph construction enables logarithmic search complexity across dense embeddings?',
        options: [
          'Hierarchical multi-layer skip-list graph structure with exponentially decaying link lengths.',
          'Exhaustive cosine distance sweeps over all stored vector nodes.',
          'Randomized drop-out of query dimensions during traversal.',
          'Hashing embeddings into fixed 32-bit bloom filters.',
        ],
        correctAnswerIndex: 0,
        feedback: 'Hierarchical Navigable Small World (HNSW) uses multiple layers of graphs where top layers have long-range links for fast coarse navigation and bottom layers have short-range links for fine precision.',
        assessedSkillId: 'skill-vec-01',
        difficulty: 'Hard' as const,
        version: '1.0',
        status: 'published' as const,
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

function sortQuestionsWithDraftsBelowPublished(
  list: QuizQuestionModel[],
  sortBy: 'latest' | 'code' = 'latest'
): QuizQuestionModel[] {
  const groups = new Map<string, QuizQuestionModel[]>()
  for (const q of list) {
    const key = q.stableId || q.code
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(q)
  }

  const isPureDraftLineage = (groupQuestions: QuizQuestionModel[]): boolean => {
    return groupQuestions.every((q) => q.status !== 'published')
  }

  const getLineageBaseTime = (groupQuestions: QuizQuestionModel[]): number => {
    const published = groupQuestions.filter((q) => q.status === 'published')
    if (published.length > 0) {
      let baseTime = Infinity
      for (const q of published) {
        const t = q.updatedAt ? new Date(q.updatedAt).getTime() : 0
        if (!isNaN(t) && t > 0 && t < baseTime) {
          baseTime = t
        }
      }
      return baseTime === Infinity ? 0 : baseTime
    }

    let latest = 0
    for (const q of groupQuestions) {
      const t = q.updatedAt ? new Date(q.updatedAt).getTime() : 0
      if (!isNaN(t) && t > latest) {
        latest = t
      }
    }
    return latest
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const qsA = groups.get(a)!
    const qsB = groups.get(b)!
    const qA = qsA[0]
    const qB = qsB[0]

    if (sortBy === 'latest') {
      const isPureDraftA = isPureDraftLineage(qsA)
      const isPureDraftB = isPureDraftLineage(qsB)

      // Rule: Brand-new pure draft questions appear on top
      if (isPureDraftA && !isPureDraftB) return -1
      if (isPureDraftB && !isPureDraftA) return 1

      const timeA = getLineageBaseTime(qsA)
      const timeB = getLineageBaseTime(qsB)
      if (timeB !== timeA) {
        return timeB - timeA
      }
      return (qB?.id || '').localeCompare(qA?.id || '')
    }

    return (qA?.code || '').localeCompare(qB?.code || '')
  })

  const result: QuizQuestionModel[] = []
  for (const key of sortedKeys) {
    const groupQs = groups.get(key)!
    const published = groupQs
      .filter((q) => q.status === 'published')
      .sort((a, b) => compareVersions(b.version, a.version))

    const newestPublished = published[0]
    const olderPublished = published.slice(1).sort((a, b) => compareVersions(a.version, b.version))
    const nonPublished = groupQs
      .filter((q) => q.status !== 'published')
      .sort((a, b) => compareVersions(a.version, b.version))

    if (newestPublished) {
      result.push(newestPublished, ...olderPublished, ...nonPublished)
    } else {
      result.push(...nonPublished)
    }
  }

  return result
}

export function AssessmentBankPage() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = React.useState('questions')
  const [questions, setQuestions] = React.useState<QuizQuestionModel[]>(() => getActiveCompany()?.questions ?? [])
  const [blueprints, setBlueprints] = React.useState<AssessmentBlueprintModel[]>(() => getActiveCompany()?.blueprints ?? [])

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      const active = getActiveCompany()
      setQuestions(active?.questions ?? [])
      setBlueprints(active?.blueprints ?? [])
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [])

  // Explicit persistence helper to prevent circular re-render loops
  const saveAndSetQuestions = React.useCallback(
    (updater: QuizQuestionModel[] | ((prev: QuizQuestionModel[]) => QuizQuestionModel[])) => {
      setQuestions((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({
          ...c,
          questions: next,
        }))
        return next
      })
    },
    []
  )

  const saveAndSetBlueprints = React.useCallback(
    (updater: AssessmentBlueprintModel[] | ((prev: AssessmentBlueprintModel[]) => AssessmentBlueprintModel[])) => {
      setBlueprints((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        updateActiveCompany((c) => ({
          ...c,
          blueprints: next,
        }))
        return next
      })
    },
    []
  )

  const activeComp = getActiveCompany()
  const companyMicroSkills =
    activeComp?.microSkills && activeComp.microSkills.length > 0
      ? activeComp.microSkills
      : INITIAL_MICRO_SKILLS
  const companyRoles = activeComp?.targetRoles || []
  const companyModules = activeComp?.modules || []

  // Filters
  const [questionSearch, setQuestionSearch] = React.useState('')
  const [questionSkillFilter, setQuestionSkillFilter] = React.useState('all')
  const [questionStatusFilter, setQuestionStatusFilter] = React.useState('all')

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = React.useState(false)
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuizQuestionModel | null>(null)
  const [viewingQuestionDetails, setViewingQuestionDetails] = React.useState<QuizQuestionModel | null>(null)
  const [selectedBlueprint, setSelectedBlueprint] = React.useState<AssessmentBlueprintModel | null>(null)
  const [viewingBlueprintDetails, setViewingBlueprintDetails] = React.useState<AssessmentBlueprintModel | null>(null)
  const [deletingBlueprint, setDeletingBlueprint] = React.useState<AssessmentBlueprintModel | null>(null)

  const [isSubmittingQuestion, setIsSubmittingQuestion] = React.useState(false)

  const handleImportQuestions = (data: unknown) => {
    const list = Array.isArray(data)
      ? data
      : (typeof data === 'object' && data !== null && 'questions' in data && Array.isArray((data as Record<string, unknown>).questions))
      ? ((data as Record<string, unknown>).questions as unknown[])
      : []
    const normalized: QuizQuestionModel[] = list.map((itemRecord: unknown, idx: number) => {
      const item = (typeof itemRecord === 'object' && itemRecord !== null ? itemRecord : {}) as Record<string, unknown>
      return {
        id: (item.id as string) || `qst-${Date.now()}-${idx}`,
        stableId: (item.stableId as string) || `qst-uuid-${Date.now()}-${idx}`,
        code: String(item.code || `QST-IMP-${idx + 1}`).trim().toUpperCase(),
        prompt: String(item.prompt || 'Untitled Assessment Question').trim(),
        options: Array.isArray(item.options) && item.options.length >= 2 ? (item.options as string[]) : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswerIndex: typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0,
        feedback: String(item.feedback || 'Explanatory feedback for this question.'),
        assessedSkillId: (item.assessedSkillId as string) || companyMicroSkills[0]?.id || 'skill-attn-01',
        difficulty: (item.difficulty as QuizQuestionModel['difficulty']) || 'Intermediate',
        version: String(item.version || '1.0'),
        status: (item.status === 'draft' || item.status === 'archived') ? item.status : 'published',
        provenance: String(item.provenance || 'Imported Curriculum Test Bank'),
        updatedAt: String(item.updatedAt || new Date().toISOString().slice(0, 10)),
      }
    })
    saveAndSetQuestions((prev) => [...normalized, ...prev])
  }
  const [deletingDraftQuestion, setDeletingDraftQuestion] = React.useState<QuizQuestionModel | null>(null)

  // Question Form
  const [questionForm, setQuestionForm] = React.useState({
    code: '',
    prompt: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    feedback: '',
    assessedSkillId: companyMicroSkills[0]?.id || '',
    difficulty: 'Intermediate' as QuizQuestionModel['difficulty'],
    provenance: '',
  })

  // Blueprint Form
  const [blueprintForm, setBlueprintForm] = React.useState({
    code: '',
    title: '',
    targetType: 'role' as 'role' | 'module',
    targetId: companyRoles[0]?.id || companyModules[0]?.id || '',
    passThreshold: 80,
    requirements: [
      {
        skillId: companyMicroSkills[0]?.id || '',
        skillCode: companyMicroSkills[0]?.code || '',
        skillName: companyMicroSkills[0]?.name || '',
        questionCount: 2,
      },
    ] as BlueprintSkillRequirement[],
  })

  // ------------------------------------------------------------------
  // Helper: Live Question Count per Micro-skill in Bank
  // ------------------------------------------------------------------
  const getPublishedQuestionCount = (skillId: string) => {
    return questions.filter((q) => q.assessedSkillId === skillId && q.status === 'published').length
  }

  // Sorting & pagination states
  const [questionSortBy, setQuestionSortBy] = React.useState<'latest' | 'code'>('latest')
  const [blueprintPage, setBlueprintPage] = React.useState(1)
  const pageSize = 10

  // Filtered & sorted Questions
  const filteredQuestions = React.useMemo(() => {
    const list = questions.filter((q) => {
      const matchesSkill = questionSkillFilter === 'all' || q.assessedSkillId === questionSkillFilter
      const matchesStatus = questionStatusFilter === 'all' || q.status === questionStatusFilter
      const matchesSearch =
        q.prompt.toLowerCase().includes(questionSearch.toLowerCase()) ||
        q.code.toLowerCase().includes(questionSearch.toLowerCase())
      return matchesSkill && matchesStatus && matchesSearch
    })

    return sortQuestionsWithDraftsBelowPublished(list, questionSortBy)
  }, [questions, questionSkillFilter, questionStatusFilter, questionSearch, questionSortBy])

  // Grouped questions by Assessed Micro-skill
  const groupedSkills = React.useMemo(() => {
    const isSearching = questionSearch.trim().length > 0
    const isStatusFiltered = questionStatusFilter !== 'all'

    // Map of skillId -> QuizQuestionModel[]
    const skillMap = new Map<string, QuizQuestionModel[]>()

    // Seed map if not searching/filtering status so experts can see all skills in their domain
    if (!isSearching && !isStatusFiltered) {
      if (questionSkillFilter !== 'all') {
        skillMap.set(questionSkillFilter, [])
      } else {
        companyMicroSkills.forEach((ms) => {
          skillMap.set(ms.id, [])
        })
      }
    } else if (questionSkillFilter !== 'all') {
      skillMap.set(questionSkillFilter, [])
    }

    // Place filtered questions into map
    filteredQuestions.forEach((q) => {
      const key = q.assessedSkillId || 'unassigned'
      if (!skillMap.has(key)) {
        skillMap.set(key, [])
      }
      skillMap.get(key)!.push(q)
    })

    const result: {
      skillId: string
      skillCode: string
      skillName: string
      macroCompetencyCode?: string
      questions: QuizQuestionModel[]
      publishedCount: number
      draftCount: number
      difficultyCounts: {
        Foundation: number
        Intermediate: number
        Advanced: number
      }
    }[] = []

    skillMap.forEach((qList, skillId) => {
      if ((isSearching || isStatusFiltered) && qList.length === 0 && questionSkillFilter === 'all') {
        return
      }

      const skill =
        companyMicroSkills.find((s) => s.id === skillId || s.code === skillId) ||
        INITIAL_MICRO_SKILLS.find((s) => s.id === skillId || s.code === skillId)

      const publishedCount = qList.filter((q) => q.status === 'published').length
      const draftCount = qList.filter((q) => q.status !== 'published').length
      const difficultyCounts = {
        Foundation: qList.filter((q) => q.difficulty === 'Foundation').length,
        Intermediate: qList.filter((q) => q.difficulty === 'Intermediate').length,
        Advanced: qList.filter((q) => q.difficulty === 'Advanced').length,
      }

      result.push({
        skillId,
        skillCode: skill?.code || (skillId === 'unassigned' ? 'UNASSIGNED' : skillId),
        skillName:
          skill?.name || (skillId === 'unassigned' ? 'Unassigned Micro-skill' : 'Custom / External Micro-skill'),
        macroCompetencyCode: skill?.macroCompetencyCode,
        questions: qList,
        publishedCount,
        draftCount,
        difficultyCounts,
      })
    })

    return result.sort((a, b) => {
      if (a.questions.length > 0 && b.questions.length === 0) return -1
      if (b.questions.length > 0 && a.questions.length === 0) return 1
      return a.skillCode.localeCompare(b.skillCode)
    })
  }, [filteredQuestions, questionSkillFilter, questionStatusFilter, questionSearch, companyMicroSkills])

  // Collapsible dropdown state for micro-skill question groups
  const [collapsedSkillIds, setCollapsedSkillIds] = React.useState<Record<string, boolean>>({})

  const isSkillExpanded = React.useCallback(
    (skillId: string) => !collapsedSkillIds[skillId],
    [collapsedSkillIds]
  )

  const toggleSkillExpanded = React.useCallback((skillId: string) => {
    setCollapsedSkillIds((prev) => ({
      ...prev,
      [skillId]: !prev[skillId],
    }))
  }, [])

  const expandAllSkills = React.useCallback(() => {
    setCollapsedSkillIds({})
  }, [])

  const collapseAllSkills = React.useCallback(() => {
    const next: Record<string, boolean> = {}
    groupedSkills.forEach((g) => {
      next[g.skillId] = true
    })
    setCollapsedSkillIds(next)
  }, [groupedSkills])

  const [skillGroupPage, setSkillGroupPage] = React.useState(1)
  const skillGroupPageSize = 10
  const totalSkillGroupPages = Math.max(1, Math.ceil(groupedSkills.length / skillGroupPageSize))
  const paginatedSkillGroups = React.useMemo(() => {
    const start = (skillGroupPage - 1) * skillGroupPageSize
    return groupedSkills.slice(start, start + skillGroupPageSize)
  }, [groupedSkills, skillGroupPage, skillGroupPageSize])

  React.useEffect(() => {
    setSkillGroupPage(1)
  }, [questionSearch, questionSkillFilter, questionStatusFilter])


  const totalBlueprintPages = Math.max(1, Math.ceil(blueprints.length / pageSize))
  const paginatedBlueprints = React.useMemo(() => {
    const start = (blueprintPage - 1) * pageSize
    return blueprints.slice(start, start + pageSize)
  }, [blueprints, blueprintPage, pageSize])

  // Aggregate stats
  const totalQuestions = questions.length
  const publishedQuestions = questions.filter((q) => q.status === 'published').length

  // ------------------------------------------------------------------
  // Question Handlers
  // ------------------------------------------------------------------
  const handleOpenCreateQuestion = (defaultSkillId?: string) => {
    const targetSkillId = defaultSkillId || companyMicroSkills[0]?.id || ''
    setQuestionForm({
      code: `QUE-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(
        Math.random() * 80 + 10,
      )}`,
      prompt: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      feedback: '',
      assessedSkillId: targetSkillId,
      difficulty: 'Intermediate',
      provenance: 'Internal Curriculum Assessment Bank 2026',
    })
    setSelectedQuestion(null)
    setIsQuestionModalOpen(true)
  }

  const handleSaveQuestion = () => {
    if (isSubmittingQuestion) return

    // Validations
    if (!questionForm.code.trim() || !questionForm.prompt.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Question Code and Prompt are required.',
        variant: 'destructive',
      })
      return
    }

    if (questionForm.options.some((opt) => !opt.trim())) {
      toast({
        title: 'Incomplete Options',
        description: 'All 4 multiple-choice options must be filled.',
        variant: 'destructive',
      })
      return
    }

    if (!questionForm.feedback.trim()) {
      toast({
        title: 'Missing Feedback',
        description: 'Pedagogical explanation/feedback is required for test remediation.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmittingQuestion(true)
    try {

    if (selectedQuestion) {
      // Editing draft
      saveAndSetQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQuestion.id
            ? {
                ...q,
                prompt: questionForm.prompt.trim(),
                options: [...questionForm.options],
                correctAnswerIndex: questionForm.correctAnswerIndex,
                feedback: questionForm.feedback.trim(),
                assessedSkillId: questionForm.assessedSkillId,
                difficulty: questionForm.difficulty,
                provenance: questionForm.provenance.trim(),
              }
            : q,
        ),
      )
      toast({ title: 'Question Updated', description: `Saved changes to draft ${selectedQuestion.code}.`, variant: 'success' })
    } else {
      if (questions.some((q) => q.code.toUpperCase() === questionForm.code.trim().toUpperCase())) {
        toast({ title: 'Duplicate Code', description: 'Question code must be unique.', variant: 'destructive' })
        return
      }

      const newQ: QuizQuestionModel = {
        id: `q-${Date.now()}`,
        stableId: `qu-uuid-${Date.now()}`,
        code: questionForm.code.trim().toUpperCase(),
        prompt: questionForm.prompt.trim(),
        options: [...questionForm.options],
        correctAnswerIndex: questionForm.correctAnswerIndex,
        feedback: questionForm.feedback.trim(),
        assessedSkillId: questionForm.assessedSkillId,
        version: '1.0',
        status: 'draft',
        difficulty: questionForm.difficulty,
        provenance: questionForm.provenance || 'Official Diagnostic Bank',
      }

      saveAndSetQuestions([newQ, ...questions])
      toast({
        title: 'Draft Question Created',
        description: `Registered ${newQ.code}. Exactly one micro-skill linked.`,
        variant: 'success',
      })
    }
    setIsQuestionModalOpen(false)
  } finally {
    setIsSubmittingQuestion(false)
  }
}

  // Create Successor Draft (Preserving Submitted Historical Attempts)
  const handleCreateSuccessorQuestion = (q: QuizQuestionModel) => {
    const curVer = parseFloat(q.version) || 1.0
    const nextVer = (curVer + 0.1).toFixed(1)

    const existingDraft = questions.find(
      (item) => (item.stableId === q.stableId || item.code === q.code) && item.status === 'draft'
    )
    if (existingDraft) {
      toast({
        title: 'Successor Draft Exists',
        description: `Draft v${existingDraft.version} already exists for this question.`,
        variant: 'warning',
      })
      return
    }

    const successor: QuizQuestionModel = {
      ...q,
      id: `q-${Date.now()}`,
      stableId: q.stableId || `qu-uuid-${q.code}`,
      version: nextVer,
      status: 'draft',
      updatedAt: new Date().toISOString().slice(0, 10),
      prompt: `${q.prompt} (Revision)`,
    }

    saveAndSetQuestions((prev) => [...prev, successor])
    toast({
      title: 'Successor Version Spawned',
      description: `Draft v${nextVer} created. Historical submitted learner attempts continue using the original answer key.`,
      variant: 'success',
    })
  }

  const handlePublishQuestion = (q: QuizQuestionModel) => {
    saveAndSetQuestions((prev) => prev.map((item) => (item.id === q.id ? { ...item, status: 'published' } : item)))
    toast({
      title: 'Question Published',
      description: `${q.code} (v${q.version}) is now published in the active assessment bank.`,
      variant: 'success',
    })
  }

  // Delete Draft Question (initial or successor)
  const handleDeleteDraftQuestion = (q: QuizQuestionModel) => {
    if (q.status !== 'draft') {
      toast({
        title: 'Action Rejected',
        description: 'Only draft questions can be deleted. Published questions cannot be deleted to preserve test integrity.',
        variant: 'destructive',
      })
      return
    }

    saveAndSetQuestions(questions.filter((item) => item.id !== q.id))
    toast({
      title: 'Draft Question Deleted',
      description: `Draft question ${q.code} (v${q.version}) was removed from the bank.`,
      variant: 'default',
    })
  }

  // ------------------------------------------------------------------
  // Blueprint Handlers & Coverage Validation
  // ------------------------------------------------------------------
  const handleOpenCreateBlueprint = () => {
    setSelectedBlueprint(null)
    setBlueprintForm({
      code: `BP-${Math.random().toString(36).substring(2, 5).toUpperCase()}-TEST`,
      title: '',
      targetType: 'role',
      targetId: companyRoles[0]?.id || INITIAL_TARGET_ROLES[0]?.id || '',
      passThreshold: 80,
      requirements: [
        {
          skillId: companyMicroSkills[0]?.id || '',
          skillCode: companyMicroSkills[0]?.code || '',
          skillName: companyMicroSkills[0]?.name || '',
          questionCount: 2,
        },
      ],
    })
    setIsBlueprintModalOpen(true)
  }

  const handleOpenEditBlueprint = (bp: AssessmentBlueprintModel) => {
    setSelectedBlueprint(bp)
    setBlueprintForm({
      code: bp.code,
      title: bp.title,
      targetType: bp.targetType,
      targetId: bp.targetId,
      passThreshold: bp.passThreshold,
      requirements: [...bp.requirements],
    })
    setIsBlueprintModalOpen(true)
  }

  const handleAddBlueprintReq = () => {
    // Find skill not yet added
    const unused = companyMicroSkills.find(
      (ms) => !blueprintForm.requirements.some((r) => r.skillId === ms.id),
    )
    if (!unused) {
      toast({ title: 'All Skills Added', description: 'All available micro-skills already added.', variant: 'info' })
      return
    }

    setBlueprintForm({
      ...blueprintForm,
      requirements: [
        ...blueprintForm.requirements,
        {
          skillId: unused.id,
          skillCode: unused.code,
          skillName: unused.name,
          questionCount: 1,
        },
      ],
    })
  }

  const handleRemoveBlueprintReq = (skillId: string) => {
    setBlueprintForm({
      ...blueprintForm,
      requirements: blueprintForm.requirements.filter((r) => r.skillId !== skillId),
    })
  }

  // Calculate Coverage for current blueprint form
  const evaluateCoverage = (reqs: BlueprintSkillRequirement[]) => {
    let hasShortage = false
    let criticalShortage = false

    const items = reqs.map((req) => {
      const available = getPublishedQuestionCount(req.skillId)
      const shortage = Math.max(0, req.questionCount - available)
      if (shortage > 0) hasShortage = true
      if (available === 0) criticalShortage = true
      return { ...req, available, shortage }
    })

    const status: AssessmentBlueprintModel['coverageStatus'] = criticalShortage
      ? 'critical_shortage'
      : hasShortage
      ? 'partial_shortage'
      : 'fully_covered'

    return { items, status, canActivate: !hasShortage }
  }

  const handleSaveBlueprint = () => {
    if (!blueprintForm.code.trim() || !blueprintForm.title.trim()) {
      toast({ title: 'Validation Error', description: 'Code and Title are required.', variant: 'destructive' })
      return
    }

    if (blueprintForm.requirements.length === 0) {
      toast({ title: 'Missing Skills', description: 'At least one skill requirement is required.', variant: 'destructive' })
      return
    }

    const coverage = evaluateCoverage(blueprintForm.requirements)
    const targetName =
      blueprintForm.targetType === 'role'
        ? (companyRoles.find((r) => r.id === blueprintForm.targetId)?.title ||
           INITIAL_TARGET_ROLES.find((r) => r.id === blueprintForm.targetId)?.title || 'Target Role')
        : (companyModules.find((m) => m.id === blueprintForm.targetId)?.title ||
           INITIAL_MODULES.find((m) => m.id === blueprintForm.targetId)?.title || 'Learning Module')

    const totalQuestions = blueprintForm.requirements.reduce((acc, r) => acc + r.questionCount, 0)

    if (selectedBlueprint) {
      const updatedBp: AssessmentBlueprintModel = {
        ...selectedBlueprint,
        code: blueprintForm.code.trim().toUpperCase(),
        title: blueprintForm.title.trim(),
        targetType: blueprintForm.targetType,
        targetId: blueprintForm.targetId,
        targetName,
        passThreshold: blueprintForm.passThreshold,
        requirements: blueprintForm.requirements,
        totalQuestions,
        coverageStatus: coverage.status,
        status: coverage.canActivate ? 'active' : 'draft',
      }

      saveAndSetBlueprints((prev) => prev.map((b) => (b.id === selectedBlueprint.id ? updatedBp : b)))
      setIsBlueprintModalOpen(false)
      toast({
        title: 'Blueprint Updated',
        description: `Successfully saved changes for ${updatedBp.code}.`,
        variant: 'success',
      })
    } else {
      const newBp: AssessmentBlueprintModel = {
        id: `bp-${Date.now()}`,
        code: blueprintForm.code.trim().toUpperCase(),
        title: blueprintForm.title.trim(),
        targetType: blueprintForm.targetType,
        targetId: blueprintForm.targetId,
        targetName,
        version: '1.0',
        status: coverage.canActivate ? 'active' : 'draft',
        passThreshold: blueprintForm.passThreshold,
        requirements: blueprintForm.requirements,
        totalQuestions,
        coverageStatus: coverage.status,
      }

      saveAndSetBlueprints((prev) => [newBp, ...prev])
      setIsBlueprintModalOpen(false)

      if (coverage.canActivate) {
        toast({
          title: 'Blueprint Active & Verified',
          description: `${newBp.code} configured with 100% item coverage across published questions.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'Blueprint Saved as Draft (Shortage Warning)',
          description: `Blueprint requires items that are not yet published in the bank. Coverage status: ${coverage.status}.`,
          variant: 'warning',
        })
      }
    }
  }

  const handleDeleteBlueprint = (bp: AssessmentBlueprintModel) => {
    saveAndSetBlueprints((prev) => prev.filter((b) => b.id !== bp.id))
    toast({
      title: 'Blueprint Deleted',
      description: `Assessment Blueprint ${bp.code} has been deleted.`,
      variant: 'info',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          actions={
            activeTab === 'questions' ? (
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
                  onClick={() => handleOpenCreateQuestion()}
                  className="font-semibold shadow-2xs"
                >
                  Create
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenCreateBlueprint}
                  className="font-semibold shadow-2xs"
                >
                  Create
                </Button>
              </div>
            )
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<FileQuestion className="h-4 w-4 text-primary" />}
            title="Total Bank Items"
            value={totalQuestions.toString()}
            valueClassName="text-primary"
            description="Diagnostic test items"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Published Questions"
            value={publishedQuestions.toString()}
            valueClassName="text-success"
            description="Available for test generation"
          />

          <StatCard
            variant="gradient"
            icon={<Clock className="h-4 w-4 text-warning" />}
            title="Draft In-Development"
            value={(totalQuestions - publishedQuestions).toString()}
            valueClassName="text-warning"
            description="Pending curricular review"
          />

          <StatCard
            variant="gradient"
            icon={<Layers className="h-4 w-4 text-primary" />}
            title="Micro-Skills Assessed"
            value={`${new Set(questions.map((q) => q.assessedSkillId)).size} Skills`}
            valueClassName="text-primary"
            description="Objective question bank coverage"
          />
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="questions">Quiz Questions Bank</TabsTrigger>
            <TabsTrigger value="blueprints">Assessment Blueprints</TabsTrigger>
          </TabsList>

          {/* TAB 1: QUIZ QUESTIONS GROUPED BY ASSESSED MICRO-SKILL */}
          <TabsContent value="questions" className="space-y-4">
            <Card className="border-border shadow-xs bg-card">
              <CardHeader className="p-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-primary" />
                      <span>Question Bank Directory</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Diagnostic and module assessment questions classified by assessed micro-skill and difficulty. Click any skill to expand and manage its items.
                    </CardDescription>
                  </div>

                  {/* Search, Filter & Accordion Toolbar */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="relative w-52">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search questions..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                      <span className="text-[11px] text-muted-foreground font-medium">Skill:</span>
                      <select
                        value={questionSkillFilter}
                        onChange={(e) => setQuestionSkillFilter(e.target.value)}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium max-w-[130px] truncate"
                      >
                        <option value="all">All ({companyMicroSkills.length})</option>
                        {companyMicroSkills.map((ms) => (
                          <option key={ms.id} value={ms.id}>
                            {ms.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                      <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                      <select
                        value={questionStatusFilter}
                        onChange={(e) => setQuestionStatusFilter(e.target.value)}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All ({totalQuestions})</option>
                        <option value="published">Published ({publishedQuestions})</option>
                        <option value="draft">Draft ({totalQuestions - publishedQuestions})</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                      <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                      <select
                        value={questionSortBy}
                        onChange={(e) => setQuestionSortBy(e.target.value as 'latest' | 'code')}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="latest">Latest</option>
                        <option value="code">Code A–Z</option>
                      </select>
                    </div>

                    {/* Accordion Expand / Collapse All Controls */}
                    <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-background shadow-2xs">
                      <button
                        type="button"
                        onClick={expandAllSkills}
                        className="px-2 py-1 text-[11px] font-medium rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Expand all micro-skill question groups"
                      >
                        Expand All
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={collapseAllSkills}
                        className="px-2 py-1 text-[11px] font-medium rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Collapse all micro-skill question groups"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {groupedSkills.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold">No questions or micro-skills match filter criteria.</p>
                    <p className="text-xs mt-1">Try resetting the search bar or skill/status filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedSkillGroups.map((group) => {
                      const expanded = isSkillExpanded(group.skillId)

                      return (
                        <div
                          key={group.skillId}
                          className="border border-border rounded-xl bg-card overflow-hidden shadow-2xs transition-all duration-150"
                        >
                          {/* Collapsible Micro-Skill Group Header */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleSkillExpanded(group.skillId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                toggleSkillExpanded(group.skillId)
                              }
                            }}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 select-none transition-colors border-b border-border/60"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                aria-label={expanded ? 'Collapse micro-skill questions' : 'Expand micro-skill questions'}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSkillExpanded(group.skillId)
                                }}
                              >
                                {expanded ? (
                                  <ChevronDown className="h-4 w-4 text-primary" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>

                              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Layers className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                                    {group.skillCode}
                                  </span>
                                  {group.macroCompetencyCode && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] font-semibold uppercase tracking-wider py-0 px-1.5 bg-secondary text-primary border-primary/20"
                                    >
                                      {group.macroCompetencyCode}
                                    </Badge>
                                  )}
                                  {group.questions.length === 0 && (
                                    <Badge variant="warning" className="text-[9px] py-0 px-1.5">
                                      Needs Questions
                                    </Badge>
                                  )}
                                </div>
                                <p
                                  className="text-xs text-muted-foreground font-medium truncate mt-0.5"
                                  title={group.skillName}
                                >
                                  {group.skillName}
                                </p>
                              </div>
                            </div>

                            {/* Badges, Difficulty Breakdown & Add Button */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2">
                                  {group.questions.length} {group.questions.length === 1 ? 'Question' : 'Questions'}
                                </Badge>
                                {group.publishedCount > 0 && (
                                  <Badge variant="success" className="text-[10px] py-0.5 px-1.5">
                                    {group.publishedCount} Pub
                                  </Badge>
                                )}
                                {group.draftCount > 0 && (
                                  <Badge variant="warning" className="text-[10px] py-0.5 px-1.5">
                                    {group.draftCount} Draft
                                  </Badge>
                                )}
                              </div>

                              {group.questions.length > 0 && (
                                <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5">
                                  {group.difficultyCounts.Foundation > 0 && (
                                    <span className="text-success font-medium">
                                      {group.difficultyCounts.Foundation} F
                                    </span>
                                  )}
                                  {group.difficultyCounts.Intermediate > 0 && (
                                    <span className="text-primary font-medium">
                                      {group.difficultyCounts.Intermediate} I
                                    </span>
                                  )}
                                  {group.difficultyCounts.Advanced > 0 && (
                                    <span className="text-destructive font-medium">
                                      {group.difficultyCounts.Advanced} A
                                    </span>
                                  )}
                                </div>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<Plus className="h-3 w-3 text-primary" />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCreateQuestion(group.skillId)
                                }}
                                className="text-xs h-7 px-2 font-medium bg-background hover:bg-secondary/40 border-border"
                              >
                                Add Question
                              </Button>
                            </div>
                          </div>

                          {/* Collapsible Dropdown Content */}
                          {expanded && (
                            <div className="bg-card">
                              {group.questions.length === 0 ? (
                                <div className="p-6 text-center bg-muted/5">
                                  <FileQuestion className="h-7 w-7 mx-auto mb-1.5 text-muted-foreground opacity-40" />
                                  <p className="text-xs font-semibold text-foreground">
                                    No questions registered for {group.skillCode}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Create diagnostic or formative quiz items to ensure valid assessment coverage.
                                  </p>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="mt-3 text-xs h-7 font-semibold"
                                    leftIcon={<Plus className="h-3 w-3" />}
                                    onClick={() => handleOpenCreateQuestion(group.skillId)}
                                  >
                                    Create First Question
                                  </Button>
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-border bg-muted/20 text-muted-foreground uppercase text-[11px] font-semibold">
                                        <th className="py-2.5 px-3">Question Code &amp; Version</th>
                                        <th className="py-2.5 px-3">Prompt Stem &amp; Correct Answer</th>
                                        <th className="py-2.5 px-3 text-center">Difficulty</th>
                                        <th className="py-2.5 px-3">Provenance Reference</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {group.questions.map((q) => {
                                        const isDraft = q.status === 'draft'
                                        const isPublished = q.status === 'published'
                                        const predecessorPublished = questions.find(
                                          (item) =>
                                            (item.stableId === q.stableId || item.code === q.code) &&
                                            item.status === 'published' &&
                                            item.id !== q.id
                                        )
                                        const isSuccessor = !isPublished && Boolean(predecessorPublished)

                                        return (
                                          <tr
                                            key={q.id}
                                            className={`transition-colors ${
                                              isSuccessor
                                                ? 'bg-muted/10 border-l-2 border-l-primary/60 hover:bg-muted/25'
                                                : 'hover:bg-muted/15'
                                            }`}
                                          >
                                            <td className="py-2.5 px-3">
                                              {isSuccessor ? (
                                                <div
                                                  className="flex items-center gap-1.5 pl-3"
                                                  title="Successor draft positioned below published version"
                                                >
                                                  <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                                  <span className="font-mono font-bold text-foreground">{q.code}</span>
                                                </div>
                                              ) : (
                                                <div className="font-mono font-bold text-foreground">{q.code}</div>
                                              )}
                                              <div
                                                className={`flex items-center gap-1.5 mt-0.5 ${
                                                  isSuccessor ? 'pl-8' : ''
                                                }`}
                                              >
                                                <Badge
                                                  variant="secondary"
                                                  className="font-mono text-[10px] py-0 px-1"
                                                >
                                                  v{q.version}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground">
                                                  {q.updatedAt || '01/02/2026'}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 max-w-sm">
                                              <div className="font-medium text-foreground line-clamp-2">
                                                {q.prompt}
                                              </div>
                                              <div className="mt-1 text-[11px] text-success flex items-center gap-1 font-semibold">
                                                <Check className="h-3 w-3 shrink-0" />
                                                <span>Answer: {q.options[q.correctAnswerIndex]}</span>
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <Badge
                                                variant={
                                                  q.difficulty === 'Foundation'
                                                    ? 'success'
                                                    : q.difficulty === 'Intermediate'
                                                    ? 'primary'
                                                    : 'destructive'
                                                }
                                                className="text-[10px]"
                                              >
                                                {q.difficulty}
                                              </Badge>
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                                              {q.provenance}
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <Badge variant={isPublished ? 'success' : 'warning'}>
                                                {q.status.toUpperCase()}
                                              </Badge>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                {!isDraft && (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => setViewingQuestionDetails(q)}
                                                    title="View Details"
                                                    aria-label="View Details"
                                                  >
                                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                                  </Button>
                                                )}
                                                {isDraft ? (
                                                  <>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 w-7 p-0"
                                                      onClick={() => {
                                                        setSelectedQuestion(q)
                                                        setQuestionForm({
                                                          code: q.code,
                                                          prompt: q.prompt,
                                                          options: [...q.options],
                                                          correctAnswerIndex: q.correctAnswerIndex,
                                                          feedback: q.feedback,
                                                          assessedSkillId: q.assessedSkillId,
                                                          difficulty: q.difficulty,
                                                          provenance: q.provenance,
                                                        })
                                                        setIsQuestionModalOpen(true)
                                                      }}
                                                      title="Edit Draft"
                                                      aria-label="Edit Draft"
                                                    >
                                                      <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 w-7 p-0 text-success hover:bg-success/10"
                                                      onClick={() => handlePublishQuestion(q)}
                                                      title="Publish Question"
                                                      aria-label="Publish Question"
                                                    >
                                                      <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                      onClick={() => setDeletingDraftQuestion(q)}
                                                      title="Delete Draft"
                                                      aria-label="Delete Draft"
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => handleCreateSuccessorQuestion(q)}
                                                    title="Create New Draft Version"
                                                    aria-label="Create New Draft Version"
                                                  >
                                                    <Plus className="h-3.5 w-3.5 text-primary" />
                                                  </Button>
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
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {groupedSkills.length > 0 && (
                  <div className="p-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground mt-4">
                    <span>
                      Showing {filteredQuestions.length} questions across {groupedSkills.length} assessed micro-skills
                    </span>
                    {totalSkillGroupPages > 1 && (
                      <Pagination
                        currentPage={skillGroupPage}
                        totalPages={totalSkillGroupPages}
                        onPageChange={setSkillGroupPage}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ASSESSMENT BLUEPRINTS */}
          <TabsContent value="blueprints" className="space-y-4">
            <Card className="border-border shadow-xs bg-card">
              <CardHeader className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      <span>Assessment Blueprints &amp; Bank Coverage</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Define diagnostic blueprints mapping target roles or modules to question quotas. Engine validates
                      sufficient published bank coverage.
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleOpenCreateBlueprint}>
                    Create
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Blueprint Code</th>
                        <th className="py-2.5 px-3">Title &amp; Target</th>
                        <th className="py-2.5 px-3 text-center">Total Items</th>
                        <th className="py-2.5 px-3 text-center">Pass Threshold</th>
                        <th className="py-2.5 px-3">Micro-skill Requirements</th>
                        <th className="py-2.5 px-3">Coverage Status</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedBlueprints.map((bp) => {
                        const isCovered = bp.coverageStatus === 'fully_covered'

                        return (
                          <tr key={bp.id} className="hover:bg-muted/20">
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-foreground">{bp.code}</div>
                              <span className="font-mono text-[10px] text-muted-foreground">v{bp.version}</span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-foreground">{bp.title}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] py-0 px-1">
                                  {bp.targetType.toUpperCase()}
                                </Badge>
                                <span className="truncate max-w-xs">{bp.targetName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-foreground font-mono">
                              {bp.totalQuestions}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-primary">
                              {bp.passThreshold}%
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {bp.requirements.map((r) => {
                                  const published = getPublishedQuestionCount(r.skillId)
                                  const isShort = published < r.questionCount

                                  return (
                                    <span
                                      key={r.skillId}
                                      className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                                        isShort
                                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                          : 'border-border bg-card text-foreground'
                                      }`}
                                    >
                                      <span>{r.skillCode}:</span>
                                      <strong>
                                        {r.questionCount} req ({published} pub)
                                      </strong>
                                    </span>
                                  )
                                })}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={
                                  isCovered
                                    ? 'success'
                                    : bp.coverageStatus === 'partial_shortage'
                                    ? 'warning'
                                    : 'destructive'
                                }
                              >
                                {isCovered
                                  ? 'FULLY COVERED'
                                  : bp.coverageStatus === 'partial_shortage'
                                  ? 'SHORTAGE DEFICIT'
                                  : 'CRITICAL SHORTAGE'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={bp.status === 'active' ? 'primary' : 'outline'}>
                                {bp.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setViewingBlueprintDetails(bp)}
                                  title="View Blueprint Details"
                                  aria-label="View Blueprint Details"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenEditBlueprint(bp)}
                                  title="Edit Blueprint"
                                  aria-label="Edit Blueprint"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingBlueprint(bp)}
                                  title="Delete Blueprint"
                                  aria-label="Delete Blueprint"
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
                {blueprints.length > 0 && (
                  <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      Showing {(blueprintPage - 1) * pageSize + 1}–
                      {Math.min(blueprintPage * pageSize, blueprints.length)} of {blueprints.length} blueprints
                    </span>
                    <Pagination
                      currentPage={blueprintPage}
                      totalPages={totalBlueprintPages}
                      onPageChange={setBlueprintPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 1. CREATE / EDIT QUIZ QUESTION MODAL */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen} className="max-w-2xl">
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              {selectedQuestion ? `Edit Question (${selectedQuestion.code})` : 'Create Objective Quiz Question'}
            </DialogTitle>
            <DialogDescription>
              Enter stem prompt, 4 options, designate exactly ONE correct answer, explanatory feedback, and link to
              one micro-skill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Question Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. QUE-CYP-05"
                  disabled={Boolean(selectedQuestion)}
                  value={questionForm.code}
                  onChange={(e) => setQuestionForm({ ...questionForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Difficulty Level</label>
                <select
                  value={questionForm.difficulty}
                  onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as QuizQuestionModel['difficulty'] })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Foundation">Foundation</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Question Stem / Prompt <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="The objective question stem presented to the learner..."
                value={questionForm.prompt}
                onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* 4 Multiple Choice Options with Radio for Correct Answer */}
            <div>
              <div className="font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>Multiple-Choice Options (Select Single Correct Key)</span>
                <span className="text-primary font-mono text-[11px]">
                  Option {['A', 'B', 'C', 'D'][questionForm.correctAnswerIndex]} is Marked Correct
                </span>
              </div>
              <div className="space-y-2">
                {questionForm.options.map((opt, idx) => {
                  const label = ['A', 'B', 'C', 'D'][idx]
                  const isCorrect = questionForm.correctAnswerIndex === idx

                  return (
                    <div
                      key={label}
                      className={`p-2 rounded-lg border flex items-center gap-2.5 transition-colors ${
                        isCorrect ? 'border-success/40 bg-success/5' : 'border-border bg-card'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={isCorrect}
                        onChange={() => setQuestionForm({ ...questionForm, correctAnswerIndex: idx })}
                        className="text-success focus:ring-success cursor-pointer"
                      />
                      <span className="font-mono font-bold text-foreground w-4">{label}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${label} answer choice text...`}
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options]
                          newOpts[idx] = e.target.value
                          setQuestionForm({ ...questionForm, options: newOpts })
                        }}
                        className="flex-1 px-2.5 py-1 text-xs bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {isCorrect && (
                        <Badge variant="success" className="text-[10px] py-0 px-1 font-bold">
                          KEY
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">
                Pedagogical Feedback / Explanation <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Remediation explanation explaining why the designated key is correct..."
                value={questionForm.feedback}
                onChange={(e) => setQuestionForm({ ...questionForm, feedback: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Assessed Micro-skill (Exactly 1 Target) <span className="text-destructive">*</span>
                </label>
                <select
                  value={questionForm.assessedSkillId}
                  onChange={(e) => setQuestionForm({ ...questionForm, assessedSkillId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {companyMicroSkills.length === 0 ? (
                    <option value="" disabled>No micro-skills registered yet</option>
                  ) : (
                    companyMicroSkills.map((ms) => (
                      <option key={ms.id} value={ms.id}>
                        {ms.code} - {ms.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Provenance Citation</label>
                <input
                  type="text"
                  placeholder="e.g. Neo4j Certified Professional Exam Bank Q12"
                  value={questionForm.provenance}
                  onChange={(e) => setQuestionForm({ ...questionForm, provenance: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button variant="outline" size="sm" onClick={() => setIsQuestionModalOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSubmittingQuestion}
                onClick={handleSaveQuestion}
              >
                {isSubmittingQuestion
                  ? 'Saving...'
                  : selectedQuestion
                  ? 'Save Draft'
                  : 'Create Question'}
              </Button>
              {selectedQuestion?.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingQuestion}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => {
                    handleSaveQuestion()
                    handlePublishQuestion(selectedQuestion)
                  }}
                >
                  Publish Question
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 2. CONFIGURE ASSESSMENT BLUEPRINT MODAL */}
      <Dialog open={isBlueprintModalOpen} onOpenChange={setIsBlueprintModalOpen} className="max-w-2xl">
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              {selectedBlueprint ? `Edit Assessment Blueprint (${selectedBlueprint.code})` : 'Create Assessment Blueprint'}
            </DialogTitle>
            <DialogDescription>
              Select a target role or module, configure required questions per micro-skill, and validate published item
              coverage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Blueprint Code</label>
                <input
                  type="text"
                  placeholder="e.g. BP-AI-ARCH-ADVANCED"
                  value={blueprintForm.code}
                  onChange={(e) => setBlueprintForm({ ...blueprintForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Blueprint Title</label>
                <input
                  type="text"
                  placeholder="e.g. AI Architect Diagnostic Blueprint"
                  value={blueprintForm.title}
                  onChange={(e) => setBlueprintForm({ ...blueprintForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Target Type &amp; Selection</label>
                <div className="flex gap-2 mb-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBlueprintForm({
                        ...blueprintForm,
                        targetType: 'role',
                        targetId: companyRoles[0]?.id || INITIAL_TARGET_ROLES[0]?.id || '',
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      blueprintForm.targetType === 'role'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Target Role
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBlueprintForm({
                        ...blueprintForm,
                        targetType: 'module',
                        targetId: companyModules[0]?.id || INITIAL_MODULES[0]?.id || '',
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                      blueprintForm.targetType === 'module'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Learning Module
                  </button>
                </div>

                <select
                  value={blueprintForm.targetId}
                  onChange={(e) => setBlueprintForm({ ...blueprintForm, targetId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {blueprintForm.targetType === 'role'
                    ? (companyRoles.length > 0 ? companyRoles : INITIAL_TARGET_ROLES).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} - {r.title} (v{r.version})
                        </option>
                      ))
                    : (companyModules.length > 0 ? companyModules : INITIAL_MODULES).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.code} - {m.title}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Pass Threshold (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={blueprintForm.passThreshold}
                  onChange={(e) =>
                    setBlueprintForm({ ...blueprintForm, passThreshold: parseInt(e.target.value) || 75 })
                  }
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Skill Quotas and Live Coverage Validation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-foreground">Skill Question Quotas &amp; Bank Coverage</span>
                <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3 w-3" />} onClick={handleAddBlueprintReq}>
                  Add Skill Quota
                </Button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {blueprintForm.requirements.map((req, idx) => {
                  const available = getPublishedQuestionCount(req.skillId)
                  const shortage = Math.max(0, req.questionCount - available)
                  const hasShortage = shortage > 0

                  return (
                    <div
                      key={req.skillId}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                        hasShortage ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-mono font-bold text-foreground">{req.skillCode}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{req.skillName}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground block">Questions Req</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={req.questionCount}
                            onChange={(e) => {
                              const newReqs = [...blueprintForm.requirements]
                              newReqs[idx].questionCount = parseInt(e.target.value) || 1
                              setBlueprintForm({ ...blueprintForm, requirements: newReqs })
                            }}
                            className="w-16 px-2 py-0.5 text-xs bg-background border border-border rounded font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Bank Inventory</span>
                          <span
                            className={`font-mono font-bold text-xs ${
                              hasShortage ? 'text-destructive' : 'text-success'
                            }`}
                          >
                            {available} Published
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBlueprintReq(req.skillId)}
                          className="text-destructive hover:text-destructive/80 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Coverage summary banner */}
              {(() => {
                const coverage = evaluateCoverage(blueprintForm.requirements)

                return (
                  <div
                    className={`mt-3 p-3 rounded-lg border flex items-center justify-between text-xs ${
                      coverage.canActivate
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-warning/30 bg-warning/10 text-warning'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {coverage.canActivate ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {coverage.canActivate
                          ? 'Item coverage verified! Sufficient published questions exist in the bank.'
                          : 'Item deficit detected: Some skills do not have enough published questions in the bank.'}
                      </span>
                    </div>
                    <Badge variant={coverage.canActivate ? 'success' : 'warning'}>
                      {coverage.canActivate ? 'READY' : 'DEFICIT'}
                    </Badge>
                  </div>
                )
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBlueprintModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveBlueprint}>
              {selectedBlueprint ? 'Save Changes' : 'Create Blueprint'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 3. VIEW BLUEPRINT DETAILS MODAL (Miro Flow) */}
      <Dialog
        open={Boolean(viewingBlueprintDetails)}
        onOpenChange={(open) => !open && setViewingBlueprintDetails(null)}
        className="max-w-2xl"
      >
        {viewingBlueprintDetails && (() => {
          const bp = viewingBlueprintDetails
          const isCovered = bp.coverageStatus === 'fully_covered'

          return (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <DialogTitle className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-primary shrink-0" />
                    <span>Assessment Blueprint Details: {bp.title}</span>
                  </DialogTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="font-mono text-xs">
                      v{bp.version}
                    </Badge>
                    <Badge variant={bp.status === 'active' ? 'primary' : 'outline'}>
                      {bp.status.toUpperCase()}
                    </Badge>
                    <Badge
                      variant={
                        isCovered
                          ? 'success'
                          : bp.coverageStatus === 'partial_shortage'
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {isCovered ? 'FULLY COVERED' : bp.coverageStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <DialogDescription>
                  Diagnostic blueprint specification mapping target role or module to item quotas and passing cutoffs.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                {/* Metric tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Blueprint Code</span>
                    <strong className="font-mono text-foreground font-bold text-sm">{bp.code}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Target Scope</span>
                    <strong className="text-foreground text-xs font-semibold truncate block">
                      {bp.targetType.toUpperCase()}: {bp.targetName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Pass Threshold</span>
                    <strong className="text-primary text-sm font-bold">{bp.passThreshold}%</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Total Session Items</span>
                    <strong className="text-foreground text-sm font-mono font-bold">{bp.totalQuestions} Questions</strong>
                  </div>
                </div>

                {/* Quota and Coverage breakdown */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="h-4 w-4 text-primary" />
                      Micro-skill Question Quotas &amp; Bank Coverage Inventory
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      {bp.requirements.length} skill requirements
                    </span>
                  </h4>

                  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                    <div className="grid grid-cols-12 py-2 px-3 bg-muted/40 font-semibold text-[11px] text-muted-foreground uppercase">
                      <div className="col-span-5">Micro-skill</div>
                      <div className="col-span-2 text-center">Required Quota</div>
                      <div className="col-span-2 text-center">In Bank</div>
                      <div className="col-span-3 text-right">Coverage Health</div>
                    </div>

                    {bp.requirements.map((r) => {
                      const published = getPublishedQuestionCount(r.skillId)
                      const isShort = published < r.questionCount
                      const diff = published - r.questionCount

                      return (
                        <div key={r.skillId} className="grid grid-cols-12 py-2.5 px-3 items-center hover:bg-muted/10">
                          <div className="col-span-5">
                            <span className="font-mono font-bold text-primary mr-1.5">{r.skillCode}</span>
                            <span className="font-medium text-foreground">{r.skillName}</span>
                          </div>
                          <div className="col-span-2 text-center font-mono font-bold text-foreground">
                            {r.questionCount}
                          </div>
                          <div className="col-span-2 text-center font-mono font-semibold text-muted-foreground">
                            {published}
                          </div>
                          <div className="col-span-3 text-right">
                            {isShort ? (
                              <Badge variant="destructive" className="text-[10px]">
                                DEFICIT (-{Math.abs(diff)})
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px]">
                                READY (+{diff} surplus)
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Sampling Engine Details */}
                <div className="p-3 rounded-lg bg-secondary/40 border border-primary/20 space-y-1 text-muted-foreground text-xs">
                  <strong className="text-primary font-semibold block text-xs">Dynamic Sampling Protocol</strong>
                  <p className="leading-relaxed">
                    When a diagnostic session begins, the assessment engine samples the required question count uniformly at random from the pool of published items matching each designated micro-skill. This prevents item memorization while ensuring psychometric consistency across test cohorts.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setViewingBlueprintDetails(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-3 w-3" />}
                  onClick={() => {
                    setViewingBlueprintDetails(null)
                    handleOpenCreateQuestion()
                  }}
                >
                  Author Question for Bank
                </Button>
              </DialogFooter>
            </div>
          )
        })()}
      </Dialog>

      {/* VIEW QUESTION DETAILS MODAL */}
      {viewingQuestionDetails && (
        <Dialog
          open={Boolean(viewingQuestionDetails)}
          onOpenChange={(open) => !open && setViewingQuestionDetails(null)}
          className="max-w-2xl"
        >
          {(() => {
            const skill =
              companyMicroSkills.find(
                (s) => s.id === viewingQuestionDetails.assessedSkillId || s.code === viewingQuestionDetails.assessedSkillId
              ) ||
              INITIAL_MICRO_SKILLS.find(
                (s) => s.id === viewingQuestionDetails.assessedSkillId || s.code === viewingQuestionDetails.assessedSkillId
              )
            const isPublished = viewingQuestionDetails.status === 'published'

            return (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <DialogTitle className="flex items-center gap-2">
                      <FileQuestion className="h-5 w-5 text-primary shrink-0" />
                      <span>Question Specification: {viewingQuestionDetails.code}</span>
                    </DialogTitle>
                    <Badge variant={isPublished ? 'success' : 'warning'} className="font-bold text-xs">
                      {viewingQuestionDetails.status.toUpperCase()}
                    </Badge>
                  </div>
                  <DialogDescription>
                    Assessment item specification, cognitive difficulty, verified answer key, and pedagogical feedback.
                  </DialogDescription>
                </DialogHeader>

                {/* Question Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Question Code</span>
                    <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingQuestionDetails.code}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                    <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingQuestionDetails.version}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Difficulty</span>
                    <span className="font-semibold text-primary mt-0.5 block">{viewingQuestionDetails.difficulty}</span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Updated</span>
                    <span className="font-mono text-muted-foreground mt-0.5 block">
                      {viewingQuestionDetails.updatedAt || '01/02/2026'}
                    </span>
                  </div>
                </div>

                {/* Assessed Micro-Skill */}
                <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Assessed Micro-skill &amp; Competency
                    </span>
                    {skill?.macroCompetencyCode && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1 font-semibold text-primary">
                        {skill.macroCompetencyCode}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <strong className="font-mono font-bold text-foreground">{skill?.code || viewingQuestionDetails.assessedSkillId}</strong>
                    <span className="text-muted-foreground font-medium">— {skill?.name || 'Atomic Competency'}</span>
                  </div>
                  {skill?.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{skill.description}</p>
                  )}
                </div>

                {/* Question Prompt Stem */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-xs space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Question Stem</span>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">{viewingQuestionDetails.prompt}</p>
                </div>

                {/* Multiple-Choice Options with Correct Answer Highlighted */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Answer Options &amp; Key</span>
                  <div className="space-y-1.5">
                    {viewingQuestionDetails.options.map((opt, idx) => {
                      const isCorrect = idx === viewingQuestionDetails.correctAnswerIndex
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                            isCorrect
                              ? 'bg-success/10 border-success/30 text-success font-semibold'
                              : 'bg-card border-border text-foreground hover:bg-muted/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold w-5 shrink-0">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                          {isCorrect && (
                            <Badge variant="success" className="text-[10px] shrink-0 font-bold ml-2">
                              <CheckCircle2 size={12} className="mr-1 inline" /> Correct Answer
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pedagogical Feedback */}
                {viewingQuestionDetails.feedback && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-secondary/30 text-xs space-y-1">
                    <span className="text-[10px] text-primary uppercase font-bold block">Pedagogical Feedback</span>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">{viewingQuestionDetails.feedback}</p>
                  </div>
                )}

                {/* Provenance reference */}
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold text-foreground shrink-0">Reference Provenance:</span>
                  <span className="font-mono truncate">{viewingQuestionDetails.provenance}</span>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setViewingQuestionDetails(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="h-3 w-3 text-primary" />}
                    onClick={() => {
                      const q = viewingQuestionDetails
                      setViewingQuestionDetails(null)
                      handleCreateSuccessorQuestion(q)
                    }}
                  >
                    Create New Draft Version
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </Dialog>
      )}

      {/* CONFIRMATION PROMPT TO DISCARD DRAFT QUESTION */}
      <ConfirmationModal
        open={Boolean(deletingDraftQuestion)}
        onOpenChange={(open) => !open && setDeletingDraftQuestion(null)}
        title="Discard Draft Assessment Question?"
        description={
          deletingDraftQuestion ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to discard draft question{' '}
                <strong className="text-foreground font-semibold font-mono">
                  {deletingDraftQuestion.code}
                </strong>
                ?
              </p>
              <p className="text-muted-foreground line-clamp-2">
                "{deletingDraftQuestion.prompt}"
              </p>
            </div>
          ) : null
        }
        confirmText="Delete Draft"
        cancelText="Keep Draft"
        variant="destructive"
        onConfirm={() => {
          if (deletingDraftQuestion) {
            handleDeleteDraftQuestion(deletingDraftQuestion)
            setDeletingDraftQuestion(null)
          }
        }}
      />

      {/* CONFIRMATION PROMPT TO DELETE BLUEPRINT */}
      <ConfirmationModal
        open={Boolean(deletingBlueprint)}
        onOpenChange={(open) => !open && setDeletingBlueprint(null)}
        title="Delete Assessment Blueprint?"
        description={
          deletingBlueprint ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to delete blueprint{' '}
                <strong className="text-foreground font-semibold font-mono">
                  {deletingBlueprint.code}
                </strong>{' '}
                ({deletingBlueprint.title})?
              </p>
              <p className="text-muted-foreground">
                This blueprint template will be removed from diagnostic test generation.
              </p>
            </div>
          ) : null
        }
        confirmText="Delete Blueprint"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deletingBlueprint) {
            handleDeleteBlueprint(deletingBlueprint)
            setDeletingBlueprint(null)
          }
        }}
      />

      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Diagnostic Question Bank"
        entityName="Assessment Questions"
        description="Select an industry blueprint question pack or upload custom JSON questions to populate diagnostic assessments for your organization."
        presets={QUESTION_PRESETS}
        onImport={handleImportQuestions}
        sampleJsonPlaceholder={`[\n  {\n    "code": "QST-ATTN-01",\n    "prompt": "In multi-head attention, what does scaling by 1/sqrt(d_k) accomplish?",\n    "options": [\n      "Prevents gradient vanishing in the softmax function.",\n      "Eliminates the requirement for positional encodings.",\n      "Compresses key vectors to minimize GPU tensor memory.",\n      "Enforces an upper bound threshold on causal masking."\n    ],\n    "correctAnswerIndex": 0,\n    "feedback": "For large values of d_k, dot products grow large pushing softmax into regions with small gradients.",\n    "difficulty": "Intermediate",\n    "provenance": "Internal Curriculum Assessment Bank"\n  }\n]`}
      />
    </WorkspaceLayout>
  )
}
