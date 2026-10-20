import { loadCompanies, saveCompanies, type CompanyRecord, type PackageTier } from '../../shared/stores/companyStore'

export interface PlatformSubscriptionPlan {
  id: string
  tier: PackageTier
  name: string
  description: string
  priceUsdMonthly: number
  priceUsdAnnual: number
  priceVndMonthly: number
  priceVndAnnual: number
  seatLimit: number
  popular?: boolean
  features: string[]
  isActive: boolean
}

export interface PlatformAuditEvent {
  id: string
  timestamp: string
  organizationId: string
  organizationName: string
  actor: string
  action: string
  details: string
  severity: 'info' | 'success' | 'warning' | 'error'
}

export interface PlatformHealthMetric {
  service: string
  status: 'operational' | 'degraded' | 'outage'
  latencyMs: number
  uptimePercent: number
  lastChecked: string
}

const STORAGE_KEY_PLANS = 'adaptlearn_platform_plans_v1'
const STORAGE_KEY_AUDIT = 'adaptlearn_platform_audit_v1'

export const DEFAULT_PLANS: PlatformSubscriptionPlan[] = [
  {
    id: 'plan-starter',
    tier: 'Starter',
    name: 'Starter Tier',
    description: 'Perfect for small engineering teams starting competency intelligence and graph upskilling.',
    priceUsdMonthly: 199,
    priceUsdAnnual: 159,
    priceVndMonthly: 4900000,
    priceVndAnnual: 3900000,
    seatLimit: 20,
    features: [
      'Up to 20 Employee seats',
      'Full Competency Ontology & Micro-skills Graph',
      'Automated Diagnostic Assessment Quiz Engine',
      'Adaptive Learning Pathways & Skill Gap Analysis',
      'Interactive Knowledge Graph Visualization',
      'PayOS Signature-Verified Subscriptions',
      'Standard Email Support',
    ],
    isActive: true,
  },
  {
    id: 'plan-growth',
    tier: 'Growth',
    name: 'Growth Tier',
    description: 'Ideal for scaling engineering departments with dedicated L&D managers and experts.',
    priceUsdMonthly: 499,
    priceUsdAnnual: 399,
    priceVndMonthly: 12250000,
    priceVndAnnual: 9800000,
    seatLimit: 50,
    popular: true,
    features: [
      'Up to 50 Employee seats',
      'All Starter features included',
      'Multiple L&D Managers & Domain Experts',
      'O*NET Discipline & Occupation Mapping',
      'Team Competency Heatmaps & ROI Telemetry',
      'Custom Assessment Question Banks & Blueprints',
      'Priority Support & Dedicated Onboarding',
    ],
    isActive: true,
  },
  {
    id: 'plan-enterprise',
    tier: 'Enterprise',
    name: 'Enterprise Tier',
    description: 'Complete competency intelligence platform for enterprise-scale software engineering organizations.',
    priceUsdMonthly: 999,
    priceUsdAnnual: 799,
    priceVndMonthly: 24500000,
    priceVndAnnual: 19600000,
    seatLimit: 200,
    features: [
      'Up to 200 Employee seats',
      'All Growth features included',
      'Custom Neo4j Graph Projections & Private Database Space',
      'MinIO Dedicated File & Video Storage Quota',
      'Knowledge Tracing Adaptation & Custom Traversal Models',
      'SSO & Granular Administrative Permissions',
      'Dedicated Customer Success Manager & 99.9% SLA',
    ],
    isActive: true,
  },
]

