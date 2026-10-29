import {
  INITIAL_BLUEPRINTS,
  INITIAL_QUESTIONS,
  type AssessmentBlueprintModel,
  type CompetencyModel,
  type MicroSkillModel,
  type LearningModuleModel,
  type PrerequisiteEdge,
  type QuizQuestionModel,
  type TargetRoleModel,
} from '../../features/manager/data/ldManagerMockData'

export type PackageTier = 'Starter' | 'Growth' | 'Enterprise'
export type CompanyUserRole = 'L&D Manager' | 'Expert' | 'Employee'
export type UserStatus = 'active' | 'pending' | 'inactive'

export interface CompanyUser {
  id: string
  name: string
  email: string
  role: CompanyUserRole
  department: string
  status: UserStatus
  targetRole?: string
  lastActive: string
  avatar: string
}

export interface CompanyRecord {
  id: string
  name: string
  packageTier: PackageTier
  maxUsers: number
  ownerEmail: string
  createdAt: string
  users: CompanyUser[]
  competencies: CompetencyModel[]
  microSkills: MicroSkillModel[]
  prerequisites: PrerequisiteEdge[]
  modules: LearningModuleModel[]
  targetRoles: TargetRoleModel[]
  questions: QuizQuestionModel[]
  blueprints: AssessmentBlueprintModel[]
  isSuspended?: boolean
  suspensionReason?: string
  domain?: string
}

const STORAGE_KEY_COMPANIES = 'adaptlearn_companies_v4'
const STORAGE_KEY_ACTIVE_COMPANY = 'adaptlearn_active_company_id'

// Initial seeded enterprise company: TechNova
const SEED_COMPANY_TECHNOVA: CompanyRecord = {
  id: 'e0000000-0000-0000-0000-000000000001', // TechNova Workspace UUID
  name: 'TechNova Cognitive Labs',
  packageTier: 'Enterprise',
  maxUsers: 50,
  ownerEmail: 'sarah.connor@adaptlearn.internal',
  createdAt: '2026-01-15',
  users: [
    {
      id: 'USR-101',
      name: 'Sarah Connor',
      email: 'sarah.connor@adaptlearn.internal',
      role: 'L&D Manager',
      department: 'Enterprise Talent Development',
      status: 'active',
      lastActive: 'Just now',
      avatar: 'SC',
    },
    {
      id: 'USR-102',
      name: 'Dr. Sarah Chen',
      email: 'expert-chen@adaptlearn.internal',
      role: 'Expert',
      department: 'Cognitive Architecture & AI',
      status: 'active',
      lastActive: '10 mins ago',
      avatar: 'SC',
    },
    {
      id: 'USR-103',
      name: 'Alex Chen',
      email: 'alex.chen@adaptlearn.internal',
      role: 'Employee',
      department: 'Machine Learning & Cognitive Architecture',
      status: 'active',
      targetRole: 'AI Knowledge Architect',
      lastActive: '15 mins ago',
      avatar: 'AC',
    },
    {
      id: 'USR-104',
      name: 'Marcus Vance',
      email: 'marcus.vance@adaptlearn.internal',
      role: 'Employee',
      department: 'Backend Engineering',
      status: 'active',
      targetRole: 'Machine Learning Engineer',
      lastActive: 'Yesterday',
      avatar: 'MV',
    },
    {
      id: 'USR-105',
      name: 'Chloe Bennett',
      email: 'chloe.bennett@adaptlearn.internal',
      role: 'Employee',
      department: 'Data & Analytics',
      status: 'pending',
      targetRole: 'Data Systems Specialist',
      lastActive: '3 days ago',
      avatar: 'CB',
    },
    {
      id: 'USR-106',
      name: 'Elena Rostova',
      email: 'elena.rostova@adaptlearn.internal',
      role: 'Employee',
      department: 'Cognitive Architecture & AI',
      status: 'active',
      targetRole: 'AI Knowledge Architect',
      lastActive: 'Just now',
      avatar: 'ER',
    },
  ],
  competencies: [],
  microSkills: [],
  prerequisites: [],
  modules: [],
  targetRoles: [],
  questions: INITIAL_QUESTIONS,
  blueprints: INITIAL_BLUEPRINTS,
}

// Initial seeded starter company: Acme Global
const SEED_COMPANY_ACME: CompanyRecord = {
  id: 'comp-acme',
  name: 'Acme Cloud Dynamics',
  packageTier: 'Starter',
  maxUsers: 20,
  ownerEmail: 'jordan.parker@acme.internal',
  createdAt: '2026-02-01',
  users: [
    {
      id: 'USR-201',
      name: 'Jordan Parker',
      email: 'jordan.parker@acme.internal',
      role: 'L&D Manager',
      department: 'Cloud & Infrastructure',
      status: 'active',
      lastActive: '1 hour ago',
      avatar: 'JP',
    },
    {
      id: 'USR-202',
      name: 'Maya Lin',
      email: 'maya.lin@acme.internal',
      role: 'Expert',
      department: 'Cybersecurity & DevOps',
      status: 'active',
      lastActive: '4 hours ago',
      avatar: 'ML',
    },
    {
      id: 'USR-203',
      name: 'Elena S.',
      email: 'elena.s@acme.internal',
      role: 'Employee',
      department: 'Platform Reliability',
      status: 'active',
      targetRole: 'Cloud Security Architect',
      lastActive: '2 days ago',
      avatar: 'ES',
    },
  ],
  competencies: [],
  microSkills: [],
  prerequisites: [],
  modules: [],
  targetRoles: [],
  questions: INITIAL_QUESTIONS.slice(0, 3),
  blueprints: INITIAL_BLUEPRINTS.slice(0, 1),
}

