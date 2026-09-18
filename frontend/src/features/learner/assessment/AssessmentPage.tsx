import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Flag,
  LogOut,
  Save,
  Send,
} from 'lucide-react'
import * as React from 'react'
import { Heading } from '../../../shared/components/typography/Heading'
import { Badge } from '../../../shared/components/ui/Badge'
import { Breadcrumb } from '../../../shared/components/ui/Breadcrumb'
import { Button } from '../../../shared/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import './AssessmentPage.css'

interface Question {
  id: string
  number: number
  concept: string
  category: string
  points: number
  questionText: string
  codeSnippet?: string
  options: { id: string; text: string }[]
  correctOptionId: string
  explanation: string
}

const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    number: 1,
    concept: 'Graph Neural Networks (GNN)',
    category: 'Spatial Convolution',
    points: 1.0,
    questionText:
      'In a Spatial Graph Convolutional Network (GCN) layer, how are node representations aggregated across localized 1-hop neighbor nodes before non-linear activation?',
    codeSnippet: 'H^(l+1) = σ( D̃^(-1/2) * Ã * D̃^(-1/2) * H^(l) * W^(l) )',
    options: [
      {
        id: 'opt-1-a',
        text: 'A) Normalized graph Laplacian adjacency matrix multiplication with neighbor feature vectors.',
      },
      {
        id: 'opt-1-b',
        text: 'B) Standard multi-layer perceptron (MLP) flattening of all adjacent vertices into a single 1D vector.',
      },
      {
        id: 'opt-1-c',
        text: 'C) Independent random dropout of edges without permutation invariance normalization.',
      },
      {
        id: 'opt-1-d',
        text: 'D) Recursive tree search over all possible subgraph Hamiltonian paths.',
      },
    ],
    correctOptionId: 'opt-1-a',
    explanation:
      'Spectral GCNs approximate convolution via normalized adjacency graph Laplacians (Kipf & Welling).',
  },
  {
    id: 'q-2',
    number: 2,
    concept: 'Neo4j Cypher Optimization',
    category: 'Graph Database Querying',
    points: 1.0,
    questionText:
      'Which Cypher clause structure ensures optimal index usage when traversing variable-length competency prerequisite relationships up to 3 hops?',
    codeSnippet: 'MATCH (c:Competency {id: $id})-[:REQUIRES*1..3]->(p:Competency) RETURN p',
    options: [
      {
        id: 'opt-2-a',
        text: 'A) Schema index lookup on starting node ID followed by direction-constrained BFS expansion.',
      },
      {
        id: 'opt-2-b',
        text: 'B) Full Cartesian product MATCH (c), (p) with post-filtering in WHERE clause.',
      },
      {
        id: 'opt-2-c',
        text: 'C) Unbounded shortestPath without anchor node property predicates.',
      },
      {
        id: 'opt-2-d',
        text: 'D) Converting all node labels into raw string JSON payloads.',
      },
    ],
    correctOptionId: 'opt-2-a',
    explanation:
      'Constraining anchor properties using an index lookup avoids full-table graph scans.',
  },
  {
    id: 'q-3',
    number: 3,
    concept: 'Dynamic Knowledge Tracing',
    category: 'Competency Intelligence',
    points: 1.0,
    questionText:
      'What is the primary role of the Hidden Markov State in standard Bayesian Knowledge Tracing (BKT) formulations?',
    options: [
      {
        id: 'opt-3-a',
        text: 'A) Latent binary mastery probability: whether the learner has internalized a specific micro-competency.',
      },
      {
        id: 'opt-3-b',
        text: 'B) Network ping latency between client browser and Java gateway.',
      },
      {
        id: 'opt-3-c',
        text: 'C) The total number of open tabs in the browser session.',
      },
      {
        id: 'opt-3-d',
        text: 'D) The exact cryptographic hash of the learner password.',
      },
    ],
    correctOptionId: 'opt-3-a',
    explanation:
      'BKT models mastery as a latent variable with transition probabilities (Learn, Slip, Guess).',
  },
  {
    id: 'q-4',
    number: 4,
    concept: 'Ontology Modeling',
    category: 'Knowledge Graph Architecture',
    points: 1.0,
    questionText:
      'When designing an enterprise competency ontology, what distinguishes a "Macro-Competency" from a "Micro-Skill"?',
    options: [
      {
        id: 'opt-4-a',
        text: 'A) Macro-competencies group domain capabilities; micro-skills represent granular, testable behavioral units.',
      },
      {
        id: 'opt-4-b',
        text: 'B) Macro-competencies are stored in PostgreSQL while micro-skills can only exist in Redis.',
      },
      {
        id: 'opt-4-c',
        text: 'C) There is no structural difference; the names are purely visual synonyms.',
      },
      {
        id: 'opt-4-d',
        text: 'D) Micro-skills cannot have prerequisite dependency edges in the graph.',
      },
    ],
    correctOptionId: 'opt-4-a',
    explanation:
      'Taxonomic hierarchies bridge high-level capability goals to assessable micro-skills.',
  },
  {
    id: 'q-5',
    number: 5,
    concept: 'Graph Traversal Algorithms',
    category: 'Pathway Generation',
    points: 1.0,
    questionText:
      'Which topological algorithm is best suited for computing a strictly non-cyclic prerequisite learning schedule over a Directed Acyclic Graph (DAG)?',
    options: [
      {
        id: 'opt-5-a',
        text: 'A) Topological Sort (Kahn algorithm / DFS-based order).',
      },
      {
        id: 'opt-5-b',
        text: 'B) Bellman-Ford negative cycle generator.',
      },
      {
        id: 'opt-5-c',
        text: 'C) Randomized Monte Carlo tree walk with edge replacement.',
      },
      {
        id: 'opt-5-d',
        text: 'D) Prim minimum spanning tree on disconnected node clusters.',
      },
    ],
    correctOptionId: 'opt-5-a',
    explanation:
      'Topological sorting guarantees that every prerequisite milestone appears before downstream dependent skills.',
  },
  {
    id: 'q-6',
    number: 6,
    concept: 'Hexagonal Architecture in Spring Boot',
    category: 'Backend Integration',
    points: 1.0,
    questionText:
      'In a Hexagonal (Ports & Adapters) backend design for adaptive learning, where should domain calculation rules reside?',
    options: [
      {
        id: 'opt-6-a',
        text: 'A) Inside the pure Domain and Application core packages, decoupled from database and web frameworks.',
      },
      {
        id: 'opt-6-b',
        text: 'B) Directly inside the Spring REST `@RestController` annotation bodies.',
      },
      {
        id: 'opt-6-c',
        text: 'C) Stored inside HTML meta tags in client responses.',
      },
      {
        id: 'opt-6-d',
        text: 'D) In the client-side JavaScript bundle using browser local storage.',
      },
    ],
    correctOptionId: 'opt-6-a',
    explanation:
      'Hexagonal architecture isolates core business domain invariants from infrastructure adapters.',
  },
  {
    id: 'q-7',
    number: 7,
    concept: 'Knowledge Graph Prerequisite Remediation',
    category: 'Adaptive Feedback',
    points: 1.0,
    questionText:
      'If a learner repeatedly fails questions associated with "GNN Node Embeddings", what remediation strategy does the engine trigger?',
    options: [
      {
        id: 'opt-7-a',
        text: 'A) Traverse reverse prerequisite edges to identify unmastered root skills (e.g. Matrix Eigenvalues).',
      },
      {
        id: 'opt-7-b',
        text: 'B) Permanently lock the learner account and delete previous course attempts.',
      },
      {
        id: 'opt-7-c',
        text: 'C) Fast-forward the learner directly to the final capstone project.',
      },
      {
        id: 'opt-7-d',
        text: 'D) Randomly assign unrelated marketing and sales training modules.',
      },
    ],
    correctOptionId: 'opt-7-a',
    explanation:
      'Root-cause prerequisite remediation analyzes predecessor nodes to fill foundational gaps.',
  },
  {
    id: 'q-8',
    number: 8,
    concept: 'Vector Embeddings in Competency Matching',
    category: 'Machine Learning',
    points: 1.0,
    questionText:
      'How does Cosine Similarity evaluate alignment between an employee skill vector and a target role profile vector?',
    options: [
      {
        id: 'opt-8-a',
        text: 'A) Measures the cosine of the angle between high-dimensional embedding vectors (dot product normalized by magnitudes).',
      },
      {
        id: 'opt-8-b',
        text: 'B) Computes the sum of ASCII characters in employee usernames.',
      },
      {
        id: 'opt-8-c',
        text: 'C) Inverts the database connection socket port.',
      },
      {
        id: 'opt-8-d',
        text: 'D) Counts the number of pixels displayed on the monitor screen.',
      },
    ],
    correctOptionId: 'opt-8-a',
    explanation:
      'Cosine similarity is invariant to vector scale and quantifies angular orientation in embedding space.',
  },
  {
    id: 'q-9',
    number: 9,
    concept: 'Data Consistency in CQRS',
    category: 'Event-Driven Systems',
    points: 1.0,
    questionText:
      'When an assessment attempt is submitted, how does the system ensure the relational Postgres database and Neo4j graph stay synchronized?',
    options: [
      {
        id: 'opt-9-a',
        text: 'A) Through transactional event publication with durable outbox and idempotency guards.',
      },
      {
        id: 'opt-9-b',
        text: 'B) Manually restarting both database servers after every single quiz click.',
      },
      {
        id: 'opt-9-c',
        text: 'C) Ignoring sync entirely and letting data diverge indefinitely.',
      },
      {
        id: 'opt-9-d',
        text: 'D) Emailing an Excel attachment to the database administrator.',
      },
    ],
    correctOptionId: 'opt-9-a',
    explanation:
      'The transactional outbox pattern guarantees durable cross-store event synchronization.',
  },
  {
    id: 'q-10',
    number: 10,
    concept: 'Adaptive Gate Assessments',
    category: 'Curriculum Progression',
    points: 1.0,
    questionText:
      'What condition must be satisfied before an adaptive milestone "Gate Assessment" unlocks the subsequent pathway module?',
    options: [
      {
        id: 'opt-10-a',
        text: 'A) Reaching the minimum demonstrated competency threshold (e.g. >= 80% mastery) on gate criteria.',
      },
      {
        id: 'opt-10-b',
        text: 'B) Waiting a mandatory 30 calendar days regardless of score.',
      },
      {
        id: 'opt-10-c',
        text: 'C) Manually editing the browser CSS to unhide locked elements.',
      },
      {
        id: 'opt-10-d',
        text: 'D) Submitting blank answers to bypass all questions.',
      },
    ],
    correctOptionId: 'opt-10-a',
    explanation:
      'Gate assessments enforce mastery validation before advancing downstream in the competency graph.',
  },
]

