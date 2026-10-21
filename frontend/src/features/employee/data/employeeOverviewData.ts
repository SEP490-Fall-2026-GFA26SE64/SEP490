export interface ProfileStatistics {
  overallMasteryPercentage: number
  totalSkillsEvaluated: number
  masteredSkillsCount: number
  inProgressSkillsCount: number
  criticalGapsCount: number
  pathwayProgressPercentage: number
  completedModulesCount: number
  totalPathwayModules: number
  bktConfidencePercentage: number
  hoursSavedViaAdaptivity: number
  lastAssessedDate: string
}

export interface RadarDimension {
  id: string
  axisName: string
  category: string
  currentLevel: number // 0 to 100
  requiredLevel: number // 0 to 100
  benchmarkRole: string
}

export type EvidenceType = 'assessment' | 'endorsement' | 'work_proof' | 'module'

export interface EvidenceSource {
  id: string
  type: EvidenceType
  title: string
  providerOrIssuer: string
  date: string
  scoreOrLevel?: string
  verificationStatus: 'verified' | 'pending' | 'endorsed'
  notes?: string
}

export interface TeachingModuleInfo {
  id: string
  moduleCode: string
  title: string
  description: string
  status: 'completed' | 'in_progress' | 'not_started'
  estimatedDurationMinutes: number
  order: number
}

export interface CompetencySkillProfile {
  id: string
  skillCode?: string
  name: string
  category: 'Graph Architecture' | 'AI & Knowledge Tracing' | 'Distributed Systems' | 'Data Persistence' | 'Semantic Web' | (string & {})
  estimatedMastery: number // 0 to 100
  targetRoleRequirement: number // 0 to 100
  status: 'mastered' | 'in_progress' | 'critical_gap'
  bktConfidence: number // Bayesian probability estimate
  evidenceCount?: number
  evidenceSources?: EvidenceSource[]
  recommendedModule?: string
  teachingModule?: TeachingModuleInfo
}

export interface TargetRoleBenchmark {
  roleId: string
  roleTitle: string
  department: string
  readinessPercentage: number
  dimensions: {
    axisName: string
    currentLevel: number
    requiredLevel: number
  }[]
}

export const EMPLOYEE_PROFILE_STATS: ProfileStatistics = {
  overallMasteryPercentage: 74,
  totalSkillsEvaluated: 18,
  masteredSkillsCount: 11,
  inProgressSkillsCount: 4,
  criticalGapsCount: 3,
  pathwayProgressPercentage: 68,
  completedModulesCount: 6,
  totalPathwayModules: 9,
  bktConfidencePercentage: 91,
  hoursSavedViaAdaptivity: 38.5,
  lastAssessedDate: '2026-09-18',
}

export const LEARNER_PROFILE_STATS = EMPLOYEE_PROFILE_STATS

export const TARGET_ROLE_BENCHMARKS: Record<string, TargetRoleBenchmark> = {
  'ai-knowledge-architect': {
    roleId: 'ai-knowledge-architect',
    roleTitle: 'AI Knowledge Architect',
    department: 'Enterprise AI & Ontologies',
    readinessPercentage: 78,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 88, requiredLevel: 85 },
      { axisName: 'Generative AI', currentLevel: 82, requiredLevel: 90 },
      { axisName: 'Machine Learning', currentLevel: 75, requiredLevel: 85 },
      { axisName: 'Responsible AI', currentLevel: 70, requiredLevel: 85 },
      { axisName: 'AI literacy', currentLevel: 90, requiredLevel: 80 },
      { axisName: 'Innovation', currentLevel: 80, requiredLevel: 85 },
      { axisName: 'Communication', currentLevel: 75, requiredLevel: 80 },
      { axisName: 'Leadership and Management', currentLevel: 65, requiredLevel: 75 },
    ],
  },
  'senior-backend-engineer': {
    roleId: 'senior-backend-engineer',
    roleTitle: 'Senior Backend Engineer',
    department: 'Core Platform Engineering',
    readinessPercentage: 94,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 92, requiredLevel: 90 },
      { axisName: 'Generative AI', currentLevel: 68, requiredLevel: 60 },
      { axisName: 'Machine Learning', currentLevel: 60, requiredLevel: 55 },
      { axisName: 'Responsible AI', currentLevel: 75, requiredLevel: 70 },
      { axisName: 'AI literacy', currentLevel: 85, requiredLevel: 75 },
      { axisName: 'Innovation', currentLevel: 88, requiredLevel: 85 },
      { axisName: 'Communication', currentLevel: 82, requiredLevel: 80 },
      { axisName: 'Leadership and Management', currentLevel: 78, requiredLevel: 75 },
    ],
  },
  'graph-data-scientist': {
    roleId: 'graph-data-scientist',
    roleTitle: 'Graph Data Scientist',
    department: 'Research & Advanced Analytics',
    readinessPercentage: 69,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 82, requiredLevel: 80 },
      { axisName: 'Generative AI', currentLevel: 72, requiredLevel: 85 },
      { axisName: 'Machine Learning', currentLevel: 70, requiredLevel: 95 },
      { axisName: 'Responsible AI', currentLevel: 72, requiredLevel: 85 },
      { axisName: 'AI literacy', currentLevel: 85, requiredLevel: 85 },
      { axisName: 'Innovation', currentLevel: 76, requiredLevel: 85 },
      { axisName: 'Communication', currentLevel: 70, requiredLevel: 75 },
      { axisName: 'Leadership and Management', currentLevel: 58, requiredLevel: 70 },
    ],
  },
}

