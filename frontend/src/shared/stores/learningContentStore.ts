import { type CourseraLessonItem } from '../../features/employee/modules/LearningModuleReaderPage'

export interface LearningContentPackage {
  id: string
  code: string
  title: string
  skillCode: string
  skillName: string
  occupation: string
  estimatedDuration: number // minutes
  description: string
  lessons: CourseraLessonItem[]
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_REQUESTED'
  version: string
  submittedBy?: string
  submittedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  feedbackNotes?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY_CONTENT = 'adaptlearn_learning_contents_v1'

const SEED_LEARNING_CONTENTS: LearningContentPackage[] = [
  {
    id: 'mod-cypher-mastery',
    code: 'MOD-CYP-101',
    title: 'Accelerated Cypher Querying & Pattern Traversal',
    skillCode: 'MS-FS04',
    skillName: 'use query languages',
    occupation: 'Software Developers',
    estimatedDuration: 64,
    description:
      'Master pattern matching, variable-length path traversal, aggregation pipelines, and graph index optimization using openCypher.',
    version: '1.0',
    status: 'APPROVED',
    submittedBy: 'Dr. Sarah Chen',
    submittedAt: '2026-10-18T10:00:00Z',
    reviewedBy: 'Marcus Vance',
    reviewedAt: '2026-10-19T14:30:00Z',
    createdAt: '2026-10-15T09:00:00Z',
    updatedAt: '2026-10-19T14:30:00Z',
    lessons: [
      {
        id: 'lesson-1',
        title: 'Define and Aggregate Relevant Graph Data',
        type: 'reading',
        durationMinutes: 5,
        leadParagraph:
          'Property graph modeling is the foundational architectural discipline every graph engineer applies to transform relational schema tables into high-throughput connected structures.',
        readingSections: [
          {
            heading: 'Why Graph Data Aggregation Matters',
            content:
              'When designing enterprise skill graphs, nodes represent discrete competencies while directed relationships describe prerequisite pipelines and taxonomic hierarchies. Unlike traditional relational database architectures that rely on expensive recursive multi-table joins, graph databases treat relationships as first-class physical pointers that can be traversed in constant time.',
          },
          {
            heading: 'Core Structural Concepts',
            bulletPoints: [
              {
                label: 'Labeled Node Constraints',
                text: 'Nodes are grouped under strict semantic labels such as :MicroSkill, :TargetRole, and :LearningModule to support high-efficiency schema-level range index scans.',
              },
              {
                label: 'Directed Typed Edges',
                text: 'Every relationship maintains an explicit directional orientation and type descriptor, such as [:REQUIRES_SKILL] or [:HAS_SKILL_PREREQUISITE], eliminating ambiguous bidirectional pointer traversal.',
              },
              {
                label: 'Internal Node Key Indexing',
                text: 'Each node carries uniquely indexed immutable keys (e.g. code: "JAVA-BACKEND-II") to guarantee O(1) initial pattern lookups before index-free adjacency traversal begins.',
              },
            ],
          },
          {
            heading: 'Pattern Matching Example',
            content:
              'Below is a standard production query retrieving all immediate competency dependencies for a target job role. Notice how the visual ASCII-art pattern maps directly to connected graph entities.',
            codeSnippet: {
              language: 'cypher',
              label: 'Cypher Query — Immediate Dependencies',
              code: `// Retrieve all immediate skill dependencies for a target job role
MATCH (role:TargetRole {code: "JAVA-BACKEND-II"})-[:REQUIRES_SKILL]->(skill:MicroSkill)
RETURN skill.code AS code, skill.name AS name, skill.targetMastery AS mastery
ORDER BY skill.name ASC;`,
            },
          },
          {
            heading: 'Production Architectural Guidelines',
            guidelines: [
              'Always filter early using node labels to restrict the initial Cartesian product space.',
              'Parameterize all query inputs to take full advantage of cached Neo4j execution plans.',
              'Avoid unbound variable-length queries in production without a strict upper depth limit.',
            ],
          },
        ],
      },
      {
        id: 'lesson-2',
        title: 'Filtering with WHERE Predicates and Property Lookups',
        type: 'reading',
        durationMinutes: 5,
        leadParagraph:
          'Construct deterministic graph traversals by combining semantic property constraints, nullability predicates, and regex string matching.',
        readingSections: [
          {
            heading: 'Predicate Evaluation Lifecycle',
            content:
              'In Cypher, WHERE clauses do not represent standalone operations; they act as post-filters attached directly to preceding MATCH, WITH, or OPTIONAL MATCH steps. Proper placement prevents unnecessary relationship expansions across irrelevant subgraphs.',
          },
          {
            heading: 'Standard Filter Patterns',
            bulletPoints: [
              {
                label: 'Range Predicates',
                text: 'Filter numerical boundaries such as mastery thresholds (e.g., WHERE skill.targetMastery >= 0.75).',
              },
              {
                label: 'Collection Inclusions',
                text: 'Assert node membership against dynamic arrays using the IN operator.',
              },
            ],
          },
          {
            heading: 'Safe Index-Backed Lookups',
            codeSnippet: {
              language: 'cypher',
              label: 'Cypher Query — Indexed Filtering',
              code: `MATCH (m:LearningModule)
WHERE m.status = "published" AND m.durationMinutes <= 60
RETURN m.code, m.title, m.durationMinutes;`,
            },
          },
        ],
      },
      {
        id: 'lesson-3',
        title: 'Property Graph Core Concepts & Match Syntax',
        type: 'video',
        durationMinutes: 14,
        videoDuration: '14:20',
        videoSummary:
          'This video lecture explores the internal physical representation of nodes, pointer swizzling, and how the Neo4j Cypher planner compiles visual ASCII patterns into optimized pipelined execution plans.',
        videoHighlights: [
          'Memory structure of node records and double-linked relationship chains.',
          'Index-free adjacency vs traditional B-tree foreign key lookups.',
          'Visual breakdown of directed arrows, label filters, and return projections.',
        ],
      },
      {
        id: 'lesson-4',
        title: 'Variable-Length Paths & Bounded Traversal Pipelines',
        type: 'reading',
        durationMinutes: 8,
        leadParagraph:
          'Explore deep prerequisite hierarchies without recursion limits using bounded variable-length Cypher paths.',
        readingSections: [
          {
            heading: 'Deep Prerequisite Resolution',
            content:
              'Competency networks often feature transitive dependency chains where skill A requires skill B, which in turn requires skill C. Bounded variable-length path expressions allow the query engine to trace dependency depths seamlessly.',
            codeSnippet: {
              language: 'cypher',
              label: 'Cypher Query — Transitive Prerequisites',
              code: `MATCH path = (root:MicroSkill {code: "MS-DE01"})-[:HAS_SKILL_PREREQUISITE*1..4]->(prereq:MicroSkill)
RETURN [n IN nodes(path) | n.name] AS dependencyChain, length(path) AS depth;`,
            },
          },
        ],
      },
      {
        id: 'lesson-5',
        title: 'Shortest Path Algorithms & Prerequisite Resolution',
        type: 'video',
        durationMinutes: 16,
        videoDuration: '16:00',
        videoSummary:
          'Learn how to apply shortestPath() and allShortestPaths() functions in Cypher to discover the most efficient learning progression across complex skill dependency graphs.',
        videoHighlights: [
          'Dijkstra implementation inside the Neo4j graph traversal engine.',
          'Prerequisite cycle detection and resolution strategies.',
          'Dynamic pathway shortest path calculations for employee onboarding.',
        ],
      },
      {
        id: 'lesson-6',
        title: 'Constraint Engineering & Schema Integrity',
        type: 'reading',
        durationMinutes: 10,
        leadParagraph:
          'Guarantee graph schema integrity with unique property constraints, node existence constraints, and relationship key indexing.',
        readingSections: [
          {
            heading: 'Strict Architectural Constraints',
            content:
              'Enterprise ontologies require strict schema guardrails. Enforcing uniqueness on node business identifiers prevents split identity duplication across batch imports.',
            codeSnippet: {
              language: 'cypher',
              label: 'Cypher Schema — Constraints DDL',
              code: `CREATE CONSTRAINT constraint_microskill_code IF NOT EXISTS
FOR (s:MicroSkill) REQUIRE s.code IS UNIQUE;

CREATE CONSTRAINT constraint_module_code IF NOT EXISTS
FOR (m:LearningModule) REQUIRE m.code IS UNIQUE;`,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mod-core01-scripting',
    code: 'MOD-MS-CORE01',
    title: 'Executable Programs & Scripting Foundations',
    skillCode: 'MS-CORE01',
    skillName: 'Implement programs and scripts',
    occupation: 'Software Developers',
    estimatedDuration: 45,
    description:
      'Write, test, and package executable logic for enterprise automation, software services, and pipeline utilities.',
    version: '1.0',
    status: 'APPROVED',
    submittedBy: 'Marcus Vance',
    submittedAt: '2026-10-14T08:00:00Z',
    reviewedBy: 'Dr. Sarah Chen',
    reviewedAt: '2026-10-15T11:00:00Z',
    createdAt: '2026-10-12T09:00:00Z',
    updatedAt: '2026-10-15T11:00:00Z',
    lessons: [
      {
        id: 'core01-l1',
        title: 'Programmatic Logic & Execution Contexts',
        type: 'reading',
        durationMinutes: 10,
        leadParagraph:
          'Understanding process lifecycles, execution arguments, exit codes, and environment variables is crucial for reliable automation scripts.',
        readingSections: [
          {
            heading: 'Standard I/O and Process Streams',
            content:
              'Every operating system process communicates through standard input (stdin), standard output (stdout), and standard error (stderr). Automation scripts must emit actionable error messages to stderr and exit with non-zero codes upon failure.',
          },
        ],
      },
      {
        id: 'core01-l2',
        title: 'Defensive Scripting & Error Handling',
        type: 'video',
        durationMinutes: 18,
        videoDuration: '18:15',
        videoSummary:
          'Deep dive into trapping errors, idempotency checks, environment variable validation, and graceful teardown in modern scripting environments.',
        videoHighlights: [
          'Signal trapping and resource cleanup on unexpected termination.',
          'Deterministic exit code propagation across pipeline steps.',
          'Idempotent file operations avoiding race conditions.',
        ],
      },
    ],
  },
  {
    id: 'mod-core02-git',
    code: 'MOD-MS-CORE02',
    title: 'Enterprise Version Control & Branching Governance',
    skillCode: 'MS-CORE02',
    skillName: 'Manage source changes with version control',
    occupation: 'Software Developers',
    estimatedDuration: 50,
    description:
      'Record, review, and merge atomic source revisions ensuring reproducible releases and audit compliance.',
    version: '1.0',
    status: 'PENDING_APPROVAL',
    submittedBy: 'Dr. Sarah Chen',
    submittedAt: '2026-10-22T14:10:00Z',
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-22T14:10:00Z',
    lessons: [
      {
        id: 'core02-l1',
        title: 'Directed Acyclic Graph Model of Git Revisions',
        type: 'reading',
        durationMinutes: 15,
        leadParagraph:
          'Git stores history as an immutable directed acyclic graph (DAG) of commit objects, trees, and blobs addressed by SHA cryptographic hashes.',
        readingSections: [
          {
            heading: 'Commit Immutability & Tree Pointers',
            content:
              'A commit references a root tree object, metadata (author, timestamp, commit message), and parent commit hashes. Branch references are lightweight mutable pointers to commit nodes.',
          },
        ],
      },
      {
        id: 'core02-l2',
        title: 'Trunk-Based Development & Atomic Pull Requests',
        type: 'video',
        durationMinutes: 20,
        videoDuration: '20:00',
        videoSummary:
          'Learn best practices for high-velocity teams: small atomic commits, short-lived feature branches, and semantic pull request reviews.',
        videoHighlights: [
          'Minimizing merge debt with continuous integration.',
          'Rebase vs merge strategies in enterprise teams.',
          'Automated validation gates prior to protected branch merges.',
        ],
      },
    ],
  },
  {
    id: 'mod-arc01-solution-modeling',
    code: 'MOD-MS-ARC01',
    title: 'Solution Component Modeling & Boundary Design',
    skillCode: 'MS-ARC01',
    skillName: 'Model solution components and boundaries',
    occupation: 'Computer Systems Engineers & Architects',
    estimatedDuration: 40,
    description:
      'Formalize component boundaries, interfaces, and architectural constraints using standard architectural notations.',
    version: '1.0',
    status: 'DRAFT',
    submittedBy: 'Dr. Sarah Chen',
    createdAt: '2026-10-23T11:00:00Z',
    updatedAt: '2026-10-23T11:00:00Z',
    lessons: [
      {
        id: 'arc01-l1',
        title: 'Domain Boundaries & Hexagonal Component Isolation',
        type: 'reading',
        durationMinutes: 20,
        leadParagraph:
          'Isolate domain models from infrastructure adapters to preserve testability and minimize technological lock-in.',
        readingSections: [
          {
            heading: 'Ports and Adapters Architecture',
            content:
              'Ports define semantic domain contracts, while adapters connect external frameworks, HTTP controllers, and database drivers.',
          },
        ],
      },
    ],
  },
]

type Listener = () => void
const listeners = new Set<Listener>()

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function getStoredLearningContents(): LearningContentPackage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTENT)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(SEED_LEARNING_CONTENTS))
      return SEED_LEARNING_CONTENTS
    }
    const parsed = JSON.parse(raw) as LearningContentPackage[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(SEED_LEARNING_CONTENTS))
      return SEED_LEARNING_CONTENTS
    }
    return parsed
  } catch {
    return SEED_LEARNING_CONTENTS
  }
}

