export interface MicroSkillNode {
  id: string
  skillCode: string
  name: string
  description: string
  status: 'achieved' | 'not_achieved'
  masteryPercentage: number
  estimatedMinutes: number
}

export interface LearningModuleNode {
  id: string
  moduleCode: string
  title: string
  description: string
  status: 'completed' | 'in_progress' | 'not_started'
  estimatedDurationMinutes: number
  order: number
  branchSide: 'left' | 'right' | 'both'
  microSkills: MicroSkillNode[]
}

export interface TargetRoleRoadmap {
  roleId: string
  roleCode: string
  name: string
  jobLevel: string
  domain: string
  description: string
  totalModules: number
  totalSkills: number
  achievedSkills: number
  modules: LearningModuleNode[]
}

export const TARGET_ROLE_ROADMAPS: Record<string, TargetRoleRoadmap> = {
  'ai-knowledge-architect': {
    roleId: 'ai-knowledge-architect',
    roleCode: 'ROLE-AI-ARCH',
    name: 'AI Knowledge Architect',
    jobLevel: 'Staff / Principal Lead',
    domain: 'Enterprise AI & Knowledge Systems',
    description:
      'Designs enterprise-scale semantic ontologies, Neo4j property graph architectures, Bayesian Knowledge Tracing algorithms, and graph neural network recommendation pipelines.',
    totalModules: 5,
    totalSkills: 18,
    achievedSkills: 11,
    modules: [
      {
        id: 'mod-101',
        moduleCode: 'MOD-101',
        title: 'Foundations of Knowledge Graphs & RDF Triples',
        description: 'Semantic web foundations, W3C standards, RDF subject-predicate-object triples, and SPARQL 1.1 query syntax.',
        status: 'completed',
        estimatedDurationMinutes: 240,
        order: 1,
        branchSide: 'both',
        microSkills: [
          {
            id: 'sk-1',
            skillCode: 'SK-RDF-01',
            name: 'RDF TripleStore Data Model',
            description: 'Representing entity-relationship graphs using URIs, blank nodes, and literal values.',
            status: 'achieved',
            masteryPercentage: 92,
            estimatedMinutes: 60,
          },
          {
            id: 'sk-2',
            skillCode: 'SK-SPARQL-02',
            name: 'SPARQL 1.1 Query Engine',
            description: 'Pattern matching, FILTER conditions, OPTIONAL clauses, and aggregation on RDF graphs.',
            status: 'achieved',
            masteryPercentage: 88,
            estimatedMinutes: 75,
          },
          {
            id: 'sk-3',
            skillCode: 'SK-TURTLE-03',
            name: 'Turtle & TriG Serialization',
            description: 'Reading and writing compact semantic graphs in standard text syntaxes.',
            status: 'achieved',
            masteryPercentage: 95,
            estimatedMinutes: 45,
          },
          {
            id: 'sk-4',
            skillCode: 'SK-ONT-04',
            name: 'RDFS Taxonomies & Subclasses',
            description: 'Hierarchical class inheritance and domain/range constraint reasoning.',
            status: 'achieved',
            masteryPercentage: 90,
            estimatedMinutes: 60,
          },
        ],
      },
      {
        id: 'mod-204',
        moduleCode: 'MOD-204',
        title: 'Property Graph Architecture with Neo4j & Cypher',
        description: 'LPG (Labeled Property Graph) database systems, index-free adjacency, declarative Cypher querying, and APOC procedures.',
        status: 'completed',
        estimatedDurationMinutes: 360,
        order: 2,
        branchSide: 'both',
        microSkills: [
          {
            id: 'sk-5',
            skillCode: 'SK-CYP-01',
            name: 'Declarative Cypher MATCH & MERGE',
            description: 'Path traversal syntax, bidirectional relationship matching, and atomic merge semantics.',
            status: 'achieved',
            masteryPercentage: 91,
            estimatedMinutes: 90,
          },
          {
            id: 'sk-6',
            skillCode: 'SK-NEO-02',
            name: 'Index-Free Adjacency & Schema Constraints',
            description: 'Unique node constraints, text/range indexes, and point-in-time schema validation.',
            status: 'achieved',
            masteryPercentage: 85,
            estimatedMinutes: 90,
          },
          {
            id: 'sk-7',
            skillCode: 'SK-APOC-03',
            name: 'APOC Graph Procedures & Refactoring',
            description: 'Batch node merging, periodic iterate pipelines, and dynamic graph transformations.',
            status: 'achieved',
            masteryPercentage: 82,
            estimatedMinutes: 90,
          },
          {
            id: 'sk-8',
            skillCode: 'SK-OPT-04',
            name: 'Cypher Query Profiling (EXPLAIN / PROFILE)',
            description: 'DbHits analysis, card estimation, cache hits, and Cartesian product elimination.',
            status: 'achieved',
            masteryPercentage: 87,
            estimatedMinutes: 90,
          },
        ],
      },
      {
        id: 'mod-301',
        moduleCode: 'MOD-301',
        title: 'Graph Neural Networks & Node Embeddings',
        description: 'Representation learning on graphs, shallow embedding techniques, and deep graph convolution networks.',
        status: 'in_progress',
        estimatedDurationMinutes: 480,
        order: 3,
        branchSide: 'both',
        microSkills: [
          {
            id: 'sk-9',
            skillCode: 'SK-N2V-01',
            name: 'Node2Vec & Random Walk Embeddings',
            description: 'Biased random walks balancing BFS homophily and DFS structural equivalence.',
            status: 'achieved',
            masteryPercentage: 82,
            estimatedMinutes: 120,
          },
          {
            id: 'sk-10',
            skillCode: 'SK-PYG-02',
            name: 'PyTorch Geometric (PyG) Pipeline',
            description: 'Constructing Data and HeteroData tensors with sparse adjacency representations.',
            status: 'not_achieved',
            masteryPercentage: 45,
            estimatedMinutes: 120,
          },
          {
            id: 'sk-11',
            skillCode: 'SK-SAGE-03',
            name: 'GraphSAGE Inductive Neighbor Aggregation',
            description: 'Mean, LSTM, and pool aggregators for unseen competency node inference.',
            status: 'not_achieved',
            masteryPercentage: 35,
            estimatedMinutes: 120,
          },
          {
            id: 'sk-12',
            skillCode: 'SK-COS-04',
            name: 'Vector Cosine Similarity Clustering',
            description: 'k-NN skill cluster discovery and multi-modal semantic similarity matching.',
            status: 'achieved',
            masteryPercentage: 88,
            estimatedMinutes: 120,
          },
        ],
      },
      {
        id: 'mod-305',
        moduleCode: 'MOD-305',
        title: 'Bayesian Knowledge Tracing & Skill Estimation',
        description: 'Probabilistic graphical models and deep neural networks for continuous latent skill estimation from assessment data.',
        status: 'not_started',
        estimatedDurationMinutes: 600,
        order: 4,
        branchSide: 'both',
        microSkills: [
          {
            id: 'sk-13',
            skillCode: 'SK-BKT-01',
            name: 'Hidden Markov Models for Skill Mastery',
            description: 'Transition, emission, and initial state probabilities in Bayesian knowledge tracing.',
            status: 'not_achieved',
            masteryPercentage: 20,
            estimatedMinutes: 150,
          },
          {
            id: 'sk-14',
            skillCode: 'SK-BKT-02',
            name: 'Slip & Guess Probability Tuning',
            description: 'Calibrating false positives (guess) and false negatives (slip) in diagnostic questions.',
            status: 'not_achieved',
            masteryPercentage: 15,
            estimatedMinutes: 150,
          },
          {
            id: 'sk-15',
            skillCode: 'SK-DKT-03',
            name: 'Deep Knowledge Tracing (DKT with LSTM)',
            description: 'Sequence modeling of learner interaction history using recurrent neural architectures.',
            status: 'not_achieved',
            masteryPercentage: 10,
            estimatedMinutes: 150,
          },
        ],
      },
      {
        id: 'mod-401',
        moduleCode: 'MOD-401',
        title: 'Enterprise Competency Platform Capstone',
        description: 'End-to-end integration of Kafka streaming, graph microservices, real-time ROI forecasting, and automated gap mitigation.',
        status: 'not_started',
        estimatedDurationMinutes: 720,
        order: 5,
        branchSide: 'both',
        microSkills: [
          {
            id: 'sk-16',
            skillCode: 'SK-KAF-01',
            name: 'Real-time Event Streaming (Kafka / Debezium)',
            description: 'Change data capture on learner assessments and real-time competency event pub/sub.',
            status: 'achieved',
            masteryPercentage: 90,
            estimatedMinutes: 240,
          },
          {
            id: 'sk-17',
            skillCode: 'SK-REC-02',
            name: 'Personalized Pathway Recommendation Engine',
            description: 'Topological sort on ontology prerequisites paired with adaptive DKT thresholds.',
            status: 'not_achieved',
            masteryPercentage: 30,
            estimatedMinutes: 240,
          },
          {
            id: 'sk-18',
            skillCode: 'SK-AUD-03',
            name: 'Competency Audit & Evidence Validation Ledger',
            description: 'Immutable ledger verifying multi-source diagnostic proofs and manager endorsements.',
            status: 'not_achieved',
            masteryPercentage: 25,
            estimatedMinutes: 240,
          },
        ],
      },
    ],
  },
}