export const INITIAL_AUDIT_LOGS: PlatformAuditEvent[] = [
  {
    id: 'PAUD-901',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    organizationId: 'comp-technova',
    organizationName: 'TechNova Cognitive Labs',
    actor: 'system',
    action: 'SUBSCRIPTION_RENEWAL_CONFIRMED',
    details: 'PayOS webhook confirmed monthly subscription renewal for Enterprise Tier (VND 24,500,000).',
    severity: 'success',
  },
  {
    id: 'PAUD-902',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    organizationId: 'comp-acme',
    organizationName: 'Acme Cloud Dynamics',
    actor: 'Jordan Parker (Org Admin)',
    action: 'EMPLOYEE_SEATS_UPDATED',
    details: 'Assigned 3 new employees to Cloud Infrastructure department. 18 of 20 seats utilized.',
    severity: 'info',
  },
  {
    id: 'PAUD-903',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    organizationId: 'comp-technova',
    organizationName: 'TechNova Cognitive Labs',
    actor: 'Sarah Connor (L&D Manager)',
    action: 'TARGET_ROLE_PUBLISHED',
    details: 'Published new target role "AI Knowledge Architect" to employee catalog.',
    severity: 'info',
  },
  {
    id: 'PAUD-904',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    organizationId: 'platform-system',
    organizationName: 'Adapt-Learn-Graph Platform',
    actor: 'Cron Runner',
    action: 'NEO4J_CONSISTENCY_AUDIT',
    details: 'Multi-tenant graph boundary check passed: 0 cross-tenant edges detected.',
    severity: 'success',
  },
  {
    id: 'PAUD-905',
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    organizationId: 'comp-acme',
    organizationName: 'Acme Cloud Dynamics',
    actor: 'system',
    action: 'WORKSPACE_PROVISIONED',
    details: 'Self-service workspace setup completed. Relational tenant & Neo4j schemas active.',
    severity: 'success',
  },
]

export function loadPlatformPlans(): PlatformSubscriptionPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load platform plans:', e)
  }
  savePlatformPlans(DEFAULT_PLANS)
  return DEFAULT_PLANS
}

export function savePlatformPlans(plans: PlatformSubscriptionPlan[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans))
    window.dispatchEvent(new Event('platform_plans_updated'))
  } catch (e) {
    console.error('Failed to save platform plans:', e)
  }
}

export function loadPlatformAuditLogs(): PlatformAuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load platform audit logs:', e)
  }
  savePlatformAuditLogs(INITIAL_AUDIT_LOGS)
  return INITIAL_AUDIT_LOGS
}

export function savePlatformAuditLogs(logs: PlatformAuditEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs))
    window.dispatchEvent(new Event('platform_audit_updated'))
  } catch (e) {
    console.error('Failed to save platform audit logs:', e)
  }
}

export function logPlatformEvent(event: Omit<PlatformAuditEvent, 'id' | 'timestamp'>) {
  const current = loadPlatformAuditLogs()
  const newEvent: PlatformAuditEvent = {
    ...event,
    id: `PAUD-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  }
  savePlatformAuditLogs([newEvent, ...current])
}

export function setWorkspaceSuspension(companyId: string, isSuspended: boolean, reason?: string) {
  const companies = loadCompanies()
  const updated = companies.map((c) => {
    if (c.id === companyId) {
      return {
        ...c,
        isSuspended,
        suspensionReason: isSuspended ? reason || 'Administrative hold' : undefined,
      }
    }
    return c
  })
  saveCompanies(updated)

  const targetComp = companies.find((c) => c.id === companyId)
  logPlatformEvent({
    organizationId: companyId,
    organizationName: targetComp?.name || companyId,
    actor: 'Platform Administrator',
    action: isSuspended ? 'WORKSPACE_SUSPENDED' : 'WORKSPACE_REACTIVATED',
    details: isSuspended
      ? `Workspace suspended. Reason: ${reason || 'Administrative action'}`
      : 'Workspace reactivated by Platform Administrator.',
    severity: isSuspended ? 'warning' : 'success',
  })
}

export function updateOrganizationDetails(
  companyId: string,
  updates: Partial<CompanyRecord>
) {
  const companies = loadCompanies()
  const updated = companies.map((c) => (c.id === companyId ? { ...c, ...updates } : c))
  saveCompanies(updated)

  logPlatformEvent({
    organizationId: companyId,
    organizationName: updates.name || companyId,
    actor: 'Platform Administrator',
    action: 'ORGANIZATION_UPDATED',
    details: `Updated organization details for ${companyId}.`,
    severity: 'info',
  })
}
