import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

export interface DepartmentDto {
  id: string
  code: string
  name: string
  description: string
  headOfDepartment: string
  headEmail: string
  status: string
  organizationId: string
  createdAt?: string
  updatedAt?: string
  jobPositionCodes: string[]
  jobPositionCount: number
}

export interface SaveDepartmentPayload {
  id?: string
  code: string
  name: string
  description?: string
  headOfDepartment?: string
  headEmail?: string
  status?: string
  linkedJobPositions?: string[]
}

function normalizeOrg(orgId?: string): string {
  return requireOrganizationId(orgId)
}

export async function fetchDepartments(orgId: string): Promise<DepartmentDto[]> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch departments: ${res.statusText}`)
  }
  return res.json()
}

export async function getDepartment(orgId: string, id: string): Promise<DepartmentDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to get department: ${res.statusText}`)
  }
  return res.json()
}

export async function createDepartmentApi(
  orgId: string,
  payload: SaveDepartmentPayload
): Promise<DepartmentDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create department: ${res.statusText}`)
  }
  return res.json()
}

export async function updateDepartmentApi(
  orgId: string,
  id: string,
  payload: SaveDepartmentPayload
): Promise<DepartmentDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update department: ${res.statusText}`)
  }
  return res.json()
}

export async function deleteDepartmentApi(orgId: string, id: string): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete department: ${res.statusText}`)
  }
}

export async function linkJobPositionToDepartment(
  orgId: string,
  departmentId: string,
  jobPositionCode: string
): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments/${encodeURIComponent(departmentId)}/job-positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ jobPositionCode }),
  })
  if (!res.ok) {
    throw new Error(`Failed to link job position: ${res.statusText}`)
  }
}

export async function unlinkJobPositionFromDepartment(
  orgId: string,
  departmentId: string,
  jobPositionCode: string
): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/departments/${encodeURIComponent(departmentId)}/job-positions/${encodeURIComponent(jobPositionCode)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to unlink job position: ${res.statusText}`)
  }
}

