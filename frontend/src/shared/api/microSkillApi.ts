import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

function normalizeOrg(orgId?: string): string {
  return requireOrganizationId(orgId)
}

export interface SkillProvisionPayload {
  moduleOnlyKnowledgeLevels: string[]
  certificateOnlyKnowledgeLevels: string[]
  foundationOutcomeCodes: string[]
  intermediateOutcomeCodes: string[]
  advancedOutcomeCodes: string[]
}

export interface MicroSkillDto extends Partial<SkillProvisionPayload> {
  id: string
  organizationId?: string
  code: string
  name: string
  description?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  version?: string | null
}

export interface CreateMicroSkillPayload extends Partial<SkillProvisionPayload> {
  code: string
  name: string
  description?: string
}

export interface UpdateMicroSkillPayload extends Partial<SkillProvisionPayload> {
  name: string
  description?: string
  status?: string
  expectedVersion?: string | null
}

export async function fetchMicroSkills(organizationId: string, q?: string): Promise<MicroSkillDto[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : ''
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/micro-skills${query}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch micro-skills: ${res.statusText}`)
  }
  return res.json()
}

export async function createMicroSkill(
  organizationId: string,
  payload: CreateMicroSkillPayload
): Promise<MicroSkillDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/micro-skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-User-Role': 'DOMAIN_EXPERT',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.message || `Failed to create micro-skill (HTTP ${res.status})`
    throw new Error(message)
  }
  return res.json()
}

export async function updateMicroSkill(
  organizationId: string,
  skillId: string,
  payload: UpdateMicroSkillPayload
): Promise<MicroSkillDto> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/micro-skills/${encodeURIComponent(skillId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-User-Role': 'DOMAIN_EXPERT',
      },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.message || `Failed to update micro-skill (HTTP ${res.status})`
    throw new Error(message)
  }
  return res.json()
}

export async function deleteMicroSkill(organizationId: string, skillId: string): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(organizationId))}/micro-skills/${encodeURIComponent(skillId)}`,
    {
      method: 'DELETE',
      headers: {
        'X-User-Role': 'DOMAIN_EXPERT',
      },
    }
  )
  if (!res.ok) {
    const errorData = await res.json().catch(() => null)
    const message = errorData?.message || `Failed to delete micro-skill (HTTP ${res.status})`
    throw new Error(message)
  }
}
