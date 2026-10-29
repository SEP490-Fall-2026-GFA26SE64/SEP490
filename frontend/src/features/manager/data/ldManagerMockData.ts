export interface SkillTargetConfig {
  skillId: string
  skillCode: string
  skillName: string
  threshold: number // e.g. 80 (%) -> maps to targetMastery in Neo4j
  level?: string
}

export interface RoleLevelThresholds {
  J: number
  M: number
  S: number
}

export interface TargetRoleModel {
  id: string
  stableId: string
  code: string
  title: string
  department?: string
  domainCode?: string // 'ICT' | 'DATA' | 'AI'
  familyCode?: string // Local profile e.g. 'DEV' | 'DATAENG' | 'QAENG'
  track?: 'PROFESSIONAL' | 'MANAGEMENT'
  seniority?: string
  assignedExpertId?: string
  assignedExpertName?: string
  description: string
  responsibilities?: string[]
  version: string
  status: 'draft' | 'submitted' | 'sent' | 'rejected' | 'published'
  rejectionReason?: string
  competencyIds: string[]
  skillTargets: SkillTargetConfig[]
  levelCompetencies?: Record<string, string[]>
  activeEnrollments: number
  occupationCode?: string
  occupationTitle?: string
  scope?: string
  levels?: string[]
  levelThresholds?: RoleLevelThresholds
  createdAt?: string
  updatedAt: string
}

export interface OnetOccupation {
  code: string // e.g. '15-1252.00'
  name: string // e.g. 'Software Developers'
  description: string
  jobZone: number // e.g. 4
  profiles: string[] // e.g. ['DEV', 'INTEGRATION', 'DEVOPS', 'INFRA', 'SWARCH', 'SYSARCH']
  assignedExpertIds: string[]
}

export const EXPERT_SARAH_CHEN_ID = 'a0000000-0000-0000-0000-000000000002'
export const EXPERT_MARCUS_VANCE_ID = 'a0000000-0000-0000-0000-000000000005'
export const EXPERT_ALEX_RIVERA_ID = 'a0000000-0000-0000-0000-000000000006'
export const EXPERT_LINH_NGUYEN_ID = 'a0000000-0000-0000-0000-000000000007'

export const ONET_OCCUPATIONS: OnetOccupation[] = [
  {
    code: '15-1252.00',
    name: 'Software Developers',
    description: 'Design, code, and test applications, systems software, and infrastructure pipelines.',
    jobZone: 4,
    profiles: ['DEV', 'INTEGRATION', 'DEVOPS', 'INFRA', 'SWARCH', 'SYSARCH'],
    assignedExpertIds: [EXPERT_SARAH_CHEN_ID],
  },
  {
    code: '15-1243.00',
    name: 'Database Architects & Engineers',
    description: 'Design database systems, analytical warehouses, governance policies, and data pipelines.',
    jobZone: 4,
    profiles: ['DATARCH', 'DATAENG', 'DATAGOV', 'DBANALYSIS', 'DBDEV', 'ENTERPRISE'],
    assignedExpertIds: [EXPERT_MARCUS_VANCE_ID],
  },
  {
    code: '15-1253.00',
    name: 'Software Quality Assurance & Testing',
    description: 'Design test automation suites, quality gates, and system verification protocols.',
    jobZone: 4,
    profiles: ['QAAUTO', 'QAA', 'QAENG'],
    assignedExpertIds: [EXPERT_SARAH_CHEN_ID, EXPERT_ALEX_RIVERA_ID],
  },
  {
    code: '15-1299.08',
    name: 'Computer Systems Engineers & Architects',
    description: 'Architect complex systems, cloud infrastructure networks, and enterprise solutions.',
    jobZone: 4,
    profiles: ['SYSARCH', 'INFRA', 'INTEGRATION', 'SYSANALYSIS', 'WEBARCH'],
    assignedExpertIds: [EXPERT_ALEX_RIVERA_ID],
  },
  {
    code: '15-1212.00',
    name: 'Information Security & Cybersecurity',
    description: 'Engineer security perimeters, vulnerability analysis, access policies, and incident response.',
    jobZone: 4,
    profiles: ['SECOFFICER', 'SECANALYSIS', 'NETSEC'],
    assignedExpertIds: [EXPERT_SARAH_CHEN_ID],
  },
]

