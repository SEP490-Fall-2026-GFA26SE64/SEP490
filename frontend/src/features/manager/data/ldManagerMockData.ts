export interface SkillTargetConfig {
  skillId: string
  skillCode: string
  skillName: string
  threshold: number // e.g. 80 (%)
  weight: number // positive weight e.g. 1.0, 1.5, 2.0
  mandatory: boolean
}

export interface TargetRoleModel {
  id: string
  stableId: string
  code: string
  title: string
  department: string
  description: string
  version: string
  status: 'draft' | 'published' | 'archived'
  competencyIds: string[]
  skillTargets: SkillTargetConfig[]
  activeEnrollments: number
  updatedAt: string
  provenanceRef: string
}

export interface CompetencyModel {
  id: string
  stableId: string
  code: string
  name: string
  definition: string
  version: string
  status: 'draft' | 'published' | 'archived'
  derivationRef: string
  skillIds: string[] // HAS_SKILL links
  updatedAt: string
}

export interface MicroSkillModel {
  id: string
  stableId: string
  code: string
  name: string
  observableOutcome: string
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create'
  version: string
  status: 'draft' | 'published' | 'archived'
  provenance: {
    source: string
    ruleRef: string
    type: 'source-backed' | 'derived' | 'synthetic'
    recordedDate: string
  }
}

export interface PrerequisiteEdge {
  id: string
  sourceSkillId: string // Prerequisite skill
  targetSkillId: string // Dependent skill
  requiredThreshold: number // percentage e.g. 75
  type: 'hard_prerequisite' | 'recommended'
  ruleRef: string
}

export interface ProvenanceRecord {
  id: string
  entityType: 'Competency' | 'Micro-Skill' | 'Prerequisite' | 'Module' | 'Question'
  entityCode: string
  entityName: string
  sourceRef: string
  ruleRef: string
  versionDate: string
  provenanceStatus: 'source-backed' | 'derived' | 'synthetic'
  notes: string
}

export interface LearningModuleModel {
  id: string
  stableId: string
  code: string
  title: string
  version: string
  status: 'draft' | 'published' | 'archived'
  durationMinutes: number
  sampleContentUri: string
  teachesSkillIds: string[] // TEACHES links
  activePlanEnrollments: number
  replacementModuleId?: string
  updatedAt: string
}

export interface QuizQuestionModel {
  id: string
  stableId: string
  code: string
  prompt: string
  options: string[]
  correctAnswerIndex: number
  feedback: string
  assessedSkillId: string // exactly 1 micro-skill
  version: string
  status: 'draft' | 'published' | 'archived'
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced'
  provenance: string
}

export interface BlueprintSkillRequirement {
  skillId: string
  skillCode: string
  skillName: string
  questionCount: number
}

export interface AssessmentBlueprintModel {
  id: string
  code: string
  title: string
  targetType: 'role' | 'module'
  targetId: string
  targetName: string
  version: string
  status: 'draft' | 'active'
  passThreshold: number
  requirements: BlueprintSkillRequirement[]
  totalQuestions: number
  coverageStatus: 'fully_covered' | 'partial_shortage' | 'critical_shortage'
}

export interface LearningOutcomeCohort {
  id: string
  cohortName: string
  department: string
  targetRole: string
  learnerCount: number
  avgScore: number
  completionRate: number
  gapClosureRate: number
  velocityTrend: string
  status: 'Exceeding' | 'On Track' | 'Attention'
}

export interface SkillAcquisitionMetric {
  skillCode: string
  skillName: string
  masteryRate: number
  avgAttemptsToPass: number
  difficultyTag: 'High Velocity' | 'Standard' | 'Bottleneck'
}

// ----------------------------------------------------
// INITIAL MOCK DATA
// ----------------------------------------------------

