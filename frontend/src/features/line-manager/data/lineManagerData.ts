export interface AssignmentAuditEntry {
  id: string
  action: 'initial_assignment' | 'role_replaced' | 'deadline_revised'
  actionLabel: string
  timestamp: string
  performedBy: string
  reason?: string
  details: string
  previousValue?: string
  newValue?: string
}

export interface ManagedEmployee {
  id: string
  name: string
  email: string
  avatar: string
  currentRole: string
  targetRole: string | null
  targetRoleVersion: string | null
  assignedDate: string | null
  deadline: string | null
  benchmarkScore: number
  currentReadiness: number
  diagnosticStatus: 'completed' | 'pending' | 'unassigned'
  diagnosticScore: number | null
  criticalSkillGap: string
  notes?: string
  assignmentStatus: 'active' | 'superseded' | 'unassigned'
  auditTrail: AssignmentAuditEntry[]
}

export interface TargetRoleDefinition {
  id: string
  title: string
  department: string
  level: string
  competencyCount: number
  recommendedBenchmark: number
  description: string
  publishedVersions: string[]
}

export const AVAILABLE_TARGET_ROLES: TargetRoleDefinition[] = [
  {
    id: 'role-1',
    title: 'AI Knowledge Architect',
    department: 'Machine Learning & Cognitive Architecture',
    level: 'Senior (L5)',
    competencyCount: 12,
    recommendedBenchmark: 85,
    description:
      'Specializes in Graph Neural Networks, knowledge graph reasoning, vector embeddings, and Neo4j architectures.',
    publishedVersions: ['v2.4 (Latest - Published 2026-06)', 'v2.1 (LTS)', 'v1.9'],
  },
  {
    id: 'role-2',
    title: 'Machine Learning Engineer',
    department: 'Applied AI Engineering',
    level: 'Mid-Senior (L4)',
    competencyCount: 10,
    recommendedBenchmark: 80,
    description:
      'Constructs dynamic knowledge tracing pipelines, feature stores, and automated continuous calibration pipelines.',
    publishedVersions: ['v3.0 (Latest - Published 2026-08)', 'v2.2 (LTS)'],
  },
  {
    id: 'role-3',
    title: 'Full-Stack Knowledge Engineer',
    department: 'Enterprise Knowledge Systems',
    level: 'Senior (L5)',
    competencyCount: 14,
    recommendedBenchmark: 88,
    description:
      'Bridges deep graph querying (Cypher & SPARQL) with responsive reactive frontends and distributed CQRS persistence.',
    publishedVersions: ['v2.0 (Latest - Published 2026-05)', 'v1.5'],
  },
  {
    id: 'role-4',
    title: 'Cloud Solutions Architect',
    department: 'Cloud Infrastructure & SRE',
    level: 'Staff (L6)',
    competencyCount: 11,
    recommendedBenchmark: 90,
    description:
      'Designs resilient cloud infrastructure, multi-cluster Neo4j Bolt configurations, and Kafka event streaming.',
    publishedVersions: ['v1.8 (Latest - Published 2026-04)', 'v1.2'],
  },
  {
    id: 'role-5',
    title: 'Graph Data Ontologist',
    department: 'Corporate Ontology & Governance',
    level: 'Lead (L5)',
    competencyCount: 9,
    recommendedBenchmark: 82,
    description:
      'Defines formal taxonomy triples, OWL/RDFS ontologies, and semantic validation constraints.',
    publishedVersions: ['v2.2 (Latest - Published 2026-07)', 'v1.0'],
  },
]