export interface OntologyLevel {
  code: 'J' | 'M' | 'S'
  name: 'Junior' | 'Middle' | 'Senior'
  rank: 1 | 2 | 3
  threshold: number // 0.60, 0.75, 0.90
  context: string
}

export const ONTOLOGY_LEVELS: OntologyLevel[] = [
  { code: 'J', name: 'Junior', rank: 1, threshold: 0.60, context: 'Guided bounded execution under task support' },
  { code: 'M', name: 'Middle', rank: 2, threshold: 0.75, context: 'Independent defined-scope delivery and standard troubleshooting' },
  { code: 'S', name: 'Senior', rank: 3, threshold: 0.90, context: 'Complex solution architecture, system review, and governance' },
]

export function resolveOccupationForRole(
  role: {
    code?: string
    title?: string
    domainCode?: string
    familyCode?: string
    occupationCode?: string
  },
  organizationId?: string
): OnetOccupation {
  const occupations = getAvailableOccupations(organizationId)
  if (role.occupationCode) {
    const found = occupations.find((o) => o.code === role.occupationCode)
    if (found) return found
  }

  const code = (role.code || '').toUpperCase()
  const title = (role.title || '').toLowerCase()
  const domain = (role.domainCode || '').toUpperCase()
  const family = (role.familyCode || '').toUpperCase()

  // Match by keyword in title, code, or family
  if (title.includes('security') || title.includes('cyber') || title.includes('sec') || code.includes('SEC') || family.includes('SEC')) {
    return occupations.find((o) => o.code === '15-1212.00') || ONET_OCCUPATIONS[4]
  }
  if (title.includes('test') || title.includes('quality') || title.includes('qa') || code.includes('QA') || family.includes('QA')) {
    return occupations.find((o) => o.code === '15-1253.00') || ONET_OCCUPATIONS[2]
  }
  if (title.includes('data') || title.includes('database') || title.includes('analytics') || domain === 'DATA' || code.includes('DATA') || family.includes('DATA')) {
    return occupations.find((o) => o.code === '15-1243.00') || ONET_OCCUPATIONS[1]
  }
  if (title.includes('system') || title.includes('network') || title.includes('cloud') || title.includes('infrastructure') || (title.includes('architect') && !title.includes('software')) || code.includes('SYS') || code.includes('INFRA')) {
    return occupations.find((o) => o.code === '15-1299.08') || ONET_OCCUPATIONS[3]
  }

  return occupations.find((o) => o.code === '15-1252.00') || ONET_OCCUPATIONS[0]
}

/**
 * Compares semantic or numeric versions, e.g. "1.0" < "1.1" < "1.2" < "2.0".
 */
export function compareRoleVersions(vA?: string, vB?: string): number {
  const partsA = (vA || '0').split('.').map((p) => parseInt(p, 10) || 0)
  const partsB = (vB || '0').split('.').map((p) => parseInt(p, 10) || 0)
  const maxLen = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < maxLen; i++) {
    const a = partsA[i] || 0
    const b = partsB[i] || 0
    if (a !== b) {
      return a - b
    }
  }
  return 0
}

/**
 * Formats an ISO datetime or date string into DD/MM/YYYY format.
 * e.g. "2026-10-01T06:20:59.069533368Z" -> "01/10/2026"
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    }
  } catch {}

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`
  }
  return dateStr
}

/**
 * Ensures that within each role lineage (grouped by stableId/code):
 * 1. The newest published version always appears first as the primary row (e.g. v2.0).
 * 2. Older published versions appear immediately below the newest version, ordered by version ascending (e.g. v1.0, v1.1, v1.2).
 * 3. Any draft / sent / rejected successor versions appear directly below the published group.
 * 4. Lineage groups are sorted by newest creation/update date descending by default so new/updated roles appear at the top.
 */