export const INITIAL_MICRO_SKILLS: MicroSkillModel[] = [
  {
    id: 'skill-cypher',
    stableId: 'ms-001',
    code: 'SKILL-CYPHER-01',
    name: 'Neo4j Cypher DDL & Pattern Matching',
    observableOutcome: 'Formulate declarative Cypher queries including MATCH, MERGE, and index constraints against multi-relational graphs.',
    bloomLevel: 'Apply',
    version: '1.0',
    status: 'published',
    provenance: {
      source: 'Neo4j Certified Professional Framework v5.12',
      ruleRef: 'GRAPH-DDL-2025.1',
      type: 'source-backed',
      recordedDate: '2025-11-15',
    },
  },
  {
    id: 'skill-gnn',
    stableId: 'ms-002',
    code: 'SKILL-GNN-02',
    name: 'Graph Neural Networks & Message Passing',
    observableOutcome: 'Construct spatial graph convolutional layers with neighborhood aggregation using PyTorch Geometric.',
    bloomLevel: 'Create',
    version: '1.0',
    status: 'published',
    provenance: {
      source: 'Stanford CS224W Machine Learning with Graphs (2024)',
      ruleRef: 'GNN-ARCH-03',
      type: 'source-backed',
      recordedDate: '2025-10-20',
    },
  },
  {
    id: 'skill-embeddings',
    stableId: 'ms-003',
    code: 'SKILL-EMB-03',
    name: 'Random Walk & Node2Vec Embeddings',
    observableOutcome: 'Generate low-dimensional continuous vector representations for nodes using biased second-order random walks.',
    bloomLevel: 'Analyze',
    version: '1.0',
    status: 'published',
    provenance: {
      source: 'KDD Grover & Leskovec Node2Vec Specification',
      ruleRef: 'EMB-PROV-99',
      type: 'derived',
      recordedDate: '2025-09-12',
    },
  },
  {
    id: 'skill-owl-rdf',
    stableId: 'ms-004',
    code: 'SKILL-RDF-04',
    name: 'RDF Schema & OWL 2 DL Ontologies',
    observableOutcome: 'Define formal description logic axioms, subsumption hierarchies, and inverse functional object properties.',
    bloomLevel: 'Evaluate',
    version: '1.0',
    status: 'published',
    provenance: {
      source: 'W3C OWL 2 Web Ontology Language Recommendation',
      ruleRef: 'W3C-REC-OWL2-2012',
      type: 'source-backed',
      recordedDate: '2025-08-01',
    },
  },
  {
    id: 'skill-dkt',
    stableId: 'ms-005',
    code: 'SKILL-DKT-05',
    name: 'Dynamic Deep Knowledge Tracing',
    observableOutcome: 'Implement LSTM/Transformer architectures to track longitudinal learner skill mastery over chronological exercise logs.',
    bloomLevel: 'Create',
    version: '1.1',
    status: 'draft',
    provenance: {
      source: 'NeurIPS Deep Knowledge Tracing Adaptation Matrix',
      ruleRef: 'AIED-DKT-2024',
      type: 'synthetic',
      recordedDate: '2026-01-10',
    },
  },
  {
    id: 'skill-vector-db',
    stableId: 'ms-006',
    code: 'SKILL-VEC-06',
    name: 'HNSW Indexing & Vector Search Optimization',
    observableOutcome: 'Configure hierarchical navigable small world graphs for sub-millisecond approximate nearest neighbor retrieval.',
    bloomLevel: 'Apply',
    version: '1.0',
    status: 'published',
    provenance: {
      source: 'Malkov & Yashunin HNSW Technical Whitepaper',
      ruleRef: 'VEC-INDEX-01',
      type: 'source-backed',
      recordedDate: '2025-12-04',
    },
  },
]

export const INITIAL_COMPETENCIES: CompetencyModel[] = [
  {
    id: 'comp-semantic-arch',
    stableId: 'comp-uuid-01',
    code: 'COMP-SEM-01',
    name: 'Graph Semantic Architecture & Modeling',
    definition: 'Engineering formal semantic data schemas, ontologies, and property graph representations for corporate enterprise data.',
    version: '1.0',
    status: 'published',
    derivationRef: 'ACM Computing Curricula 2023 / Knowledge Representation & Reasoning',
    skillIds: ['skill-cypher', 'skill-owl-rdf'],
    updatedAt: '2026-02-14',
  },
  {
    id: 'comp-graph-ml',
    stableId: 'comp-uuid-02',
    code: 'COMP-GML-02',
    name: 'Graph Machine Learning & Embeddings',
    definition: 'Applying geometric deep learning, representation learning, and neural message passing over connected topology networks.',
    version: '1.0',
    status: 'published',
    derivationRef: 'IEEE Computational Intelligence Society AI Taxonomy 2025',
    skillIds: ['skill-gnn', 'skill-embeddings'],
    updatedAt: '2026-02-18',
  },
  {
    id: 'comp-adaptive-sys',
    stableId: 'comp-uuid-03',
    code: 'COMP-ADP-03',
    name: 'Adaptive Learning Engines & Cognitive Diagnostics',
    definition: 'Designing personalized Bayesian and neural knowledge tracing architectures for prescriptive recommendation loops.',
    version: '1.1',
    status: 'draft',
    derivationRef: 'International Artificial Intelligence in Education Society Standard',
    skillIds: ['skill-dkt', 'skill-vector-db'],
    updatedAt: '2026-03-01',
  },
]

