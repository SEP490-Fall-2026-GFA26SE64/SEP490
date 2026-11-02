import { requireOrganizationId } from './organizationScope'

export interface LearningModuleDto {
  id: string
  code: string
  title: string
  moduleType?: string
  contentUri?: string
  contentType?: string
  contentVersion?: string
  version?: string
  status?: string
  reviewStatus?: string
  durationMinutes?: number
  teachesSkillIds?: string[]
  teachesSkillNames?: string[]
}

export async function fetchLearningModules(orgId: string): Promise<LearningModuleDto[]> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(requireOrganizationId(orgId))}/modules`, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch learning modules: ${res.statusText}`)
  }
  return res.json()
}

export async function createLearningModule(
  orgId: string,
  payload: Partial<LearningModuleDto>
): Promise<LearningModuleDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(requireOrganizationId(orgId))}/modules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create learning module: ${res.statusText}`)
  }
  return res.json()
}

export async function updateLearningModule(
  orgId: string,
  id: string,
  payload: Partial<LearningModuleDto>
): Promise<LearningModuleDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(requireOrganizationId(orgId))}/modules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update learning module: ${res.statusText}`)
  }
  return res.json()
}

export async function deleteLearningModule(orgId: string, id: string): Promise<void> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(requireOrganizationId(orgId))}/modules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete learning module: ${res.statusText}`)
  }
}