export const INITIAL_MANAGED_EMPLOYEES: ManagedEmployee[] = [
  {
    id: 'emp-101',
    name: 'Alex Chen',
    email: 'alex.chen@adaptlearn.internal',
    avatar: 'AC',
    currentRole: 'Junior Graph Developer',
    targetRole: 'AI Knowledge Architect',
    targetRoleVersion: 'v2.4 (Latest - Published 2026-06)',
    assignedDate: '2026-09-21',
    deadline: '2026-12-31',
    benchmarkScore: 85,
    currentReadiness: 62,
    diagnosticStatus: 'pending', // Pending diagnostic -> learning locked!
    diagnosticScore: null,
    criticalSkillGap: 'Graph Neural Networks (GNN)',
    notes: 'Prioritize diagnostic assessment to calibrate personal roadmap.',
    assignmentStatus: 'active',
    auditTrail: [
      {
        id: 'aud-101-1',
        action: 'initial_assignment',
        actionLabel: 'Initial Target Role Assigned (UC-04)',
        timestamp: '2026-09-21 09:30',
        performedBy: 'David Miller (Line Manager)',
        details: 'Assigned AI Knowledge Architect (v2.4) with deadline 2026-12-31.',
        newValue: 'AI Knowledge Architect v2.4',
        reason: 'H2 2026 career progression roadmap alignment.',
      },
    ],
  },
  {
    id: 'emp-102',
    name: 'Marcus Vance',
    email: 'marcus.vance@adaptlearn.internal',
    avatar: 'MV',
    currentRole: 'Backend Developer',
    targetRole: 'Machine Learning Engineer',
    targetRoleVersion: 'v3.0 (Latest - Published 2026-08)',
    assignedDate: '2026-08-14',
    deadline: '2026-11-30',
    benchmarkScore: 80,
    currentReadiness: 76,
    diagnosticStatus: 'completed',
    diagnosticScore: 84,
    criticalSkillGap: 'Deep Knowledge Tracing (DKT)',
    notes: 'Completed diagnostic with high score; advancing through Module 3.',
    assignmentStatus: 'active',
    auditTrail: [
      {
        id: 'aud-102-1',
        action: 'initial_assignment',
        actionLabel: 'Initial Target Role Assigned (UC-04)',
        timestamp: '2026-08-14 11:00',
        performedBy: 'David Miller (Line Manager)',
        details: 'Assigned Machine Learning Engineer (v3.0) with deadline 2026-11-30.',
        newValue: 'Machine Learning Engineer v3.0',
        reason: 'Talent initiative onboarding for DKT implementation.',
      },
    ],
  },
  {
    id: 'emp-103',
    name: 'Elena Rostova',
    email: 'elena.rostova@adaptlearn.internal',
    avatar: 'ER',
    currentRole: 'Frontend Specialist',
    targetRole: 'Full-Stack Knowledge Engineer',
    targetRoleVersion: 'v2.0 (Latest - Published 2026-05)',
    assignedDate: '2026-07-10',
    deadline: '2026-10-15',
    benchmarkScore: 88,
    currentReadiness: 92,
    diagnosticStatus: 'completed',
    diagnosticScore: 94,
    criticalSkillGap: 'Neo4j Bolt Driver Optimization',
    notes: 'Exceeding target readiness benchmark. Ready for capstone evaluation.',
    assignmentStatus: 'active',
    auditTrail: [
      {
        id: 'aud-103-1',
        action: 'initial_assignment',
        actionLabel: 'Initial Target Role Assigned (UC-04)',
        timestamp: '2026-07-10 14:15',
        performedBy: 'David Miller (Line Manager)',
        details: 'Assigned Full-Stack Knowledge Engineer (v2.0).',
        newValue: 'Full-Stack Knowledge Engineer v2.0',
      },
      {
        id: 'aud-103-2',
        action: 'deadline_revised',
        actionLabel: 'Assignment Deadline Revised (UC-06)',
        timestamp: '2026-08-01 10:20',
        performedBy: 'David Miller (Line Manager)',
        previousValue: '2026-09-30',
        newValue: '2026-10-15',
        reason: 'Extended by 15 days to allow full Neo4j Bolt benchmark validation.',
        details: 'Revised deadline from 2026-09-30 to 2026-10-15.',
      },
    ],
  },
  {
    id: 'emp-104',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@adaptlearn.internal',
    avatar: 'CB',
    currentRole: 'Associate Data Analyst',
    targetRole: null,
    targetRoleVersion: null,
    assignedDate: null,
    deadline: null,
    benchmarkScore: 75,
    currentReadiness: 45,
    diagnosticStatus: 'unassigned',
    diagnosticScore: null,
    criticalSkillGap: 'SPARQL Query Optimization',
    notes: 'Needs target role assignment for H2 2026 career plan.',
    assignmentStatus: 'unassigned',
    auditTrail: [],
  },
]
