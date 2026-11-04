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

const STORAGE_KEY_DEPARTMENTS = 'adaptlearn_departments_v2'
const STORAGE_KEY_DEPARTMENTS_LEGACY = 'adaptlearn_departments_v1'

export const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dept-eng-swe',
    code: 'ENG-SWE',
    name: 'Software Engineering',
    description: 'Core distributed systems, hexagonal microservices, and web applications.',
    headOfDepartment: 'Marcus Vance',
    headEmail: 'marcus.vance@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1252.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: 'dept-eng-data',
    code: 'ENG-DATA',
    name: 'Data & Artificial Intelligence',
    description: 'Data pipelines, analytics warehouses, and cognitive knowledge models.',
    headOfDepartment: 'Marcus Vance',
    headEmail: 'marcus.vance@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1243.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: 'dept-eng-qa',
    code: 'ENG-QA',
    name: 'Quality Engineering & Assurance',
    description: 'Automated test suites, Playwright verification, and quality gates.',
    headOfDepartment: 'Dr. Sarah Chen',
    headEmail: 'sarah.chen@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1253.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: 'dept-eng-cloud',
    code: 'ENG-CLOUD',
    name: 'Cloud Infrastructure & DevOps',
    description: 'Cloud systems architecture, container orchestration, and CI/CD pipelines.',
    headOfDepartment: 'Alex Rivera',
    headEmail: 'alex.rivera@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1299.08'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
  {
    id: 'dept-eng-sec',
    code: 'ENG-SEC',
    name: 'Cybersecurity & Compliance',
    description: 'Zero-trust architecture, security auditing, and compliance governance.',
    headOfDepartment: 'Dr. Sarah Chen',
    headEmail: 'sarah.chen@technova.com',
    status: 'active',
    linkedJobPositions: ['15-1212.00'],
    organizationId: 'e0000000-0000-0000-0000-000000000001',
    createdAt: '2026-11-04',
  },
]

export function loadDepartments(): DepartmentRecord[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_DEPARTMENTS) ||
      localStorage.getItem(STORAGE_KEY_DEPARTMENTS_LEGACY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d: Partial<DepartmentRecord>) => ({
          id: d.id || `dept-${d.code?.toLowerCase() || 'item'}`,
          code: d.code || '',
          name: d.name || '',
          description: d.description || '',
          headOfDepartment: d.headOfDepartment || '',
          headEmail: d.headEmail || '',
          status: d.status === 'inactive' ? 'inactive' : 'active',
          linkedJobPositions: Array.isArray(d.linkedJobPositions) ? d.linkedJobPositions : [],
          organizationId: d.organizationId || 'e0000000-0000-0000-0000-000000000001',
          createdAt: d.createdAt || '2026-11-04',
          updatedAt: d.updatedAt,
        }))
      }
    }
  } catch (e) {
    console.error('Failed to load departments from storage:', e)
  }
  saveDepartments(INITIAL_DEPARTMENTS)
  return INITIAL_DEPARTMENTS
}

export function saveDepartments(departments: DepartmentRecord[]) {
  try {
    const serialized = JSON.stringify(departments)
    localStorage.setItem(STORAGE_KEY_DEPARTMENTS, serialized)
    localStorage.setItem(STORAGE_KEY_DEPARTMENTS_LEGACY, serialized)
    window.dispatchEvent(new Event('departments_updated'))
  } catch (e) {
    console.error('Failed to save departments:', e)
  }
}

export function createDepartment(
  data: Omit<DepartmentRecord, 'id' | 'createdAt' | 'organizationId'>
): DepartmentRecord {
  const current = loadDepartments()
  const activeComp = getActiveCompany()
  const codeClean = data.code.trim().toUpperCase()
  const newDept: DepartmentRecord = {
    ...data,
    code: codeClean,
    id: `dept-${codeClean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    organizationId: activeComp.id || 'e0000000-0000-0000-0000-000000000001',
    status: data.status || 'active',
    createdAt: new Date().toISOString().slice(0, 10),
  }
  saveDepartments([newDept, ...current])
  return newDept
}

export function updateDepartment(id: string, updates: Partial<DepartmentRecord>) {
  const current = loadDepartments()
  const updated = current.map((d) =>
    d.id === id || d.code === id
      ? {
          ...d,
          ...updates,
          code: updates.code ? updates.code.trim().toUpperCase() : d.code,
          updatedAt: new Date().toISOString(),
        }
      : d
  )
  saveDepartments(updated)
}

export function deleteDepartment(id: string) {
  const current = loadDepartments()
  const updated = current.filter((d) => d.id !== id && d.code !== id)
  saveDepartments(updated)
}

export function reassignEmployeeDepartment(userEmail: string, newDeptName: string) {
  updateActiveCompany((comp) => {
    return {
      ...comp,
      users: comp.users.map((u) => (u.email === userEmail ? { ...u, department: newDeptName } : u)),
    }
  })
}
