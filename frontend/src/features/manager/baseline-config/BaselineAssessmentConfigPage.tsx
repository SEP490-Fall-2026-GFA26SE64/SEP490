import * as React from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Mail,
  RotateCcw,
  Save,
  Search,
  Send,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import {
  ELIGIBLE_EXPERTS,
  JOB_DOMAINS,
  type TargetRoleModel,
} from '../data/ldManagerMockData'

export interface BaselineConfigModel {
  roleId: string
  roleCode: string
  prerequisiteDepth: number // 0 - 5
  questionCountMax: number // 3 - 10
  startingDifficulty: 'Easy' | 'Medium' | 'Hard'
  confidenceThreshold: number // 0.70 - 0.95
  earlyStoppingEnabled: boolean
  singleAttemptEnforced: boolean
  lastSavedAt?: string
  lastSavedBy?: string
}

export interface SkillCoverageItem {
  skillId: string
  skillCode: string
  skillName: string
  isDirect: boolean
  hopDepth: number
  easyCount: number
  mediumCount: number
  hardCount: number
}

export interface LinkedOccupation {
  code: string
  name: string
}

export interface EnrolledLearner {
  id: string
  name: string
  email: string
}

const STORAGE_KEY = 'alg_baseline_configurations_v2'

const DEFAULT_CONFIGS: Record<string, BaselineConfigModel> = {
  'ROLE-GENAI-01': {
    roleId: '20000000-0000-0000-0000-000000000004',
    roleCode: 'ROLE-GENAI-01',
    prerequisiteDepth: 3,
    questionCountMax: 5,
    startingDifficulty: 'Medium',
    confidenceThreshold: 0.8,
    earlyStoppingEnabled: true,
    singleAttemptEnforced: true,
    lastSavedAt: '2026-10-15T09:30:00Z',
    lastSavedBy: 'Sarah Connor (L&D Manager)',
  },
  'JAVA_BACKEND_P3': {
    roleId: '20000000-0000-0000-0000-000000000001',
    roleCode: 'JAVA_BACKEND_P3',
    prerequisiteDepth: 3,
    questionCountMax: 5,
    startingDifficulty: 'Medium',
    confidenceThreshold: 0.8,
    earlyStoppingEnabled: true,
    singleAttemptEnforced: true,
    lastSavedAt: '2026-10-14T11:00:00Z',
    lastSavedBy: 'Sarah Connor (L&D Manager)',
  },
  'ROLE-MLOPS-02': {
    roleId: '20000000-0000-0000-0000-000000000005',
    roleCode: 'ROLE-MLOPS-02',
    prerequisiteDepth: 2,
    questionCountMax: 4,
    startingDifficulty: 'Easy',
    confidenceThreshold: 0.85,
    earlyStoppingEnabled: true,
    singleAttemptEnforced: true,
    lastSavedAt: '2026-10-12T14:15:00Z',
    lastSavedBy: 'Sarah Connor (L&D Manager)',
  },
  'ROLE-AI-ARCH': {
    roleId: '20000000-0000-0000-0000-000000000003',
    roleCode: 'ROLE-AI-ARCH',
    prerequisiteDepth: 3,
    questionCountMax: 5,
    startingDifficulty: 'Hard',
    confidenceThreshold: 0.9,
    earlyStoppingEnabled: true,
    singleAttemptEnforced: true,
    lastSavedAt: '2026-10-10T16:40:00Z',
    lastSavedBy: 'Sarah Connor (L&D Manager)',
  },
}

// Question inventory per micro-skill
const MOCK_QUESTION_INVENTORY: Record<string, { easy: number; medium: number; hard: number }> = {
  'SKILL-CYPHER': { easy: 8, medium: 7, hard: 6 },
  'SKILL-GNN': { easy: 6, medium: 6, hard: 5 },
  'SKILL-OWL-RDF': { easy: 7, medium: 5, hard: 4 }, // Deficit if cap > 4
  'SKILL-EMBEDDINGS': { easy: 9, medium: 8, hard: 6 },
  'SKILL-DKT': { easy: 6, medium: 5, hard: 5 },
  'JAVA-CORE-01': { easy: 8, medium: 7, hard: 5 },
  'SPRING-BOOT-01': { easy: 6, medium: 6, hard: 6 },
  'SQL-OPT-01': { easy: 7, medium: 5, hard: 4 },
  'DOCKER-CONT-01': { easy: 6, medium: 8, hard: 5 },
  'REST-API-01': { easy: 9, medium: 6, hard: 5 },
  'GIT-FLOW-01': { easy: 10, medium: 8, hard: 7 },
  'K8S-ORCH-01': { easy: 4, medium: 5, hard: 3 }, // Shortage
  'CI-CD-PIPE-01': { easy: 7, medium: 6, hard: 5 },
}

