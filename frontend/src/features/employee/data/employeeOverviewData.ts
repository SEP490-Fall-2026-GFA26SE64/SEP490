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

export type EvidenceType = 'assessment' | 'endorsement' | 'work_proof' | 'course'

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

export interface CompetencySkillProfile {
  id: string
  name: string
  category: 'Graph Architecture' | 'AI & Knowledge Tracing' | 'Distributed Systems' | 'Data Persistence' | 'Semantic Web'
  estimatedMastery: number // 0 to 100
  targetRoleRequirement: number // 0 to 100
  status: 'mastered' | 'in_progress' | 'critical_gap'
  bktConfidence: number // Bayesian probability estimate
  evidenceCount: number
  evidenceSources: EvidenceSource[]
  recommendedModule?: string
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
      { axisName: 'Graph Architecture', currentLevel: 75, requiredLevel: 85 },
      { axisName: 'Knowledge Tracing', currentLevel: 45, requiredLevel: 90 },
      { axisName: 'Semantic Web (OWL/RDF)', currentLevel: 80, requiredLevel: 85 },
      { axisName: 'Graph Neural Networks', currentLevel: 55, requiredLevel: 85 },
      { axisName: 'Distributed Systems', currentLevel: 90, requiredLevel: 80 },
      { axisName: 'Data Persistence', currentLevel: 88, requiredLevel: 75 },
    ],
  },
  'senior-backend-engineer': {
    roleId: 'senior-backend-engineer',
    roleTitle: 'Senior Backend Engineer',
    department: 'Core Platform Engineering',
    readinessPercentage: 94,
    dimensions: [
      { axisName: 'Graph Architecture', currentLevel: 75, requiredLevel: 65 },
      { axisName: 'Knowledge Tracing', currentLevel: 45, requiredLevel: 50 },
      { axisName: 'Semantic Web (OWL/RDF)', currentLevel: 80, requiredLevel: 60 },
      { axisName: 'Graph Neural Networks', currentLevel: 55, requiredLevel: 60 },
      { axisName: 'Distributed Systems', currentLevel: 90, requiredLevel: 90 },
      { axisName: 'Data Persistence', currentLevel: 88, requiredLevel: 90 },
    ],
  },
  'graph-data-scientist': {
    roleId: 'graph-data-scientist',
    roleTitle: 'Graph Data Scientist',
    department: 'Research & Advanced Analytics',
    readinessPercentage: 69,
    dimensions: [
      { axisName: 'Graph Architecture', currentLevel: 75, requiredLevel: 80 },
      { axisName: 'Knowledge Tracing', currentLevel: 45, requiredLevel: 85 },
      { axisName: 'Semantic Web (OWL/RDF)', currentLevel: 80, requiredLevel: 70 },
      { axisName: 'Graph Neural Networks', currentLevel: 55, requiredLevel: 95 },
      { axisName: 'Distributed Systems', currentLevel: 90, requiredLevel: 65 },
      { axisName: 'Data Persistence', currentLevel: 88, requiredLevel: 70 },
    ],
  },
}