export const INITIAL_PREREQUISITES: PrerequisiteEdge[] = [
  {
    id: 'pre-1',
    sourceSkillId: 'skill-cypher',
    targetSkillId: 'skill-embeddings',
    requiredThreshold: 75,
    type: 'hard_prerequisite',
    ruleRef: 'PREREQ-RULE-01',
  },
  {
    id: 'pre-2',
    sourceSkillId: 'skill-embeddings',
    targetSkillId: 'skill-gnn',
    requiredThreshold: 80,
    type: 'hard_prerequisite',
    ruleRef: 'PREREQ-RULE-02',
  },
  {
    id: 'pre-3',
    sourceSkillId: 'skill-owl-rdf',
    targetSkillId: 'skill-cypher',
    requiredThreshold: 70,
    type: 'recommended',
    ruleRef: 'PREREQ-RULE-03',
  },
  {
    id: 'pre-4',
    sourceSkillId: 'skill-gnn',
    targetSkillId: 'skill-dkt',
    requiredThreshold: 85,
    type: 'hard_prerequisite',
    ruleRef: 'PREREQ-RULE-04',
  },
]

export const INITIAL_TARGET_ROLES: TargetRoleModel[] = [
  {
    id: 'role-ai-arch-v1',
    stableId: 'role-uuid-001',
    code: 'ROLE-AI-ARCH',
    title: 'AI Knowledge Architect',
    department: 'Machine Learning & Cognitive Architecture',
    description: 'Enterprise architect responsible for multi-modal knowledge modeling, graph ML pipelines, and ontological integration.',
    version: '1.0',
    status: 'published',
    competencyIds: ['comp-semantic-arch', 'comp-graph-ml'],
    skillTargets: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL & Pattern Matching', threshold: 85, weight: 1.5, mandatory: true },
      { skillId: 'skill-owl-rdf', skillCode: 'SKILL-RDF-04', skillName: 'RDF Schema & OWL 2 DL Ontologies', threshold: 75, weight: 1.0, mandatory: true },
      { skillId: 'skill-gnn', skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks & Message Passing', threshold: 80, weight: 2.0, mandatory: true },
      { skillId: 'skill-embeddings', skillCode: 'SKILL-EMB-03', skillName: 'Random Walk & Node2Vec Embeddings', threshold: 70, weight: 1.0, mandatory: false },
    ],
    activeEnrollments: 24,
    updatedAt: '2026-02-10',
    provenanceRef: 'Corporate Job Architecture Level 6 / Tech Spec 2026',
  },
  {
    id: 'role-ai-arch-v1.1-draft',
    stableId: 'role-uuid-001',
    code: 'ROLE-AI-ARCH',
    title: 'AI Knowledge Architect',
    department: 'Machine Learning & Cognitive Architecture',
    description: 'Updated draft incorporating Vector Search Optimization and Deep Knowledge Tracing into core requirements.',
    version: '1.1',
    status: 'draft',
    competencyIds: ['comp-semantic-arch', 'comp-graph-ml', 'comp-adaptive-sys'],
    skillTargets: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL & Pattern Matching', threshold: 85, weight: 1.5, mandatory: true },
      { skillId: 'skill-owl-rdf', skillCode: 'SKILL-RDF-04', skillName: 'RDF Schema & OWL 2 DL Ontologies', threshold: 80, weight: 1.2, mandatory: true },
      { skillId: 'skill-gnn', skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks & Message Passing', threshold: 85, weight: 2.0, mandatory: true },
      { skillId: 'skill-embeddings', skillCode: 'SKILL-EMB-03', skillName: 'Random Walk & Node2Vec Embeddings', threshold: 75, weight: 1.0, mandatory: false },
      { skillId: 'skill-dkt', skillCode: 'SKILL-DKT-05', skillName: 'Dynamic Deep Knowledge Tracing', threshold: 75, weight: 1.8, mandatory: true },
      { skillId: 'skill-vector-db', skillCode: 'SKILL-VEC-06', skillName: 'HNSW Indexing & Vector Search Optimization', threshold: 80, weight: 1.5, mandatory: false },
    ],
    activeEnrollments: 0,
    updatedAt: '2026-03-02',
    provenanceRef: 'Corporate Job Architecture Level 6 (Draft Revision Q1)',
  },
  {
    id: 'role-mlops-v2',
    stableId: 'role-uuid-002',
    code: 'ROLE-MLOPS-02',
    title: 'Senior MLOps & Graph Systems Engineer',
    department: 'Platform Engineering',
    description: 'Infrastructure specialist maintaining distributed vector stores, graph databases, and continuous model inference services.',
    version: '2.0',
    status: 'published',
    competencyIds: ['comp-semantic-arch'],
    skillTargets: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL & Pattern Matching', threshold: 90, weight: 2.0, mandatory: true },
      { skillId: 'skill-vector-db', skillCode: 'SKILL-VEC-06', skillName: 'HNSW Indexing & Vector Search Optimization', threshold: 85, weight: 1.5, mandatory: true },
    ],
    activeEnrollments: 18,
    updatedAt: '2026-01-22',
    provenanceRef: 'Infrastructure Engineering Matrix v2.0',
  },
]

