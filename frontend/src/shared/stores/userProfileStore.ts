import { getActiveCompany } from './companyStore'

export type ActorRole = 'employee' | 'expert' | 'ld-manager' | 'admin' | 'guest' | 'learner'

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
    name: 'Chen Wei',
    email: 'chen.wei@adaptlearn.internal',
    roleTitle: 'Expert',
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
    scope: 'Neo4j Knowledge Graph & Design System Showcase',
    status: 'Neo4j Bolt: Active',
    details: [
      { label: 'Department', value: 'Corporate Ontology & Governance' },
      { label: 'Scope', value: 'Neo4j Knowledge Graph & Design System Showcase' },
      { label: 'Cluster Connectivity', value: 'Neo4j Bolt: Active' },
    ],
  },
  guest: {
    name: 'Guest Administrator',
    email: 'guest.user@example.com',
    roleTitle: 'Guest / Purchaser',
    portal: 'Guest',
    department: 'Organization Provisioning',
    scope: 'Elevates to L&D Manager upon package selection',
    status: 'Sandbox Provisioning • Instant Activation',
    details: [
      { label: 'Account Scope', value: 'Organization Provisioning' },
      { label: 'Assigned Role', value: 'Elevates to L&D Manager upon package selection' },
      { label: 'Trial Mode', value: 'Sandbox Provisioning • Instant Activation' },
      { label: 'Access Level', value: '100% Complete Feature Parity' },
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

  // 1. Resolve Display Name
  const customName =
    localStorage.getItem(`user_name_${effectiveKey}`) ||
    (effectiveKey === 'guest'
      ? localStorage.getItem('auth_display_name')
      : null) ||
    defaults.name

  // 2. Resolve Email
  let customEmail = localStorage.getItem(`user_email_${effectiveKey}`)
  if (!customEmail && effectiveKey === 'guest') {
    customEmail = localStorage.getItem('auth_user')
  }
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