export const TARGET_SKILL_BENCHMARKS: Record<string, TargetRoleBenchmark> = {
  'gemini-orchestration': {
    roleId: 'gemini-orchestration',
    roleTitle: 'Google Gemini & LLM Orchestration',
    department: 'Generative AI & Tooling',
    readinessPercentage: 74,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 85, requiredLevel: 85 },
      { axisName: 'Generative AI', currentLevel: 86, requiredLevel: 95 },
      { axisName: 'Machine Learning', currentLevel: 74, requiredLevel: 80 },
      { axisName: 'Responsible AI', currentLevel: 78, requiredLevel: 85 },
      { axisName: 'AI literacy', currentLevel: 92, requiredLevel: 90 },
      { axisName: 'Innovation', currentLevel: 84, requiredLevel: 85 },
      { axisName: 'Communication', currentLevel: 76, requiredLevel: 75 },
      { axisName: 'Leadership and Management', currentLevel: 62, requiredLevel: 65 },
    ],
  },
  'cypher-traversal': {
    roleId: 'cypher-traversal',
    roleTitle: 'Neo4j Cypher Traversal & Querying',
    department: 'Graph Query Engine',
    readinessPercentage: 79,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 90, requiredLevel: 85 },
      { axisName: 'Generative AI', currentLevel: 62, requiredLevel: 65 },
      { axisName: 'Machine Learning', currentLevel: 68, requiredLevel: 70 },
      { axisName: 'Responsible AI', currentLevel: 70, requiredLevel: 75 },
      { axisName: 'AI literacy', currentLevel: 82, requiredLevel: 75 },
      { axisName: 'Innovation', currentLevel: 82, requiredLevel: 80 },
      { axisName: 'Communication', currentLevel: 72, requiredLevel: 70 },
      { axisName: 'Leadership and Management', currentLevel: 60, requiredLevel: 65 },
    ],
  },
  'python-core': {
    roleId: 'python-core',
    roleTitle: 'Python Core & Async Semantics',
    department: 'Language Engineering',
    readinessPercentage: 86,
    dimensions: [
      { axisName: 'Knowledge', currentLevel: 94, requiredLevel: 90 },
      { axisName: 'Generative AI', currentLevel: 70, requiredLevel: 70 },
      { axisName: 'Machine Learning', currentLevel: 82, requiredLevel: 85 },
      { axisName: 'Responsible AI', currentLevel: 75, requiredLevel: 75 },
      { axisName: 'AI literacy', currentLevel: 86, requiredLevel: 80 },
      { axisName: 'Innovation', currentLevel: 88, requiredLevel: 85 },
      { axisName: 'Communication', currentLevel: 80, requiredLevel: 75 },
      { axisName: 'Leadership and Management', currentLevel: 72, requiredLevel: 70 },
    ],
  },
}

export function normalizeRoleKey(roleTitleOrKey?: string | null): string {
  if (!roleTitleOrKey) return 'ai-knowledge-architect'
  const lower = roleTitleOrKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (lower.includes('backend')) return 'senior-backend-engineer'
  if (lower.includes('scientist') || lower.includes('data')) return 'graph-data-scientist'
  return 'ai-knowledge-architect'
}

export function normalizeSkillKey(skillTitleOrKey?: string | null): string {
  if (!skillTitleOrKey) return 'gemini-orchestration'
  const lower = skillTitleOrKey.toLowerCase()
  if (lower.includes('cypher') || lower.includes('neo4j')) return 'cypher-traversal'
  if (lower.includes('python')) return 'python-core'
  return 'gemini-orchestration'
}