export function saveStoredLearningContents(contents: LearningContentPackage[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CONTENT, JSON.stringify(contents))
    notifyListeners()
  } catch (err) {
    console.error('Failed to save learning contents to localStorage', err)
  }
}

export function getLearningContentById(id: string): LearningContentPackage | undefined {
  const all = getStoredLearningContents()
  return all.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase())
}

export function getApprovedLearningContents(): LearningContentPackage[] {
  const all = getStoredLearningContents()
  return all.filter((c) => c.status === 'APPROVED')
}

export function saveOrUpdateContentPackage(pkg: LearningContentPackage): LearningContentPackage {
  const all = getStoredLearningContents()
  const idx = all.findIndex((c) => c.id === pkg.id)
  const now = new Date().toISOString()
  const updatedPkg: LearningContentPackage = {
    ...pkg,
    updatedAt: now,
  }

  let next: LearningContentPackage[]
  if (idx >= 0) {
    next = [...all]
    next[idx] = updatedPkg
  } else {
    next = [updatedPkg, ...all]
  }

  saveStoredLearningContents(next)
  return updatedPkg
}

export function deleteContentPackage(id: string): boolean {
  const all = getStoredLearningContents()
  const filtered = all.filter((c) => c.id !== id)
  if (filtered.length !== all.length) {
    saveStoredLearningContents(filtered)
    return true
  }
  return false
}

