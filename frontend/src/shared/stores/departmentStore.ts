import { getActiveCompany, updateActiveCompany } from './companyStore'

export interface DepartmentRecord {
  id: string
  code: string
  name: string
  description: string
  headOfDepartment: string
  headEmail: string
  status: 'active' | 'inactive'
  targetHeadcount?: number
  linkedJobPositions: string[]
  organizationId: string
  createdAt: string
  updatedAt?: string
}

const STORAGE_KEY_DEPARTMENTS_PREFIX = 'adaptlearn_departments_v2_'

export function getDepartmentStorageKey(orgId?: string): string {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  return `${STORAGE_KEY_DEPARTMENTS_PREFIX}${effectiveOrg}`
}

export const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    code: 'ENG-COG',
    name: 'Engineering & Cognitive Systems',
    description: 'Core software engineering, cognitive knowledge graphs, and distributed systems.',
    headOfDepartment: 'Sarah Connor',
    headEmail: 'manager@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1252.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: '27fd451e-a429-3de1-9a6e-52c5876904a3',
    code: 'ENG-DATA',
    name: 'Data & Artificial Intelligence',
    description: 'Data pipelines, analytics warehouses, and cognitive knowledge models.',
    headOfDepartment: 'Dr. Sarah Chen',
    headEmail: 'expert@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1243.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: '4bb9ce13-f65a-349e-803d-017fd495a62f',
    code: 'ENG-QA',
    name: 'Quality Engineering & Assurance',
    description: 'Automated test suites, Playwright verification, and quality gates.',
    headOfDepartment: 'Marcus Vance',
    headEmail: 'marcus.vance@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1253.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: '6fe84095-c4f5-39a2-a100-88a15c672d33',
    code: 'ENG-CLOUD',
    name: 'Cloud Infrastructure & DevOps',
    description: 'Cloud systems architecture, container orchestration, and CI/CD pipelines.',
    headOfDepartment: 'Linh Nguyen',
    headEmail: 'linh.nguyen@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1299.08', '15-1259.00', '15-1260.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: 'c05d5732-9897-38c7-9d8f-dfdbe71cfd53',
    code: 'ENG-SEC',
    name: 'Cybersecurity & Compliance',
    description: 'Zero-trust architecture, security auditing, and compliance governance.',
    headOfDepartment: 'Alex Rivera',
    headEmail: 'alex.rivera@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1212.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
]

export function loadDepartments(orgId?: string): DepartmentRecord[] {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  const key = getDepartmentStorageKey(effectiveOrg)

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((d: Partial<DepartmentRecord>) => !d.organizationId || d.organizationId === effectiveOrg)
          .map((d: Partial<DepartmentRecord>) => ({
            id: d.id || `dept-${d.code?.toLowerCase() || 'item'}`,
            code: d.code || '',
            name: d.name || '',
            description: d.description || '',
            headOfDepartment: d.headOfDepartment || '',
            headEmail: d.headEmail || '',
            status: d.status === 'inactive' ? 'inactive' : 'active',
            linkedJobPositions: Array.isArray(d.linkedJobPositions) ? d.linkedJobPositions : [],
            organizationId: effectiveOrg,
            createdAt: d.createdAt || '2026-11-04',
            updatedAt: d.updatedAt,
          }))
      }
    }
  } catch (e) {
    console.error('Failed to load departments from storage:', e)
  }

  // Only seed default initial departments if in the standard demo organization (TechNova)
  if (effectiveOrg === 'e0000000-0000-0000-0000-000000000001') {
    saveDepartments(INITIAL_DEPARTMENTS, effectiveOrg)
    return INITIAL_DEPARTMENTS
  }

  // For any other organization: do NOT seed foreign mock data. Return clean empty array.
  return []
}

export function saveDepartments(departments: DepartmentRecord[], orgId?: string, notify = true) {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  const key = getDepartmentStorageKey(effectiveOrg)

  try {
    const scopedDepartments = departments.map((d) => ({
      ...d,
      organizationId: d.organizationId || effectiveOrg,
    }))
    const serialized = JSON.stringify(scopedDepartments)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
    if (notify && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('departments_updated'))
    }
  } catch (e) {
    console.error('Failed to save departments:', e)
  }
}

export function createDepartment(
  data: Omit<DepartmentRecord, 'id' | 'createdAt' | 'organizationId'>,
  orgId?: string
): DepartmentRecord {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  const current = loadDepartments(effectiveOrg)
  const codeClean = data.code.trim().toUpperCase()
  const newDept: DepartmentRecord = {
    ...data,
    code: codeClean,
    id: `dept-${codeClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    organizationId: effectiveOrg,
    status: data.status || 'active',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  saveDepartments([newDept, ...current], effectiveOrg)
  return newDept
}

export function updateDepartment(id: string, updates: Partial<DepartmentRecord>, orgId?: string) {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  const current = loadDepartments(effectiveOrg)
  const idLower = (id || '').toLowerCase().trim()
  const codeLower = (updates.code || id || '').toLowerCase().trim()
  const updated = current.map((d) => {
    const dIdLower = (d.id || '').toLowerCase().trim()
    const dCodeLower = (d.code || '').toLowerCase().trim()
    const isMatch =
      dIdLower === idLower ||
      dCodeLower === idLower ||
      dIdLower === codeLower ||
      dCodeLower === codeLower ||
      (updates.name && d.name.toLowerCase().trim() === updates.name.toLowerCase().trim())
    return isMatch
      ? {
          ...d,
          ...updates,
          code: updates.code ? updates.code.trim().toUpperCase() : d.code,
          updatedAt: new Date().toISOString(),
        }
      : d
  })
  saveDepartments(updated, effectiveOrg)
}

export function deleteDepartment(id: string, orgId?: string) {
  const effectiveOrg = orgId || getActiveCompany()?.id || 'e0000000-0000-0000-0000-000000000001'
  const current = loadDepartments(effectiveOrg)
  const updated = current.filter((d) => d.id !== id && d.code !== id)
  saveDepartments(updated, effectiveOrg, false)
}

export function reassignEmployeeDepartment(userEmail: string, newDeptName: string) {
  updateActiveCompany((comp) => {
    return {
      ...comp,
      users: comp.users.map((u) => (u.email === userEmail ? { ...u, department: newDeptName } : u)),
    }
  })
}
