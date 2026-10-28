export interface MicroSkillDto {
  id: string
  organizationId?: string
  code: string
  name: string
  description?: string
  macroCompetencyCode?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface MacroCompetencyDto {
  id: string
  code: string
  name: string
  description?: string
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateMicroSkillPayload {
  code: string
  name: string
  description?: string
  macroCompetencyCode?: string
}

export interface UpdateMicroSkillPayload {
  name: string
  description?: string
  macroCompetencyCode?: string
  status?: string
}

export async function fetchMicroSkills(organizationId: string, q?: string): Promise<MicroSkillDto[]> {
  const url = new URL(`/api/v1/organizations/${encodeURIComponent(organizationId)}/micro-skills`, window.location.origin)
  if (q) {
    url.searchParams.set('q', q)
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch micro-skills: ${res.statusText}`)
  }
  return res.json()
}

export async function createMicroSkill(
  organizationId: string,
  payload: CreateMicroSkillPayload
): Promise<MicroSkillDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/micro-skills`, {
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
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/micro-skills/${encodeURIComponent(skillId)}`,
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
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/micro-skills/${encodeURIComponent(skillId)}`,
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

export async function fetchMacroCompetencies(organizationId: string): Promise<MacroCompetencyDto[]> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/macro-competencies`, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch macro-competencies: ${res.statusText}`)
  }
  return res.json()
}