export function sortTargetRolesWithDraftsBelowPublished(
  roles: TargetRoleModel[],
  sortBy: 'latest' | 'code' | 'title' = 'latest'
): TargetRoleModel[] {
  const groups = new Map<string, TargetRoleModel[]>()
  for (const r of roles) {
    const key = r.stableId || r.code
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(r)
  }

  // A lineage is a brand-new role if it has NEVER been published (pure draft/sent/rejected).
  // A lineage that has a published version is an existing role, even if a successor draft was spawned.
  const isPureDraftLineage = (groupRoles: TargetRoleModel[]): boolean => {
    return groupRoles.every((r) => r.status !== 'published')
  }

  // Base creation time for the lineage:
  // For existing published roles, anchor to the published base version's creation time so spawning a successor draft does not alter the lineage order.
  // For brand-new draft roles, use the creation time of that new role.
  const getLineageBaseTime = (groupRoles: TargetRoleModel[]): number => {
    let latest = 0
    for (const r of groupRoles) {
      const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : 0
      const updatedTime = r.updatedAt ? new Date(r.updatedAt).getTime() : 0
      const best = Math.max(
        isNaN(createdTime) ? 0 : createdTime,
        isNaN(updatedTime) ? 0 : updatedTime
      )
      if (best > latest) {
        latest = best
      }
    }
    return latest
  }

  const result: TargetRoleModel[] = []

  // Sort groups by selected criteria
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const rolesA = groups.get(a)!
    const rolesB = groups.get(b)!
    const roleA = rolesA[0]
    const roleB = rolesB[0]

    if (sortBy === 'latest') {
      const timeA = getLineageBaseTime(rolesA)
      const timeB = getLineageBaseTime(rolesB)
      if (timeB !== timeA) {
        return timeB - timeA
      }

      const isPureDraftA = isPureDraftLineage(rolesA)
      const isPureDraftB = isPureDraftLineage(rolesB)
      if (isPureDraftA && !isPureDraftB) return -1
      if (isPureDraftB && !isPureDraftA) return 1

      // Priority: Newly dispatched / submitted roles
      const hasSentA = rolesA.some((r) => r.status === 'submitted' || r.status === 'sent')
      const hasSentB = rolesB.some((r) => r.status === 'submitted' || r.status === 'sent')
      if (hasSentA && !hasSentB) return -1
      if (hasSentB && !hasSentA) return 1

      // Fallback: reverse ID so newer entries go to top
      return (roleB?.id || '').localeCompare(roleA?.id || '')
    }

    if (sortBy === 'title') {
      return (roleA?.title || '').localeCompare(roleB?.title || '')
    }

    return (roleA?.code || '').localeCompare(roleB?.code || '')
  })

  for (const key of sortedKeys) {
    const groupRoles = groups.get(key)!
    const published = groupRoles
      .filter((r) => r.status === 'published')
      .sort((a, b) => compareRoleVersions(b.version, a.version))

    const newestPublished = published[0]
    const olderPublished = published.slice(1)

    // Draft / sent / rejected versions placed immediately below published
    const nonPublished = groupRoles
      .filter((r) => r.status !== 'published')
      .sort((a, b) => compareRoleVersions(a.version, b.version))

    if (newestPublished) {
      result.push(newestPublished, ...olderPublished, ...nonPublished)
    } else {
      result.push(...nonPublished)
    }
  }

  return result
}

export const JOB_DOMAINS = [
  { code: 'ICT', name: 'Information & Communication Technology' },
  { code: 'DATA', name: 'Data Engineering & Analytics' },
  { code: 'AI', name: 'Artificial Intelligence & Cognitive Computing' },
] as const

export const CAREER_FAMILIES = [
  { code: 'JAVA_BACKEND', name: 'Java Backend Engineering', domain: 'ICT' },
  { code: 'PYTHON_DATA', name: 'Python & Data Engineering', domain: 'DATA' },
  { code: 'AI_ML', name: 'Machine Learning & LLM Systems', domain: 'AI' },
  { code: 'CLOUD_DEVOPS', name: 'Cloud & Infrastructure DevOps', domain: 'ICT' },
  { code: 'FRONTEND_WEB', name: 'Modern Web & UI Architecture', domain: 'ICT' },
  { code: 'CYBERSECURITY', name: 'Enterprise Cybersecurity & Trust', domain: 'ICT' },
] as const

