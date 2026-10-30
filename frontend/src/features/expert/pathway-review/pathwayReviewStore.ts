export interface PathwayModuleItem {
  id: string
  code: string
  title: string
  estimatedHours: number
  domain: string
  reason: string
}

export interface InitialPathwayItem {
  id: string
  employeeId: string
  employeeName: string
  occupationCode: string
  occupationTitle: string
  targetRoleCode: string
  targetRoleTitle: string
  generatedAt: string
  status: 'PENDING_EXPERT_CONFIRMATION' | 'APPROVED'
  modules: PathwayModuleItem[] // Included / active in the pathway
  excludedModules: PathwayModuleItem[] // Excluded from the pathway
  regenerationFeedback?: string
}

export interface CatalogModuleItem {
  id: string
  code: string
  title: string
  estimatedHours: number
  domain: string
  reason: string
}

export const AVAILABLE_CATALOG_MODULES: CatalogModuleItem[] = [
  {
    id: 'cat-cyp-101',
    code: 'MOD-CYP-101',
    title: 'Accelerated Cypher Querying & Pattern Traversal',
    estimatedHours: 6,
    domain: 'Graph Database',
    reason: 'Declarative Cypher path matching and pattern traversal optimization.',
  },
  {
    id: 'cat-gnn-201',
    code: 'MOD-GNN-201',
    title: 'Hands-on Geometric Deep Learning & Message Passing',
    estimatedHours: 8,
    domain: 'AI & Data Science',
    reason: 'Graph convolutional networks, PyTorch Geometric, and localized embeddings.',
  },
  {
    id: 'cat-ont-301',
    code: 'MOD-ONT-301',
    title: 'Enterprise Ontology Modeling with OWL 2 & Protege',
    estimatedHours: 6,
    domain: 'Knowledge Systems',
    reason: 'Axiom reasoning, semantic taxonomies, and description logic verification.',
  },
  {
    id: 'cat-dkt-401',
    code: 'MOD-DKT-401',
    title: 'Personalized Cognitive Modeling with Transformer DKT',
    estimatedHours: 10,
    domain: 'AI & Data Science',
    reason: 'Deep knowledge tracing and latent learner state forecasting.',
  },
  {
    id: 'cat-kaf-108',
    code: 'MOD-KAF-108',
    title: 'Event-Driven Microservices & Kafka Stream Processing',
    estimatedHours: 8,
    domain: 'Distributed Systems',
    reason: 'Transactional outbox event streaming and partition consumer semantics.',
  },
  {
    id: 'cat-pg-202',
    code: 'MOD-PG-202',
    title: 'PostgreSQL Relational Schema Optimization & Indexing',
    estimatedHours: 6,
    domain: 'Data Persistence',
    reason: 'Query planner optimization, MVCC isolation, and partial index architectures.',
  },
  {
    id: 'cat-dist-304',
    code: 'MOD-DIST-304',
    title: 'Distributed Consensus & Replication Protocols',
    estimatedHours: 8,
    domain: 'Distributed Systems',
    reason: 'Raft consensus protocols, leader election, and gRPC streaming.',
  },
  {
    id: 'cat-k8s-402',
    code: 'MOD-K8S-402',
    title: 'Cloud-Native Container Orchestration & Telemetry',
    estimatedHours: 10,
    domain: 'Infrastructure',
    reason: 'Kubernetes workload topology, Istio service meshes, and OpenTelemetry spans.',
  },
  {
    id: 'cat-sec-105',
    code: 'MOD-SEC-105',
    title: 'Zero-Trust Architecture & Identity Federation',
    estimatedHours: 6,
    domain: 'Security',
    reason: 'OAuth2/OIDC token verification, mTLS encryption, and role-based access control.',
  },
  {
    id: 'cat-ai-405',
    code: 'MOD-AI-405',
    title: 'Foundation Model Fine-Tuning & Quantization (LoRA / QLoRA)',
    estimatedHours: 12,
    domain: 'AI & Data Science',
    reason: 'Parameter-efficient fine-tuning, 4-bit quantization, and evaluation benchmarks.',
  },
]

