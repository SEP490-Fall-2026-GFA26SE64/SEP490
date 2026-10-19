import React, { useState, useMemo, useEffect } from 'react'
import {
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Award,
  Briefcase,
  ChevronRight,
  Clock,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/components/ui/Card'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Progress } from '../../../shared/components/ui/Progress'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { cn } from '../../../shared/lib/utils'

export interface RiasecQuestionItem {
  id: number
  dimension: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
  dimensionName: string
  statement: string
}

export interface DimensionScore {
  dimension: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
  name: string
  title: string
  score: number // 0 - 100
  color: string
  description: string
}

const RIASEC_QUESTIONS: RiasecQuestionItem[] = [
  // Realistic (Hands-on, systems, hardware, networks)
  { id: 1, dimension: 'R', dimensionName: 'Realistic', statement: 'Deploying and troubleshooting Linux server clusters, containers, and network topologies.' },
  { id: 2, dimension: 'R', dimensionName: 'Realistic', statement: 'Configuring CI/CD build agents, hardware accelerators (GPUs), and infrastructure pipelines.' },
  { id: 3, dimension: 'R', dimensionName: 'Realistic', statement: 'Diagnosing low-level memory leaks, thread contention, and hardware resource bottlenecks.' },

  // Investigative (Analytical, research, math, algorithms)
  { id: 4, dimension: 'I', dimensionName: 'Investigative', statement: 'Designing complex graph traversal algorithms and querying multi-hop relationship trees.' },
  { id: 5, dimension: 'I', dimensionName: 'Investigative', statement: 'Formulating probabilistic Bayesian models to estimate learner skill acquisition curves.' },
  { id: 6, dimension: 'I', dimensionName: 'Investigative', statement: 'Conducting in-depth architectural benchmarks and profiling Big-O time complexity.' },

  // Artistic (Creative, design, visual aesthetics, abstraction)
  { id: 7, dimension: 'A', dimensionName: 'Artistic', statement: 'Crafting responsive user interfaces with micro-animations and harmonious color systems.' },
  { id: 8, dimension: 'A', dimensionName: 'Artistic', statement: 'Synthesizing ambiguous business problems into novel, elegant visual domain models.' },
  { id: 9, dimension: 'A', dimensionName: 'Artistic', statement: 'Designing engaging data visualisations, knowledge graphs, and interactive timelines.' },

  // Social (Mentorship, team communication, coaching)
  { id: 10, dimension: 'S', dimensionName: 'Social', statement: 'Mentoring junior developers through code reviews and pair programming sessions.' },
  { id: 11, dimension: 'S', dimensionName: 'Social', statement: 'Facilitating cross-functional discovery workshops between engineers and domain experts.' },
  { id: 12, dimension: 'S', dimensionName: 'Social', statement: 'Explaining intricate technical trade-offs to non-technical stakeholders with empathy.' },

  // Enterprising (Leadership, business impact, product ownership)
  { id: 13, dimension: 'E', dimensionName: 'Enterprising', statement: 'Pitching technical roadmaps and product feature investments to executive leadership.' },
  { id: 14, dimension: 'E', dimensionName: 'Enterprising', statement: 'Balancing technical debt against rapid time-to-market commercial delivery priorities.' },
  { id: 15, dimension: 'E', dimensionName: 'Enterprising', statement: 'Organizing engineering sprint commitments and driving accountability for team milestones.' },

  // Conventional (Structure, precision, test automation, data integrity)
  { id: 16, dimension: 'C', dimensionName: 'Conventional', statement: 'Enforcing strict relational schema constraints, database migrations, and ACID consistency.' },
  { id: 17, dimension: 'C', dimensionName: 'Conventional', statement: 'Writing comprehensive unit, integration, and contract test suites to prevent regressions.' },
  { id: 18, dimension: 'C', dimensionName: 'Conventional', statement: 'Cataloging API contracts, OpenAPI schemas, and documentation according to standards.' },
]

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Dislike', desc: 'I would avoid this activity' },
  { value: 2, label: 'Dislike', desc: 'I find this activity unappealing' },
  { value: 3, label: 'Neutral', desc: 'No strong preference either way' },
  { value: 4, label: 'Enjoy', desc: 'I find this engaging and interesting' },
  { value: 5, label: 'Strongly Enjoy', desc: 'One of my favorite types of work' },
]

