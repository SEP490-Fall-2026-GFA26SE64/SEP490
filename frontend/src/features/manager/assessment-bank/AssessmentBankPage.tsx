import {
  AlertCircle,
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Copy,
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
        assessedSkillId: INITIAL_MICRO_SKILLS[0]?.id || 'skill-attn-01',
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
        assessedSkillId: INITIAL_MICRO_SKILLS[1]?.id || 'skill-kv-01',
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
        assessedSkillId: INITIAL_MICRO_SKILLS[2]?.id || 'skill-vec-01',
        difficulty: 'Hard' as const,
        version: '1.0',
        status: 'published' as const,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    ],
  },
]

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
  const companyMicroSkills = activeComp?.microSkills || []
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
  const [selectedBlueprint, setSelectedBlueprint] = React.useState<AssessmentBlueprintModel | null>(null)
  const [viewingBlueprintDetails, setViewingBlueprintDetails] = React.useState<AssessmentBlueprintModel | null>(null)
  const [deletingBlueprint, setDeletingBlueprint] = React.useState<AssessmentBlueprintModel | null>(null)

  const handleImportQuestions = (data: any) => {
    const list = Array.isArray(data) ? data : data.questions || []
    const normalized: QuizQuestionModel[] = list.map((item: any, idx: number) => ({
      id: item.id || `qst-${Date.now()}-${idx}`,
      stableId: item.stableId || `qst-uuid-${Date.now()}-${idx}`,
      code: (item.code || `QST-IMP-${idx + 1}`).trim().toUpperCase(),
      prompt: (item.prompt || 'Untitled Assessment Question').trim(),
      options: Array.isArray(item.options) && item.options.length >= 2 ? item.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0,
      feedback: item.feedback || 'Explanatory feedback for this question.',
      assessedSkillId: item.assessedSkillId || companyMicroSkills[0]?.id || 'skill-attn-01',
      difficulty: item.difficulty || 'Intermediate',
      version: item.version || '1.0',
      status: (item.status === 'draft' || item.status === 'archived') ? item.status : 'published',
      provenance: item.provenance || 'Imported Curriculum Test Bank',
      updatedAt: item.updatedAt || new Date().toISOString().slice(0, 10),
    }))
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

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSkill = questionSkillFilter === 'all' || q.assessedSkillId === questionSkillFilter
    const matchesStatus = questionStatusFilter === 'all' || q.status === questionStatusFilter
    const matchesSearch =
      q.prompt.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.code.toLowerCase().includes(questionSearch.toLowerCase())
    return matchesSkill && matchesStatus && matchesSearch
  })

  // Aggregate stats
  const totalQuestions = questions.length
  const publishedQuestions = questions.filter((q) => q.status === 'published').length
  const activeBlueprints = blueprints.filter((b) => b.status === 'active').length

  // ------------------------------------------------------------------
  // Question Handlers
  // ------------------------------------------------------------------
  const handleOpenCreateQuestion = () => {
    setQuestionForm({
      code: `QUE-${Math.random().toString(36).substring(2, 5).toUpperCase()}-${Math.floor(
        Math.random() * 80 + 10,
      )}`,
      prompt: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      feedback: '',
      assessedSkillId: INITIAL_MICRO_SKILLS[0]?.id || '',
      difficulty: 'Intermediate',
      provenance: 'Internal Curriculum Assessment Bank 2026',
    })
    setSelectedQuestion(null)
    setIsQuestionModalOpen(true)
  }

  const handleSaveQuestion = () => {
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
  }

  // Create Successor Draft (Preserving Submitted Historical Attempts)
  const handleCreateSuccessorQuestion = (q: QuizQuestionModel) => {
    const curVer = parseFloat(q.version) || 1.0
    const nextVer = (curVer + 0.1).toFixed(1)

    const existingDraft = questions.find((item) => item.stableId === q.stableId && item.status === 'draft')
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
      version: nextVer,
      status: 'draft',
      prompt: `${q.prompt} (Revision)`,
    }

    saveAndSetQuestions([successor, ...questions])
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
          skillId: companyMicroSkills[0]?.id || INITIAL_MICRO_SKILLS[0]?.id || '',
          skillCode: companyMicroSkills[0]?.code || INITIAL_MICRO_SKILLS[0]?.code || '',
          skillName: companyMicroSkills[0]?.name || INITIAL_MICRO_SKILLS[0]?.name || '',
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
    const unused = INITIAL_MICRO_SKILLS.find(
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
                  onClick={handleOpenCreateQuestion}
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
            icon={<Sliders className="h-4 w-4 text-primary" />}
            title="Active Blueprints"
            value={activeBlueprints.toString()}
            valueClassName="text-primary"
            description="Diagnostic assessment templates"
          />

          <StatCard
            variant="gradient"
            icon={<Award className="h-4 w-4 text-warning" />}
            title="Item Coverage Integrity"
            value="100%"
            valueClassName="text-warning"
            description="Assessed skill 1-to-1 linkage"
          />
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="questions">Quiz Questions Bank</TabsTrigger>
            <TabsTrigger value="blueprints">Assessment Blueprints</TabsTrigger>
          </TabsList>

          {/* TAB 1: QUIZ QUESTIONS */}
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4 text-primary" />
                      Objective Question Bank
                    </CardTitle>
                    <CardDescription>
                      Multiple-choice items with single correct answers, feedback rationales, and micro-skill linkages.
                    </CardDescription>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search prompts or codes..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <select
                        value={questionSkillFilter}
                        onChange={(e) => setQuestionSkillFilter(e.target.value)}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Micro-skills</option>
                        {INITIAL_MICRO_SKILLS.map((ms) => (
                          <option key={ms.id} value={ms.id}>
                            {ms.code}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                      <select
                        value={questionStatusFilter}
                        onChange={(e) => setQuestionStatusFilter(e.target.value)}
                        className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Statuses</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold">No questions match filter criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                          <th className="py-2.5 px-3">Question Code</th>
                          <th className="py-2.5 px-3">Prompt Stem &amp; Correct Answer</th>
                          <th className="py-2.5 px-3">Assessed Micro-skill</th>
                          <th className="py-2.5 px-3 text-center">Difficulty</th>
                          <th className="py-2.5 px-3">Provenance</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredQuestions.map((q) => {
                          const skill = companyMicroSkills.find((s) => s.id === q.assessedSkillId)
                          const isDraft = q.status === 'draft'
                          const isPublished = q.status === 'published'

                          return (
                            <tr key={q.id} className="hover:bg-muted/20">
                              <td className="py-3 px-3">
                                <div className="font-mono font-bold text-foreground">{q.code}</div>
                                <Badge variant="secondary" className="font-mono text-[10px] mt-0.5 py-0 px-1">
                                  v{q.version}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 max-w-sm">
                                <div className="font-medium text-foreground line-clamp-2">{q.prompt}</div>
                                <div className="mt-1 text-[11px] text-success flex items-center gap-1 font-semibold">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>Answer: {q.options[q.correctAnswerIndex]}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 min-w-[220px] max-w-[280px]">
                                <div className="flex items-start gap-2.5">
                                  <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                    <Layers className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                                        {skill?.code || q.assessedSkillId}
                                      </span>
                                      {skill?.bloomLevel && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[9px] font-semibold uppercase tracking-wider py-0 px-1 bg-secondary text-primary border-primary/20"
                                        >
                                          {skill.bloomLevel}
                                        </Badge>
                                      )}
                                    </div>
                                    <p
                                      className="text-xs text-muted-foreground font-medium truncate block"
                                      title={skill?.name || q.assessedSkillId}
                                    >
                                      {skill?.name || 'Unmapped Micro-skill'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
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
                              <td className="py-3 px-3 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                                {q.provenance}
                              </td>
                              <td className="py-3 px-3">
                                <Badge variant={isPublished ? 'success' : 'warning'}>
                                  {q.status.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isDraft ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
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
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setDeletingDraftQuestion(q)}
                                        title="Delete Draft"
                                        aria-label="Delete Draft"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleCreateSuccessorQuestion(q)}
                                      title="Create Draft"
                                      aria-label="Create Draft"
                                    >
                                      <Copy className="h-4 w-4" />
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ASSESSMENT BLUEPRINTS */}
          <TabsContent value="blueprints" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" />
                      Assessment Blueprints &amp; Bank Coverage
                    </CardTitle>
                    <CardDescription>
                      Define diagnostic blueprints mapping target roles or modules to question quotas. Engine validates
                      sufficient published bank coverage.
                    </CardDescription>
                  </div>
                  <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={handleOpenCreateBlueprint}>
                    Create
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                      {blueprints.map((bp) => {
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
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
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
                  onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as any })}
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
              <Button variant="outline" size="sm" onClick={handleSaveQuestion}>
                {selectedQuestion ? 'Save Draft' : 'Create Question'}
              </Button>
              {selectedQuestion?.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
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
                        targetId: INITIAL_TARGET_ROLES[0]?.id || '',
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
                        targetId: INITIAL_MODULES[0]?.id || '',
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
                    ? INITIAL_TARGET_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} - {r.title} (v{r.version})
                        </option>
                      ))
                    : INITIAL_MODULES.map((m) => (
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