export const COMPETENCY_SKILL_PROFILES: CompetencySkillProfile[] = [
  // Module 1: MOD-101 (Foundations of Knowledge Graphs & RDF Triples) - Completed
  {
    id: 'sk-1',
    skillCode: 'SK-RDF-01',
    name: 'RDF TripleStore Data Model',
    category: 'Semantic Web',
    estimatedMastery: 92,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 95,
    teachingModule: {
      id: 'mod-101',
      moduleCode: 'MOD-101',
      title: 'Foundations of Knowledge Graphs & RDF Triples',
      description: 'Semantic web foundations, W3C standards, RDF subject-predicate-object triples, and SPARQL 1.1 query syntax.',
      status: 'completed',
      estimatedDurationMinutes: 240,
      order: 1,
    },
  },
  {
    id: 'sk-2',
    skillCode: 'SK-SPARQL-02',
    name: 'SPARQL 1.1 Query Engine',
    category: 'Semantic Web',
    estimatedMastery: 88,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 94,
    teachingModule: {
      id: 'mod-101',
      moduleCode: 'MOD-101',
      title: 'Foundations of Knowledge Graphs & RDF Triples',
      description: 'Semantic web foundations, W3C standards, RDF subject-predicate-object triples, and SPARQL 1.1 query syntax.',
      status: 'completed',
      estimatedDurationMinutes: 240,
      order: 1,
    },
  },
  {
    id: 'sk-3',
    skillCode: 'SK-TURTLE-03',
    name: 'Turtle & TriG Serialization',
    category: 'Semantic Web',
    estimatedMastery: 95,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 98,
    teachingModule: {
      id: 'mod-101',
      moduleCode: 'MOD-101',
      title: 'Foundations of Knowledge Graphs & RDF Triples',
      description: 'Semantic web foundations, W3C standards, RDF subject-predicate-object triples, and SPARQL 1.1 query syntax.',
      status: 'completed',
      estimatedDurationMinutes: 240,
      order: 1,
    },
  },
  {
    id: 'sk-4',
    skillCode: 'SK-ONT-04',
    name: 'RDFS Taxonomies & Subclasses',
    category: 'Semantic Web',
    estimatedMastery: 90,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 93,
    teachingModule: {
      id: 'mod-101',
      moduleCode: 'MOD-101',
      title: 'Foundations of Knowledge Graphs & RDF Triples',
      description: 'Semantic web foundations, W3C standards, RDF subject-predicate-object triples, and SPARQL 1.1 query syntax.',
      status: 'completed',
      estimatedDurationMinutes: 240,
      order: 1,
    },
  },

  // Module 2: MOD-204 (Property Graph Architecture with Neo4j & Cypher) - Completed
  {
    id: 'sk-5',
    skillCode: 'SK-CYP-01',
    name: 'Declarative Cypher MATCH & MERGE',
    category: 'Graph Architecture',
    estimatedMastery: 91,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 96,
    teachingModule: {
      id: 'mod-204',
      moduleCode: 'MOD-204',
      title: 'Property Graph Architecture with Neo4j & Cypher',
      description: 'LPG (Labeled Property Graph) database systems, index-free adjacency, declarative Cypher querying, and APOC procedures.',
      status: 'completed',
      estimatedDurationMinutes: 360,
      order: 2,
    },
  },
  {
    id: 'sk-6',
    skillCode: 'SK-NEO-02',
    name: 'Index-Free Adjacency & Schema Constraints',
    category: 'Graph Architecture',
    estimatedMastery: 85,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 92,
    teachingModule: {
      id: 'mod-204',
      moduleCode: 'MOD-204',
      title: 'Property Graph Architecture with Neo4j & Cypher',
      description: 'LPG (Labeled Property Graph) database systems, index-free adjacency, declarative Cypher querying, and APOC procedures.',
      status: 'completed',
      estimatedDurationMinutes: 360,
      order: 2,
    },
  },
  {
    id: 'sk-7',
    skillCode: 'SK-APOC-03',
    name: 'APOC Graph Procedures & Refactoring',
    category: 'Graph Architecture',
    estimatedMastery: 82,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 89,
    teachingModule: {
      id: 'mod-204',
      moduleCode: 'MOD-204',
      title: 'Property Graph Architecture with Neo4j & Cypher',
      description: 'LPG (Labeled Property Graph) database systems, index-free adjacency, declarative Cypher querying, and APOC procedures.',
      status: 'completed',
      estimatedDurationMinutes: 360,
      order: 2,
    },
  },
  {
    id: 'sk-8',
    skillCode: 'SK-OPT-04',
    name: 'Cypher Query Profiling (EXPLAIN / PROFILE)',
    category: 'Graph Architecture',
    estimatedMastery: 87,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 94,
    teachingModule: {
      id: 'mod-204',
      moduleCode: 'MOD-204',
      title: 'Property Graph Architecture with Neo4j & Cypher',
      description: 'LPG (Labeled Property Graph) database systems, index-free adjacency, declarative Cypher querying, and APOC procedures.',
      status: 'completed',
      estimatedDurationMinutes: 360,
      order: 2,
    },
  },

  // Module 3: MOD-301 (Graph Neural Networks & Node Embeddings) - In Progress
  {
    id: 'sk-9',
    skillCode: 'SK-N2V-01',
    name: 'Node2Vec & Random Walk Embeddings',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 82,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 90,
    teachingModule: {
      id: 'mod-301',
      moduleCode: 'MOD-301',
      title: 'Graph Neural Networks & Node Embeddings',
      description: 'Representation learning on graphs, shallow embedding techniques, and deep graph convolution networks.',
      status: 'in_progress',
      estimatedDurationMinutes: 480,
      order: 3,
    },
  },
  {
    id: 'sk-10',
    skillCode: 'SK-PYG-02',
    name: 'PyTorch Geometric (PyG) Pipeline',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 75,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 88,
    teachingModule: {
      id: 'mod-301',
      moduleCode: 'MOD-301',
      title: 'Graph Neural Networks & Node Embeddings',
      description: 'Representation learning on graphs, shallow embedding techniques, and deep graph convolution networks.',
      status: 'in_progress',
      estimatedDurationMinutes: 480,
      order: 3,
    },
  },
  {
    id: 'sk-11',
    skillCode: 'SK-SAGE-03',
    name: 'GraphSAGE Inductive Neighbor Aggregation',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 35,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 80,
    teachingModule: {
      id: 'mod-301',
      moduleCode: 'MOD-301',
      title: 'Graph Neural Networks & Node Embeddings',
      description: 'Representation learning on graphs, shallow embedding techniques, and deep graph convolution networks.',
      status: 'in_progress',
      estimatedDurationMinutes: 480,
      order: 3,
    },
  },
  {
    id: 'sk-12',
    skillCode: 'SK-COS-04',
    name: 'Vector Cosine Similarity Clustering',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 88,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 94,
    teachingModule: {
      id: 'mod-301',
      moduleCode: 'MOD-301',
      title: 'Graph Neural Networks & Node Embeddings',
      description: 'Representation learning on graphs, shallow embedding techniques, and deep graph convolution networks.',
      status: 'in_progress',
      estimatedDurationMinutes: 480,
      order: 3,
    },
  },

  // Module 4: MOD-305 (Bayesian Knowledge Tracing & Skill Estimation) - Upcoming
  {
    id: 'sk-13',
    skillCode: 'SK-BKT-01',
    name: 'Hidden Markov Models for Skill Mastery',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 20,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 75,
    teachingModule: {
      id: 'mod-305',
      moduleCode: 'MOD-305',
      title: 'Bayesian Knowledge Tracing & Skill Estimation',
      description: 'Probabilistic graphical models and deep neural networks for continuous latent skill estimation from assessment data.',
      status: 'not_started',
      estimatedDurationMinutes: 600,
      order: 4,
    },
  },
  {
    id: 'sk-14',
    skillCode: 'SK-BKT-02',
    name: 'Slip & Guess Probability Tuning',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 15,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 72,
    teachingModule: {
      id: 'mod-305',
      moduleCode: 'MOD-305',
      title: 'Bayesian Knowledge Tracing & Skill Estimation',
      description: 'Probabilistic graphical models and deep neural networks for continuous latent skill estimation from assessment data.',
      status: 'not_started',
      estimatedDurationMinutes: 600,
      order: 4,
    },
  },
  {
    id: 'sk-15',
    skillCode: 'SK-DKT-03',
    name: 'Deep Knowledge Tracing (DKT with LSTM)',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 10,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 70,
    teachingModule: {
      id: 'mod-305',
      moduleCode: 'MOD-305',
      title: 'Bayesian Knowledge Tracing & Skill Estimation',
      description: 'Probabilistic graphical models and deep neural networks for continuous latent skill estimation from assessment data.',
      status: 'not_started',
      estimatedDurationMinutes: 600,
      order: 4,
    },
  },

  // Module 5: MOD-401 (Enterprise Competency Platform Capstone) - Capstone
  {
    id: 'sk-16',
    skillCode: 'SK-CAP-01',
    name: 'Event-Driven Neo4j Integration with Kafka',
    category: 'Distributed Systems',
    estimatedMastery: 10,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 70,
    teachingModule: {
      id: 'mod-401',
      moduleCode: 'MOD-401',
      title: 'Enterprise Competency Platform Capstone',
      description: 'End-to-end integration of Kafka streaming, graph microservices, real-time ROI forecasting, and automated gap mitigation.',
      status: 'not_started',
      estimatedDurationMinutes: 720,
      order: 5,
    },
  },
  {
    id: 'sk-17',
    skillCode: 'SK-CAP-02',
    name: 'Real-time ROI Forecasting & Skill Gap Mitigation',
    category: 'Distributed Systems',
    estimatedMastery: 5,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 65,
    teachingModule: {
      id: 'mod-401',
      moduleCode: 'MOD-401',
      title: 'Enterprise Competency Platform Capstone',
      description: 'End-to-end integration of Kafka streaming, graph microservices, real-time ROI forecasting, and automated gap mitigation.',
      status: 'not_started',
      estimatedDurationMinutes: 720,
      order: 5,
    },
  },
  {
    id: 'sk-18',
    skillCode: 'SK-CAP-03',
    name: 'Automated Remediation Pipeline',
    category: 'Distributed Systems',
    estimatedMastery: 5,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 65,
    teachingModule: {
      id: 'mod-401',
      moduleCode: 'MOD-401',
      title: 'Enterprise Competency Platform Capstone',
      description: 'End-to-end integration of Kafka streaming, graph microservices, real-time ROI forecasting, and automated gap mitigation.',
      status: 'not_started',
      estimatedDurationMinutes: 720,
      order: 5,
    },
  },
]