export const INITIAL_MODULES: LearningModuleModel[] = [
  {
    id: 'mod-cypher-mastery',
    stableId: 'mod-uuid-01',
    code: 'MOD-CYP-101',
    title: 'Accelerated Cypher Querying & Pattern Traversal',
    version: '1.0',
    status: 'published',
    durationMinutes: 45,
    sampleContentUri: 'https://learning.adaptlearn.internal/modules/cypher-101/index.html',
    teachesSkillIds: ['skill-cypher'],
    activePlanEnrollments: 36,
    updatedAt: '2026-01-18',
  },
  {
    id: 'mod-gnn-fundamentals',
    stableId: 'mod-uuid-02',
    code: 'MOD-GNN-201',
    title: 'Hands-on Geometric Deep Learning & Message Passing',
    version: '1.0',
    status: 'published',
    durationMinutes: 75,
    sampleContentUri: 'https://learning.adaptlearn.internal/modules/gnn-201/interactive-lab.ipynb',
    teachesSkillIds: ['skill-gnn', 'skill-embeddings'],
    activePlanEnrollments: 28,
    updatedAt: '2026-02-01',
  },
  {
    id: 'mod-owl-foundations',
    stableId: 'mod-uuid-03',
    code: 'MOD-ONT-301',
    title: 'Enterprise Ontology Modeling with OWL 2 & Protege',
    version: '1.0',
    status: 'published',
    durationMinutes: 60,
    sampleContentUri: 'https://learning.adaptlearn.internal/modules/owl-301/protege-guide.pdf',
    teachesSkillIds: ['skill-owl-rdf'],
    activePlanEnrollments: 14,
    updatedAt: '2026-01-30',
  },
  {
    id: 'mod-dkt-advanced',
    stableId: 'mod-uuid-04',
    code: 'MOD-DKT-401',
    title: 'Personalized Cognitive Modeling with Transformer DKT',
    version: '1.1',
    status: 'draft',
    durationMinutes: 90,
    sampleContentUri: 'https://learning.adaptlearn.internal/modules/dkt-401/spec.html',
    teachesSkillIds: ['skill-dkt'],
    activePlanEnrollments: 0,
    updatedAt: '2026-02-25',
  },
  {
    id: 'mod-legacy-sql-graph',
    stableId: 'mod-uuid-05',
    code: 'MOD-LEG-001',
    title: 'Legacy Relational-to-Graph Migration Fundamentals',
    version: '1.0',
    status: 'archived',
    durationMinutes: 30,
    sampleContentUri: 'https://learning.adaptlearn.internal/modules/legacy-001/archive.pdf',
    teachesSkillIds: ['skill-cypher'],
    activePlanEnrollments: 4,
    replacementModuleId: 'mod-cypher-mastery',
    updatedAt: '2025-10-10',
  },
]

