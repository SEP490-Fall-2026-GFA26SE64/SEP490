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

export async function fetchMicroSkills(organizationId: string): Promise<MicroSkillDto[]> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/micro-skills`, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch micro-skills: ${res.statusText}`)
  }
  return res.json()
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
