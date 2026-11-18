import './AssessmentPage.css'

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

export const MODULE_OPTIONS = [
  { code: 'MOD-101', title: 'Foundations of Knowledge Graphs & RDF Triples' },
  { code: 'MOD-204', title: 'Property Graph Architecture with Neo4j & Cypher' },
  { code: 'MOD-301', title: 'Graph Neural Networks & Node Embeddings (Fast-Track)' },
  { code: 'MOD-305', title: 'Adaptive Knowledge Tracing Engine Implementation' },
  { code: 'MOD-401', title: 'Enterprise Competency Intelligence Platform Capstone' },
  { code: 'MOD-CYP-101', title: 'Accelerated Cypher Querying & Pattern Traversal' },
]

export const SKILL_CYPHER_ATTEMPT: QuizAttempt = {
  id: 'att-modcyp101-1',
  attemptNumber: 1,
  moduleCode: 'MOD-CYP-101',
  moduleTitle: 'Accelerated Cypher Querying & Pattern Traversal',
  quizTitle: 'Skill Milestone: Cypher Query Optimization & Pattern Matching',
  date: '2026-09-18 11:20',
  score: 85,
  correctCount: 8,
  totalQuestions: 10,
  timeTaken: '14m 20s',
  answers: {
    'q-1': 'opt-1-a',
    'q-2': 'opt-2-a',
    'q-3': 'opt-3-a',
    'q-4': 'opt-4-a',
    'q-5': 'opt-5-b',
    'q-6': 'opt-6-a',
    'q-7': 'opt-7-b',
    'q-8': 'opt-8-a',
    'q-9': 'opt-9-a',
    'q-10': 'opt-10-a',
  },
}

export interface SkillQuiz {
  id: string
  skillCode: string
  skillName: string
  description: string
  currentMastery: number
  targetMastery: number
  status: 'completed' | 'eligible' | 'locked'
  lastScore?: number
  durationMinutes: number
  questionCount: number
  passingScore: number
  parentModuleCode: string
}

export const SKILL_QUIZZES: SkillQuiz[] = [
  {
    id: 'quiz-sk-pyg-02',
    skillCode: 'SK-PYG-02',
    skillName: 'PyTorch Geometric (PyG) Pipeline',
    description: 'Constructing Data and HeteroData tensors with sparse adjacency representations.',
    currentMastery: 75,
    targetMastery: 70,
    status: 'eligible',
    durationMinutes: 20,
    questionCount: 10,
    passingScore: 80,
    parentModuleCode: 'MOD-301',
  },
  {
    id: 'quiz-sk-rdf-01',
    skillCode: 'SK-RDF-01',
    skillName: 'RDF TripleStore Data Model',
    description: 'Representing entity-relationship graphs using URIs, blank nodes, and literal values.',
    currentMastery: 92,
    targetMastery: 80,
    status: 'completed',
    lastScore: 90,
    durationMinutes: 15,
    questionCount: 8,
    passingScore: 80,
    parentModuleCode: 'MOD-101',
  },
  {
    id: 'quiz-sk-sparql-02',
    skillCode: 'SK-SPARQL-02',
    skillName: 'SPARQL 1.1 Query Engine',
    description: 'Pattern matching, FILTER conditions, OPTIONAL clauses, and aggregation on RDF graphs.',
    currentMastery: 88,
    targetMastery: 75,
    status: 'completed',
    lastScore: 88,
    durationMinutes: 20,
    questionCount: 10,
    passingScore: 75,
    parentModuleCode: 'MOD-101',
  },
  {
    id: 'quiz-sk-cyp-01',
    skillCode: 'SK-CYP-01',
    skillName: 'Declarative Cypher MATCH & MERGE',
    description: 'Path traversal syntax, bidirectional relationship matching, and atomic merge semantics.',
    currentMastery: 91,
    targetMastery: 70,
    status: 'completed',
    lastScore: 92,
    durationMinutes: 15,
    questionCount: 8,
    passingScore: 75,
    parentModuleCode: 'MOD-204',
  },
  {
    id: 'quiz-sk-neo-02',
    skillCode: 'SK-NEO-02',
    skillName: 'Index-Free Adjacency & Schema Constraints',
    description: 'Unique node constraints, text/range indexes, and point-in-time schema validation.',
    currentMastery: 85,
    targetMastery: 75,
    status: 'completed',
    lastScore: 88,
    durationMinutes: 20,
    questionCount: 10,
    passingScore: 80,
    parentModuleCode: 'MOD-204',
  },
  {
    id: 'quiz-sk-opt-04',
    skillCode: 'SK-OPT-04',
    skillName: 'Cypher Query Profiling (EXPLAIN / PROFILE)',
    description: 'DbHits analysis, card estimation, cache hits, and Cartesian product elimination.',
    currentMastery: 87,
    targetMastery: 70,
    status: 'completed',
    lastScore: 85,
    durationMinutes: 15,
    questionCount: 8,
    passingScore: 75,
    parentModuleCode: 'MOD-204',
  },
]

export interface RiasecQuestionItem {
  id: number
  dimension: 'R' | 'I' | 'A' | 'S' | 'E' | 'C'
  dimensionName: string
  statement: string
}

export const RIASEC_QUIZ_QUESTIONS: RiasecQuestionItem[] = [
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

export const RIASEC_LIKERT_OPTIONS = [
  { value: 1, letter: 'A', label: 'Strongly Dislike', desc: 'I would avoid this activity' },
  { value: 2, letter: 'B', label: 'Dislike', desc: 'I find this activity unappealing' },
  { value: 3, letter: 'C', label: 'Neutral', desc: 'No strong preference either way' },
  { value: 4, letter: 'D', label: 'Enjoy', desc: 'I find this engaging and interesting' },
  { value: 5, letter: 'E', label: 'Strongly Enjoy', desc: 'One of my favorite types of work' },
]