export const INITIAL_QUESTIONS: QuizQuestionModel[] = [
  {
    id: 'q-01',
    stableId: 'qu-001',
    code: 'QUE-CYP-01',
    prompt: 'In Neo4j Cypher, which clause ensures an idempotent node creation by checking for existing property matches before inserting?',
    options: ['CREATE UNIQUE', 'MERGE', 'UPSERT INTO', 'MATCH OR CREATE'],
    correctAnswerIndex: 1,
    feedback: 'The MERGE clause in Cypher acts as a combined MATCH or CREATE, matching existing graph patterns or creating them if missing.',
    assessedSkillId: 'skill-cypher',
    version: '1.0',
    status: 'published',
    difficulty: 'Foundation',
    provenance: 'Neo4j Cypher Reference Manual v5 (DDL Spec)',
  },
  {
    id: 'q-02',
    stableId: 'qu-002',
    code: 'QUE-CYP-02',
    prompt: 'How do you enforce a schema constraint requiring that every (:Person) node possesses a globally distinct `email` property?',
    options: [
      'CREATE CONSTRAINT ON (p:Person) ASSERT p.email IS UNIQUE',
      'CREATE CONSTRAINT FOR (p:Person) REQUIRE p.email IS UNIQUE',
      'ALTER TABLE Person ADD CONSTRAINT UNIQUE(email)',
      'CREATE INDEX FOR (p:Person) ON (p.email) UNIQUE',
    ],
    correctAnswerIndex: 1,
    feedback: 'In modern Cypher (5.x+), constraints are declared using the syntax: CREATE CONSTRAINT [name] FOR (p:Label) REQUIRE p.property IS UNIQUE.',
    assessedSkillId: 'skill-cypher',
    version: '1.0',
    status: 'published',
    difficulty: 'Intermediate',
    provenance: 'Neo4j Certified Professional Exam Bank Q44',
  },
  {
    id: 'q-03',
    stableId: 'qu-003',
    code: 'QUE-GNN-01',
    prompt: 'What is the primary role of neighborhood aggregation in spatial Graph Convolutional Networks (GCN)?',
    options: [
      'Performing random edge dropout to avoid GPU memory overflow',
      'Pooling and transforming feature representations of neighboring nodes to update the target node state',
      'Converting unstructured text nodes into one-hot token vectors',
      'Computing shortest paths between non-adjacent subgraphs',
    ],
    correctAnswerIndex: 1,
    feedback: 'Neighborhood aggregation collects feature vectors from 1-hop connected nodes, sums or averages them with learnable weights, and updates the ego-node representation.',
    assessedSkillId: 'skill-gnn',
    version: '1.0',
    status: 'published',
    difficulty: 'Intermediate',
    provenance: 'Kipf & Welling GCN Formulation (ICLR 2017)',
  },
  {
    id: 'q-04',
    stableId: 'qu-004',
    code: 'QUE-GNN-02',
    prompt: 'When training very deep GNNs (e.g. >8 layers), what catastrophic phenomenon typically degrades all node representations to identical vectors?',
    options: ['Vanishing gradients', 'Over-smoothing', 'Negative sampling explosion', 'Graph isomorphism collapse'],
    correctAnswerIndex: 1,
    feedback: 'Over-smoothing occurs when excessive neighborhood convolutions cause node embeddings across the entire graph to converge to indistinguishable mean vectors.',
    assessedSkillId: 'skill-gnn',
    version: '1.0',
    status: 'published',
    difficulty: 'Advanced',
    provenance: 'Stanford CS224W Lecture 7: Deep GNN Limitations',
  },
  {
    id: 'q-05',
    stableId: 'qu-005',
    code: 'QUE-EMB-01',
    prompt: 'In Node2Vec, which hyperparameter governs the likelihood of immediately revisiting the node just traversed in the random walk?',
    options: ['Parameter p (return parameter)', 'Parameter q (in-out parameter)', 'Walk length l', 'Negative sample rate k'],
    correctAnswerIndex: 0,
    feedback: 'Parameter p controls the probability of returning to the previous node, balancing local microscopic exploration with macro network exploration.',
    assessedSkillId: 'skill-embeddings',
    version: '1.0',
    status: 'published',
    difficulty: 'Foundation',
    provenance: 'Grover & Leskovec (KDD 2016)',
  },
  {
    id: 'q-06',
    stableId: 'qu-006',
    code: 'QUE-RDF-01',
    prompt: 'In OWL 2 DL, which property characteristic prevents a single individual from having two distinct values for that property?',
    options: ['SymmetricProperty', 'TransitiveProperty', 'FunctionalProperty', 'InverseFunctionalProperty'],
    correctAnswerIndex: 2,
    feedback: 'A FunctionalProperty connects an individual to at most one target value (e.g. hasBirthMother).',
    assessedSkillId: 'skill-owl-rdf',
    version: '1.0',
    status: 'published',
    difficulty: 'Intermediate',
    provenance: 'W3C OWL 2 Primer Section 3.2',
  },
  {
    id: 'q-07',
    stableId: 'qu-007',
    code: 'QUE-VEC-01',
    prompt: 'Why does the Hierarchical Navigable Small World (HNSW) graph achieve logarithmic search time for high-dimensional embeddings?',
    options: [
      'It utilizes multi-layer graphs where upper layers maintain long-range links and bottom layers maintain dense local links',
      'It computes exact Euclidean distance against all stored vectors on GPU clusters',
      'It hashes vectors into 8-bit integers using Locality-Sensitive Hashing without graph edges',
      'It projects vectors onto 2D PCA planes before cosine indexing',
    ],
    correctAnswerIndex: 0,
    feedback: 'HNSW constructs skip-list-style hierarchical layers, allowing fast coarse traversal on upper layers and fine-grained greedy search on lower layers.',
    assessedSkillId: 'skill-vector-db',
    version: '1.0',
    status: 'published',
    difficulty: 'Advanced',
    provenance: 'IEEE TPAMI Malkov & Yashunin (2020)',
  },
]

