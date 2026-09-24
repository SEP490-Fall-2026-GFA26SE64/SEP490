import {
  AlertCircle,
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  FileQuestion,
  Plus,
  Search,
  Sliders,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  type AssessmentBlueprintModel,
  type BlueprintSkillRequirement,
  INITIAL_BLUEPRINTS,
  INITIAL_MICRO_SKILLS,
  INITIAL_MODULES,
  INITIAL_QUESTIONS,
  INITIAL_TARGET_ROLES,
  type QuizQuestionModel,
} from '../data/ldManagerMockData'

export function AssessmentBankPage() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = React.useState('questions')
  const [questions, setQuestions] = React.useState<QuizQuestionModel[]>(INITIAL_QUESTIONS)
  const [blueprints, setBlueprints] = React.useState<AssessmentBlueprintModel[]>(INITIAL_BLUEPRINTS)

  // Filters
  const [questionSearch, setQuestionSearch] = React.useState('')
  const [questionSkillFilter, setQuestionSkillFilter] = React.useState('all')
  const [questionStatusFilter, setQuestionStatusFilter] = React.useState('all')

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = React.useState(false)
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = React.useState(false)
  const [selectedQuestion, setSelectedQuestion] = React.useState<QuizQuestionModel | null>(null)

  // Question Form
  const [questionForm, setQuestionForm] = React.useState({
    code: '',
    prompt: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    feedback: '',
    assessedSkillId: INITIAL_MICRO_SKILLS[0]?.id || '',
    difficulty: 'Intermediate' as QuizQuestionModel['difficulty'],
    provenance: '',
  })

  // Blueprint Form
  const [blueprintForm, setBlueprintForm] = React.useState({
    code: '',
    title: '',
    targetType: 'role' as 'role' | 'module',
    targetId: INITIAL_TARGET_ROLES[0]?.id || '',
    passThreshold: 80,
    requirements: [
      {
        skillId: INITIAL_MICRO_SKILLS[0]?.id || '',
        skillCode: INITIAL_MICRO_SKILLS[0]?.code || '',
        skillName: INITIAL_MICRO_SKILLS[0]?.name || '',
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
      setQuestions((prev) =>
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

      setQuestions([newQ, ...questions])
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

    setQuestions([successor, ...questions])
    toast({
      title: 'Successor Version Spawned',
      description: `Draft v${nextVer} created. Historical submitted learner attempts continue using the original answer key.`,
      variant: 'success',
    })
  }

  const handlePublishQuestion = (q: QuizQuestionModel) => {
    setQuestions((prev) => prev.map((item) => (item.id === q.id ? { ...item, status: 'published' } : item)))
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

    setQuestions(questions.filter((item) => item.id !== q.id))
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
    setBlueprintForm({
      code: `BP-${Math.random().toString(36).substring(2, 5).toUpperCase()}-TEST`,
      title: '',
      targetType: 'role',
      targetId: INITIAL_TARGET_ROLES[0]?.id || '',
      passThreshold: 80,
      requirements: [
        {
          skillId: INITIAL_MICRO_SKILLS[0]?.id || '',
          skillCode: INITIAL_MICRO_SKILLS[0]?.code || '',
          skillName: INITIAL_MICRO_SKILLS[0]?.name || '',
          questionCount: 2,
        },
      ],
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
        ? INITIAL_TARGET_ROLES.find((r) => r.id === blueprintForm.targetId)?.title || 'Target Role'
        : INITIAL_MODULES.find((m) => m.id === blueprintForm.targetId)?.title || 'Learning Module'

    const totalQuestions = blueprintForm.requirements.reduce((acc, r) => acc + r.questionCount, 0)

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

    setBlueprints([newBp, ...blueprints])
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

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Top Actions */}
        <div className="flex items-center justify-end gap-2 pb-1 border-b border-border/60">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sliders className="h-4 w-4" />}
            onClick={handleOpenCreateBlueprint}
          >
            Configure Blueprint
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreateQuestion}
          >
            Create Quiz Question
          </Button>
        </div>

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
                          const skill = INITIAL_MICRO_SKILLS.find((s) => s.id === q.assessedSkillId)
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
                              <td className="py-3 px-3">
                                <Badge variant="outline" className="font-mono text-[10px] block truncate max-w-[160px]">
                                  {skill?.code || q.assessedSkillId}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground truncate block max-w-[160px]">
                                  {skill?.name}
                                </span>
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
                                        leftIcon={<Edit3 className="h-3 w-3" />}
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
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        leftIcon={<CheckCircle2 className="h-3 w-3" />}
                                        onClick={() => handlePublishQuestion(q)}
                                      >
                                        Publish
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                        onClick={() => handleDeleteDraftQuestion(q)}
                                        title="Delete draft question"
                                      >
                                        Delete Draft
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      leftIcon={<Copy className="h-3 w-3" />}
                                      onClick={() => handleCreateSuccessorQuestion(q)}
                                      title="Create successor version; past submitted attempts retain original answer key"
                                    >
                                      Successor Draft
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
                    New Blueprint
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
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <div className="space-y-4 max-w-2xl">
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
                  {INITIAL_MICRO_SKILLS.map((ms) => (
                    <option key={ms.id} value={ms.id}>
                      {ms.code} - {ms.name}
                    </option>
                  ))}
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

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsQuestionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveQuestion}>
              {selectedQuestion ? 'Save Changes' : 'Create Question'}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 2. CONFIGURE ASSESSMENT BLUEPRINT MODAL */}
      <Dialog open={isBlueprintModalOpen} onOpenChange={setIsBlueprintModalOpen}>
        <div className="space-y-4 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Configure Assessment Blueprint
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
              Save Blueprint
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </WorkspaceLayout>
  )
}
