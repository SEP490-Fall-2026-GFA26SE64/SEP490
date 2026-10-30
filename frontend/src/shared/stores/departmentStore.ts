import { getActiveCompany, updateActiveCompany } from './companyStore'

export interface DepartmentRecord {
  id: string
  code: string
  name: string
  description: string
  headOfDepartment: string
  headEmail: string
  targetHeadcount: number
  linkedOccupations: string[]
  organizationId: string
  createdAt: string
}

const STORAGE_KEY_DEPARTMENTS = 'adaptlearn_departments_v1'

export const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dept-ml',
    code: 'ML-CA',
    name: 'Machine Learning & Cognitive Architecture',
    description: 'Specializes in graph neural networks, knowledge tracing algorithms, and generative AI systems.',
    headOfDepartment: 'Dr. Sarah Chen',
    headEmail: 'expert-chen@adaptlearn.internal',
    targetHeadcount: 15,
    linkedOccupations: ['15-1252.00 (Software Developers)', '15-1221.00 (Computer and Information Research Scientists)'],
    organizationId: 'comp-technova',
    createdAt: '2026-01-15',
  },
  {
    id: 'dept-talent',
    code: 'ETD',
    name: 'Enterprise Talent Development',
    description: 'Designs competency matrices, organizational upskilling roadmaps, and training ROI evaluations.',
    headOfDepartment: 'Sarah Connor',
    headEmail: 'sarah.connor@adaptlearn.internal',
    targetHeadcount: 10,
    linkedOccupations: ['11-3131.00 (Training and Development Managers)'],
    organizationId: 'comp-technova',
    createdAt: '2026-01-15',
  },
  {
    id: 'dept-backend',
    code: 'BE-ENG',
    name: 'Backend Engineering',
    description: 'Builds scalable Spring Boot distributed microservices, PostgreSQL transactions, and Neo4j graph storage.',
    headOfDepartment: 'Marcus Vance',
    headEmail: 'marcus.vance@adaptlearn.internal',
    targetHeadcount: 20,
    linkedOccupations: ['15-1252.00 (Software Developers)'],
    organizationId: 'comp-technova',
    createdAt: '2026-01-20',
  },
  {
    id: 'dept-data',
    code: 'DATA-ANA',
    name: 'Data & Analytics',
    description: 'Manages ETL data ingestion, reporting cubes, and organizational skill telemetry metrics.',
    headOfDepartment: 'Chloe Bennett',
    headEmail: 'chloe.bennett@adaptlearn.internal',
    targetHeadcount: 12,
    linkedOccupations: ['15-2051.00 (Data Scientists)'],
    organizationId: 'comp-technova',
    createdAt: '2026-02-01',
  },
  {
    id: 'dept-cloud',
    code: 'CLOUD-SRE',
    name: 'Cloud Infrastructure & SRE',
    description: 'Docker Compose orchestration, MinIO storage quotas, and platform high availability.',
    headOfDepartment: 'Jordan Parker',
    headEmail: 'jordan.parker@adaptlearn.internal',
    targetHeadcount: 10,
    linkedOccupations: ['15-1244.00 (Network and Computer Systems Administrators)'],
    organizationId: 'comp-technova',
    createdAt: '2026-02-10',
  },
]

export function loadDepartments(): DepartmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEPARTMENTS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
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
    localStorage.setItem(STORAGE_KEY_DEPARTMENTS, JSON.stringify(departments))
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
  const newDept: DepartmentRecord = {
    ...data,
    id: `dept-${Date.now().toString(36)}`,
    organizationId: activeComp.id,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  saveDepartments([newDept, ...current])
  return newDept
}

export function updateDepartment(id: string, updates: Partial<DepartmentRecord>) {
  const current = loadDepartments()
  const updated = current.map((d) => (d.id === id ? { ...d, ...updates } : d))
  saveDepartments(updated)
}

export function deleteDepartment(id: string) {
  const current = loadDepartments()
  const updated = current.filter((d) => d.id !== id)
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
