import { getActiveCompany } from './companyStore'

export type ActorRole = 'employee' | 'expert' | 'ld-manager' | 'admin' | 'learner' | 'platform-admin'

export interface UserProfileData {
  actor: ActorRole
  name: string
  email: string
  roleTitle: string
  initials: string
  portal: string
  department: string
  scope: string
  status: string
  details: { label: string; value: string }[]
}

export const EXPERT_DIRECTORY: Record<string, { name: string; email: string; roleTitle: string }> = {
  'a0000000-0000-0000-0000-000000000002': {
    name: 'Dr. Sarah Chen',
    email: 'expert@technova.com',
    roleTitle: 'Senior AI & Knowledge Architect',
  },
  'expert-chen': {
    name: 'Dr. Sarah Chen',
    email: 'expert-chen@adaptlearn.internal',
    roleTitle: 'Senior AI & Knowledge Architect',
  },
  'expert-vance': {
    name: 'Marcus Vance',
    email: 'expert-vance@adaptlearn.internal',
    roleTitle: 'Principal Graph Database Architect',
  },
  'expert-rivera': {
    name: 'Alex Rivera',
    email: 'expert-rivera@adaptlearn.internal',
    roleTitle: 'Staff Cloud Infrastructure Engineer',
  },
  'expert-nguyen': {
    name: 'Linh Nguyen',
    email: 'expert-nguyen@adaptlearn.internal',
    roleTitle: 'Lead Data Systems Specialist',
  },
}

const DEFAULT_PROFILES: Record<
  string,
  {
    name: string
    email: string
    roleTitle: string
    portal: string
    department: string
    scope: string
    status: string
    details: { label: string; value: string }[]
  }
> = {
  employee: {
    name: 'Alex Chen',
    email: 'alex.chen@adaptlearn.internal',
    roleTitle: 'Employee',
    portal: 'Employee',
    department: 'Machine Learning & Cognitive Architecture',
    scope: 'Self-Directed Career Progression',
    status: 'Diagnostic Active • 92% Highest Score',
    details: [
      { label: 'Department', value: 'Machine Learning & Cognitive Architecture' },
      { label: 'Target Career Goal', value: 'AI Knowledge Architect' },
      { label: 'Current Status', value: 'Diagnostic Active • 92% Highest Score' },
    ],
  },
  expert: {
    name: 'Dr. Sarah Chen',
    email: 'expert-chen@adaptlearn.internal',
    roleTitle: 'Senior AI & Knowledge Architect',
    portal: 'Expert Authoring Portal',
    department: 'Cognitive Architecture & Curricula',
    scope: 'Macro Competencies, Micro-skills & Question Bank',
    status: '100% Curricular Integrity Verified',
    details: [
      { label: 'Department', value: 'Cognitive Architecture & Curricula' },
      { label: 'Authoring Scope', value: 'Macro Competencies, Micro-skills & Question Bank' },
      { label: 'Curation Status', value: '100% Curricular Integrity Verified' },
    ],
  },
  'ld-manager': {
    name: 'Sarah Connor',
    email: 'sarah.connor@adaptlearn.internal',
    roleTitle: 'Enterprise L&D Director',
    portal: 'L&D Manager Console',
    department: 'Enterprise Talent Development',
    scope: 'Cross-Departmental Skill Matrices & User Provisioning',
    status: '78% Average Team Readiness',
    details: [
      { label: 'Department', value: 'Enterprise Talent Development' },
      { label: 'Organization Scope', value: 'Cross-Departmental Skill Matrices & User Provisioning' },
      { label: 'Readiness Benchmark', value: '78% Average Team Readiness' },
    ],
  },
  admin: {
    name: 'Elena Rostova',
    email: 'elena.rostova@adaptlearn.internal',
    roleTitle: 'Lead System Administrator',
    portal: 'Administration',
    department: 'Corporate Ontology & Governance',
    scope: 'Competency Framework & Design System Showcase',
    status: 'Competency Engine: Operational',
    details: [
      { label: 'Department', value: 'Corporate Ontology & Governance' },
      { label: 'Scope', value: 'Competency Framework & Design System Showcase' },
      { label: 'Connectivity', value: 'Competency Engine: Operational' },
    ],
  },
  'platform-admin': {
    name: 'Platform Superadmin',
    email: 'platform.admin@adaptlearn.io',
    roleTitle: 'Platform Administrator',
    portal: 'Platform Administration',
    department: 'Multi-Tenant Platform Infrastructure',
    scope: 'Multi-Organization Lifecycle, Subscriptions & Telemetry',
    status: 'Global Health: 100% Operational',
    details: [
      { label: 'Platform Scope', value: 'Multi-Tenant Organization Workspaces' },
      { label: 'Authority', value: 'Global Platform Administrator' },
      { label: 'Cluster Status', value: 'Multi-Region Neo4j & PostgreSQL Active' },
    ],
  },
}

export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getUserProfile(actor: ActorRole): UserProfileData {
  const effectiveKey = actor === 'learner' ? 'employee' : actor
  const defaults = DEFAULT_PROFILES[effectiveKey] || DEFAULT_PROFILES.employee
  const company = getActiveCompany()

  if (effectiveKey === 'expert') {
    const activeExpertId = localStorage.getItem('expert_active_id') || 'expert-chen'
    const expertInfo = EXPERT_DIRECTORY[activeExpertId] || EXPERT_DIRECTORY['expert-chen']
    const customName =
      localStorage.getItem(`user_name_${effectiveKey}`) ||
      expertInfo.name
    const customEmail =
      localStorage.getItem(`user_email_${effectiveKey}`) ||
      expertInfo.email
    const initials = computeInitials(customName)

    return {
      actor,
      name: customName,
      email: customEmail,
      roleTitle: expertInfo.roleTitle,
      initials,
      portal: defaults.portal,
      department: defaults.department,
      scope: defaults.scope,
      status: defaults.status,
      details: [
        { label: 'Organization', value: company.name },
        ...defaults.details,
      ],
    }
  }

  // 1. Resolve Display Name
  const customName =
    localStorage.getItem(`user_name_${effectiveKey}`) ||
    defaults.name

  // 2. Resolve Email
  const customEmail = localStorage.getItem(`user_email_${effectiveKey}`)
  const email = customEmail || defaults.email

  // 3. Resolve Initials
  const initials = computeInitials(customName)

  return {
    actor,
    name: customName,
    email,
    roleTitle: defaults.roleTitle,
    initials,
    portal: defaults.portal,
    department: defaults.department,
    scope: defaults.scope,
    status: defaults.status,
    details: [
      { label: 'Organization', value: company.name },
      ...defaults.details,
    ],
  }
}

export function updateUserProfileName(actor: ActorRole, newName: string): void {
  const effectiveKey = actor === 'learner' ? 'employee' : actor
  const trimmed = newName.trim()
  if (!trimmed) return

  localStorage.setItem(`user_name_${effectiveKey}`, trimmed)
  localStorage.setItem('auth_display_name', trimmed)
  window.dispatchEvent(new CustomEvent('user_profile_updated'))
}

export function getUserPassword(email: string): string {
  const normalized = email.toLowerCase().trim()
  return (
    localStorage.getItem(`auth_password_${normalized}`) ||
    localStorage.getItem('auth_password') ||
    'enterprisePass2026!'
  )
}

export function updateUserPassword(email: string, newPassword: string): void {
  const normalized = email.toLowerCase().trim()
  localStorage.setItem(`auth_password_${normalized}`, newPassword)
  localStorage.setItem('auth_password', newPassword)
  window.dispatchEvent(new CustomEvent('user_password_updated'))
}