export const ELIGIBLE_EXPERTS = [
  { id: EXPERT_SARAH_CHEN_ID, name: 'Dr. Sarah Chen', title: 'Senior AI & Knowledge Architect' },
  { id: EXPERT_MARCUS_VANCE_ID, name: 'Marcus Vance', title: 'Principal Graph Database Architect' },
  { id: EXPERT_ALEX_RIVERA_ID, name: 'Alex Rivera', title: 'Staff Cloud Infrastructure Engineer' },
  { id: EXPERT_LINH_NGUYEN_ID, name: 'Linh Nguyen', title: 'Lead Data Systems Specialist' },
] as const;

export type EligibleExpert = typeof ELIGIBLE_EXPERTS[number];

export function normalizeExpertId(id?: string | null): string {
  if (!id) return '';
  if (id === 'expert-chen' || id === EXPERT_SARAH_CHEN_ID) return EXPERT_SARAH_CHEN_ID;
  if (id === 'expert-vance' || id === EXPERT_MARCUS_VANCE_ID) return EXPERT_MARCUS_VANCE_ID;
  if (id === 'expert-rivera' || id === EXPERT_ALEX_RIVERA_ID) return EXPERT_ALEX_RIVERA_ID;
  if (id === 'expert-nguyen' || id === EXPERT_LINH_NGUYEN_ID) return EXPERT_LINH_NGUYEN_ID;
  return id;
}

export function findEligibleExpert(id?: string | null): EligibleExpert | undefined {
  if (!id) return undefined;
  const normalized = normalizeExpertId(id);
  return ELIGIBLE_EXPERTS.find((e) => normalizeExpertId(e.id) === normalized);
}

export function getAvailableOccupations(organizationId?: string): OnetOccupation[] {
  const codeMap = new Map<string, OnetOccupation>();
  for (const o of ONET_OCCUPATIONS) {
    codeMap.set(o.code, { ...o });
  }

  const effectiveOrg = organizationId && organizationId !== 'comp-technova' && organizationId !== 'default-org'
    ? organizationId
    : (typeof localStorage !== 'undefined' ? localStorage.getItem('adaptlearn_active_company_id') || '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000001');

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('adaptlearn_occupations_v2_' + effectiveOrg);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
          for (const item of stored) {
            if (item.code) {
              const existing = codeMap.get(item.code);
              codeMap.set(item.code, {
                code: item.code,
                name: item.name || existing?.name || item.code,
                description: item.description || existing?.description || '',
                jobZone: item.jobZone || existing?.jobZone || 4,
                profiles: existing?.profiles || ['DEV'],
                assignedExpertIds: Array.isArray(item.assignedExperts)
                  ? item.assignedExperts.map((ae: any) => normalizeExpertId(ae.id || ae))
                  : existing?.assignedExpertIds || [],
              });
            }
          }
        }
      }
    }
  } catch {}

  return Array.from(codeMap.values());
}

/**
 * Returns domain experts who are specifically assigned and certified for a given O*NET occupation.
 */
export function getEligibleExpertsForOccupation(occupationCode?: string, organizationId?: string): EligibleExpert[] {
  if (!occupationCode) return [...ELIGIBLE_EXPERTS];
  const occupations = getAvailableOccupations(organizationId);
  const occ = occupations.find((o) => o.code === occupationCode);
  if (!occ || !occ.assignedExpertIds || occ.assignedExpertIds.length === 0) {
    return [];
  }
  const assignedNormalized = occ.assignedExpertIds.map(normalizeExpertId);
  return ELIGIBLE_EXPERTS.filter((exp) => assignedNormalized.includes(normalizeExpertId(exp.id)));
}