export const COMPETENCY_SKILL_PROFILES: CompetencySkillProfile[] = [
  {
    id: 'c-1',
    name: 'Knowledge Graph Modeling (RDF/OWL & Cypher)',
    category: 'Graph Architecture',
    estimatedMastery: 75,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 93,
    evidenceCount: 3,
    recommendedModule: 'MOD-204: Neo4j Semantic Modeling',
    evidenceSources: [
      {
        id: 'ev-1',
        type: 'assessment',
        title: 'Diagnostic Graph Modeling Assessment',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-12',
        scoreOrLevel: '82% Score',
        verificationStatus: 'verified',
        notes: 'Demonstrated solid grasp of Cypher MATCH pattern indexing and SPARQL queries.',
      },
      {
        id: 'ev-2',
        type: 'work_proof',
        title: 'Pull Request #412: Enterprise Ontology Migration',
        providerOrIssuer: 'GitHub Repository: adapt-ontology-core',
        date: '2026-09-02',
        scoreOrLevel: 'Merged by Lead',
        verificationStatus: 'verified',
        notes: 'Refactored RDF TripleStore schema to OWL DL format with Protégé validation.',
      },
      {
        id: 'ev-3',
        type: 'endorsement',
        title: 'Quarterly Technical Endorsement',
        providerOrIssuer: 'Sarah Connor (Engineering Manager)',
        date: '2026-08-20',
        scoreOrLevel: 'Level 4 / Proficient',
        verificationStatus: 'endorsed',
        notes: 'Autonomous execution in Neo4j index tuning and graph query optimization.',
      },
    ],
  },
  {
    id: 'c-2',
    name: 'Adaptive Knowledge Tracing (BKT / DKT Algorithms)',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 45,
    targetRoleRequirement: 90,
    status: 'critical_gap',
    bktConfidence: 89,
    evidenceCount: 2,
    recommendedModule: 'MOD-305: Bayesian Knowledge Tracing Algorithms',
    evidenceSources: [
      {
        id: 'ev-4',
        type: 'assessment',
        title: 'Baseline DKT Theory Quiz',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-15',
        scoreOrLevel: '58% Score',
        verificationStatus: 'verified',
        notes: 'Identified deficit in hidden Markov model transition probabilities.',
      },
      {
        id: 'ev-5',
        type: 'course',
        title: 'MOD-102: Introduction to Employee State Estimation',
        providerOrIssuer: 'Adapt-Learn-Graph Academy',
        date: '2026-08-10',
        scoreOrLevel: 'Passed (88%)',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'c-3',
    name: 'Graph Neural Networks & Embeddings (PyG / Node2Vec)',
    category: 'AI & Knowledge Tracing',
    estimatedMastery: 55,
    targetRoleRequirement: 85,
    status: 'critical_gap',
    bktConfidence: 86,
    evidenceCount: 2,
    recommendedModule: 'MOD-301: Node2Vec & GraphSAGE in PyTorch Geometric',
    evidenceSources: [
      {
        id: 'ev-6',
        type: 'work_proof',
        title: 'Jupyter Experiment: Skill Clustering with GraphSAGE',
        providerOrIssuer: 'MLflow Tracking Hub',
        date: '2026-09-05',
        scoreOrLevel: 'Verified Experiment',
        verificationStatus: 'verified',
        notes: 'Evaluated cosine similarity on 2,500 competency nodes with 0.81 F1-score.',
      },
      {
        id: 'ev-7',
        type: 'assessment',
        title: 'Graph Embedding Diagnostic',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-09-17',
        scoreOrLevel: '62% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'c-4',
    name: 'Event-Driven Microservices (Kafka / RabbitMQ)',
    category: 'Distributed Systems',
    estimatedMastery: 90,
    targetRoleRequirement: 80,
    status: 'mastered',
    bktConfidence: 96,
    evidenceCount: 3,
    evidenceSources: [
      {
        id: 'ev-8',
        type: 'work_proof',
        title: 'PR #589: Employee Event Streaming Architecture',
        providerOrIssuer: 'GitHub Repository: stream-pipeline',
        date: '2026-07-28',
        scoreOrLevel: 'Production Verified',
        verificationStatus: 'verified',
        notes: 'Engineered high-throughput consumer groups handling 12k events/sec with zero loss.',
      },
      {
        id: 'ev-9',
        type: 'endorsement',
        title: 'Architectural Peer Review Endorsement',
        providerOrIssuer: 'Elena Rostova (Staff Platform Architect)',
        date: '2026-08-05',
        scoreOrLevel: 'Level 5 / Expert',
        verificationStatus: 'endorsed',
      },
      {
        id: 'ev-10',
        type: 'course',
        title: 'MOD-108: Kafka Event Processing Patterns',
        providerOrIssuer: 'Enterprise Academy',
        date: '2026-06-14',
        scoreOrLevel: 'Mastery Certified',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'c-5',
    name: 'Relational Schema Optimization (PostgreSQL)',
    category: 'Data Persistence',
    estimatedMastery: 88,
    targetRoleRequirement: 75,
    status: 'mastered',
    bktConfidence: 95,
    evidenceCount: 2,
    evidenceSources: [
      {
        id: 'ev-11',
        type: 'work_proof',
        title: 'Migration: Partitioned Competency Event Ledger',
        providerOrIssuer: 'Flyway Migration V2',
        date: '2026-08-12',
        scoreOrLevel: 'Production Deployed',
        verificationStatus: 'verified',
        notes: 'Reduced query execution latencies on competency history tables by 65%.',
      },
      {
        id: 'ev-12',
        type: 'assessment',
        title: 'Advanced Database Engineering Test',
        providerOrIssuer: 'Enterprise Engine Quiz',
        date: '2026-07-10',
        scoreOrLevel: '94% Score',
        verificationStatus: 'verified',
      },
    ],
  },
  {
    id: 'c-6',
    name: 'Semantic Web & Description Logics (OWL 2 / SHACL)',
    category: 'Semantic Web',
    estimatedMastery: 80,
    targetRoleRequirement: 85,
    status: 'in_progress',
    bktConfidence: 91,
    evidenceCount: 2,
    recommendedModule: 'MOD-206: SHACL Shapes Constraint Validation',
    evidenceSources: [
      {
        id: 'ev-13',
        type: 'work_proof',
        title: 'PR #320: SHACL Validation Rules for Competency Nodes',
        providerOrIssuer: 'GitHub Repository: adapt-ontology-core',
        date: '2026-09-08',
        scoreOrLevel: 'Merged',
        verificationStatus: 'verified',
      },
      {
        id: 'ev-14',
        type: 'endorsement',
        title: 'Competency Engine Validation Sign-off',
        providerOrIssuer: 'Sarah Connor (Engineering Manager)',
        date: '2026-09-10',
        scoreOrLevel: 'Level 4 / Proficient',
        verificationStatus: 'endorsed',
      },
    ],
  },
]