export function AssessmentPage() {
  const { toast } = useToast()

  // State
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [flagged, setFlagged] = React.useState<Record<string, boolean>>({})
  const [isQuitModalOpen, setIsQuitModalOpen] = React.useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  // 25-minute live countdown timer (1500 seconds)
  const [secondsRemaining, setSecondsRemaining] = React.useState(1500)

  React.useEffect(() => {
    if (isSubmitted) return
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isSubmitted])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const currentQuestion = ASSESSMENT_QUESTIONS[currentIndex]
  const totalQuestions = ASSESSMENT_QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const flaggedCount = Object.values(flagged).filter(Boolean).length

  const handleSelectOption = (optionId: string) => {
    if (isSubmitted) return
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }))
  }

  const handleToggleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }))
    toast({
      title: flagged[currentQuestion.id] ? 'Question Unflagged' : 'Question Flagged for Review',
      description: `Question ${currentQuestion.number} marked for review.`,
      variant: 'info',
    })
  }

  const handleSaveProgress = () => {
    toast({
      title: 'Progress Saved',
      description: `${answeredCount} of ${totalQuestions} answers successfully synchronized.`,
      variant: 'success',
    })
  }

  const handleQuitConfirm = () => {
    toast({
      title: 'Session Ended',
      description: 'Assessment session closed. You can resume at any time.',
      variant: 'info',
    })
  }

  const handleSubmitAssessment = () => {
    setIsSubmitted(true)
    toast({
      title: 'Assessment Submitted',
      description: `Submitted ${answeredCount} / ${totalQuestions} questions for dynamic competency evaluation.`,
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16 assessment-page">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Platform Home', href: '/' },
            { label: 'Learner Portal', href: '/learner/pathway' },
            { label: 'Diagnostic Assessment Exam' },
          ]}
        />

        {/* Page Top Header with Title, Timer and Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5 bg-card p-5 rounded-xl border">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="primary">Adaptive Examination</Badge>
              <Badge variant="outline">AI Knowledge Architect</Badge>
            </div>
            <Heading level={1} size="page" className="mt-1 text-foreground flex items-center gap-2.5">
              <span>Diagnostic Assessment Quiz</span>
            </Heading>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Answer the following questions to evaluate knowledge gaps and update your dynamic competency graph.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer Card */}
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border font-mono transition-colors ${
                secondsRemaining < 300
                  ? 'bg-destructive/10 border-destructive text-destructive'
                  : 'bg-secondary/60 border-border text-foreground'
              }`}
            >
              <Clock className={`h-4 w-4 ${secondsRemaining < 300 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase font-sans font-semibold">
                  Time Remaining
                </div>
                <div className="text-base font-bold tracking-wider">
                  {formatTimer(secondsRemaining)}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={handleSaveProgress}
            >
              Save Progress
            </Button>
          </div>
        </div>

        {/* Main Grid: Left Quiz Navigation Sidebar + Right Question Body */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT: Quiz Navigation Palette */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quiz Navigation
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {answeredCount}/{totalQuestions} Answered
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Question Number Palette Grid */}
              <div className="quiz-nav-grid">
                {ASSESSMENT_QUESTIONS.map((q, idx) => {
                  const isAnswered = !!answers[q.id]
                  const isCurrent = idx === currentIndex
                  const isFlagged = !!flagged[q.id]

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`quiz-nav-btn ${isCurrent ? 'active' : ''} ${
                        isAnswered ? 'answered' : ''
                      } ${isFlagged ? 'flagged' : ''}`}
                      title={`Question ${q.number} - ${isAnswered ? 'Answered' : 'Not yet answered'}`}
                    >
                      <span className="text-xs">{q.number}</span>
                      {isAnswered && <Check className="h-3 w-3 text-success mt-0.5" />}
                    </button>
                  )
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-2 border-t border-border space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs border-2 border-primary bg-primary/10 inline-block" />
                  <span>Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-xs border border-success bg-success/20 inline-block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block ml-0.5" />
                  <span className="ml-0.5">Flagged for Review</span>
                </div>
              </div>

              {/* Quit / Finish Action Links */}
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={() => setIsSubmitModalOpen(true)}
                  disabled={isSubmitted}
                >
                  Finish Attempt...
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-muted-foreground hover:text-destructive text-xs"
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                  onClick={() => setIsQuitModalOpen(true)}
                >
                  Quit Session
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Question Content Card */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-base">
                      Question {currentQuestion.number}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion.category}
                    </Badge>
                    {flagged[currentQuestion.id] && (
                      <Badge variant="warning" className="text-xs flex items-center gap-1">
                        <Flag className="h-3 w-3" /> Flagged
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Marked out of {currentQuestion.points.toFixed(2)} &bull; Concept: {currentQuestion.concept}
                  </CardDescription>
                </div>

                {/* Flag Question Toggle */}
                <Button
                  variant={flagged[currentQuestion.id] ? 'secondary' : 'ghost'}
                  size="sm"
                  leftIcon={<Flag className={`h-4 w-4 ${flagged[currentQuestion.id] ? 'text-warning fill-warning' : ''}`} />}
                  onClick={handleToggleFlag}
                >
                  {flagged[currentQuestion.id] ? 'Flagged' : 'Flag Question'}
                </Button>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                {/* Question Prompt */}
                <div className="text-sm font-medium text-foreground leading-relaxed">
                  {currentQuestion.questionText}
                </div>

                {/* Optional Code Snippet */}
                {currentQuestion.codeSnippet && (
                  <div className="p-3.5 rounded-md bg-muted/60 border border-border font-mono text-xs text-foreground overflow-x-auto">
                    {currentQuestion.codeSnippet}
                  </div>
                )}

                {/* Answer Options (RadioGroup) */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Select one answer:
                  </span>

                  <RadioGroup
                    value={answers[currentQuestion.id] || ''}
                    onChange={handleSelectOption}
                    className="space-y-2.5"
                  >
                    {currentQuestion.options.map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt.id

                      return (
                        <label
                          key={opt.id}
                          htmlFor={opt.id}
                          className={`flex items-start space-x-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-secondary/50 font-medium text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          <div className="pt-0.5">
                            <RadioGroupItem id={opt.id} value={opt.id} />
                          </div>
                          <span className="leading-relaxed">{opt.text}</span>
                        </label>
                      )
                    })}
                  </RadioGroup>
                </div>

                {/* Question Footer Navigation Controls */}
                <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                  >
                    Previous Question
                  </Button>

                  <div className="text-xs text-muted-foreground font-medium">
                    Question {currentIndex + 1} of {totalQuestions}
                  </div>

                  {currentIndex < totalQuestions - 1 ? (
                    <Button
                      variant="primary"
                      size="default"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="default"
                      rightIcon={<Send className="h-4 w-4" />}
                      onClick={() => setIsSubmitModalOpen(true)}
                      disabled={isSubmitted}
                    >
                      Finish Attempt...
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SHARED CONFIRMATION MODAL 1: Quit Session */}
        <ConfirmationModal
          open={isQuitModalOpen}
          onOpenChange={setIsQuitModalOpen}
          title="Quit Assessment Session?"
          description="Are you sure you want to quit this session? Your current progress will be preserved and you can return later to complete unanswered questions."
          confirmText="Quit Session"
          cancelText="Continue Quiz"
          variant="warning"
          onConfirm={handleQuitConfirm}
        />

        {/* SHARED CONFIRMATION MODAL 2: Submit Assessment */}
        <ConfirmationModal
          open={isSubmitModalOpen}
          onOpenChange={setIsSubmitModalOpen}
          title="Submit Assessment Attempt?"
          description={`You have answered ${answeredCount} of ${totalQuestions} questions (${flaggedCount} flagged for review). Once submitted, answers are graded to calibrate your dynamic competency graph.`}
          confirmText="Submit & Calibrate"
          cancelText="Return to Questions"
          variant="primary"
          onConfirm={handleSubmitAssessment}
        />
      </div>
    </WorkspaceLayout>
  )
}
