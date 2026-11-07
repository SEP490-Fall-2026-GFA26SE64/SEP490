import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

function normalizeOrg(orgId?: string): string {
  return requireOrganizationId(orgId)
}


export interface PrerequisiteEdgeDto {
  sourceSkillId: string
  sourceSkillCode?: string
  sourceSkillName?: string
  targetSkillId: string
  targetSkillCode?: string
  targetSkillName?: string
  dependentKnowledgeLevel: string | null
  prerequisiteKnowledgeLevel: string | null
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface TargetRoleGraphSkillDto {
  skillId: string
  skillCode: string
  skillName: string
  requiredKnowledgeLevels: string[]
  status: string
  level?: string
}

export interface TargetRoleGraphDto {
  roleId: string
  roleCode: string
  roleName: string
  track: string
  status: string
  requiredSkills: TargetRoleGraphSkillDto[]
  prerequisites: PrerequisiteEdgeDto[]
}

export interface CreatePrerequisitePayload {
  sourceSkillId: string
  targetSkillId: string
  dependentKnowledgeLevel: string
  prerequisiteKnowledgeLevel: string
}

export async function fetchPrerequisites(organizationId: string): Promise<PrerequisiteEdgeDto[]> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/prerequisites`, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch prerequisites: ${res.statusText}`)
  }
  return res.json()
}

export async function createPrerequisite(
  organizationId: string,
  payload: CreatePrerequisitePayload
): Promise<PrerequisiteEdgeDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/prerequisites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.message || `Failed to create prerequisite (HTTP ${res.status})`
    throw new Error(message)
  }
  return res.json()
}

export async function deletePrerequisite(
  organizationId: string,
  sourceSkillId: string,
  targetSkillId: string,
  dependentKnowledgeLevel: string,
  prerequisiteKnowledgeLevel: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/prerequisites?sourceSkillId=${encodeURIComponent(
      sourceSkillId
    )}&targetSkillId=${encodeURIComponent(targetSkillId)}&dependentKnowledgeLevel=${encodeURIComponent(dependentKnowledgeLevel)}&prerequisiteKnowledgeLevel=${encodeURIComponent(prerequisiteKnowledgeLevel)}`,
    {
      method: 'DELETE',
    }
  )
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.message || `Failed to delete prerequisite (HTTP ${res.status})`
    throw new Error(message)
  }
}

export async function fetchTargetRoleGraph(
  organizationId: string,
  roleId: string
): Promise<TargetRoleGraphDto> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/target-roles/${encodeURIComponent(roleId)}/graph`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch target role graph: ${res.statusText}`)
  }
  return res.json()
}

export async function reversePrerequisite(organizationId: string, payload: CreatePrerequisitePayload): Promise<PrerequisiteEdgeDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/prerequisites/reverse`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.message || `Failed to reverse prerequisite (HTTP ${res.status})`)
  }
  return res.json()
}