export const PACKAGE_LIMITS: Record<PackageTier, { limit: number; price: string; description: string }> = {
  Starter: {
    limit: 20,
    price: '$199 / mo',
    description: 'Full platform access with up to 20 user seats.',
  },
  Growth: {
    limit: 50,
    price: '$499 / mo',
    description: 'Full platform access with up to 50 user seats.',
  },
  Enterprise: {
    limit: 200,
    price: '$999 / mo',
    description: 'Full platform access with up to 200 user seats.',
  },
}

export function resolveWorkspaceOrgId(contextOrgId?: string | null): string {
  if (contextOrgId && contextOrgId !== 'comp-technova' && contextOrgId !== 'default-org') {
    return contextOrgId
  }
  const activeId = getActiveCompanyId()
  if (activeId && activeId !== 'comp-technova' && activeId !== 'default-org') {
    return activeId
  }
  return SEED_COMPANY_TECHNOVA.id
}

export function loadCompanies(): CompanyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPANIES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as CompanyRecord[]).map((comp) => {
          let users = comp.users || []
          const isTechnova = comp.id === 'comp-technova' || comp.id === SEED_COMPANY_TECHNOVA.id
          if (isTechnova) {
            const hasElena = users.some((u) => u.id === 'USR-106')
            if (!hasElena) {
              const elenaUser = SEED_COMPANY_TECHNOVA.users.find((u) => u.id === 'USR-106')
              if (elenaUser) {
                users = [...users, elenaUser]
              }
            }
          }
          const normalizedId = isTechnova ? SEED_COMPANY_TECHNOVA.id : (comp.id || SEED_COMPANY_TECHNOVA.id)
          return {
            ...comp,
            id: normalizedId,
            users,
            microSkills: Array.isArray(comp.microSkills) ? comp.microSkills : [],
            competencies: Array.isArray(comp.competencies) ? comp.competencies : [],
            blueprints: Array.isArray(comp.blueprints)
              ? comp.blueprints
              : isTechnova
              ? INITIAL_BLUEPRINTS
              : [],
          }
        })
      }
    }
  } catch (e) {
    console.error('Failed to parse stored companies:', e)
  }
  const defaultCompanies = [SEED_COMPANY_TECHNOVA, SEED_COMPANY_ACME]
  saveCompanies(defaultCompanies)
  return defaultCompanies
}

export function saveCompanies(companies: CompanyRecord[]) {
  try {
    const sanitized = companies.map((c) => (c.id === 'comp-technova' ? { ...c, id: SEED_COMPANY_TECHNOVA.id } : c))
    localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(sanitized))
    window.dispatchEvent(new Event('companies_updated'))
  } catch (e) {
    console.error('Failed to save companies:', e)
  }
}

export function getActiveCompanyId(): string {
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_COMPANY)
  if (saved) {
    if (saved === 'comp-technova' || saved === 'default-org') return SEED_COMPANY_TECHNOVA.id
    return saved
  }
  return SEED_COMPANY_TECHNOVA.id
}

export function setActiveCompanyId(id: string) {
  const normalized = id === 'comp-technova' || id === 'default-org' ? SEED_COMPANY_TECHNOVA.id : id
  localStorage.setItem(STORAGE_KEY_ACTIVE_COMPANY, normalized)
  window.dispatchEvent(new Event('active_company_changed'))
}

export function getActiveCompany(): CompanyRecord {
  const companies = loadCompanies()
  const activeId = getActiveCompanyId()
  const found = companies.find((c) => c.id === activeId || (activeId === SEED_COMPANY_TECHNOVA.id && c.id === 'comp-technova'))
  if (found) {
    if (found.id === 'comp-technova') {
      return { ...found, id: SEED_COMPANY_TECHNOVA.id }
    }
    return found
  }
  const fallback = companies[0] || SEED_COMPANY_TECHNOVA
  return fallback.id === 'comp-technova' ? { ...fallback, id: SEED_COMPANY_TECHNOVA.id } : fallback
}

export function updateActiveCompany(updater: (company: CompanyRecord) => CompanyRecord) {
  const companies = loadCompanies()
  const activeId = getActiveCompanyId()
  const updated = companies.map((c) =>
    (c.id === activeId || (activeId === SEED_COMPANY_TECHNOVA.id && c.id === 'comp-technova'))
      ? updater(c)
      : c
  )
  saveCompanies(updated)
}

export function createCompanyFromPackagePurchase(
  companyName: string,
  packageTier: PackageTier,
  ownerEmail: string,
  ownerName: string
): CompanyRecord {
  const companies = loadCompanies()
  const id = `comp-${Date.now().toString(36)}`
  const maxUsers = PACKAGE_LIMITS[packageTier]?.limit || 20

  const initials = ownerName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LD'

  const ownerUser: CompanyUser = {
    id: `USR-${Math.floor(100 + Math.random() * 900)}`,
    name: ownerName,
    email: ownerEmail,
    role: 'L&D Manager',
    department: 'Enterprise Talent Development',
    status: 'active',
    lastActive: 'Just now',
    avatar: initials,
  }

  const newCompany: CompanyRecord = {
    id,
    name: companyName.trim(),
    packageTier,
    maxUsers,
    ownerEmail,
    createdAt: new Date().toISOString().slice(0, 10),
    users: [ownerUser],
    competencies: [],
    microSkills: [],
    prerequisites: [],
    modules: [],
    targetRoles: [],
    questions: [],
    blueprints: [],
  }

  const updatedCompanies = [newCompany, ...companies]
  saveCompanies(updatedCompanies)
  setActiveCompanyId(id)

  return newCompany
}