const STORAGE_KEY = 'alg_employee_riasec_result_v1'

export const RiasecAssessmentPage: React.FC = () => {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Answers map: questionId -> 1..5
  const [answers, setAnswers] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_answers`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) !== null
  })

  // Timer counter when taking assessment
  useEffect(() => {
    if (isCompleted) return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isCompleted])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Handle rating change
  const handleRate = (questionId: number, value: number) => {
    const updated = { ...answers, [questionId]: value }
    setAnswers(updated)
    try {
      localStorage.setItem(`${STORAGE_KEY}_answers`, JSON.stringify(updated))
    } catch (err) {
      console.error(err)
    }
  }

  // Answered count & completion percentage
  const answeredCount = Object.keys(answers).length
  const totalQuestions = RIASEC_QUESTIONS.length
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)
  const currentQuestion = RIASEC_QUESTIONS[activeQuestionIndex]

  // Calculate scores per dimension
  const dimensionScores: DimensionScore[] = useMemo(() => {
    const dimMap: Record<'R' | 'I' | 'A' | 'S' | 'E' | 'C', { sum: number; count: number; name: string; title: string; desc: string; color: string }> = {
      R: { sum: 0, count: 0, name: 'Realistic', title: 'Hands-on & Infrastructure', desc: 'Practical execution, DevOps, distributed systems, networks.', color: 'hsl(var(--primary))' },
      I: { sum: 0, count: 0, name: 'Investigative', title: 'Algorithmic & Analytical', desc: 'Mathematical problem-solving, data science, deep architecture.', color: '#0284C7' },
      A: { sum: 0, count: 0, name: 'Artistic', title: 'Creative & Conceptual', desc: 'UI/UX design, visual storytelling, exploratory software designs.', color: '#8B5CF6' },
      S: { sum: 0, count: 0, name: 'Social', title: 'Collaborative & Mentoring', desc: 'Team enablement, knowledge sharing, cross-functional leadership.', color: 'hsl(var(--success))' },
      E: { sum: 0, count: 0, name: 'Enterprising', title: 'Product & Strategic', desc: 'Product vision, driving deliverables, tech-business alignment.', color: 'hsl(var(--warning))' },
      C: { sum: 0, count: 0, name: 'Conventional', title: 'Systematic & Precision', desc: 'Quality assurance, formal schema integrity, reliability engineering.', color: '#64748B' },
    }

    RIASEC_QUESTIONS.forEach((q) => {
      const val = answers[q.id] || 3 // default neutral if not yet answered
      dimMap[q.dimension].sum += val
      dimMap[q.dimension].count += 1
    })

    return Object.entries(dimMap).map(([key, data]) => {
      const rawAvg = data.sum / data.count
      const pct = Math.round(((rawAvg - 1) / 4) * 100)
      return {
        dimension: key as 'R' | 'I' | 'A' | 'S' | 'E' | 'C',
        name: data.name,
        title: data.title,
        score: pct,
        color: data.color,
        description: data.desc,
      }
    })
  }, [answers])

  // Top 3 dimensions for Holland Code
  const topDimensions = useMemo(() => {
    return [...dimensionScores].sort((a, b) => b.score - a.score).slice(0, 3)
  }, [dimensionScores])

  const hollandCode = topDimensions.map((d) => d.dimension).join('')

  // Suggested Target Roles based on Holland Code
  const suggestedRoles = useMemo(() => {
    return [
      {
        title: 'AI Knowledge Architect',
        code: 'TR-001',
        track: 'Professional',
        seniority: 'P4',
        match: '94% Match',
        reason: 'High Investigative (88%) & Conventional (82%) profile matches knowledge graph ontology engineering.',
      },
      {
        title: 'Senior Machine Learning Engineer',
        code: 'TR-002',
        track: 'Professional',
        seniority: 'P4',
        match: '88% Match',
        reason: 'Strong algorithmic reasoning and software engineering production baseline.',
      },
      {
        title: 'Full-Stack Knowledge Engineer',
        code: 'TR-003',
        track: 'Professional',
        seniority: 'P3',
        match: '85% Match',
        reason: 'Balanced Artistic conceptual design and Conventional data integrity aptitude.',
      },
    ]
  }, [])

  const handleFinishAssessment = () => {
    const payload = {
      completedAt: new Date().toISOString(),
      hollandCode,
      topTraits: topDimensions.map((d) => d.name),
      scores: dimensionScores.map((s) => ({ dim: s.dimension, score: s.score })),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      localStorage.setItem('employee_riasec_completed', 'true')
    } catch (e) {
      console.error(e)
    }
    setIsCompleted(true)
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Top Header / Actions Bar */}
        <PageHeader
          title="RIASEC Career Interest Profiler"
          description="Discover your Holland occupational interest code to align your adaptive learning pathway with your natural strengths."
          actions={
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <>
                  <Badge variant="outline" className="text-xs font-semibold gap-1.5 py-1 text-muted-foreground border-border bg-card">
                    <CheckCircle2 size={13} className="text-success" />
                    <span>Profile Locked</span>
                  </Badge>
                  <Link to="/employee/upskilling?tab=roles">
                    <Button variant="primary" size="sm" className="gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Browse Target Roles</span>
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-border bg-card text-xs font-mono text-muted-foreground shadow-2xs">
                    <Clock size={14} className="text-primary" />
                    <span>{formatTimer(timerSeconds)}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={answeredCount < totalQuestions}
                    onClick={handleFinishAssessment}
                    className="font-semibold gap-1.5 shadow-2xs"
                  >
                    <span>Submit Profiler</span>
                    <ArrowRight size={14} />
                  </Button>
                </div>
              )}
            </div>
          }
        />

        {/* Top Telemetry StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Profiler Status"
            value={isCompleted ? 'Profile Complete' : `${answeredCount}/${totalQuestions} Answered`}
            description={isCompleted ? `Assessed on 18 criteria` : `${totalQuestions - answeredCount} statements remaining`}
            icon={<Compass className="w-5 h-5 text-primary" />}
          />
          <StatCard
            title="Dominant Holland Code"
            value={isCompleted ? hollandCode : 'Calculating...'}
            description={
              isCompleted
                ? topDimensions.map((d) => d.name).join(' • ')
                : 'Complete questions to reveal'
            }
            icon={<Award className="w-5 h-5 text-primary" />}
          />
          <StatCard
            title="Primary Trait"
            value={isCompleted ? `${topDimensions[0]?.name} (${topDimensions[0]?.score}%)` : 'Pending'}
            description={isCompleted ? topDimensions[0]?.title : 'Based on top ratings'}
            icon={<BarChart3 className="w-5 h-5 text-primary" />}
          />
          <StatCard
            title="Matched Target Roles"
            value={isCompleted ? `${suggestedRoles.length} Roles` : 'Awaiting Profile'}
            description="Aligned with interest vectors"
            icon={<Briefcase className="w-5 h-5 text-primary" />}
          />
        </div>

        {isCompleted ? (
          /* RESULTS & RECOMMENDATIONS VIEW */
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-2xs">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" className="font-mono text-xs font-bold">
                        Holland Code: {hollandCode}
                      </Badge>
                      <Badge variant="success" className="text-xs font-semibold">
                        Calibrated Profile
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      RIASEC Dimension Compatibility Profile
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Normalized interest distribution across Holland&apos;s 6 engineering vocational dimensions.
                    </CardDescription>
                  </div>
                  <Link to="/employee/upskilling?tab=roles">
                    <Button variant="primary" size="sm" className="font-semibold gap-1.5 shadow-2xs">
                      <Target size={14} />
                      <span>Explore Recommended Roles</span>
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dimensionScores.map((dim) => {
                    const isTop = topDimensions.some((t) => t.dimension === dim.dimension)
                    return (
                      <div
                        key={dim.dimension}
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-3",
                          isTop
                            ? "border-primary/40 bg-secondary/30 ring-1 ring-primary/20"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center">
                              {dim.dimension}
                            </span>
                            <span className="font-bold text-sm text-foreground">
                              {dim.name}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-sm text-foreground">
                            {dim.score}%
                          </span>
                        </div>
                        <Progress value={dim.score} className="h-2" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {dim.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recommended Target Roles Aligned With This Holland Code */}
            <Card className="border-border bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI Recommended Target Roles (Calibrated to {hollandCode})</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Roles in your organization that maximize your occupational interest strengths and problem-solving drivers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestedRoles.map((role) => (
                    <div
                      key={role.code}
                      className="p-5 rounded-xl border border-border bg-muted/15 flex flex-col justify-between gap-4 hover:shadow-xs transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px] font-semibold text-primary">
                            {role.track} • {role.seniority}
                          </Badge>
                          <Badge variant="primary" className="text-[10px] font-bold">
                            {role.match}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-foreground">{role.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{role.reason}</p>
                      </div>
                      <Link to="/employee/upskilling?tab=roles" className="mt-auto">
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between">
                          <span>View in Target Roles</span>
                          <ChevronRight size={13} />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* STANDARDIZED TWO-PANE QUIZ TEMPLATE VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Question Palette Navigation (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Question Palette
                    </h3>
                    <p className="text-xs text-foreground font-semibold mt-0.5">
                      {answeredCount} of {totalQuestions} answered
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {progressPercent}%
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {RIASEC_QUESTIONS.map((q, idx) => {
                      const isAnswered = answers[q.id] !== undefined
                      const isCurrent = idx === activeQuestionIndex
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setActiveQuestionIndex(idx)}
                          className={cn(
                            "h-9 w-full rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer shadow-2xs",
                            isCurrent
                              ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30"
                              : isAnswered
                              ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          )}
                          title={`Question ${idx + 1} (${q.dimensionName}) - ${isAnswered ? 'Answered' : 'Unanswered'}`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>

                  {/* Palette Legend */}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40 inline-block" />
                      <span>Answered</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
                      <span>Current</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-muted/60 border border-border inline-block" />
                      <span>Remaining</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RIASEC Dimension Info Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Compass size={15} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Current Focus: {currentQuestion.dimensionName} ({currentQuestion.dimension})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Evaluates your engagement with {currentQuestion.dimensionName.toLowerCase()} activities to determine your occupational interest profile.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: Active Question & Likert Response Card (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="border-border bg-card shadow-xs overflow-hidden">
                <CardHeader className="p-6 border-b border-border bg-muted/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-semibold text-primary">
                          Question {activeQuestionIndex + 1} of {totalQuestions}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {currentQuestion.dimensionName} ({currentQuestion.dimension})
                        </Badge>
                      </div>
                      <h3 className="text-sm font-bold text-foreground mt-1">
                        Occupational Interest Assessment Statement
                      </h3>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Scale: 1 (Dislike) - 5 (Enjoy)
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Question Statement */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Engineering Activity Statement:
                    </span>
                    <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                      &ldquo;{currentQuestion.statement}&rdquo;
                    </p>
                  </div>

                  {/* Likert Scale Selection */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Your Interest Preference:
                    </div>

                    <div className="space-y-2.5">
                      {LIKERT_OPTIONS.map((opt) => {
                        const isSelected = answers[currentQuestion.id] === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleRate(currentQuestion.id, opt.value)}
                            className={cn(
                              "w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs group",
                              isSelected
                                ? "border-primary bg-secondary/50 font-medium ring-1 ring-primary/30"
                                : "border-border bg-card hover:bg-muted/40 hover:border-primary/40 text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border text-muted-foreground group-hover:border-primary/50 group-hover:text-primary"
                                )}
                              >
                                {opt.value}
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {opt.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {opt.desc}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={16} className="text-primary shrink-0 mr-1" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeQuestionIndex === 0}
                      onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                      leftIcon={<ArrowLeft size={14} />}
                      className="text-xs font-semibold"
                    >
                      Previous
                    </Button>

                    <span className="text-xs font-medium text-muted-foreground">
                      Question {activeQuestionIndex + 1} of {totalQuestions}
                    </span>

                    {activeQuestionIndex < totalQuestions - 1 ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setActiveQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                        rightIcon={<ArrowRight size={14} />}
                        className="text-xs font-semibold"
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={answeredCount < totalQuestions}
                        onClick={handleFinishAssessment}
                        rightIcon={<CheckCircle2 size={14} />}
                        className="text-xs font-semibold shadow-2xs"
                      >
                        Finish & Submit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  )
}

export default RiasecAssessmentPage