export const DEFAULT_INITIAL_PATHWAYS: InitialPathwayItem[] = [
  {
    id: 'pathway-rev-01',
    employeeId: 'emp-alex',
    employeeName: 'Alex Chen',
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-001',
    targetRoleTitle: 'AI Knowledge Architect',
    generatedAt: '2026-10-15 09:30',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-1',
        code: 'MOD-001',
        title: 'Foundations of Knowledge Graphs & Cypher Querying',
        estimatedHours: 8,
        domain: 'Graph Database',
        reason: 'Essential prerequisite baseline for graph querying in assigned occupation.',
      },
      {
        id: 'mod-2',
        code: 'MOD-002',
        title: 'Graph Neural Networks & Relational Inductive Biases',
        estimatedHours: 14,
        domain: 'AI & Data Science',
        reason: 'Key competency for AI Knowledge Architect target role.',
      },
      {
        id: 'mod-4',
        code: 'MOD-004',
        title: 'Dynamic Knowledge Tracing & Pedagogical Modeling',
        estimatedHours: 12,
        domain: 'AI & Data Science',
        reason: 'Direct target threshold competency gap identified in baseline assessment.',
      },
    ],
    excludedModules: [
      {
        id: 'mod-3',
        code: 'MOD-003',
        title: 'Transactional Microservice Architecture in Spring Boot',
        estimatedHours: 10,
        domain: 'Software Engineering',
        reason: 'Elective engineering module - recommend exclusion to focus on core AI Graph path.',
      },
    ],
  },
  {
    id: 'pathway-rev-02',
    employeeId: 'emp-liam',
    employeeName: "Liam O'Connor",
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-002',
    targetRoleTitle: 'Senior Machine Learning Engineer',
    generatedAt: '2026-10-15 08:45',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-5',
        code: 'MOD-ML-101',
        title: 'Production Model Serving & Triton Architecture',
        estimatedHours: 10,
        domain: 'Machine Learning',
        reason: 'High priority competency gap from diagnostic assessment.',
      },
      {
        id: 'mod-6',
        code: 'MOD-ML-201',
        title: 'Feature Store Engineering with Feast & Redis',
        estimatedHours: 8,
        domain: 'Data Engineering',
        reason: 'Production MLOps pipeline requirement.',
      },
      {
        id: 'mod-7',
        code: 'MOD-ML-301',
        title: 'Distributed Model Training with Ray & PyTorch',
        estimatedHours: 16,
        domain: 'Machine Learning',
        reason: 'Target role core requirement.',
      },
    ],
    excludedModules: [],
  },
  {
    id: 'pathway-rev-03',
    employeeId: 'emp-zoe',
    employeeName: 'Zoe Martinez',
    occupationCode: '15-1243.00',
    occupationTitle: 'Database Architects',
    targetRoleCode: 'TR-003',
    targetRoleTitle: 'Full-Stack Knowledge Engineer',
    generatedAt: '2026-10-14 14:20',
    status: 'PENDING_EXPERT_CONFIRMATION',
    modules: [
      {
        id: 'mod-8',
        code: 'MOD-KG-101',
        title: 'Enterprise Neo4j Cluster Configuration & Constraints',
        estimatedHours: 10,
        domain: 'Graph Database',
        reason: 'Refined by replanner per expert request for database architecture focus.',
      },
      {
        id: 'mod-9',
        code: 'MOD-KG-202',
        title: 'Ontology Versioning and Cypher Refactoring Pipelines',
        estimatedHours: 12,
        domain: 'Knowledge Systems',
        reason: 'Added following expert regeneration guidance.',
      },
      {
        id: 'mod-10',
        code: 'MOD-KG-303',
        title: 'GraphQL & Semantic Graph API Gateways',
        estimatedHours: 8,
        domain: 'Software Engineering',
        reason: 'Cross-functional knowledge distribution.',
      },
    ],
    excludedModules: [
      {
        id: 'mod-sec-105-zoe',
        code: 'MOD-SEC-105',
        title: 'Zero-Trust Architecture & Identity Federation',
        estimatedHours: 6,
        domain: 'Security',
        reason: 'Expert excluded to focus strictly on Neo4j clusters and ontology pipelines.',
      },
    ],
  },
  {
    id: 'pathway-rev-04',
    employeeId: 'emp-marcus',
    employeeName: 'Marcus Vance',
    occupationCode: '15-1252.00',
    occupationTitle: 'Software Developers',
    targetRoleCode: 'TR-004',
    targetRoleTitle: 'Senior Cognitive Systems Specialist',
    generatedAt: '2026-10-13 11:15',
    status: 'APPROVED',
    modules: [
      {
        id: 'mod-11',
        code: 'MOD-COG-101',
        title: 'Cognitive Architecture Foundations',
        estimatedHours: 10,
        domain: 'AI & Data Science',
        reason: 'Core prerequisite.',
      },
      {
        id: 'mod-12',
        code: 'MOD-COG-201',
        title: 'Neuro-Symbolic Reasoning Engines',
        estimatedHours: 14,
        domain: 'AI & Data Science',
        reason: 'Target role competency.',
      },
    ],
    excludedModules: [],
  },
]

const STORAGE_KEY = 'expert_pathway_review_items_v2'

export function getStoredPathways(): InitialPathwayItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as InitialPathwayItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          ...p,
          modules: Array.isArray(p.modules) ? p.modules : [],
          excludedModules: Array.isArray(p.excludedModules) ? p.excludedModules : [],
        }))
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_INITIAL_PATHWAYS
}

export function saveStoredPathways(items: InitialPathwayItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event('expert_pathway_list_updated'))
  } catch {
    // fallback
  }
}

export function getStoredPathwayById(id: string): InitialPathwayItem | undefined {
  const list = getStoredPathways()
  return list.find((p) => p.id === id)
}

export function updateStoredPathway(
  id: string,
  updater: (prev: InitialPathwayItem) => InitialPathwayItem
): InitialPathwayItem | undefined {
  const list = getStoredPathways()
  let updatedItem: InitialPathwayItem | undefined
  const updatedList = list.map((item) => {
    if (item.id === id) {
      updatedItem = updater(item)
      return updatedItem
    }
    return item
  })
  if (updatedItem) {
    saveStoredPathways(updatedList)
  }
  return updatedItem
}