export const INITIAL_BLUEPRINTS: AssessmentBlueprintModel[] = [
  {
    id: 'bp-01',
    code: 'BP-AI-ARCH-BASELINE',
    title: 'AI Knowledge Architect Diagnostic Blueprint',
    targetType: 'role',
    targetId: 'role-ai-arch-v1',
    targetName: 'AI Knowledge Architect (v1.0)',
    version: '1.0',
    status: 'active',
    passThreshold: 80,
    requirements: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL', questionCount: 2 },
      { skillId: 'skill-gnn', skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks', questionCount: 2 },
      { skillId: 'skill-embeddings', skillCode: 'SKILL-EMB-03', skillName: 'Node2Vec Embeddings', questionCount: 1 },
      { skillId: 'skill-owl-rdf', skillCode: 'SKILL-RDF-04', skillName: 'OWL 2 DL Ontologies', questionCount: 1 },
    ],
    totalQuestions: 6,
    coverageStatus: 'fully_covered',
  },
  {
    id: 'bp-02',
    code: 'BP-GML-SPECIALIST',
    title: 'Graph Machine Learning Proficiency Blueprint',
    targetType: 'module',
    targetId: 'mod-gnn-fundamentals',
    targetName: 'Hands-on Geometric Deep Learning (MOD-GNN-201)',
    version: '1.0',
    status: 'draft',
    passThreshold: 75,
    requirements: [
      { skillId: 'skill-gnn', skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks', questionCount: 3 }, // Shortage: bank has 2
      { skillId: 'skill-embeddings', skillCode: 'SKILL-EMB-03', skillName: 'Node2Vec Embeddings', questionCount: 1 },
    ],
    totalQuestions: 4,
    coverageStatus: 'partial_shortage',
  },
]

export const INITIAL_PROVENANCE_LEDGER: ProvenanceRecord[] = [
  {
    id: 'prov-01',
    entityType: 'Micro-Skill',
    entityCode: 'SKILL-CYPHER-01',
    entityName: 'Neo4j Cypher DDL & Pattern Matching',
    sourceRef: 'Neo4j Professional Certification Manual 5.12',
    ruleRef: 'GRAPH-DDL-2025.1',
    versionDate: '2025-11-15',
    provenanceStatus: 'source-backed',
    notes: 'Directly verified against industry certification framework standard.',
  },
  {
    id: 'prov-02',
    entityType: 'Competency',
    entityCode: 'COMP-SEM-01',
    entityName: 'Graph Semantic Architecture & Modeling',
    sourceRef: 'ACM Computing Curricula 2023',
    ruleRef: 'ACM-KRR-2023',
    versionDate: '2026-02-14',
    provenanceStatus: 'source-backed',
    notes: 'Derived from ACM body of knowledge module on Knowledge Representation.',
  },
  {
    id: 'prov-03',
    entityType: 'Prerequisite',
    entityCode: 'SKILL-CYPHER -> SKILL-EMB',
    entityName: 'Prerequisite Edge (Cypher -> Embeddings)',
    sourceRef: 'L&D Pedagogical Curriculum Council Rule 8',
    ruleRef: 'PEDAGOGY-SEQ-08',
    versionDate: '2025-09-12',
    provenanceStatus: 'derived',
    notes: 'Learners must query graphs before calculating random walk matrix transitions.',
  },
  {
    id: 'prov-04',
    entityType: 'Micro-Skill',
    entityCode: 'SKILL-DKT-05',
    entityName: 'Dynamic Deep Knowledge Tracing',
    sourceRef: 'Internal LLM Curriculum Synthesis Engine',
    ruleRef: 'SYNTH-AIED-2026',
    versionDate: '2026-01-10',
    provenanceStatus: 'synthetic',
    notes: 'Synthetically generated based on frontier AI research papers awaiting formal board audit.',
  },
]

export const LEARNING_OUTCOME_COHORTS: LearningOutcomeCohort[] = [
  {
    id: 'coh-01',
    cohortName: 'Q1 AI Architecture Onboarding Cohort',
    department: 'Machine Learning & Cognitive Architecture',
    targetRole: 'AI Knowledge Architect',
    learnerCount: 16,
    avgScore: 84.5,
    completionRate: 91.2,
    gapClosureRate: 78.4,
    velocityTrend: '+16.2% vs Q4',
    status: 'Exceeding',
  },
  {
    id: 'coh-02',
    cohortName: 'Platform Data Engineers Up-skilling',
    department: 'Platform Engineering',
    targetRole: 'Senior MLOps & Graph Systems Engineer',
    learnerCount: 12,
    avgScore: 76.8,
    completionRate: 83.3,
    gapClosureRate: 64.0,
    velocityTrend: '+9.4% vs Q4',
    status: 'On Track',
  },
  {
    id: 'coh-03',
    cohortName: 'Enterprise Data Analysts Cross-Skilling',
    department: 'Data Analytics & BI',
    targetRole: 'AI Knowledge Architect',
    learnerCount: 8,
    avgScore: 61.2,
    completionRate: 58.0,
    gapClosureRate: 42.5,
    velocityTrend: '-3.1% vs Q4',
    status: 'Attention',
  },
]

export const SKILL_ACQUISITION_METRICS: SkillAcquisitionMetric[] = [
  { skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL', masteryRate: 92, avgAttemptsToPass: 1.3, difficultyTag: 'High Velocity' },
  { skillCode: 'SKILL-RDF-04', skillName: 'RDF Schema & OWL 2 DL', masteryRate: 84, avgAttemptsToPass: 1.8, difficultyTag: 'Standard' },
  { skillCode: 'SKILL-EMB-03', skillName: 'Node2Vec Embeddings', masteryRate: 78, avgAttemptsToPass: 2.1, difficultyTag: 'Standard' },
  { skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks & Message Passing', masteryRate: 63, avgAttemptsToPass: 3.4, difficultyTag: 'Bottleneck' },
  { skillCode: 'SKILL-VEC-06', skillName: 'HNSW Indexing & Vector Search', masteryRate: 71, avgAttemptsToPass: 2.4, difficultyTag: 'Standard' },
]