export function submitContentForApproval(id: string, submitter: string): LearningContentPackage | undefined {
  const all = getStoredLearningContents()
  const target = all.find((c) => c.id === id)
  if (!target) return undefined

  const updated: LearningContentPackage = {
    ...target,
    status: 'PENDING_APPROVAL',
    submittedBy: submitter,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  saveOrUpdateContentPackage(updated)
  return updated
}

export function approveContentPackage(id: string, reviewer: string): LearningContentPackage | undefined {
  const all = getStoredLearningContents()
  const target = all.find((c) => c.id === id)
  if (!target) return undefined

  const updated: LearningContentPackage = {
    ...target,
    status: 'APPROVED',
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    feedbackNotes: undefined,
    updatedAt: new Date().toISOString(),
  }

  saveOrUpdateContentPackage(updated)
  return updated
}

export function rejectContentPackage(id: string, reviewer: string, feedback: string): LearningContentPackage | undefined {
  const all = getStoredLearningContents()
  const target = all.find((c) => c.id === id)
  if (!target) return undefined

  const updated: LearningContentPackage = {
    ...target,
    status: 'REVISION_REQUESTED',
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    feedbackNotes: feedback,
    updatedAt: new Date().toISOString(),
  }

  saveOrUpdateContentPackage(updated)
  return updated
}

export function subscribeToLearningContents(callback: Listener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