// Default seeded target roles fallback
const SEEDED_ROLES: TargetRoleModel[] = [
  {
    id: '20000000-0000-0000-0000-000000000004',
    stableId: 'ROLE-GENAI-01',
    code: 'ROLE-GENAI-01',
    title: 'Generative AI Applications Specialist',
    domainCode: 'AI',
    familyCode: 'AI_ML',
    track: 'PROFESSIONAL',
    seniority: 'P3',
    assignedExpertId: 'expert-chen',
    assignedExpertName: 'Dr. Sarah Chen',
    department: 'Artificial Intelligence & Cognitive Computing',
    description: 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection.',
    version: '1.0',
    status: 'draft',
    competencyIds: [],
    skillTargets: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER', skillName: 'Graph Pattern Traversal & Cypher', threshold: 80 },
      { skillId: 'skill-embeddings', skillCode: 'SKILL-EMBEDDINGS', skillName: 'Vector Embeddings & Semantic Search', threshold: 85 },
      { skillId: 'skill-dkt', skillCode: 'SKILL-DKT', skillName: 'Deep Knowledge Tracing & LLM Agents', threshold: 75 },
    ],
    activeEnrollments: 4,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000001',
    stableId: 'JAVA_BACKEND_P3',
    code: 'JAVA_BACKEND_P3',
    title: 'Java Backend Developer P3',
    domainCode: 'ICT',
    familyCode: 'JAVA_BACKEND',
    track: 'PROFESSIONAL',
    seniority: 'P3',
    assignedExpertId: 'expert-rivera',
    assignedExpertName: 'Alex Rivera',
    department: 'Information & Communication Technology',
    description: 'Autonomous practitioner building distributed event-driven microservices with Spring Boot and reactive streams.',
    version: '1.0',
    status: 'published',
    competencyIds: [],
    skillTargets: [
      { skillId: 'skill-java', skillCode: 'JAVA-CORE-01', skillName: 'Enterprise Java & JVM Optimization', threshold: 80 },
      { skillId: 'skill-spring', skillCode: 'SPRING-BOOT-01', skillName: 'Spring Boot 3 & Reactive Microservices', threshold: 85 },
    ],
    activeEnrollments: 8,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    stableId: 'ROLE-MLOPS-02',
    code: 'ROLE-MLOPS-02',
    title: 'Senior MLOps & Graph Systems Engineer',
    domainCode: 'ICT',
    familyCode: 'CLOUD_DEVOPS',
    track: 'PROFESSIONAL',
    seniority: 'P4',
    assignedExpertId: 'expert-rivera',
    assignedExpertName: 'Alex Rivera',
    department: 'Information & Communication Technology',
    description: 'Infrastructure specialist maintaining distributed vector stores, graph databases, and model serving clusters.',
    version: '2.0',
    status: 'published',
    competencyIds: [],
    skillTargets: [
      { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER', skillName: 'Graph Database Maintenance & Scaling', threshold: 85 },
      { skillId: 'skill-k8s', skillCode: 'K8S-ORCH-01', skillName: 'Kubernetes Cluster Orchestration', threshold: 80 },
    ],
    activeEnrollments: 3,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    stableId: 'ROLE-AI-ARCH',
    code: 'ROLE-AI-ARCH',
    title: 'AI Knowledge Architect',
    domainCode: 'AI',
    familyCode: 'AI_ML',
    track: 'PROFESSIONAL',
    seniority: 'P4',
    assignedExpertId: 'expert-chen',
    assignedExpertName: 'Dr. Sarah Chen',
    department: 'Artificial Intelligence & Cognitive Computing',
    description: 'Deep technical leader architecting enterprise knowledge graph schemas and neuro-symbolic reasoning systems.',
    version: '1.0',
    status: 'published',
    competencyIds: [],
    skillTargets: [
      { skillId: 'skill-owl-rdf', skillCode: 'SKILL-OWL-RDF', skillName: 'OWL 2 & Semantic Ontologies', threshold: 85 },
      { skillId: 'skill-gnn', skillCode: 'SKILL-GNN', skillName: 'Graph Neural Networks & Message Passing', threshold: 90 },
    ],
    activeEnrollments: 5,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
]

// Linked Occupations mock lookup per role code
const LINKED_OCCUPATIONS_MAP: Record<string, LinkedOccupation[]> = {
  'ROLE-GENAI-01': [
    { code: '15-1252.00', name: 'Software Developers' },
    { code: '15-1299.08', name: 'Computer Systems Engineers/Architects' },
  ],
  'JAVA_BACKEND_P3': [
    { code: '15-1252.00', name: 'Software Developers' },
    { code: '15-1253.00', name: 'Software Quality Assurance Analysts and Testers' },
  ],
  'ROLE-MLOPS-02': [
    { code: '15-1243.00', name: 'Database Architects' },
    { code: '15-1299.08', name: 'Computer Systems Engineers/Architects' },
  ],
  'ROLE-AI-ARCH': [
    { code: '15-1243.00', name: 'Database Architects' },
    { code: '15-1252.00', name: 'Software Developers' },
  ],
}

// Enrolled Learner Rosters mock lookup per role code
const ROSTER_MAP: Record<string, EnrolledLearner[]> = {
  'ROLE-GENAI-01': [
    { id: 'u-1', name: 'Elena Rostova', email: 'elena.rostova@adaptlearn.internal' },
    { id: 'u-2', name: 'Sarah Connor', email: 'sarah.connor@adaptlearn.internal' },
    { id: 'u-3', name: 'David Park', email: 'david.park@adaptlearn.internal' },
    { id: 'u-4', name: 'Amina Yusuf', email: 'amina.yusuf@adaptlearn.internal' },
  ],
  'JAVA_BACKEND_P3': [
    { id: 'u-5', name: 'John Doe', email: 'john.doe@adaptlearn.internal' },
    { id: 'u-6', name: 'Carlos Mendez', email: 'carlos.mendez@adaptlearn.internal' },
    { id: 'u-7', name: 'Hannah Schmidt', email: 'hannah.schmidt@adaptlearn.internal' },
  ],
  'ROLE-MLOPS-02': [
    { id: 'u-8', name: 'Alex Rivera', email: 'alex.rivera@adaptlearn.internal' },
    { id: 'u-9', name: 'Wei Zhang', email: 'wei.zhang@adaptlearn.internal' },
    { id: 'u-10', name: 'Liam O’Connor', email: 'liam.oconnor@adaptlearn.internal' },
  ],
  'ROLE-AI-ARCH': [
    { id: 'u-11', name: 'Sarah Connor', email: 'sarah.connor@adaptlearn.internal' },
    { id: 'u-12', name: 'Marcus Vance', email: 'marcus.vance@adaptlearn.internal' },
    { id: 'u-13', name: 'Dr. Sarah Chen', email: 'sarah.chen@adaptlearn.internal' },
  ],
}

export function BaselineAssessmentConfigPage() {
  const { toast } = useToast()
  const activeComp = getActiveCompany()
  const orgId = activeComp?.id || 'comp-technova'

  // Master target roles list
  const [roles, setRoles] = React.useState<TargetRoleModel[]>(SEEDED_ROLES)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [departmentFilter, setDepartmentFilter] = React.useState('ALL')
  const [coverageFilter, setCoverageFilter] = React.useState<'ALL' | 'PASSING' | 'DEFICIT'>('ALL')
  const [sortBy, setSortBy] = React.useState<'latest' | 'code' | 'title'>('latest')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Configurations stored per roleCode
  const [configs, setConfigs] = React.useState<Record<string, BaselineConfigModel>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_CONFIGS
    } catch {
      return DEFAULT_CONFIGS
    }
  })

  // Selected role for configuration modal & drawers
  const [selectedRole, setSelectedRole] = React.useState<TargetRoleModel | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = React.useState(false)
  const [isSimulateModalOpen, setIsSimulateModalOpen] = React.useState(false)
  const [isNotifyExpertModalOpen, setIsNotifyExpertModalOpen] = React.useState(false)
  const [notificationSent, setNotificationSent] = React.useState(false)

  // Configuration modal draft inputs
  const [draftDepth, setDraftDepth] = React.useState<number>(3)
  const [draftQuestionCap, setDraftQuestionCap] = React.useState<number>(5)
  const [draftDifficulty, setDraftDifficulty] = React.useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [draftConfidence, setDraftConfidence] = React.useState<number>(0.8)
  const [draftEarlyStopping, setDraftEarlyStopping] = React.useState<boolean>(true)

  // Fetch real target roles from API
  const fetchRoles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        headers: { 'X-User-Role': 'LD_MANAGER' },
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mapped: TargetRoleModel[] = data.map((r: any) => ({
            id: r.id,
            stableId: r.code,
            code: r.code,
            title: r.name,
            domainCode: r.domainCode,
            familyCode: r.familyCode,
            track: r.track,
            seniority: r.seniority || 'P3',
            assignedExpertId: r.assignedExpertId,
            assignedExpertName:
              ELIGIBLE_EXPERTS.find((e) => e.id === r.assignedExpertId)?.name || r.assignedExpertId || '',
            department:
              JOB_DOMAINS.find((d) => d.code === r.domainCode)?.name ||
              r.domainCode ||
              'Information Technology',
            description: r.description || '',
            responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities : [],
            version: r.version || '1.0',
            status: (r.status?.toLowerCase() === 'active' ? 'published' : r.status?.toLowerCase() || 'draft') as any,
            competencyIds: [],
            skillTargets: Array.isArray(r.skillTargets) ? r.skillTargets : [],
            activeEnrollments: ROSTER_MAP[r.code]?.length || 3,
            createdAt: r.createdAt || '2026-10-01T00:00:00Z',
            updatedAt: r.updatedAt || '2026-10-01T00:00:00Z',
          }))
          setRoles(mapped)
          return
        }
      }
    } catch {
      // Fallback to activeComp?.targetRoles or SEEDED_ROLES
    }

    if (activeComp?.targetRoles && activeComp.targetRoles.length > 0) {
      setRoles(activeComp.targetRoles)
    } else {
      setRoles(SEEDED_ROLES)
    }
  }, [orgId, activeComp])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Save configs to storage
  const saveConfigsToStorage = (updated: Record<string, BaselineConfigModel>) => {
    setConfigs(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save baseline config', err)
    }
  }

  // Calculate assessed skills & coverage analysis for a role
  const getRoleCoverageAnalysis = React.useCallback(
    (role: TargetRoleModel, customDepth?: number, customCap?: number) => {
      const cfg = configs[role.code] || DEFAULT_CONFIGS[role.code]
      const depth = customDepth !== undefined ? customDepth : cfg?.prerequisiteDepth ?? 3
      const questionCap = customCap !== undefined ? customCap : cfg?.questionCountMax ?? 5

      const skillTargets =
        role.skillTargets.length > 0
          ? role.skillTargets
          : [
              { skillId: 'skill-cypher', skillCode: 'SKILL-CYPHER', skillName: 'Cypher Querying & Graph Schema', threshold: 80 },
              { skillId: 'skill-embeddings', skillCode: 'SKILL-EMBEDDINGS', skillName: 'Embeddings & Vector Matching', threshold: 85 },
            ]

      const assessedSkills: SkillCoverageItem[] = skillTargets.map((st, idx) => {
        const inv = MOCK_QUESTION_INVENTORY[st.skillCode] || { easy: 7, medium: 7, hard: 6 }
        return {
          skillId: st.skillId || `skill-${idx}`,
          skillCode: st.skillCode || `SKILL-${idx}`,
          skillName: st.skillName,
          isDirect: true,
          hopDepth: 0,
          easyCount: inv.easy,
          mediumCount: inv.medium,
          hardCount: inv.hard,
        }
      })

      if (depth >= 1) {
        assessedSkills.push({
          skillId: 'prereq-git',
          skillCode: 'GIT-FLOW-01',
          skillName: 'Git Version Control & Branching Strategy',
          isDirect: false,
          hopDepth: 1,
          easyCount: MOCK_QUESTION_INVENTORY['GIT-FLOW-01']?.easy || 10,
          mediumCount: MOCK_QUESTION_INVENTORY['GIT-FLOW-01']?.medium || 8,
          hardCount: MOCK_QUESTION_INVENTORY['GIT-FLOW-01']?.hard || 7,
        })
      }
      if (depth >= 2) {
        assessedSkills.push({
          skillId: 'prereq-sql',
          skillCode: 'SQL-OPT-01',
          skillName: 'Relational Database Optimization & Indexing',
          isDirect: false,
          hopDepth: 2,
          easyCount: MOCK_QUESTION_INVENTORY['SQL-OPT-01']?.easy || 7,
          mediumCount: MOCK_QUESTION_INVENTORY['SQL-OPT-01']?.medium || 5,
          hardCount: MOCK_QUESTION_INVENTORY['SQL-OPT-01']?.hard || 4,
        })
      }
      if (depth >= 3) {
        assessedSkills.push({
          skillId: 'prereq-docker',
          skillCode: 'DOCKER-CONT-01',
          skillName: 'Containerization Basics with Docker',
          isDirect: false,
          hopDepth: 3,
          easyCount: MOCK_QUESTION_INVENTORY['DOCKER-CONT-01']?.easy || 6,
          mediumCount: MOCK_QUESTION_INVENTORY['DOCKER-CONT-01']?.medium || 8,
          hardCount: MOCK_QUESTION_INVENTORY['DOCKER-CONT-01']?.hard || 5,
        })
      }

      let passingCount = 0
      const deficits: { skillName: string; missingEasy: number; missingMed: number; missingHard: number }[] = []

      assessedSkills.forEach((s) => {
        const missingEasy = Math.max(0, questionCap - s.easyCount)
        const missingMed = Math.max(0, questionCap - s.mediumCount)
        const missingHard = Math.max(0, questionCap - s.hardCount)
        if (missingEasy === 0 && missingMed === 0 && missingHard === 0) {
          passingCount++
        } else {
          deficits.push({
            skillName: s.skillName,
            missingEasy,
            missingMed,
            missingHard,
          })
        }
      })

      return {
        assessedSkills,
        isSufficient: deficits.length === 0,
        deficits,
        passingCount,
        totalSkills: assessedSkills.length,
        depth,
        questionCap,
      }
    },
    [configs]
  )

  // Filtered & Sorted Roles
  const filteredRoles = React.useMemo(() => {
    return roles
      .filter((r) => {
        const matchesSearch =
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesDept = departmentFilter === 'ALL' || r.department === departmentFilter

        const coverage = getRoleCoverageAnalysis(r)
        const matchesCoverage =
          coverageFilter === 'ALL' ||
          (coverageFilter === 'PASSING' && coverage.isSufficient) ||
          (coverageFilter === 'DEFICIT' && !coverage.isSufficient)

        return matchesSearch && matchesDept && matchesCoverage
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title)
        }
        if (sortBy === 'code') {
          return a.code.localeCompare(b.code)
        }
        const timeA = configs[a.code]?.lastSavedAt
          ? new Date(configs[a.code].lastSavedAt!).getTime()
          : new Date(a.updatedAt || a.createdAt || 0).getTime()
        const timeB = configs[b.code]?.lastSavedAt
          ? new Date(configs[b.code].lastSavedAt!).getTime()
          : new Date(b.updatedAt || b.createdAt || 0).getTime()
        return timeB - timeA
      })
  }, [roles, searchQuery, departmentFilter, coverageFilter, sortBy, configs, getRoleCoverageAnalysis])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, departmentFilter, coverageFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize))
  const paginatedRoles = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRoles.slice(start, start + pageSize)
  }, [filteredRoles, currentPage, pageSize])

  // Aggregate metrics
  const totalProfiles = roles.length
  const passingCoverageCount = roles.filter((r) => getRoleCoverageAnalysis(r).isSufficient).length
  const shortageCount = totalProfiles - passingCoverageCount
  const totalRosterCount = roles.reduce((acc, r) => acc + (ROSTER_MAP[r.code]?.length || r.activeEnrollments || 0), 0)

  // Open Configuration Modal
  const handleOpenConfig = (role: TargetRoleModel) => {
    setSelectedRole(role)
    const cfg = configs[role.code] || DEFAULT_CONFIGS[role.code]
    setDraftDepth(cfg?.prerequisiteDepth ?? 3)
    setDraftQuestionCap(cfg?.questionCountMax ?? 5)
    setDraftDifficulty(cfg?.startingDifficulty ?? 'Medium')
    setDraftConfidence(cfg?.confidenceThreshold ?? 0.8)
    setDraftEarlyStopping(cfg?.earlyStoppingEnabled ?? true)
    setIsConfigModalOpen(true)
  }

  // Open Simulation Modal
  const handleOpenSimulate = (role: TargetRoleModel) => {
    setSelectedRole(role)
    const cfg = configs[role.code] || DEFAULT_CONFIGS[role.code]
    setDraftDepth(cfg?.prerequisiteDepth ?? 3)
    setDraftQuestionCap(cfg?.questionCountMax ?? 5)
    setDraftDifficulty(cfg?.startingDifficulty ?? 'Medium')
    setDraftConfidence(cfg?.confidenceThreshold ?? 0.8)
    setIsSimulateModalOpen(true)
  }

  // Open Notify Expert Modal
  const handleOpenNotifyExpert = (role: TargetRoleModel) => {
    setSelectedRole(role)
    setIsNotifyExpertModalOpen(true)
  }

  // Save Configuration Handler
  const handleSaveConfig = () => {
    if (!selectedRole) return
    const activeAnalysis = getRoleCoverageAnalysis(selectedRole, draftDepth, draftQuestionCap)

    if (!activeAnalysis.isSufficient) {
      toast({
        title: 'Insufficient Question Bank Coverage',
        description: `Cannot activate: Question bank has ${activeAnalysis.deficits.length} micro-skills with shortages at cap ${draftQuestionCap}. Lower question cap or author additional items.`,
        variant: 'destructive',
      })
      return
    }

    const updated: Record<string, BaselineConfigModel> = {
      ...configs,
      [selectedRole.code]: {
        roleId: selectedRole.id,
        roleCode: selectedRole.code,
        prerequisiteDepth: draftDepth,
        questionCountMax: draftQuestionCap,
        startingDifficulty: draftDifficulty,
        confidenceThreshold: draftConfidence,
        earlyStoppingEnabled: draftEarlyStopping,
        singleAttemptEnforced: true,
        lastSavedAt: new Date().toISOString(),
        lastSavedBy: 'Sarah Connor (L&D Manager)',
      },
    }

    saveConfigsToStorage(updated)
    setIsConfigModalOpen(false)
    toast({
      title: 'Baseline Rules Activated',
      description: `Baseline configuration for ${selectedRole.title} (${selectedRole.code}) successfully saved and active for new employee attempts.`,
      variant: 'success',
    })
  }

  const handleResetDefaults = () => {
    setDraftDepth(3)
    setDraftQuestionCap(5)
    setDraftDifficulty('Medium')
    setDraftConfidence(0.8)
    setDraftEarlyStopping(true)
    toast({
      title: 'Defaults Restored',
      description: 'Reset parameters to REQ-002-F02 standard baseline defaults (Depth 3, Cap 5, Medium difficulty).',
      variant: 'info',
    })
  }

  const handleSendNotification = () => {
    setNotificationSent(true)
    setTimeout(() => {
      setIsNotifyExpertModalOpen(false)
      setNotificationSent(false)
      toast({
        title: 'Authoring Alert Dispatched',
        description: `Notification queued for Domain Expert (${selectedRole?.assignedExpertName || 'Lead Expert'}). One-email suppression active.`,
        variant: 'success',
      })
    }, 1000)
  }

  // Active role coverage for the open configuration modal
  const modalCoverage = selectedRole
    ? getRoleCoverageAnalysis(selectedRole, draftDepth, draftQuestionCap)
    : null

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Actions Header */}
        <PageHeader
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="h-4 w-4 text-primary" />}
                onClick={() => handleOpenSimulate(roles[0] || SEEDED_ROLES[0])}
                className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs"
              >
                Simulate Run
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Sliders className="h-4 w-4" />}
                onClick={() => handleOpenConfig(roles[0] || SEEDED_ROLES[0])}
                className="font-semibold shadow-2xs"
              >
                Configure Baseline
              </Button>
            </div>
          }
        />

        {/* Top Telemetry KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<BookOpen className="h-4 w-4 text-primary" />}
            title="Total Baseline Profiles"
            value={totalProfiles.toString()}
            valueClassName="text-primary"
            description="Across authorized target roles"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Passing Baseline Coverage"
            value={passingCoverageCount.toString()}
            valueClassName="text-success"
            description="Verified ready for employee tests"
          />

          <StatCard
            variant="gradient"
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
            title="Coverage Shortages"
            value={shortageCount.toString()}
            valueClassName={shortageCount > 0 ? 'text-destructive' : 'text-muted-foreground'}
            description="Blocked by question bank deficits"
          />

          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Active Enrolled Roster"
            value={totalRosterCount.toString()}
            valueClassName="text-primary"
            description="Learners pursuing target baselines"
          />
        </div>

        {/* Main Catalog Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  Baseline Assessment Configurations (REQ-002-F02)
                </CardTitle>
                <CardDescription>
                  Configure prerequisite assessment expansion depth, question caps, starting difficulty, and Bayesian confidence stopping rules.
                </CardDescription>
              </div>

              {/* Filters & Sorting */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roles, codes, or scopes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Departments</option>
                    <option value="Artificial Intelligence & Cognitive Computing">Artificial Intelligence</option>
                    <option value="Information & Communication Technology">Information & Technology</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={coverageFilter}
                    onChange={(e) => setCoverageFilter(e.target.value as any)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Coverages</option>
                    <option value="PASSING">Passing Only</option>
                    <option value="DEFICIT">Shortage Deficits</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2 py-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="latest">Latest Saved / Updated</option>
                    <option value="code">Role Code (A–Z)</option>
                    <option value="title">Role Title (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredRoles.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Sliders className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No target roles match your filter criteria.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSearchQuery(''); setCoverageFilter('ALL'); }}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">ROLE CODE</th>
                      <th className="py-2.5 px-3">TARGET ROLE &amp; VERSION</th>
                      <th className="py-2.5 px-3">LINKED OCCUPATIONS</th>
                      <th className="py-2.5 px-3">ROSTER</th>
                      <th className="py-2.5 px-3 text-center">DEPTH &amp; CAP</th>
                      <th className="py-2.5 px-3 text-center">DIFFICULTY &amp; STOP</th>
                      <th className="py-2.5 px-3">COVERAGE STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedRoles.map((role) => {
                      const cfg = configs[role.code] || DEFAULT_CONFIGS[role.code]
                      const coverage = getRoleCoverageAnalysis(role)
                      const linkedOccupations = LINKED_OCCUPATIONS_MAP[role.code] || [
                        { code: '15-1252.00', name: 'Software Developers' },
                      ]
                      const roster = ROSTER_MAP[role.code] || []

                      return (
                        <tr key={role.id} className="hover:bg-muted/20 transition-colors">
                          {/* Role Code */}
                          <td className="py-3 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                            {role.code}
                          </td>

                          {/* Role Title & Version */}
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-semibold text-foreground text-sm leading-snug">{role.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                v{role.version}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {role.department || 'Curriculum Track'}
                              </span>
                            </div>
                          </td>

                          {/* Linked Occupations (Assigned Column Design from Occupations page) */}
                          <td className="py-3 px-3">
                            {linkedOccupations.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                                  <div className="h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[9px] flex items-center justify-center shrink-0 font-mono">
                                    {linkedOccupations[0].code.slice(0, 2)}
                                  </div>
                                  <span className="text-xs font-medium text-foreground truncate max-w-[150px]" title={linkedOccupations[0].name}>
                                    {linkedOccupations[0].name}
                                  </span>
                                </div>

                                {linkedOccupations.length > 1 && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-default"
                                    title={`+${linkedOccupations.length - 1} more: ${linkedOccupations
                                      .slice(1)
                                      .map((o) => `${o.code} ${o.name}`)
                                      .join(', ')}`}
                                  >
                                    +{linkedOccupations.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">None linked</span>
                            )}
                          </td>

                          {/* Roster (Assigned Column Design from Occupations page) */}
                          <td className="py-3 px-3">
                            {roster.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {roster[0].name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-medium text-foreground">
                                    {roster[0].name}
                                  </span>
                                </div>

                                {roster.length > 1 && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-default"
                                    title={`+${roster.length - 1} more: ${roster
                                      .slice(1)
                                      .map((u) => u.name)
                                      .join(', ')}`}
                                  >
                                    +{roster.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">No active learners</span>
                            )}
                          </td>

                          {/* Prerequisite Depth & Question Cap */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-semibold text-foreground">
                              {cfg?.prerequisiteDepth ?? 3} hops
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {cfg?.questionCountMax ?? 5} max / skill
                            </span>
                          </td>

                          {/* Starting Difficulty & Confidence Stopping Rule */}
                          <td className="py-3 px-3 text-center">
                            <Badge variant="outline" className="font-bold text-[10px]">
                              {cfg?.startingDifficulty ?? 'Medium'}
                            </Badge>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {Math.round((cfg?.confidenceThreshold ?? 0.8) * 100)}% Bayes Stop
                            </div>
                          </td>

                          {/* Coverage Status Badge */}
                          <td className="py-3 px-3">
                            {coverage.isSufficient ? (
                              <Badge variant="success" className="font-bold">
                                PASSING ({coverage.passingCount}/{coverage.totalSkills})
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="font-bold">
                                DEFICIT ({coverage.deficits.length} Short)
                              </Badge>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Configure Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenConfig(role)}
                                title="Configure Baseline Rules"
                                aria-label="Configure Baseline Rules"
                              >
                                <Sliders className="h-4 w-4 text-primary" />
                              </Button>

                              {/* Simulation Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenSimulate(role)}
                                title="Simulate Adaptive Test Run"
                                aria-label="Simulate Adaptive Test Run"
                              >
                                <Sparkles className="h-4 w-4 text-foreground" />
                              </Button>

                              {/* Notify Expert Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenNotifyExpert(role)}
                                title="Dispatch Alert to Domain Expert"
                                aria-label="Dispatch Alert to Domain Expert"
                              >
                                <Mail className="h-4 w-4 text-foreground" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredRoles.length > 0 && (
              <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1}–
                  {Math.min(currentPage * pageSize, filteredRoles.length)} of {filteredRoles.length} target roles
                </span>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. CONFIGURE BASELINE PARAMETERS MODAL */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen} className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sliders className="h-5 w-5 text-primary shrink-0" />
              <span>Configure Baseline Assessment Rules: {selectedRole?.title}</span>
            </DialogTitle>
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
              {selectedRole?.code}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Governs prerequisite knowledge graph expansion depth, questions delivered per micro-skill, starting difficulty, and Bayesian confidence early-stopping bounds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 text-xs max-h-[70vh] overflow-y-auto pr-1">
          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Prerequisite Depth */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between">
                <label className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span>Prerequisite Depth</span>
                  <span className="text-primary font-bold">({draftDepth} hops)</span>
                </label>
                <Badge variant="outline" className="text-[10px]">
                  Range: 0 - 5 hops
                </Badge>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={draftDepth}
                onChange={(e) => setDraftDepth(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>0 (Direct)</span>
                <span>1</span>
                <span>2</span>
                <span>3 (Default)</span>
                <span>4</span>
                <span>5 (Max)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {draftDepth === 0
                  ? 'Only directly required role micro-skills are evaluated.'
                  : `Traverses ${draftDepth} hop(s) backward into prerequisite skills.`}
              </p>
            </div>

            {/* 2. Question Cap Per Micro-Skill */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between">
                <label className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span>Question Cap Per Skill</span>
                  <span className="text-primary font-bold">({draftQuestionCap} max)</span>
                </label>
                <Badge variant="outline" className="text-[10px]">
                  Range: 3 - 10 questions
                </Badge>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={draftQuestionCap}
                onChange={(e) => setDraftQuestionCap(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>3 (Min)</span>
                <span>5 (Default)</span>
                <span>7</span>
                <span>10 (Max)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Requires at least {draftQuestionCap} Easy, {draftQuestionCap} Medium, and {draftQuestionCap} Hard items in the bank ({draftQuestionCap * 3} items/skill).
              </p>
            </div>

            {/* 3. Initial Starting Difficulty */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border bg-background">
              <label className="text-body-sm font-semibold text-foreground block">
                Initial Starting Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDraftDifficulty(diff)}
                    className={`py-1.5 px-3 rounded-md text-xs font-semibold border transition-all text-center ${
                      draftDifficulty === diff
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-card border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Every assessed micro-skill starts at {draftDifficulty}. Questions adapt dynamically based on learner response accuracy.
              </p>
            </div>

            {/* 4. Bayesian Confidence Threshold */}
            <div className="space-y-2 p-3.5 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between">
                <label className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span>Confidence Threshold</span>
                  <span className="text-primary font-bold">({Math.round(draftConfidence * 100)}%)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground font-semibold">
                  <input
                    type="checkbox"
                    checked={draftEarlyStopping}
                    onChange={(e) => setDraftEarlyStopping(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span>Early Stop</span>
                </label>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.95"
                step="0.05"
                value={draftConfidence}
                disabled={!draftEarlyStopping}
                onChange={(e) => setDraftConfidence(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer disabled:opacity-50"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>70%</span>
                <span>80% (Default)</span>
                <span>90%</span>
                <span>95%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Evaluation ends early once Bayesian mastery certainty reaches {Math.round(draftConfidence * 100)}%.
              </p>
            </div>
          </div>

          {/* Question Bank Coverage Matrix Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Live Question Bank Coverage Matrix ({modalCoverage?.assessedSkills.length} Assessed Skills)
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Req: {draftQuestionCap} each / difficulty
              </span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Micro-Skill</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 text-center">Easy ({draftQuestionCap})</th>
                    <th className="py-2 px-3 text-center">Medium ({draftQuestionCap})</th>
                    <th className="py-2 px-3 text-center">Hard ({draftQuestionCap})</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalCoverage?.assessedSkills.map((skill) => {
                    const easyOk = skill.easyCount >= draftQuestionCap
                    const medOk = skill.mediumCount >= draftQuestionCap
                    const hardOk = skill.hardCount >= draftQuestionCap
                    const allOk = easyOk && medOk && hardOk

                    return (
                      <tr key={skill.skillId} className="hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-foreground">{skill.skillName}</div>
                          <span className="font-mono text-[10px] text-muted-foreground">{skill.skillCode}</span>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={skill.isDirect ? 'primary' : 'outline'} className="text-[9px] py-0 px-1">
                            {skill.isDirect ? 'Direct' : `Hop ${skill.hopDepth}`}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          <span className={easyOk ? 'text-success font-bold' : 'text-destructive font-bold'}>
                            {skill.easyCount}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          <span className={medOk ? 'text-success font-bold' : 'text-destructive font-bold'}>
                            {skill.mediumCount}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          <span className={hardOk ? 'text-success font-bold' : 'text-destructive font-bold'}>
                            {skill.hardCount}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {allOk ? (
                            <Badge variant="success" className="text-[10px] py-0 px-1.5">
                              READY
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                              DEFICIT
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!modalCoverage?.isSufficient && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Insufficient Question Pool for Activation</div>
                  <p className="text-[11px] mt-0.5 text-destructive/90">
                    {modalCoverage?.deficits.length} micro-skills lack the required {draftQuestionCap} questions per difficulty. Adjust question cap or dispatch an alert to the assigned domain expert.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveConfig}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Save &amp; Activate
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 2. SIMULATE RUN MODAL */}
      <Dialog open={isSimulateModalOpen} onOpenChange={setIsSimulateModalOpen} className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <span>Simulate Baseline Diagnostic: {selectedRole?.title}</span>
            </DialogTitle>
            <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-wider">
              BAYESIAN RUN
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Preview simulated question delivery sequence and knowledge graph pathing constraints for an employee starting this baseline test.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Target Role</span>
              <strong className="font-bold text-foreground text-xs truncate block">{selectedRole?.title}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Prereq Depth</span>
              <strong className="font-mono text-foreground font-bold text-xs">{draftDepth} Hops</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Question Cap</span>
              <strong className="font-mono text-foreground font-bold text-xs">{draftQuestionCap} / Skill</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Start Difficulty</span>
              <strong className="text-foreground font-bold text-xs uppercase">{draftDifficulty}</strong>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Simulated Diagnostic Execution Sequence
            </label>
            <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card text-xs">
              <div className="p-3 flex items-start gap-3 bg-card hover:bg-muted/20 transition-colors">
                <span className="font-mono text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-secondary shrink-0">
                  Step 1
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Initial Graph Calibration</span>
                    <span className="text-[11px] text-muted-foreground">Calibration Depth: 0</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Evaluates candidate against direct micro-skills starting at <strong className="text-foreground">{draftDifficulty}</strong> difficulty.
                  </p>
                </div>
              </div>
              <div className="p-3 flex items-start gap-3 bg-card hover:bg-muted/20 transition-colors">
                <span className="font-mono text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-secondary shrink-0">
                  Step 2
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Adaptive Prerequisite Pathing</span>
                    <span className="text-[11px] text-muted-foreground">Hops: Up to {draftDepth}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    When incorrect answers occur, the graph traverses up to {draftDepth} hops down prerequisite chains to identify root gaps.
                  </p>
                </div>
              </div>
              <div className="p-3 flex items-start gap-3 bg-card hover:bg-muted/20 transition-colors">
                <span className="font-mono text-[11px] font-bold text-primary px-1.5 py-0.5 rounded bg-secondary shrink-0">
                  Step 3
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Bayesian Convergence &amp; Pathway Synthesis</span>
                    <span className="text-[11px] text-muted-foreground">Confidence: {Math.round(draftConfidence * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Stopping rule terminates evaluation when confidence reaches {Math.round(draftConfidence * 100)}% or question cap ({draftQuestionCap}/skill) is reached.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
          <Button variant="outline" size="sm" onClick={() => setIsSimulateModalOpen(false)}>
            Close Simulation
          </Button>
        </div>
      </Dialog>

      {/* 3. NOTIFY DOMAIN EXPERT MODAL */}
      <Dialog open={isNotifyExpertModalOpen} onOpenChange={setIsNotifyExpertModalOpen} className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <span>Notify Assigned Domain Expert</span>
            </DialogTitle>
            <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">
              AUTHORING DISPATCH
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Dispatch an authoring request to the designated domain expert to fill identified question bank inventory deficits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Target Role</span>
              <strong className="font-bold text-foreground text-xs truncate block">{selectedRole?.title}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Assigned Expert</span>
              <strong className="font-bold text-foreground text-xs">{selectedRole?.assignedExpertName || 'Expert Lead'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">Deficit Micro-Skills</span>
              <strong className="text-destructive font-bold text-xs">
                {modalCoverage?.deficits.length || 0} Skills Short
              </strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Dispatched Authoring Notification
            </label>
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between pb-2 border-b border-border/60">
                <span>Subject: Question Bank Authoring Required for {selectedRole?.title}</span>
                <Badge variant="outline" className="text-[10px]">Priority: High</Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Dear {selectedRole?.assignedExpertName || 'Domain Expert'},
                <br /><br />
                Target role <strong className="text-foreground">{selectedRole?.title}</strong> currently has{' '}
                <strong className="text-destructive font-semibold">{modalCoverage?.deficits.length || 0} micro-skills</strong> with insufficient question bank coverage for the configured baseline assessment depth ({draftDepth}) and cap ({draftQuestionCap} items/skill).
                <br /><br />
                Please author additional diagnostic items in the Knowledge Authoring Portal to unlock baseline testing for employees.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNotifyExpertModalOpen(false)}
            disabled={notificationSent}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendNotification}
            disabled={notificationSent}
            className="flex items-center gap-1.5"
          >
            <Send size={13} />
            <span>{notificationSent ? 'Dispatching...' : 'Dispatch Alert to Expert'}</span>
          </Button>
        </div>
      </Dialog>
    </WorkspaceLayout>
  )
}

export default BaselineAssessmentConfigPage
