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

export function loadDepartments(): DepartmentRecord[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_DEPARTMENTS) ||
      localStorage.getItem(STORAGE_KEY_DEPARTMENTS_LEGACY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list: DepartmentRecord[] = parsed.map((d: Partial<DepartmentRecord>) => ({
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
        const existingIds = new Set(list.map((d) => d.id))
        const existingNames = new Set(list.map((d) => d.name.toLowerCase()))
        for (const init of INITIAL_DEPARTMENTS) {
          if (!existingIds.has(init.id) && !existingNames.has(init.name.toLowerCase())) {
            list.unshift(init)
          }
        }
        return list
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
