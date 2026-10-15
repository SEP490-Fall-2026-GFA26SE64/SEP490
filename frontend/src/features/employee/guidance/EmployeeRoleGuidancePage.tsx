import * as React from 'react'
import {
  ArrowRight,
  Award,
  BrainCircuit,
  CheckCircle2,
  Compass,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { useTargetRoles } from '../target-roles/targetRoleQueries'
import { prepareChooseTargetRoleCommand, TargetRoleSelectionApiError } from '../target-roles/targetRoleSelectionApi'
import { useChooseTargetRoleMutation, useTargetRoleSelection } from '../target-roles/targetRoleSelectionQueries'
import {
  TargetRoleSelectionDialog,
  type PendingTargetRoleChoice,
  type TargetRoleChoice,
} from '../target-roles/TargetRoleSelectionDialog'
import type { CareerTrack, Seniority } from '../target-roles/targetRoleTypes'

interface RiasecQuestion {
  dimension: string
  label: string
  question: string
}

const RIASEC_QUESTIONS: RiasecQuestion[] = [
  {
    dimension: 'Investigative',
    label: 'I (Investigative)',
    question: 'I enjoy investigating complex algorithmic puzzles, analyzing graph data structures, and mathematical modeling.',
  },
  {
    dimension: 'Conventional',
    label: 'C (Conventional)',
    question: 'I value systematic workflows, strict database schema integrity, thorough test suites, and standardized patterns.',
  },
  {
    dimension: 'Artistic',
    label: 'A (Artistic)',
    question: 'I prefer designing conceptual abstractions, intuitive visualizations, and exploring creative technical approaches.',
  },
  {
    dimension: 'Realistic',
    label: 'R (Realistic)',
    question: 'I like hands-on systems programming, performance tuning, and hardware/infrastructure configuration.',
  },
  {
    dimension: 'Enterprising',
    label: 'E (Enterprising)',
    question: 'I thrive on driving architectural decisions, mentoring team members, and aligning engineering with company goals.',
  },
  {
    dimension: 'Social',
    label: 'S (Social)',
    question: 'I value collaborating closely with stakeholders, knowledge sharing, and coaching junior developers.',
  },
]

export function EmployeeRoleGuidancePage() {
  const { toast } = useToast()
  const roles = useTargetRoles({})
  const selection = useTargetRoleSelection()
  const chooseRole = useChooseTargetRoleMutation()
  const { selectTargetRole } = useEmployeeLearningState()

  const [pendingChoice, setPendingChoice] = React.useState<PendingTargetRoleChoice | null>(null)
  const pendingChoiceRef = React.useRef<PendingTargetRoleChoice | null>(null)
  const submissionInFlightRef = React.useRef(false)

  const [hasCompletedRiasec, setHasCompletedRiasec] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('employee_riasec_completed') === 'true'
    } catch {
      return false
    }
  })

  const [isRiasecModalOpen, setIsRiasecModalOpen] = React.useState(false)
  const [answers, setAnswers] = React.useState<Record<string, number>>({
    Investigative: 5,
    Conventional: 4,
    Artistic: 4,
    Realistic: 3,
    Enterprising: 3,
    Social: 3,
  })

  const handleAnswerChange = (dimension: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [dimension]: value }))
  }

  const handleCompleteRiasec = () => {
    try {
      localStorage.setItem('employee_riasec_completed', 'true')
    } catch {
      // ignore
    }
    setHasCompletedRiasec(true)
    setIsRiasecModalOpen(false)
    toast({
      title: 'RIASEC Interest Assessment Completed',
      description: 'Your Holland interest traits have been evaluated. Personalized AI recommendations are now unlocked!',
      variant: 'success',
    })
  }

  const handleResetRiasec = () => {
    try {
      localStorage.removeItem('employee_riasec_completed')
    } catch {
      // ignore
    }
    setHasCompletedRiasec(false)
    toast({
      title: 'RIASEC Profile Reset',
      description: 'You can retake the assessment at any time.',
      variant: 'info',
    })
  }

  const openConfirmation = (role: TargetRoleChoice) => {
    if (
      pendingChoiceRef.current ||
      selection.isPending ||
      selection.isError ||
      chooseRole.isPending ||
      selection.data?.roleId === role.id
    ) {
      return
    }
    chooseRole.reset()
    const choice = {
      role,
      command: prepareChooseTargetRoleCommand({
        roleId: role.id,
        expectedCurrentSelectionId: selection.data?.selectionId ?? null,
      }),
    }
    pendingChoiceRef.current = choice
    setPendingChoice(choice)
  }

  const closeConfirmation = () => {
    if (chooseRole.isPending) return
    chooseRole.reset()
    pendingChoiceRef.current = null
    setPendingChoice(null)
  }

  const confirmSelection = () => {
    if (!pendingChoice || submissionInFlightRef.current || chooseRole.isPending) return
    submissionInFlightRef.current = true
    const chosenRole = pendingChoice.role
    chooseRole.mutate(pendingChoice.command, {
      onSuccess: () => {
        selectTargetRole(
          chosenRole.name,
          chosenRole.code,
          '2026-12-31',
          85,
          'Selected from AI Career Guidance'
        )
        pendingChoiceRef.current = null
        setPendingChoice(null)
        toast({
          title: 'Target Role Selected',
          description: `Initial adaptive pathway for ${chosenRole.name} generated and sent to Expert Review.`,
          variant: 'success',
        })
      },
      onError: (error) => {
        if (
          error instanceof TargetRoleSelectionApiError &&
          (error.code === 'STALE_SELECTION' || error.code === 'SELECTION_STATE_CONFLICT')
        ) {
          void selection.refetch()
        }
      },
      onSettled: () => {
        submissionInFlightRef.current = false
      },
    })
  }

  // Pre-matched recommended roles based on RIASEC + Baseline
  const recommendedRoles = React.useMemo(() => {
    interface RoleSuggestion {
      code: string
      name: string
      matchPercent: number
      explanation: string
      track: CareerTrack
      seniority: Seniority
    }

    const suggestions: RoleSuggestion[] = [
      {
        code: 'TR-001',
        name: 'AI Knowledge Architect',
        matchPercent: 94,
        explanation:
          'Strong Investigative (88%) & Conventional (82%) interest profile matches high baseline score (84%) in Graph Theory and Dynamic Knowledge Tracing.',
        track: 'PROFESSIONAL',
        seniority: 'P4',
      },
      {
        code: 'TR-002',
        name: 'Senior Machine Learning Engineer',
        matchPercent: 88,
        explanation:
          'High problem-solving aptitude and software engineering baseline align with production model deployment workflows.',
        track: 'PROFESSIONAL',
        seniority: 'P4',
      },
      {
        code: 'TR-003',
        name: 'Full-Stack Knowledge Engineer',
        matchPercent: 85,
        explanation:
          'Balanced Artistic and Conventional aptitude with demonstrated expertise in graph visualization and API architecture.',
        track: 'PROFESSIONAL',
        seniority: 'P3',
      },
    ]

    return suggestions.map((sug) => {
      const matchInCatalog = roles.data?.find(
        (r) =>
          (r.code && r.code.toLowerCase() === sug.code.toLowerCase()) ||
          r.name.toLowerCase() === sug.name.toLowerCase()
      )
      const fallbackChoice: TargetRoleChoice = {
        id: `role-${sug.code}`,
        code: sug.code,
        name: sug.name,
        track: sug.track,
        seniority: sug.seniority,
      }
      return {
        ...sug,
        catalogRole: (matchInCatalog as TargetRoleChoice) || fallbackChoice,
      }
    })
  }, [roles.data])

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Actions Bar */}
        <PageHeader />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Compass className="h-4 w-4 text-primary" />}
            title="Assigned Occupation"
            value="15-1252.00"
            description="Software Developers (O*NET-SOC)"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Test 1: Baseline Assessment"
            value="84% Mastery"
            valueClassName="text-success"
            description="Diagnostic completed by Admin"
          />

          <StatCard
            variant="gradient"
            icon={<Sparkles className="h-4 w-4 text-warning" />}
            title="Test 2: RIASEC Assessment"
            value={hasCompletedRiasec ? 'Completed' : 'Optional (Pending)'}
            valueClassName={hasCompletedRiasec ? 'text-primary' : 'text-warning'}
            description="Holland psychological profile"
          />

          <StatCard
            variant="gradient"
            icon={<BrainCircuit className="h-4 w-4 text-primary" />}
            title="Top Recommended Role"
            value={hasCompletedRiasec ? '94% AI Match' : 'Take Test 2 to Unlock'}
            description="Synthesized AI Guidance"
          />
        </div>

        {/* Main Content Card */}
        <Card className="border-border bg-card shadow-2xs">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  <span>AI Career Guidance & Role Matching</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Combine your occupation baseline assessment with the optional Holland RIASEC interest assessment to receive AI-powered role recommendations.
                </CardDescription>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {!hasCompletedRiasec ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsRiasecModalOpen(true)}
                    className="font-semibold shadow-2xs gap-1.5 text-xs"
                  >
                    <Sparkles size={14} />
                    <span>Take Optional RIASEC Test</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetRiasec}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RotateCcw size={12} />
                    <span>Retake RIASEC</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* When RIASEC is NOT completed */}
            {!hasCompletedRiasec ? (
              <div className="p-8 text-center space-y-4 max-w-xl mx-auto rounded-2xl border border-dashed border-border bg-muted/20">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-2xs">
                  <Sparkles size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground">
                    Unlock Personalized Target Role Recommendations
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You have already completed <strong>Test 1: Baseline Assessment</strong> (Score: 84% in Software Developers). Take the optional 2-minute <strong>RIASEC Interest Assessment</strong> to evaluate your Holland code traits and reveal curated career matches.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsRiasecModalOpen(true)}
                    className="font-semibold shadow-2xs gap-1.5 text-xs"
                  >
                    <Sparkles size={14} />
                    <span>Take Optional RIASEC Test (2 mins)</span>
                  </Button>
                  <Link
                    to="/employee/upskilling?tab=roles"
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                  >
                    <span>Or browse full catalog on your own</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              /* When RIASEC IS completed */
              <div className="space-y-6">
                {/* Holland Traits Visualization Banner */}
                <div className="p-4 rounded-xl border border-primary/20 bg-secondary/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                      Evaluated Holland Interest Traits
                    </span>
                    <p className="text-xs text-foreground font-medium">
                      Synthesized with your Diagnostic Baseline (84%) to determine optimal cognitive readiness.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-card border border-border text-foreground shadow-2xs">
                      I: 88% (Investigative)
                    </span>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-card border border-border text-foreground shadow-2xs">
                      C: 82% (Conventional)
                    </span>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-card border border-border text-foreground shadow-2xs">
                      A: 76% (Artistic)
                    </span>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-card border border-border text-foreground shadow-2xs">
                      R: 64% (Realistic)
                    </span>
                  </div>
                </div>

                {/* Recommended Roles Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Top Recommended Target Roles for You
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      Click Select Role to generate your initial learning pathway
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recommendedRoles.map((sug) => {
                      const isSelected = selection.data?.roleId === sug.catalogRole.id
                      return (
                        <div
                          key={sug.code}
                          className="p-4 rounded-xl bg-card border border-border shadow-2xs flex flex-col justify-between gap-3 hover:border-primary/40 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {sug.code}
                              </span>
                              <Badge variant="primary" className="text-[10px] font-mono">
                                {sug.matchPercent}% match
                              </Badge>
                            </div>
                            <h4 className="text-sm font-bold text-foreground leading-snug">{sug.name}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              {sug.explanation}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Award size={12} className="text-primary" /> {sug.catalogRole.seniority || 'P4'}
                            </span>
                            <Button
                              type="button"
                              variant={isSelected ? 'outline' : 'primary'}
                              size="sm"
                              disabled={isSelected}
                              onClick={() => openConfirmation(sug.catalogRole)}
                              className="text-xs font-semibold gap-1"
                            >
                              {isSelected ? (
                                <>
                                  <CheckCircle2 size={13} className="text-success" />
                                  <span>Active Target</span>
                                </>
                              ) : (
                                <>
                                  <Target size={13} />
                                  <span>Select Role</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Advisory Disclaimer & Catalog Link */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <HelpCircle size={16} className="text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong>Advisory Notice:</strong> These AI recommendations are optional suggestions. You have complete freedom to choose an AI-recommended role or browse and pick any role from the full organizational catalog.
                    </span>
                  </div>

                  <Link
                    to="/employee/upskilling?tab=roles"
                    className="shrink-0 text-primary hover:text-primary-hover font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>Browse Full Catalog</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RIASEC INTERACTIVE QUESTIONNAIRE MODAL */}
      <Dialog
        open={isRiasecModalOpen}
        onOpenChange={setIsRiasecModalOpen}
        className="max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Optional RIASEC Career Interest Assessment
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Rate your interest in each activity from 1 (Strongly Disagree) to 5 (Strongly Agree). Your responses will be combined with your Baseline Assessment to generate personalized AI target role recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {RIASEC_QUESTIONS.map((q, idx) => {
            const currentScore = answers[q.dimension] ?? 3
            return (
              <div key={q.dimension} className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="font-mono">{idx + 1}.</span> {q.label}
                  </span>
                  <span className="text-xs font-bold font-mono text-foreground px-2 py-0.5 rounded bg-muted">
                    Rating: {currentScore} / 5
                  </span>
                </div>
                <p className="text-xs text-foreground leading-snug">{q.question}</p>

                {/* 1 to 5 radio buttons */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAnswerChange(q.dimension, val)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        currentScore === val
                          ? 'bg-primary text-white border-primary shadow-2xs'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => setIsRiasecModalOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCompleteRiasec}
            className="font-semibold shadow-2xs gap-1.5"
          >
            <Sparkles size={14} />
            <span>Generate AI Role Recommendations</span>
          </Button>
        </DialogFooter>
      </Dialog>

      {/* TARGET ROLE SELECTION CONFIRMATION MODAL */}
      <TargetRoleSelectionDialog
        choice={pendingChoice}
        currentSelection={selection.data ?? null}
        error={chooseRole.error}
        isPending={chooseRole.isPending}
        onCancel={closeConfirmation}
        onConfirm={confirmSelection}
      />
    </WorkspaceLayout>
  )
}