export interface CompetencyModel {
  id: string
  code: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'draft' | 'published' | 'archived'
  skillIds: string[] // HAS_SKILL links
  levelCodes?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface MicroSkillModel {
  id: string
  code: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED' | 'draft' | 'published' | 'archived'
  macroCompetencyCode?: 'KNOWLEDGE' | 'COMMUNICATION' | 'INNOVATION' | string
  createdAt?: string
  updatedAt?: string
}

export interface PrerequisiteEdge {
  id: string
  sourceSkillId: string // Prerequisite skill
  sourceSkillCode?: string
  sourceSkillName?: string
  targetSkillId: string // Dependent skill
  targetSkillCode?: string
  targetSkillName?: string
  minMastery: number // Float [0, 1] e.g. 0.75
  status?: string
  createdAt?: string
  updatedAt?: string
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
  moduleType?: 'LESSON_AND_PRACTICE' | 'RESOURCE_GUIDED_PRACTICE'
  contentType?: string
  contentVersion?: string
  reviewStatus?: 'NEEDS_EXPERT_REVIEW' | 'APPROVED' | 'REJECTED'
  reviewedBy?: string | null
  reviewedAt?: string | null
  learningContentId?: string
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
  updatedAt?: string
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
  cohortSnapshotId?: string
  cohortName: string
  department: string
  targetRole: string
  learnerCount: number
  avgScore: number
  completionRate: number
  gapClosureRate: number
  velocityTrend: string
  status: 'Exceeding' | 'On Track' | 'Behind Pace' | 'Attention'
}

export interface SkillAcquisitionMetric {
  skillCode: string
  skillName: string
  masteryRate: number
  avgAttemptsToPass: number
  difficultyTag: 'Exceeding' | 'On Track' | 'Behind Pace'
}

// ----------------------------------------------------
// INITIAL PREREQUISITES & PROTOTYPE MOCK DATA
// ----------------------------------------------------

export const INITIAL_PREREQUISITES: PrerequisiteEdge[] = []
export const INITIAL_COMPETENCIES: CompetencyModel[] = []
export const INITIAL_MICRO_SKILLS: MicroSkillModel[] = []
export const INITIAL_TARGET_ROLES: TargetRoleModel[] = []
export const INITIAL_MODULES: LearningModuleModel[] = []

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
    cohortSnapshotId: 'CS-2026-Q1-01',
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
    cohortSnapshotId: 'CS-2026-Q1-02',
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
    cohortSnapshotId: 'CS-2026-Q1-03',
    cohortName: 'Enterprise Data Analysts Cross-Skilling',
    department: 'Data Analytics & BI',
    targetRole: 'AI Knowledge Architect',
    learnerCount: 8,
    avgScore: 61.2,
    completionRate: 58.0,
    gapClosureRate: 42.5,
    velocityTrend: '-3.1% vs Q4',
    status: 'Behind Pace',
  },
]

export const SKILL_ACQUISITION_METRICS: SkillAcquisitionMetric[] = [
  { skillCode: 'SKILL-CYPHER-01', skillName: 'Neo4j Cypher DDL', masteryRate: 92, avgAttemptsToPass: 1.3, difficultyTag: 'Exceeding' },
  { skillCode: 'SKILL-RDF-04', skillName: 'RDF Schema & OWL 2 DL', masteryRate: 84, avgAttemptsToPass: 1.8, difficultyTag: 'On Track' },
  { skillCode: 'SKILL-EMB-03', skillName: 'Node2Vec Embeddings', masteryRate: 78, avgAttemptsToPass: 2.1, difficultyTag: 'On Track' },
  { skillCode: 'SKILL-GNN-02', skillName: 'Graph Neural Networks & Message Passing', masteryRate: 63, avgAttemptsToPass: 3.4, difficultyTag: 'Behind Pace' },
  { skillCode: 'SKILL-VEC-06', skillName: 'HNSW Indexing & Vector Search', masteryRate: 71, avgAttemptsToPass: 2.4, difficultyTag: 'On Track' },
  { skillCode: 'SKILL-DKT-06', skillName: 'Dynamic Knowledge Tracing & Pedagogy', masteryRate: 59, avgAttemptsToPass: 3.6, difficultyTag: 'Behind Pace' },
  { skillCode: 'SKILL-ATTN-07', skillName: 'Multi-Head Attention & Transformers', masteryRate: 88, avgAttemptsToPass: 1.4, difficultyTag: 'Exceeding' },
  { skillCode: 'SKILL-PROMPT-08', skillName: 'Prompt Engineering & Context Injection', masteryRate: 82, avgAttemptsToPass: 1.9, difficultyTag: 'On Track' },
]