export const BACKEND_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'be-1',
    name: 'Event-Driven Microservices (Kafka / RabbitMQ)',
    category: 'Distributed Systems',
    estimatedMastery: 90,
    targetRoleRequirement: 90,
    status: 'mastered',
    bktConfidence: 96,
    evidenceCount: 3,
    recommendedModule: 'MOD-108: Kafka Event Processing Patterns',
    evidenceSources: [
      {
        id: 'ev-be-1',
        type: 'work_proof',
        title: 'PR #589: Event Streaming Architecture',
        providerOrIssuer: 'Platform Repo',
        date: '2026-07-28',
        scoreOrLevel: 'Production Verified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'be-2',
    name: 'Relational Schema Optimization (PostgreSQL)',
    category: 'Data Persistence',
    estimatedMastery: 88,
    targetRoleRequirement: 90,
    status: 'in_progress',
    bktConfidence: 94,
    evidenceCount: 2,
    recommendedModule: 'MOD-202: PostgreSQL Query Optimization & Indexing',
    evidenceSources: [
      {
        id: 'ev-be-2',
        type: 'assessment',
        title: 'PostgreSQL Indexing Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-08-15',
        scoreOrLevel: '88% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'be-3',
    name: 'Distributed Consensus & Replication (Raft / Paxos)',
    category: 'Distributed Systems',
    estimatedMastery: 72,
    targetRoleRequirement: 85,
    status: 'critical_gap',
    bktConfidence: 88,
    evidenceCount: 2,
    recommendedModule: 'MOD-304: Distributed Consensus Protocols',
    evidenceSources: [
      {
        id: 'ev-be-3',
        type: 'assessment',
        title: 'Consensus Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-01',
        scoreOrLevel: '72% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'be-4',
    name: 'Transactional Outbox & CQRS Synchronization',
    category: 'Data Persistence',
    estimatedMastery: 85,
    targetRoleRequirement: 90,
    status: 'in_progress',
    bktConfidence: 92,
    evidenceCount: 2,
    recommendedModule: 'MOD-205: Outbox Relay & Eventual Consistency',
    evidenceSources: [
      {
        id: 'ev-be-4',
        type: 'work_proof',
        title: 'Outbox Implementation in Order Service',
        providerOrIssuer: 'Order Pipeline',
        date: '2026-08-20',
        scoreOrLevel: 'Merged',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'be-5',
    name: 'High-Throughput gRPC & HTTP/2 Microservices',
    category: 'Distributed Systems',
    estimatedMastery: 92,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 95,
    evidenceCount: 3,
    recommendedModule: 'MOD-109: High-Throughput RPC Pipelines',
    evidenceSources: [
      {
        id: 'ev-be-5',
        type: 'work_proof',
        title: 'gRPC Interceptor & Protobuf Optimization',
        providerOrIssuer: 'Core Gateway',
        date: '2026-07-10',
        scoreOrLevel: 'Level 5 / Expert',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'be-6',
    name: 'Kubernetes Container Orchestration & Ingress',
    category: 'Distributed Systems',
    estimatedMastery: 68,
    targetRoleRequirement: 80,
    status: 'critical_gap',
    bktConfidence: 87,
    evidenceCount: 1,
    recommendedModule: 'MOD-208: Cloud-Native K8s Cluster Management',
    evidenceSources: [
      {
        id: 'ev-be-6',
        type: 'assessment',
        title: 'Kubernetes Pod Scheduling & RBAC',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-10',
        scoreOrLevel: '68% Score',
        verificationStatus: 'verified',
      },
    ],
  },
]

export const DATA_SCIENTIST_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'ds-1',
    name: 'Graph Neural Networks & Embeddings (PyG / Node2Vec)',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 55,
    targetRoleRequirement: 95,
    status: 'critical_gap',
    bktConfidence: 86,
    evidenceCount: 2,
    recommendedModule: 'MOD-301: Node2Vec & GraphSAGE in PyTorch Geometric',
    evidenceSources: [
      {
        id: 'ev-ds-1',
        type: 'work_proof',
        title: 'Skill Clustering with GraphSAGE',
        providerOrIssuer: 'MLflow Tracking Hub',
        date: '2026-09-05',
        scoreOrLevel: 'Verified Experiment',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'ds-2',
    name: 'Adaptive Knowledge Tracing (BKT / DKT Algorithms)',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 45,
    targetRoleRequirement: 85,
    status: 'critical_gap',
    bktConfidence: 89,
    evidenceCount: 2,
    recommendedModule: 'MOD-305: Bayesian Knowledge Tracing Algorithms',
    evidenceSources: [
      {
        id: 'ev-ds-2',
        type: 'assessment',
        title: 'Baseline DKT Theory Quiz',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-15',
        scoreOrLevel: '58% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'ds-3',
    name: 'Graph Algorithms & Centrality Metrics (PageRank / Betweenness)',
    category: 'Graph Architecture',
    estimatedMastery: 75,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 91,
    evidenceCount: 2,
    recommendedModule: 'MOD-207: Graph Data Science Library (GDS) Algorithms',
    evidenceSources: [
      {
        id: 'ev-ds-3',
        type: 'assessment',
        title: 'Graph Centrality Assessment',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-08-22',
        scoreOrLevel: '75% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'ds-4',
    name: 'Knowledge Graph Completion & Link Prediction',
    category: 'Semantic Web',
    estimatedMastery: 60,
    targetRoleRequirement: 90,
    status: 'critical_gap',
    bktConfidence: 88,
    evidenceCount: 2,
    recommendedModule: 'MOD-308: TransE & RotatE for Link Prediction',
    evidenceSources: [
      {
        id: 'ev-ds-4',
        type: 'work_proof',
        title: 'Link Prediction Benchmark on Enterprise Triples',
        providerOrIssuer: 'Research Team',
        date: '2026-08-30',
        scoreOrLevel: '60% Hit@10',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'ds-5',
    name: 'Knowledge Graph Modeling (RDF/OWL & Cypher)',
    category: 'Graph Architecture',
    estimatedMastery: 75,
    targetRoleRequirement: 80,
    status: 'in_progress',
    bktConfidence: 93,
    evidenceCount: 3,
    recommendedModule: 'MOD-204: Neo4j Semantic Modeling',
    evidenceSources: [
      {
        id: 'ev-ds-5',
        type: 'assessment',
        title: 'Diagnostic Graph Modeling Assessment',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-12',
        scoreOrLevel: '82% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'ds-6',
    name: 'Unsupervised Graph Clustering & Community Detection',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 70,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 90,
    evidenceCount: 2,
    recommendedModule: 'MOD-210: Louvain & Leiden Community Detection',
    evidenceSources: [
      {
        id: 'ev-ds-6',
        type: 'work_proof',
        title: 'Employee Cohort Segmentation via Louvain',
        providerOrIssuer: 'Analytics Hub',
        date: '2026-09-02',
        scoreOrLevel: 'Production Report',
        verificationStatus: 'verified',
      },
    ],
  },
]

export const GEMINI_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'gem-1',
    name: 'Structured JSON Output & Schema Enforcement',
    category: 'API Integration',
    estimatedMastery: 80,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 93,
    evidenceCount: 3,
    recommendedModule: 'MOD-GEM-101: Gemini SDK Structured Outputs & Pydantic',
    evidenceSources: [
      {
        id: 'ev-gem-1',
        type: 'assessment',
        title: 'Structured Output Diagnostic Exam',
        providerOrIssuer: 'Enterprise Cognitive Center',
        date: '2026-09-20',
        scoreOrLevel: '80% Score',
        verificationStatus: 'verified',
        notes: 'Demonstrated proficiency in response_schema validation and JSON parsing.',
      },
    ],
  },
  {
    id: 'gem-2',
    name: 'Multi-Turn Context Caching & System Prompts',
    category: 'Context Engineering',
    estimatedMastery: 90,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 96,
    evidenceCount: 3,
    recommendedModule: 'MOD-GEM-102: Context Optimization & Prompt Caching',
    evidenceSources: [
      {
        id: 'ev-gem-2',
        type: 'work_proof',
        title: 'PR #204: Cached Chat Sessions with TTL Management',
        providerOrIssuer: 'Enterprise Assistant Repo',
        date: '2026-09-18',
        scoreOrLevel: 'Merged & Deployed',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'gem-3',
    name: 'Function Calling & External Tool Orchestration',
    category: 'Agentic Tooling',
    estimatedMastery: 65,
    targetRoleRequirement: 90,
    status: 'critical_gap',
    bktConfidence: 89,
    evidenceCount: 2,
    recommendedModule: 'MOD-GEM-201: Agentic Function Calling & Tool Declarations',
    evidenceSources: [
      {
        id: 'ev-gem-3',
        type: 'assessment',
        title: 'Tool Calling Diagnostic Quiz',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-22',
        scoreOrLevel: '65% Score',
        verificationStatus: 'verified',
        notes: 'Identified gap in multi-step asynchronous function call loops.',
      },
    ],
  },
  {
    id: 'gem-4',
    name: 'Multimodal Audio, Image & Video Grounding',
    category: 'Multimodal Processing',
    estimatedMastery: 70,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 91,
    evidenceCount: 2,
    recommendedModule: 'MOD-GEM-203: Multimodal Vision & Audio Pipelines',
    evidenceSources: [
      {
        id: 'ev-gem-4',
        type: 'work_proof',
        title: 'Document OCR & Diagram Extraction with Gemini 1.5 Pro',
        providerOrIssuer: 'Doc-Parser Service',
        date: '2026-09-12',
        scoreOrLevel: 'Verified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'gem-5',
    name: 'Semantic Vector Embeddings & Similarity Search',
    category: 'Retrieval Augmentation',
    estimatedMastery: 55,
    targetRoleRequirement: 85,
    status: 'critical_gap',
    bktConfidence: 86,
    evidenceCount: 1,
    recommendedModule: 'MOD-GEM-301: Hybrid Dense/Sparse RAG Pipelines',
    evidenceSources: [
      {
        id: 'ev-gem-5',
        type: 'assessment',
        title: 'Embedding Indexing Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-14',
        scoreOrLevel: '55% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'gem-6',
    name: 'Bidirectional Live Streaming & Ephemeral Sessions',
    category: 'Realtime Streaming',
    estimatedMastery: 50,
    targetRoleRequirement: 80,
    status: 'critical_gap',
    bktConfidence: 84,
    evidenceCount: 1,
    recommendedModule: 'MOD-GEM-305: Gemini Live WebSockets & Voice Interactivity',
    evidenceSources: [
      {
        id: 'ev-gem-6',
        type: 'assessment',
        title: 'WebSocket Live API Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-24',
        scoreOrLevel: '50% Score',
        verificationStatus: 'verified',
      },
    ],
  },
]

export const CYPHER_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'cyp-1',
    name: 'Declarative Cypher MATCH & MERGE',
    category: 'Query Syntax',
    estimatedMastery: 91,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 97,
    evidenceCount: 3,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-cyp-1',
        type: 'assessment',
        title: 'Cypher Query Formative Quiz',
        providerOrIssuer: 'Graph Academy',
        date: '2026-09-10',
        scoreOrLevel: '91% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'cyp-2',
    name: 'Cypher Query Profiling (EXPLAIN / PROFILE)',
    category: 'Performance Tuning',
    estimatedMastery: 45,
    targetRoleRequirement: 80,
    status: 'critical_gap',
    bktConfidence: 87,
    evidenceCount: 2,
    recommendedModule: 'MOD-CYP-102: Execution Plan Profiling & DbHits Reduction',
    evidenceSources: [
      {
        id: 'ev-cyp-2',
        type: 'assessment',
        title: 'Execution Plan Diagnostic',
        providerOrIssuer: 'Graph Academy',
        date: '2026-09-18',
        scoreOrLevel: '45% Score',
        verificationStatus: 'verified',
        notes: 'Needs remediation in eliminating Eager operators and Cartesian products.',
      },
    ],
  },
  {
    id: 'cyp-3',
    name: 'Aggregation Pipelines (WITH / UNWIND / COLLECT)',
    category: 'Aggregation',
    estimatedMastery: 70,
    targetRoleRequirement: 80,
    status: 'in_progress',
    bktConfidence: 90,
    evidenceCount: 2,
    recommendedModule: 'MOD-CYP-103: Advanced Graph Aggregations & List Unwinding',
    evidenceSources: [
      {
        id: 'ev-cyp-3',
        type: 'assessment',
        title: 'Collection Pipeline Assessment',
        providerOrIssuer: 'Graph Academy',
        date: '2026-09-15',
        scoreOrLevel: '70% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'cyp-4',
    name: 'Graph Schema Constraints & Vector Indexing',
    category: 'Schema Architecture',
    estimatedMastery: 85,
    targetRoleRequirement: 80,
    status: 'mastered',
    bktConfidence: 94,
    evidenceCount: 2,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-cyp-4',
        type: 'work_proof',
        title: 'Neo4j 5.x Schema Constraint Migration',
        providerOrIssuer: 'Graph Core Team',
        date: '2026-08-25',
        scoreOrLevel: 'Verified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'cyp-5',
    name: 'Variable-Length Path Traversal & ShortestPath',
    category: 'Graph Traversal',
    estimatedMastery: 60,
    targetRoleRequirement: 80,
    status: 'critical_gap',
    bktConfidence: 88,
    evidenceCount: 2,
    recommendedModule: 'MOD-CYP-104: Algorithmic Path Traversal in Neo4j',
    evidenceSources: [
      {
        id: 'ev-cyp-5',
        type: 'assessment',
        title: 'Path Traversal Diagnostic',
        providerOrIssuer: 'Graph Academy',
        date: '2026-09-22',
        scoreOrLevel: '60% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'cyp-6',
    name: 'Transaction Semantics & Concurrency Locking',
    category: 'Transaction Engine',
    estimatedMastery: 75,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 91,
    evidenceCount: 2,
    recommendedModule: 'MOD-CYP-105: Cypher Deadlock Avoidance & Explicit Locks',
    evidenceSources: [
      {
        id: 'ev-cyp-6',
        type: 'work_proof',
        title: 'High-Concurrency Lock Optimization in Traversal Worker',
        providerOrIssuer: 'Engine Repo',
        date: '2026-09-08',
        scoreOrLevel: 'Merged',
        verificationStatus: 'verified',
      },
    ],
  },
]

export const PYTHON_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'py-1',
    name: 'Async IO & Coroutine Pipelines (asyncio / Trio)',
    category: 'Async Programming',
    estimatedMastery: 95,
    targetRoleRequirement: 90,
    status: 'mastered',
    bktConfidence: 98,
    evidenceCount: 3,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-py-1',
        type: 'work_proof',
        title: 'Async Event Poller Service Implementation',
        providerOrIssuer: 'Service Hub',
        date: '2026-07-15',
        scoreOrLevel: 'Production Verified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'py-2',
    name: 'Generators, Iterators & Memory Optimization',
    category: 'Memory Management',
    estimatedMastery: 90,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 95,
    evidenceCount: 2,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-py-2',
        type: 'assessment',
        title: 'Python Memory Profiling Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-08-10',
        scoreOrLevel: '90% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'py-3',
    name: 'Type Hints, Generics & Static Mypy Validation',
    category: 'Type Safety',
    estimatedMastery: 85,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 94,
    evidenceCount: 2,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-py-3',
        type: 'work_proof',
        title: 'Strict Mypy Type Checking Pipeline',
        providerOrIssuer: 'CI/CD Platform',
        date: '2026-08-28',
        scoreOrLevel: 'Verified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'py-4',
    name: 'Multiprocessing, GIL Bypass & Shared Memory',
    category: 'Concurrency',
    estimatedMastery: 70,
    targetRoleRequirement: 80,
    status: 'in_progress',
    bktConfidence: 89,
    evidenceCount: 2,
    recommendedModule: 'MOD-PY-202: High-Performance Python & Shared Memory',
    evidenceSources: [
      {
        id: 'ev-py-4',
        type: 'assessment',
        title: 'Multiprocessing Concurrency Quiz',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-05',
        scoreOrLevel: '70% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'py-5',
    name: 'Metaprogramming, Descriptors & Custom Decorators',
    category: 'Language Architecture',
    estimatedMastery: 80,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 91,
    evidenceCount: 2,
    recommendedModule: 'MOD-PY-203: Metaclasses & Dynamic Attribute Resolution',
    evidenceSources: [
      {
        id: 'ev-py-5',
        type: 'work_proof',
        title: 'Telemetry Decorators for RPC Functions',
        providerOrIssuer: 'Gateway Repo',
        date: '2026-09-12',
        scoreOrLevel: 'Merged',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'py-6',
    name: 'Pytest Fixtures, Mocking & Mutation Testing',
    category: 'Quality Assurance',
    estimatedMastery: 92,
    targetRoleRequirement: 85,
    status: 'mastered',
    bktConfidence: 96,
    evidenceCount: 3,
    recommendedModule: 'Mastered — Fast-tracked',
    evidenceSources: [
      {
        id: 'ev-py-6',
        type: 'work_proof',
        title: 'Test Suite Overhaul with Mutmut & Hypothesis',
        providerOrIssuer: 'Core QA',
        date: '2026-07-22',
        scoreOrLevel: 'Level 5 / Expert',
        verificationStatus: 'verified',
      },
    ],
  },
]

export function getOverviewSkills(
  isSkillMode: boolean,
  roleKey: string,
  skillKey?: string | null
): CompetencySkillProfile[] {
  if (isSkillMode) {
    const sKey = normalizeSkillKey(skillKey)
    if (sKey === 'cypher-traversal') return CYPHER_SKILL_PROFILES
    if (sKey === 'python-core') return PYTHON_SKILL_PROFILES
    return GEMINI_SKILL_PROFILES
  }

  const rKey = normalizeRoleKey(roleKey)
  if (rKey === 'senior-backend-engineer') return BACKEND_SKILL_PROFILES
  if (rKey === 'graph-data-scientist') return DATA_SCIENTIST_SKILL_PROFILES
  return COMPETENCY_SKILL_PROFILES
}

export function getOverviewBenchmark(
  isSkillMode: boolean,
  roleKey: string,
  skillKey?: string | null
): TargetRoleBenchmark {
  if (isSkillMode) {
    const sKey = normalizeSkillKey(skillKey)
    return TARGET_SKILL_BENCHMARKS[sKey] || TARGET_SKILL_BENCHMARKS['gemini-orchestration']
  }
  const rKey = normalizeRoleKey(roleKey)
  return TARGET_ROLE_BENCHMARKS[rKey] || TARGET_ROLE_BENCHMARKS['ai-knowledge-architect']
}
