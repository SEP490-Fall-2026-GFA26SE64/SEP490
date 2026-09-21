import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Award,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  CheckSquare,
  Clock,
  Compass,
  FileText,
  Flag,
  History,
  Layers,
  Lock,
  Play,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { Heading } from '../../../shared/components/typography/Heading'
import { Text } from '../../../shared/components/typography/Text'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { RadioGroup, RadioGroupItem } from '../../../shared/components/ui/RadioGroup'
import { Tabs, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import './AssessmentPage.css'

export interface Question {
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

export interface QuizAttempt {
  id: string
  attemptNumber: number
  moduleCode: string
  moduleTitle: string
  quizTitle: string
  date: string
  score: number // percentage 0-100
  correctCount: number
  totalQuestions: number
  timeTaken: string
  answers: Record<string, string>
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
      'Starting with an indexed anchor node restricts the search space before expanding traversal hops.',
  },
  {
    id: 'q-3',
    number: 3,
    concept: 'Dynamic Knowledge Tracing (DKT)',
    category: 'Learner Modeling',
    points: 1.0,
    questionText:
      'How does an LSTM-based Dynamic Knowledge Tracing architecture model continuous student mastery over time compared to traditional Bayesian Knowledge Tracing (BKT)?',
    options: [
      {
        id: 'opt-3-a',
        text: 'A) Encodes complex non-linear inter-concept dependencies within recurrent hidden state vectors without requiring rigid discrete Markov state hand-crafting.',
      },
      {
        id: 'opt-3-b',
        text: 'B) Assumes all skills are completely independent and learned instantaneously without forgetting.',
      },
      {
        id: 'opt-3-c',
        text: 'C) Discards prior responses after each submitted quiz question.',
      },
      {
        id: 'opt-3-d',
        text: 'D) Uses an unweighted majority vote of previous binary correctness scores.',
      },
    ],
    correctOptionId: 'opt-3-a',
    explanation:
      'DKT uses recurrent neural networks to capture latent knowledge transitions and cross-skill transfer.',
  },
  {
    id: 'q-4',
    number: 4,
    concept: 'RDF / OWL Semantic Ontologies',
    category: 'Knowledge Representation',
    points: 1.0,
    questionText:
      'In W3C OWL 2 Web Ontology Language, which axiom type formally declares that mastery of "Advanced Machine Learning" strictly implies mastery of its prerequisite "Linear Algebra"?',
    codeSnippet: ':AdvancedML rdfs:subClassOf [ a owl:Restriction ; owl:onProperty :hasPrerequisite ; owl:someValuesFrom :LinearAlgebra ]',
    options: [
      {
        id: 'opt-4-a',
        text: 'A) Existential property restriction (owl:someValuesFrom) defining necessary subclass conditions.',
      },
      {
        id: 'opt-4-b',
        text: 'B) Deprecated owl:distinctMembers list applied to unrelated literals.',
      },
      {
        id: 'opt-4-c',
        text: 'C) Anonymous bNode without predicate declaration or semantic entailment.',
      },
      {
        id: 'opt-4-d',
        text: 'D) XML Schema string regex assertion ignoring graph ontology triples.',
      },
    ],
    correctOptionId: 'opt-4-a',
    explanation:
      'Existential restrictions specify that any instance of the class must participate in the prerequisite relationship.',
  },
  {
    id: 'q-5',
    number: 5,
    concept: 'Kafka Stream Processing',
    category: 'Event-Driven Systems',
    points: 1.0,
    questionText:
      'To guarantee that learner quiz events update a specific learner node in Neo4j without out-of-order race conditions, what partition key strategy should be configured for the Kafka event producer?',
    options: [
      {
        id: 'opt-5-a',
        text: 'A) Use learnerId as the message partition key to guarantee strict per-learner FIFO ordering.',
      },
      {
        id: 'opt-5-b',
        text: 'B) Use random UUIDs for every message key to uniformly scatter events across all partitions.',
      },
      {
        id: 'opt-5-c',
        text: 'C) Omit the key entirely so Kafka defaults to round-robin partition distribution.',
      },
      {
        id: 'opt-5-d',
        text: 'D) Hash the client browser user-agent header string.',
      },
    ],
    correctOptionId: 'opt-5-a',
    explanation:
      'Messages with identical partition keys are guaranteed to land on the same Kafka partition in order.',
  },
  {
    id: 'q-6',
    number: 6,
    concept: 'Bayesian Knowledge Tracing (BKT)',
    category: 'Learner Modeling',
    points: 1.0,
    questionText:
      'Which standard BKT parameter accounts for the probability that a learner who has NOT mastered a skill still answers a diagnostic question correctly by chance?',
    options: [
      {
        id: 'opt-6-a',
        text: 'A) Guess parameter (P(G))',
      },
      {
        id: 'opt-6-b',
        text: 'B) Slip parameter (P(S))',
      },
      {
        id: 'opt-6-c',
        text: 'C) Transit parameter (P(T))',
      },
      {
        id: 'opt-6-d',
        text: 'D) Prior mastery parameter (P(L0))',
      },
    ],
    correctOptionId: 'opt-6-a',
    explanation:
      'P(G) is the guess probability: answering correctly despite not possessing mastery.',
  },
  {
    id: 'q-7',
    number: 7,
    concept: 'Adaptive Graph Remediation',
    category: 'Adaptive Learning Pathways',
    points: 1.0,
    questionText:
      'When a learner fails a competency gate assessment, how does the Knowledge Graph recommendation engine formulate an optimal remedial pathway?',
    options: [
      {
        id: 'opt-7-a',
        text: 'A) Traverses upstream incoming :PREREQUISITE_OF edges to identify unmastered root-cause concepts.',
      },
      {
        id: 'opt-7-b',
        text: 'B) Assigns random courses from unrelated departments.',
      },
      {
        id: 'opt-7-c',
        text: 'C) Locks the learner account permanently.',
      },
      {
        id: 'opt-7-d',
        text: 'D) Re-runs the identical assessment immediately without updating mastery state.',
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

export const MODULE_OPTIONS = [
  { code: 'MOD-101', title: 'Foundations of Knowledge Graphs & RDF Triples' },
  { code: 'MOD-204', title: 'Property Graph Architecture with Neo4j & Cypher' },
  { code: 'MOD-301', title: 'Graph Neural Networks & Node Embeddings (Fast-Track)' },
  { code: 'MOD-305', title: 'Adaptive Knowledge Tracing Engine Implementation' },
  { code: 'MOD-401', title: 'Enterprise Competency Intelligence Platform Capstone' },
]

// Seed initial finished attempts across multiple modules so history displays cross-module attempts
const INITIAL_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-mod301-1',
    attemptNumber: 1,
    moduleCode: 'MOD-301',
    moduleTitle: 'Graph Neural Networks & Node Embeddings (Fast-Track)',
    quizTitle: 'Milestone Assessment: Graph Neural Networks & Node Embeddings',
    date: '2026-09-19 16:20',
    score: 70,
    correctCount: 7,
    totalQuestions: 10,
    timeTaken: '24m 00s',
    answers: {
      'q-1': 'opt-1-a',
      'q-2': 'opt-2-b',
      'q-3': 'opt-3-a',
      'q-4': 'opt-4-c',
      'q-5': 'opt-5-a',
      'q-6': 'opt-6-a',
      'q-7': 'opt-7-b',
      'q-8': 'opt-8-a',
      'q-9': 'opt-9-a',
      'q-10': 'opt-10-a',
    },
  },
  {
    id: 'att-mod204-2',
    attemptNumber: 2,
    moduleCode: 'MOD-204',
    moduleTitle: 'Property Graph Architecture with Neo4j & Cypher',
    quizTitle: 'Milestone Assessment: Neo4j Cypher Optimization & Schema',
    date: '2026-09-18 11:25',
    score: 90,
    correctCount: 9,
    totalQuestions: 10,
    timeTaken: '16m 50s',
    answers: {
      'q-1': 'opt-1-a',
      'q-2': 'opt-2-a',
      'q-3': 'opt-3-a',
      'q-4': 'opt-4-a',
      'q-5': 'opt-5-a',
      'q-6': 'opt-6-a',
      'q-7': 'opt-7-b',
      'q-8': 'opt-8-a',
      'q-9': 'opt-9-a',
      'q-10': 'opt-10-a',
    },
  },
  {
    id: 'att-mod204-1',
    attemptNumber: 1,
    moduleCode: 'MOD-204',
    moduleTitle: 'Property Graph Architecture with Neo4j & Cypher',
    quizTitle: 'Milestone Assessment: Neo4j Cypher Optimization & Schema',
    date: '2026-09-17 09:40',
    score: 70,
    correctCount: 7,
    totalQuestions: 10,
    timeTaken: '22m 15s',
    answers: {
      'q-1': 'opt-1-a',
      'q-2': 'opt-2-b',
      'q-3': 'opt-3-a',
      'q-4': 'opt-4-a',
      'q-5': 'opt-5-b',
      'q-6': 'opt-6-a',
      'q-7': 'opt-7-b',
      'q-8': 'opt-8-a',
      'q-9': 'opt-9-a',
      'q-10': 'opt-10-a',
    },
  },
  {
    id: 'att-mod101-2',
    attemptNumber: 2,
    moduleCode: 'MOD-101',
    moduleTitle: 'Foundations of Knowledge Graphs & RDF Triples',
    quizTitle: 'Milestone Assessment: RDF Triples & SPARQL Basics',
    date: '2026-09-15 14:32',
    score: 92,
    correctCount: 9,
    totalQuestions: 10,
    timeTaken: '15m 10s',
    answers: {
      'q-1': 'opt-1-a',
      'q-2': 'opt-2-a',
      'q-3': 'opt-3-a',
      'q-4': 'opt-4-a',
      'q-5': 'opt-5-a',
      'q-6': 'opt-6-a',
      'q-7': 'opt-7-b',
      'q-8': 'opt-8-a',
      'q-9': 'opt-9-a',
      'q-10': 'opt-10-a',
    },
  },
  {
    id: 'att-mod101-1',
    attemptNumber: 1,
    moduleCode: 'MOD-101',
    moduleTitle: 'Foundations of Knowledge Graphs & RDF Triples',
    quizTitle: 'Milestone Assessment: RDF Triples & SPARQL Basics',
    date: '2026-09-14 10:15',
    score: 65,
    correctCount: 6,
    totalQuestions: 10,
    timeTaken: '18m 45s',
    answers: {
      'q-1': 'opt-1-a',
      'q-2': 'opt-2-b',
      'q-3': 'opt-3-a',
      'q-4': 'opt-4-c',
      'q-5': 'opt-5-b',
      'q-6': 'opt-6-a',
      'q-7': 'opt-7-b',
      'q-8': 'opt-8-a',
      'q-9': 'opt-9-b',
      'q-10': 'opt-10-a',
    },
  },
]

export interface PathwayQuiz {
  id: string
  moduleCode: string
  moduleTitle: string
  quizTitle: string
  description: string
  status: 'completed' | 'available' | 'locked'
  durationMinutes: number
  questionCount: number
  passingScore: number // percentage
  prerequisite?: string
  lastScore?: number
  skills: string[]
}

const PATHWAY_QUIZZES: PathwayQuiz[] = [
  {
    id: 'quiz-mod-101',
    moduleCode: 'MOD-101',
    moduleTitle: 'Foundations of Knowledge Graphs & RDF Triples',
    quizTitle: 'Milestone Assessment: RDF Triples & SPARQL Basics',
    description:
      'Validates semantic modeling proficiency, SPARQL pattern matching, and ontology namespace structuring.',
    status: 'completed',
    durationMinutes: 20,
    questionCount: 10,
    passingScore: 80,
    lastScore: 92,
    skills: ['RDF Data Model', 'SPARQL Query Basics', 'Graph Ontologies'],
  },
  {
    id: 'quiz-mod-204',
    moduleCode: 'MOD-204',
    moduleTitle: 'Property Graph Architecture with Neo4j & Cypher',
    quizTitle: 'Milestone Assessment: Neo4j Cypher Optimization & Schema',
    description:
      'Evaluates index-constrained BFS traversal, Cypher execution plans, and property graph data integrity.',
    status: 'completed',
    durationMinutes: 25,
    questionCount: 10,
    passingScore: 80,
    lastScore: 90,
    skills: ['Neo4j Cypher', 'Index Optimization', 'Schema Constraints'],
  },
  {
    id: 'quiz-mod-301',
    moduleCode: 'MOD-301',
    moduleTitle: 'Graph Neural Networks & Node Embeddings (Fast-Track)',
    quizTitle: 'Milestone Assessment: Graph Neural Networks & Node Embeddings',
    description:
      'Comprehensive evaluation covering Spatial GCN convolution, Neo4j prerequisite traversals, Dynamic Knowledge Tracing (DKT), and Kafka event partitioning.',
    status: 'available', // Available because learner finished MOD-204!
    durationMinutes: 25,
    questionCount: 10,
    passingScore: 80,
    skills: [
      'Spatial GCN Convolution',
      'Dynamic Knowledge Tracing',
      'Vector Cosine Similarity',
      'Kafka Stream Ordering',
    ],
  },
  {
    id: 'quiz-mod-305',
    moduleCode: 'MOD-305',
    moduleTitle: 'Adaptive Knowledge Tracing Engine Implementation',
    quizTitle: 'Milestone Assessment: DKT Engine Calibration & Skill Modeling',
    description:
      'Advanced assessment on recurrent student mastery state transitions, slip/guess parameter calibration, and real-time gap routing.',
    status: 'locked',
    durationMinutes: 30,
    questionCount: 12,
    passingScore: 80,
    prerequisite: 'Complete Module MOD-301: Graph Neural Networks & Node Embeddings',
    skills: ['DKT LSTM Modeling', 'Bayesian Knowledge Tracing', 'Hidden Markov Models'],
  },
  {
    id: 'quiz-mod-401',
    moduleCode: 'MOD-401',
    moduleTitle: 'Enterprise Competency Intelligence Platform Capstone',
    quizTitle: 'Capstone Gateway Defense: End-to-End Competency Platform',
    description:
      'Final defense validating end-to-end competency inference, transactional outbox CQRS consistency, and organizational ROI projection pipelines.',
    status: 'locked',
    durationMinutes: 40,
    questionCount: 15,
    passingScore: 85,
    prerequisite: 'Complete Module MOD-305: Adaptive Knowledge Tracing Engine Implementation',
    skills: [
      'Full-stack Knowledge Graph Integration',
      'Enterprise Graph Scalability',
      'Competency Inference',
    ],
  },
]

export function AssessmentPage() {
  const { toast } = useToast()

  // Navigation tab state: 'upcoming' | 'history'
  const [activeTab, setActiveTab] = React.useState<'upcoming' | 'history'>('upcoming')

  // Available Quiz Info Modal state
  const [selectedQuizModal, setSelectedQuizModal] = React.useState<PathwayQuiz | null>(null)

  // Taking quiz session state
  const [isTakingQuiz, setIsTakingQuiz] = React.useState(false)

  // Attempt review state: null = taking quiz, string = reviewing specific attempt
  const [reviewAttemptId, setReviewAttemptId] = React.useState<string | null>(null)
  const [attempts, setAttempts] = React.useState<QuizAttempt[]>(INITIAL_ATTEMPTS)

  // Active Quiz State
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [flagged, setFlagged] = React.useState<Record<string, boolean>>({})
  const [isQuitModalOpen, setIsQuitModalOpen] = React.useState(false)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  // 25-minute live countdown timer (1500 seconds)
  const [secondsRemaining, setSecondsRemaining] = React.useState(1500)

  React.useEffect(() => {
    if (isSubmitted || reviewAttemptId !== null) return
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
  }, [isSubmitted, reviewAttemptId])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Active question context
  const currentQuestion = ASSESSMENT_QUESTIONS[currentIndex]
  const totalQuestions = ASSESSMENT_QUESTIONS.length

  // Reviewing attempt context
  const reviewingAttempt = reviewAttemptId
    ? attempts.find((a) => a.id === reviewAttemptId) || null
    : null
  const isReviewMode = reviewingAttempt !== null

  // Active answers to display (either the review attempt's answers or current quiz's answers)
  const activeAnswers = isReviewMode ? reviewingAttempt.answers : answers
  const answeredCount = Object.keys(activeAnswers).length
  const unansweredCount = totalQuestions - answeredCount
  const flaggedCount = Object.values(flagged).filter(Boolean).length

  // Upcoming tab status filter state ('all' | 'available' | 'completed' | 'locked')
  const [upcomingStatusFilter, setUpcomingStatusFilter] = React.useState<'all' | 'available' | 'completed' | 'locked'>('all')

  // History tab search, filter & sort state
  const [historySearch, setHistorySearch] = React.useState('')
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'passed' | 'failed'>('all')
  const [historySort, setHistorySort] = React.useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = React.useState(false)
  const searchRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredAttempts = React.useMemo(() => {
    return attempts
      .filter((a) => {
        if (historySearch.trim()) {
          const q = historySearch.toLowerCase().trim()
          const matchesCode = a.moduleCode.toLowerCase().includes(q)
          const matchesTitle = a.moduleTitle.toLowerCase().includes(q)
          const matchesCombined = `${a.moduleCode}: ${a.moduleTitle}`.toLowerCase().includes(q)
          const matchesQuiz = a.quizTitle.toLowerCase().includes(q)
          const matchesDate = a.date.toLowerCase().includes(q)
          if (!matchesCode && !matchesTitle && !matchesCombined && !matchesQuiz && !matchesDate) return false
        }
        if (historyFilter === 'passed' && a.score < 80) return false
        if (historyFilter === 'failed' && a.score >= 80) return false
        return true
      })
      .sort((a, b) => {
        if (historySort === 'newest') return new Date(b.date.replace(' ', 'T')).getTime() - new Date(a.date.replace(' ', 'T')).getTime()
        if (historySort === 'oldest') return new Date(a.date.replace(' ', 'T')).getTime() - new Date(b.date.replace(' ', 'T')).getTime()
        if (historySort === 'highest') return b.score - a.score
        if (historySort === 'lowest') return a.score - b.score
        return 0
      })
  }, [attempts, historySearch, historyFilter, historySort])

  // Handle active option selection
  const handleSelectOption = (optionId: string) => {
    if (isSubmitted || isReviewMode) return
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }))
  }

  // Handle flag toggle
  const handleToggleFlag = () => {
    if (isReviewMode) return
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

  // Submit assessment attempt & enter Review Mode
  const handleSubmitAssessment = () => {
    let correct = 0
    ASSESSMENT_QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correctOptionId) {
        correct++
      }
    })

    const scorePct = Math.round((correct / totalQuestions) * 100)
    const newAttempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      attemptNumber: attempts.length + 1,
      moduleCode: 'MOD-301',
      moduleTitle: 'Graph Neural Networks & Node Embeddings (Fast-Track)',
      quizTitle: 'Milestone Assessment: Graph Neural Networks & Node Embeddings',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      score: scorePct,
      correctCount: correct,
      totalQuestions,
      timeTaken: formatTimer(1500 - secondsRemaining),
      answers: { ...answers },
    }

    setAttempts((prev) => [newAttempt, ...prev])
    setIsSubmitted(true)
    setReviewAttemptId(newAttempt.id)
    setCurrentIndex(0)

    toast({
      title: `Assessment Completed: ${scorePct}%`,
      description: `You got ${correct} of ${totalQuestions} correct. You are now in Review Mode to inspect your answers.`,
      variant: scorePct >= 80 ? 'success' : 'warning',
    })
  }

  // Start fresh attempt from review screen
  const handleStartNewAttempt = () => {
    setAnswers({})
    setFlagged({})
    setSecondsRemaining(1500)
    setIsSubmitted(false)
    setReviewAttemptId(null)
    setCurrentIndex(0)
    setIsTakingQuiz(true)
    toast({
      title: 'New Attempt Started',
      description: 'Timer restarted. Good luck on your diagnostic assessment!',
      variant: 'info',
    })
  }

  // Start quiz from Upcoming modal
  const handleStartQuizFromModal = () => {
    setAnswers({})
    setFlagged({})
    setSecondsRemaining(1500)
    setIsSubmitted(false)
    setReviewAttemptId(null)
    setCurrentIndex(0)
    setIsTakingQuiz(true)
    setSelectedQuizModal(null)
    toast({
      title: 'Assessment Started',
      description: '25-minute countdown is running. Good luck!',
      variant: 'info',
    })
  }

  const isQuizViewActive = isTakingQuiz || isReviewMode

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16 assessment-page">

        {/* =========================================================================
            ACTIVE QUIZ OR REVIEW MODE VIEW
           ========================================================================= */}
        {isQuizViewActive ? (
          <div className="space-y-6">
            {/* Top Navigation Bar: Back to Quizzes */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => {
                  if (isTakingQuiz && !isSubmitted && !isReviewMode && Object.keys(answers).length > 0) {
                    setIsQuitModalOpen(true)
                  } else {
                    setIsTakingQuiz(false)
                    setReviewAttemptId(null)
                  }
                }}
              >
                Back to {isReviewMode ? 'Finished Attempts' : 'Upcoming Quizzes'}
              </Button>

              <div className="flex items-center gap-2">
                {isReviewMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={handleStartNewAttempt}
                  >
                    Retake Assessment
                  </Button>
                )}
              </div>
            </div>

            {/* REVIEW MODE ALERT BANNER */}
            {isReviewMode && reviewingAttempt && (
              <div className="p-4 rounded-xl border border-primary/30 bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-card border border-border text-primary shrink-0 shadow-xs">
                    <Award className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm text-foreground">
                        {reviewingAttempt.moduleCode}: {reviewingAttempt.moduleTitle}
                      </strong>
                      <Badge
                        variant={reviewingAttempt.score >= 80 ? 'success' : 'destructive'}
                      >
                        {reviewingAttempt.score >= 80 ? 'Passed' : 'Failed'} ({reviewingAttempt.score}%) &bull; {reviewingAttempt.correctCount}/{reviewingAttempt.totalQuestions} Correct
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Completed: {reviewingAttempt.date} &bull; Time: {reviewingAttempt.timeTaken}
                      </span>
                    </div>
                    <Text variant="caption" className="mt-0.5">
                      Review each question below: Correct answers are marked with <strong>✓</strong> and wrong answers are marked with <strong>✗</strong>.
                    </Text>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<History className="h-3.5 w-3.5" />}
                    onClick={() => {
                      setIsTakingQuiz(false)
                      setReviewAttemptId(null)
                      setActiveTab('history')
                    }}
                  >
                    All Attempts
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={handleStartNewAttempt}
                  >
                    New Attempt
                  </Button>
                </div>
              </div>
            )}

            {/* Quiz Top Header with Title and Status */}
            {!isReviewMode && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs font-semibold text-primary">
                      MOD-301 Milestone Quiz
                    </Badge>
                    <span className="text-xs text-muted-foreground">Spatial Convolution &amp; DKT</span>
                  </div>
                  <Heading level={1} size="page" className="text-foreground flex items-center gap-2.5">
                    <span>Module Assessment Quiz</span>
                  </Heading>
                  <Text variant="subtitle" className="mt-0.5">
                    Evaluate your module mastery to advance along your adaptive learning pathway.
                  </Text>
                </div>

                <div className="flex items-center gap-3">
                  {/* Live Countdown Timer */}
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
                </div>
              </div>
            )}

            {/* Main Grid: Left Quiz Navigation Sidebar + Right Question Body */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* LEFT: Quiz Navigation Palette */}
              <Card className="lg:col-span-1 shadow-sm border-border">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isReviewMode ? 'Review Navigation' : 'Quiz Navigation'}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {isReviewMode && reviewingAttempt
                        ? `${reviewingAttempt.correctCount}/${totalQuestions} Correct`
                        : `${answeredCount}/${totalQuestions} Answered`}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Question Number Palette Grid */}
                  <div className="quiz-nav-grid">
                    {ASSESSMENT_QUESTIONS.map((q, idx) => {
                      const isCurrent = idx === currentIndex
                      const userChoice = activeAnswers[q.id]
                      const isAnswered = !!userChoice
                      const isCorrect = userChoice === q.correctOptionId
                      const isFlagged = !isReviewMode && !!flagged[q.id]

                      let btnClass = 'quiz-nav-btn'
                      if (isCurrent) btnClass += ' active'

                      if (isReviewMode) {
                        if (isCorrect) {
                          btnClass += ' review-correct'
                        } else {
                          btnClass += ' review-wrong'
                        }
                      } else {
                        if (isAnswered) btnClass += ' answered'
                        if (isFlagged) btnClass += ' flagged'
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          className={btnClass}
                          onClick={() => setCurrentIndex(idx)}
                          title={`Question ${q.number}: ${q.concept} ${
                            isReviewMode ? (isCorrect ? '(Correct ✓)' : '(Incorrect ✗)') : ''
                          }`}
                        >
                          <span>{q.number}</span>
                          {isReviewMode && (
                            <span className="text-[10px] font-bold">
                              {isCorrect ? '✓' : '✗'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="pt-3 border-t border-border space-y-2 text-xs text-muted-foreground">
                    {!isReviewMode ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded border border-primary bg-secondary inline-block" />
                          <span>Answered ({answeredCount})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded border border-border bg-card inline-block" />
                          <span>Unanswered ({totalQuestions - answeredCount})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded border border-warning bg-warning/20 inline-block relative">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning absolute top-0.5 right-0.5" />
                          </span>
                          <span>Flagged ({flaggedCount})</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-success font-medium">
                          <span className="w-3.5 h-3.5 rounded border border-success bg-success/20 flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                          <span>Correct Answer</span>
                        </div>
                        <div className="flex items-center gap-2 text-destructive font-medium">
                          <span className="w-3.5 h-3.5 rounded border border-destructive bg-destructive/20 flex items-center justify-center text-[10px] font-bold">
                            ✗
                          </span>
                          <span>Incorrect Answer</span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isReviewMode && (
                    <div className="pt-3 space-y-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-center"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveProgress}
                      >
                        Save Progress
                      </Button>
                      <Button
                        variant="primary"
                        size="default"
                        className="w-full justify-center shadow-xs"
                        rightIcon={<Send className="h-4 w-4" />}
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={isSubmitted}
                      >
                        Finish Attempt
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RIGHT: Active Question Workspace */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-4 border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-semibold text-primary">
                            Question {currentQuestion.number} of {totalQuestions}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {currentQuestion.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {currentQuestion.points.toFixed(1)} pt(s)
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-foreground mt-1">
                          {currentQuestion.concept}
                        </h3>
                      </div>

                      {!isReviewMode && (
                        <Button
                          variant={flagged[currentQuestion.id] ? 'secondary' : 'ghost'}
                          size="sm"
                          leftIcon={
                            <Flag
                              className={`h-4 w-4 ${
                                flagged[currentQuestion.id] ? 'text-warning fill-warning' : 'text-muted-foreground'
                              }`}
                            />
                          }
                          onClick={handleToggleFlag}
                        >
                          {flagged[currentQuestion.id] ? 'Flagged' : 'Flag for Review'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6 space-y-6">
                    {/* Question Statement */}
                    <div className="space-y-3">
                      <Text variant="body" className="text-foreground text-base leading-relaxed">
                        {currentQuestion.questionText}
                      </Text>

                      {currentQuestion.codeSnippet && (
                        <div className="p-3.5 rounded-lg bg-muted/60 border border-border font-mono text-xs text-foreground overflow-x-auto">
                          <code>{currentQuestion.codeSnippet}</code>
                        </div>
                      )}
                    </div>

                    {/* Options (RadioGroup in active quiz mode vs evaluated boxes in review mode) */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Select Best Response:
                      </div>

                      {!isReviewMode ? (
                        <RadioGroup
                          value={activeAnswers[currentQuestion.id] || ''}
                          onChange={handleSelectOption}
                          className="space-y-2.5"
                        >
                          {currentQuestion.options.map((opt) => {
                            const isSelected = activeAnswers[currentQuestion.id] === opt.id
                            return (
                              <label
                                key={opt.id}
                                htmlFor={opt.id}
                                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary bg-secondary/50 font-medium'
                                    : 'border-border bg-card hover:bg-muted/40'
                                }`}
                              >
                                <RadioGroupItem value={opt.id} id={opt.id} className="mt-0.5 shrink-0" />
                                <span className="text-sm leading-relaxed">{opt.text}</span>
                              </label>
                            )
                          })}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2.5">
                          {currentQuestion.options.map((opt) => {
                            const isUserSelected = activeAnswers[currentQuestion.id] === opt.id
                            const isCorrectAnswer = opt.id === currentQuestion.correctOptionId

                            let containerStyle = 'border-border bg-card text-muted-foreground'
                            let badge: React.ReactNode = null

                            if (isUserSelected && isCorrectAnswer) {
                              containerStyle = 'border-success bg-success/10 text-success font-medium'
                              badge = (
                                <Badge variant="outline" className="text-[11px] text-success border-success gap-1 shrink-0 font-semibold">
                                  <Check className="h-3 w-3" /> Correct Choice
                                </Badge>
                              )
                            } else if (isUserSelected && !isCorrectAnswer) {
                              containerStyle = 'border-destructive bg-destructive/10 text-destructive font-medium'
                              badge = (
                                <Badge variant="outline" className="text-[11px] text-destructive border-destructive gap-1 shrink-0 font-semibold">
                                  <X className="h-3 w-3" /> Your Answer (Incorrect)
                                </Badge>
                              )
                            } else if (!isUserSelected && isCorrectAnswer) {
                              containerStyle = 'border-success/60 bg-success/5 text-foreground font-medium'
                              badge = (
                                <Badge variant="outline" className="text-[11px] text-success border-success gap-1 shrink-0 font-semibold">
                                  <Check className="h-3 w-3" /> Correct Answer
                                </Badge>
                              )
                            }

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-start justify-between p-3.5 rounded-lg border text-sm transition-colors gap-3 ${containerStyle}`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="pt-0.5 shrink-0">
                                    {isUserSelected && isCorrectAnswer && (
                                      <CheckCircle2 className="h-4 w-4 text-success" />
                                    )}
                                    {isUserSelected && !isCorrectAnswer && (
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    {!isUserSelected && isCorrectAnswer && (
                                      <Check className="h-4 w-4 text-success" />
                                    )}
                                    {!isUserSelected && !isCorrectAnswer && (
                                      <span className="w-4 h-4 rounded-full border border-border inline-block" />
                                    )}
                                  </span>
                                  <span className="leading-relaxed">{opt.text}</span>
                                </div>
                                {badge}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Review Mode Concept Explanation & Learning Bridge */}
                    {isReviewMode && (
                      <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wide">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span>Ontology Concept Explanation</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {currentQuestion.explanation}
                        </p>
                        {activeAnswers[currentQuestion.id] !== currentQuestion.correctOptionId && (
                          <div className="pt-1 text-xs text-primary font-medium flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Recommended Prerequisite Remediation: MOD-204 ({currentQuestion.concept})</span>
                          </div>
                        )}
                      </div>
                    )}

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
                      ) : !isReviewMode ? (
                        <Button
                          variant="primary"
                          size="default"
                          rightIcon={<Send className="h-4 w-4" />}
                          onClick={() => setIsSubmitModalOpen(true)}
                          disabled={isSubmitted}
                        >
                          Finish Attempt...
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="default"
                          leftIcon={<History className="h-4 w-4" />}
                          onClick={() => {
                            setIsTakingQuiz(false)
                            setReviewAttemptId(null)
                            setActiveTab('history')
                          }}
                        >
                          View All Attempts
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
              UPCOMING & HISTORY TABS VIEW
             ========================================================================= */
          <div className="space-y-6">
            {/* View Mode Navigation Tabs: Upcoming vs History */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <Tabs
                value={activeTab}
                onValueChange={(val) => {
                  setActiveTab(val as 'upcoming' | 'history')
                }}
                className="w-auto"
              >
                <TabsList className="bg-muted/70 p-1">
                  <TabsTrigger value="upcoming" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Upcoming Milestone Quizzes</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold data-[state=active]:bg-card">
                    <History className="h-4 w-4 text-primary" />
                    <span>Attempt History ({attempts.length})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* TAB 1: UPCOMING ASSESSMENTS (2-COLUMN COCKPIT LAYOUT) */}
            {activeTab === 'upcoming' && (() => {
              const availableQuizzes = PATHWAY_QUIZZES.filter((q) => q.status === 'available')
              const completedQuizzes = PATHWAY_QUIZZES.filter((q) => q.status === 'completed')
              const lockedQuizzes = PATHWAY_QUIZZES.filter((q) => q.status === 'locked')
              const nextQuiz = availableQuizzes[0] || PATHWAY_QUIZZES[0]
              const filteredUpcomingQuizzes = PATHWAY_QUIZZES.filter(
                (q) => upcomingStatusFilter === 'all' || q.status === upcomingStatusFilter
              )

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* LEFT COLUMN: Hero Milestone Card & Unified Adaptive Timeline Big Container (lg:col-span-8) */}
                  <div className="lg:col-span-8 space-y-5">
                    {/* 1. Hero Milestone Progress Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-xs">
                      <div className="relative z-10 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                              <Sparkles className="h-3.5 w-3.5" />
                              Dynamic Pathway Quizzes
                            </span>
                            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                              End-of-Module Evaluations
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="text-muted-foreground">Milestone Progress:</span>
                            <Badge variant="success" className="font-mono text-xs font-bold">
                              2 of 5 Cleared (40%)
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <Heading level={1} size="page" className="text-foreground tracking-tight text-xl sm:text-2xl font-bold">
                            Upcoming Pathway Quizzes
                          </Heading>
                          <Text variant="subtitle" className="mt-1 text-muted-foreground max-w-2xl leading-relaxed text-xs sm:text-sm">
                            Milestone assessment quizzes unlock sequentially as you finish each module in your Adaptive Learning Pathway. Passing each quiz calibrates knowledge tracing and unlocks the next module.
                          </Text>
                        </div>

                        {/* Pathway Sequential Progress Step Bar */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5 flex-wrap gap-1">
                            <span className="text-success font-bold">MOD-101 (RDF) ✓</span>
                            <span className="text-success font-bold">MOD-204 (Neo4j) ✓</span>
                            <span className="text-primary font-bold flex items-center gap-1">
                              <Sparkles size={11} /> MOD-301 (GNN) • Ready
                            </span>
                            <span className="text-foreground font-bold flex items-center gap-1">
                              <Lock size={11} className="text-muted-foreground" /> MOD-305 (DKT)
                            </span>
                            <span className="text-foreground font-bold flex items-center gap-1">
                              <Lock size={11} className="text-muted-foreground" /> MOD-401 (Capstone)
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5 h-2 w-full rounded-full overflow-hidden bg-muted/80 p-0.5">
                            <div className="bg-success rounded-full" title="MOD-101: Passed (92%)" />
                            <div className="bg-success rounded-full" title="MOD-204: Passed (90%)" />
                            <div className="bg-primary rounded-full animate-pulse" title="MOD-301: Ready to Take" />
                            <div className="bg-muted-foreground/50 rounded-full" title="MOD-305: Locked" />
                            <div className="bg-muted-foreground/50 rounded-full" title="MOD-401: Locked" />
                          </div>
                        </div>
                      </div>

                      {/* Ambient decorative glow */}
                      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                    </div>

                    {/* 2. ADAPTIVE TIMELINE (SINGLE BIG UNIFIED CONTAINER) */}
                    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                      {/* Big Container Header: Title, Summary & Status Filters */}
                      <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary shrink-0" />
                            <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                              Adaptive Pathway Timeline
                            </h2>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Sequential milestone evaluations calibrated to your demonstrated competency
                          </p>
                        </div>

                        {/* Interactive Filter Pills Integrated into the Header */}
                        <div className="flex items-center gap-1 flex-wrap p-1 rounded-xl bg-card border border-border shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setUpcomingStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              upcomingStatusFilter === 'all'
                                ? 'bg-secondary text-primary shadow-2xs font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            All ({PATHWAY_QUIZZES.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => setUpcomingStatusFilter('available')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              upcomingStatusFilter === 'available'
                                ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Ready ({availableQuizzes.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setUpcomingStatusFilter('completed')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              upcomingStatusFilter === 'completed'
                                ? 'bg-success/15 text-success font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Done ({completedQuizzes.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setUpcomingStatusFilter('locked')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              upcomingStatusFilter === 'locked'
                                ? 'bg-foreground text-background font-bold shadow-2xs'
                                : 'text-foreground/80 hover:text-foreground hover:bg-muted/70 font-medium'
                            }`}
                          >
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            <span>Locked ({lockedQuizzes.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Big Container Body: Continuous Adaptive Timeline Track */}
                      <div className="p-5 sm:p-7 relative">
                        <div className="relative">
                          {/* Continuous Vertical Timeline Line */}
                          <div className="absolute left-[19px] sm:left-[21px] top-6 bottom-8 w-0.5 bg-border -translate-x-1/2 z-0" />

                          <div className="space-y-6">
                            {filteredUpcomingQuizzes.map((quiz) => {
                              const isAvailable = quiz.status === 'available'
                              const isLocked = quiz.status === 'locked'
                              const isCompleted = quiz.status === 'completed'

                              return (
                                <div key={quiz.id} className="relative flex items-start gap-3.5 sm:gap-5 group">
                                  {/* Timeline Node Bullet Pin */}
                                  <div
                                    className={`relative z-10 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                                      isCompleted
                                        ? 'border-success bg-success text-white shadow-2xs'
                                        : isAvailable
                                          ? 'border-primary bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/20 animate-pulse'
                                          : 'border-border bg-muted text-foreground'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                    ) : isAvailable ? (
                                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                                    ) : (
                                      <Lock className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
                                    )}
                                  </div>

                                  {/* Timeline Step Content Surface Panel */}
                                  <div
                                    className={`flex-1 min-w-0 rounded-xl p-4 sm:p-5 border transition-all ${
                                      isAvailable
                                        ? 'border-primary/50 bg-secondary/35 shadow-xs ring-1 ring-primary/25 cursor-pointer hover:border-primary'
                                        : isCompleted
                                          ? 'border-border bg-card hover:border-success/50 shadow-2xs'
                                          : 'border-border bg-muted/20'
                                    }`}
                                    onClick={() => {
                                      if (isAvailable) {
                                        setSelectedQuizModal(quiz)
                                      }
                                    }}
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="space-y-2.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <Badge
                                            variant="outline"
                                            className={`font-mono text-xs font-bold shrink-0 ${
                                              isLocked ? 'text-muted-foreground bg-muted/60 border-border' : 'text-primary bg-secondary/60 border-primary/30'
                                            }`}
                                          >
                                            {quiz.moduleCode}
                                          </Badge>

                                          {isCompleted && (
                                            <Badge variant="success" className="gap-1 text-xs font-semibold shrink-0">
                                              <CheckCircle className="h-3 w-3" />
                                              Completed &bull; Passed ({quiz.lastScore}%)
                                            </Badge>
                                          )}

                                          {isAvailable && (
                                            <Badge variant="primary" className="gap-1 text-xs font-semibold bg-primary text-primary-foreground shadow-xs shrink-0">
                                              <Sparkles className="h-3 w-3" />
                                              Ready to Take
                                            </Badge>
                                          )}

                                          {isLocked && (
                                            <Badge variant="outline" className="gap-1.5 text-xs font-semibold bg-muted text-foreground border-border shrink-0">
                                              <Lock className="h-3 w-3 text-foreground" />
                                              Locked Gate
                                            </Badge>
                                          )}

                                          <span className="text-xs font-medium text-foreground truncate min-w-0">
                                            {quiz.moduleTitle}
                                          </span>
                                        </div>

                                        <div>
                                          <h3 className="text-base font-bold text-foreground transition-colors">
                                            {quiz.quizTitle}
                                          </h3>
                                          <p className="text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl text-muted-foreground font-normal">
                                            {quiz.description}
                                          </p>
                                        </div>

                                        {/* Skills Tested Badges */}
                                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                          <span className="text-[11px] font-bold mr-1 text-muted-foreground">
                                            Skills Tested:
                                          </span>
                                          {quiz.skills.map((skill) => (
                                            <Badge
                                              key={skill}
                                              variant="outline"
                                              className="text-[11px] px-2 py-0.5 font-semibold bg-muted/40 text-foreground border-border"
                                            >
                                              {skill}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Action Column */}
                                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border md:pl-4">
                                        <div className="flex items-center gap-3 text-xs font-mono">
                                          <span className="flex items-center gap-1 font-bold text-foreground">
                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                            {quiz.durationMinutes}m
                                          </span>
                                          <span className="text-muted-foreground font-bold">&bull;</span>
                                          <span className="flex items-center gap-1 font-bold text-foreground">
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            {quiz.questionCount} Questions
                                          </span>
                                        </div>

                                        {isAvailable && (
                                          <Button
                                            variant="primary"
                                            size="sm"
                                            rightIcon={<ArrowRight className="h-4 w-4" />}
                                            className="shadow-xs font-semibold"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedQuizModal(quiz)
                                            }}
                                          >
                                            Take Quiz Now
                                          </Button>
                                        )}

                                        {isCompleted && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            leftIcon={<History className="h-3.5 w-3.5 text-primary" />}
                                            className="font-medium hover:border-primary/40"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setHistorySearch(`${quiz.moduleCode}: ${quiz.moduleTitle}`)
                                              setActiveTab('history')
                                            }}
                                          >
                                            Review Attempt
                                          </Button>
                                        )}

                                        {isLocked && (
                                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground font-bold text-xs border border-border shadow-2xs">
                                            <Lock className="h-3.5 w-3.5 text-foreground" />
                                            <span>Locked Gate</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Supporting Hub & Contextual Cards (lg:col-span-4) */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Card A: Target Track Readiness & Summary */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
                            <Target size={19} />
                          </div>
                          <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Role</h3>
                            <p className="text-sm font-bold text-foreground">AI Knowledge Architect</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[11px] font-bold text-primary">
                          Staff Level
                        </Badge>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Milestone Readiness</span>
                          <span className="text-foreground font-mono font-bold">40% (2 / 5 Passed)</span>
                        </div>
                        <Progress value={40} variant="primary" />
                      </div>

                      {/* 2x2 Metric Tile Grid */}
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <div className="text-[11px] font-semibold text-muted-foreground">Highest Score</div>
                          <div className="text-xl font-bold text-success mt-0.5 font-mono">92%</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">MOD-101 RDF</div>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <div className="text-[11px] font-semibold text-muted-foreground">Average Score</div>
                          <div className="text-xl font-bold text-primary mt-0.5 font-mono">91%</div>
                          <div className="text-[10px] text-muted-foreground font-mono">2 Assessments</div>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <div className="text-[11px] font-semibold text-muted-foreground">Est. Time Left</div>
                          <div className="text-xl font-bold text-foreground mt-0.5 font-mono">1h 35m</div>
                          <div className="text-[10px] text-muted-foreground font-mono">3 Quizzes Left</div>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                          <div className="text-[11px] font-semibold text-muted-foreground">Skills Verified</div>
                          <div className="text-xl font-bold text-foreground mt-0.5 font-mono">6 / 18</div>
                          <div className="text-[10px] text-success font-semibold flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> +4 on next pass
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card B: Next Action Priority Spotlight (MOD-301) */}
                    {nextQuiz && (
                      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-secondary/60 via-card to-card p-5 shadow-xs space-y-3.5 relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <Badge variant="primary" className="text-[11px] font-bold px-2.5 py-0.5 gap-1 shadow-2xs">
                            <Sparkles size={12} />
                            <span>Next Priority Milestone</span>
                          </Badge>
                          <span className="font-mono text-xs font-bold text-primary">{nextQuiz.moduleCode}</span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-foreground leading-snug">
                            {nextQuiz.quizTitle}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                            Covers Graph Neural Networks, Spatial GCN convolution, and DKT models. Clearing this milestone unlocks Module MOD-305 in your pathway.
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60 font-mono">
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Clock size={13} className="text-primary" /> {nextQuiz.durationMinutes} mins
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FileText size={13} className="text-primary" /> {nextQuiz.questionCount} Questions
                          </span>
                          <span>•</span>
                          <span className="text-success font-semibold">Pass: {nextQuiz.passingScore}%</span>
                        </div>

                        <Button
                          variant="primary"
                          size="default"
                          className="w-full justify-center shadow-xs font-semibold mt-1"
                          rightIcon={<ArrowRight size={15} />}
                          onClick={() => setSelectedQuizModal(nextQuiz)}
                        >
                          Launch Milestone Quiz
                        </Button>
                      </div>
                    )}

                    {/* Card C: Supporting Pathway & Gap Analysis Hub */}
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-secondary text-primary flex items-center justify-center">
                          <Compass size={15} />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Connected Curriculum
                        </h4>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Milestone assessment results feed directly into your Bayesian Knowledge Tracing parameters, updating prerequisite gates and competency radars.
                      </p>

                      <div className="space-y-2 pt-1">
                        <Link
                          to="/learner/gap-analysis"
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:border-primary/40 hover:bg-muted/50 transition-all text-xs group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Award size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                Competency Gap Analysis
                              </div>
                              <div className="text-[10.5px] text-muted-foreground truncate">
                                Compare verified mastery vs. target standards
                              </div>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* TAB 2: HISTORY (VIEW OLD QUIZ ASSESSMENTS) */}
            {activeTab === 'history' && (
              <div className="space-y-5">
                {/* Attempts Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Submissions"
                    value={`${attempts.length} Finished`}
                    description="Stored in learner portfolio"
                  />

                  <StatCard
                    title="Highest Score"
                    value={`${Math.max(...attempts.map((a) => a.score), 0)}%`}
                    valueClassName="text-success"
                    description="Demonstrated mastery tier"
                  />

                  <StatCard
                    title="Average Score"
                    value={`${Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / (attempts.length || 1))}%`}
                    valueClassName="text-primary"
                    description="Across all dynamic tests"
                  />
                </div>

                {/* Search, Filter & Sort Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-card rounded-xl border border-border shadow-xs">
                  {/* Search Input with Module Name Autocomplete / Dropdown */}
                  <div ref={searchRef} className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search or select module name..."
                      value={historySearch}
                      onFocus={() => setIsSearchDropdownOpen(true)}
                      onChange={(e) => {
                        setHistorySearch(e.target.value)
                        setIsSearchDropdownOpen(true)
                      }}
                      className="w-full pl-9 pr-8 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/25 transition-colors"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch('')
                          setIsSearchDropdownOpen(false)
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                        title="Clear module filter"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Interactive Module List Dropdown */}
                    {isSearchDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1.5 overflow-hidden">
                        <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
                          {/* All Modules Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setHistorySearch('')
                              setIsSearchDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between hover:bg-primary/10 ${
                              !historySearch ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="font-medium">All Modules</span>
                              <span className="text-[11px] text-muted-foreground">(Show all attempts)</span>
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {attempts.length} attempts
                            </Badge>
                          </button>

                          {/* Individual Module Options */}
                          {MODULE_OPTIONS.filter((mod) => {
                            if (!historySearch.trim()) return true
                            const q = historySearch.toLowerCase().trim()
                            return (
                              mod.code.toLowerCase().includes(q) ||
                              mod.title.toLowerCase().includes(q)
                            )
                          }).map((mod) => {
                            const modAttempts = attempts.filter((a) => a.moduleCode === mod.code)
                            const isSelected = historySearch.toLowerCase().includes(mod.code.toLowerCase())
                            return (
                              <button
                                key={mod.code}
                                type="button"
                                onClick={() => {
                                  setHistorySearch(`${mod.code}: ${mod.title}`)
                                  setIsSearchDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 hover:bg-primary/10 ${
                                  isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge variant="outline" className="font-mono text-[11px] shrink-0 text-primary border-primary/30">
                                    {mod.code}
                                  </Badge>
                                  <span className="truncate text-xs">{mod.title}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                                  {modAttempts.length} {modAttempts.length === 1 ? 'attempt' : 'attempts'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filter & Sort Controls */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-lg px-2.5 py-1">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">Status:</span>
                      <select
                        value={historyFilter}
                        onChange={(e) => setHistoryFilter(e.target.value as 'all' | 'passed' | 'failed')}
                        className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="all">All Statuses</option>
                        <option value="passed">Passed (≥ 80%)</option>
                        <option value="failed">Failed (&lt; 80%)</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-lg px-2.5 py-1">
                      <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">Sort:</span>
                      <select
                        value={historySort}
                        onChange={(e) => setHistorySort(e.target.value as 'newest' | 'oldest' | 'highest' | 'lowest')}
                        className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Score</option>
                        <option value="lowest">Lowest Score</option>
                      </select>
                    </div>

                    {(historySearch || historyFilter !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setHistorySearch('')
                          setHistoryFilter('all')
                        }}
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* List of Finished Attempts - Unified Big Container Design */}
                <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                  <div className="p-5 sm:p-6 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary shrink-0" />
                        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                          Historical Attempts Ledger
                        </h2>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Archived attempt results, submission timestamps, and verified competencies across all modules
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono bg-card px-3 py-1.5 rounded-lg border border-border shadow-2xs">
                      Showing {filteredAttempts.length} of {attempts.length} attempts
                    </span>
                  </div>

                  <div>
                    <div className="divide-y divide-border">
                      {filteredAttempts.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <History className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                          <div className="text-sm font-semibold text-foreground">No matching attempts found</div>
                          <p className="text-xs text-muted-foreground">
                            Try selecting another module name or adjusting your status filter.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHistorySearch('')
                              setHistoryFilter('all')
                            }}
                            className="mt-2 text-xs"
                          >
                            Reset Filters
                          </Button>
                        </div>
                      ) : (
                        filteredAttempts.map((attempt) => {
                          return (
                            <div
                              key={attempt.id}
                              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <Badge variant="outline" className="font-mono text-xs font-semibold text-primary">
                                    {attempt.moduleCode}
                                  </Badge>
                                  <span className="font-bold text-sm text-foreground">
                                    {attempt.moduleTitle}
                                  </span>
                                  <Badge
                                    variant={attempt.score >= 80 ? 'success' : 'destructive'}
                                  >
                                    {attempt.score >= 80 ? `Passed (${attempt.score}%)` : `Failed (${attempt.score}%)`}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3 text-primary" /> {attempt.timeTaken}
                                  </span>
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-2.5 flex-wrap">
                                  <span className="font-medium text-foreground">{attempt.quizTitle}</span>
                                  <span>&bull;</span>
                                  <span>Completed: <strong className="text-foreground">{attempt.date}</strong></span>
                                  <span>&bull;</span>
                                  <span>
                                    Results: <strong className="text-foreground">{attempt.correctCount}</strong> / {attempt.totalQuestions} correct (
                                    <span className={attempt.score >= 80 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                      {attempt.totalQuestions - attempt.correctCount} incorrect
                                    </span>)
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<FileText className="h-4 w-4 text-primary" />}
                                  onClick={() => {
                                    setReviewAttemptId(attempt.id)
                                    setIsTakingQuiz(true)
                                    setCurrentIndex(0)
                                    toast({
                                      title: `${attempt.moduleCode} Submission Loaded`,
                                      description: 'You can now inspect what was correct and what you got wrong (X).',
                                      variant: 'info',
                                    })
                                  }}
                                >
                                  Review Answers (with X & ✓)
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL: AVAILABLE QUIZ DETAILS & INSTRUCTIONS
           ========================================================================= */}
        {selectedQuizModal && (
          <Dialog
            open={!!selectedQuizModal}
            onOpenChange={(open) => !open && setSelectedQuizModal(null)}
            className="sm:max-w-[640px] p-6 sm:p-7"
          >
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary text-primary border border-primary/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  {selectedQuizModal.moduleCode} Milestone Assessment
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-foreground/80 border border-border">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  Pass Threshold: {selectedQuizModal.passingScore}%
                </span>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-snug">
                {selectedQuizModal.quizTitle}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1.5">
                {selectedQuizModal.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-3">
              {/* Stat Tiles */}
              <div className="modal-stat-grid">
                <div className="modal-stat-card">
                  <div className="modal-stat-header">
                    <span className="modal-stat-label">Duration</span>
                    <div className="modal-stat-icon-box">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="modal-stat-value">
                      {selectedQuizModal.durationMinutes}{' '}
                      <span className="text-xs font-semibold text-muted-foreground">Min</span>
                    </div>
                    <div className="modal-stat-sub">Live countdown</div>
                  </div>
                </div>

                <div className="modal-stat-card">
                  <div className="modal-stat-header">
                    <span className="modal-stat-label">Questions</span>
                    <div className="modal-stat-icon-box">
                      <FileText className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="modal-stat-value">
                      {selectedQuizModal.questionCount}{' '}
                      <span className="text-xs font-semibold text-muted-foreground">Qs</span>
                    </div>
                    <div className="modal-stat-sub">Multiple-choice</div>
                  </div>
                </div>

                <div className="modal-stat-card">
                  <div className="modal-stat-header">
                    <span className="modal-stat-label">Passing</span>
                    <div className="modal-stat-icon-box">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="modal-stat-value text-success">
                      {selectedQuizModal.passingScore}%
                    </div>
                    <div className="modal-stat-sub">Unlocks next module</div>
                  </div>
                </div>

                <div className="modal-stat-card">
                  <div className="modal-stat-header">
                    <span className="modal-stat-label">Grading</span>
                    <div className="modal-stat-icon-box">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="modal-stat-value">Instant</div>
                    <div className="modal-stat-sub">With ✓ and ✗ review</div>
                  </div>
                </div>
              </div>

              {/* Tested Competencies Card */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Tested Competencies</span>
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md">
                    {selectedQuizModal.skills.length} Competencies
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedQuizModal.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground border border-border/80 hover:border-primary/40 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Session Guidelines Callout */}
              <div className="p-4 rounded-xl border border-primary/20 bg-secondary/40 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold text-foreground">Session Protocol & Instructions</div>
                  <p className="text-muted-foreground leading-relaxed">
                    Once you click <strong>&quot;Begin Assessment Now&quot;</strong>, your{' '}
                    <strong>{selectedQuizModal.durationMinutes}-minute countdown</strong> will begin. You
                    can navigate between questions, flag items for review, and submit when ready.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={() => setSelectedQuizModal(null)}
                className="rounded-xl px-5 font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="default"
                onClick={handleStartQuizFromModal}
                className="rounded-xl px-6 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                rightIcon={<Play className="h-4 w-4 fill-current" />}
              >
                Begin Assessment Now
              </Button>
            </DialogFooter>
          </Dialog>
        )}

        {/* MODAL: Quit Session */}
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

        {/* MODAL: Submit Assessment (UI-UX Pro Max Metrics-Driven) */}
        {isSubmitModalOpen && (
          <Dialog
            open={isSubmitModalOpen}
            onOpenChange={setIsSubmitModalOpen}
            className="sm:max-w-[500px] p-6 sm:p-7"
          >
            <DialogHeader className="mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-foreground">
                    Submit Assessment?
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Ready to finalize your answers and generate immediate diagnostic results?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 my-3">
              {/* Visual Metrics Cards: Answered, Unanswered, Flagged */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card text-center shadow-xs">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Answered
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1">
                    <span className="text-primary">{answeredCount}</span>
                    <span className="text-xs font-semibold text-muted-foreground">/{totalQuestions}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border text-center shadow-xs ${
                  unansweredCount > 0
                    ? 'border-warning/50 bg-warning/10 text-warning-foreground'
                    : 'border-border bg-card'
                }`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Unanswered
                  </div>
                  <div className={`text-xl font-extrabold mt-1 ${unansweredCount > 0 ? 'text-warning' : 'text-foreground'}`}>
                    {unansweredCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card text-center shadow-xs">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Flagged
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1 flex items-center justify-center gap-1.5">
                    {flaggedCount > 0 && <Flag className="h-4 w-4 text-warning fill-warning" />}
                    <span>{flaggedCount}</span>
                  </div>
                </div>
              </div>

              {/* Warning Alert if Unanswered vs Success if Complete */}
              {unansweredCount > 0 ? (
                <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/10 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground leading-relaxed">
                    <strong>{unansweredCount} question{unansweredCount > 1 ? 's' : ''} left unanswered.</strong> Unanswered items are scored as 0 points. You can return now to complete them.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-success/30 bg-success/10 flex items-center gap-2.5 text-xs text-success font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>All {totalQuestions} questions completed! Your attempt is ready for scoring.</span>
                </div>
              )}
            </div>

            <DialogFooter className="mt-5 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={() => setIsSubmitModalOpen(false)}
                className="rounded-xl px-4 font-semibold text-muted-foreground hover:text-foreground"
              >
                Return to Questions
              </Button>
              <Button
                variant="primary"
                size="default"
                onClick={() => {
                  setIsSubmitModalOpen(false)
                  handleSubmitAssessment()
                }}
                className="rounded-xl px-5 font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                rightIcon={<Send className="h-4 w-4" />}
              >
                Submit &amp; Grade
              </Button>
            </DialogFooter>
          </Dialog>
        )}
      </div>
    </WorkspaceLayout>
  )
}
