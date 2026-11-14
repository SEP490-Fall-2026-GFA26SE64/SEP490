import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

function normalizeOrg(orgId?: string): string {
  return requireOrganizationId(orgId)
}

export interface CompetencyMemberSkill {
  id: string
  code: string
  name: string
}

export interface CompetencyDto {
  id: string
  code?: string
  name: string
  description?: string
  attainmentRule?: string
  status?: string
  version?: string
  levelId?: string | null
  levelName?: string
  roleName?: string
  departmentId?: string | null
  departmentName?: string | null
  jobPositionCode?: string | null
  jobPositionTitle?: string | null
  memberSkills?: CompetencyMemberSkill[]
  memberSkillCount?: number
  skillIds?: string[]
  levelCodes?: string[]
  createdAt?: string
  updatedAt?: string
}

export async function fetchCompetencies(
  orgId: string,
  search?: string,
  departmentId?: string,
  jobPositionCode?: string,
): Promise<CompetencyDto[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (departmentId && departmentId !== 'all') params.set('departmentId', departmentId)
  if (jobPositionCode && jobPositionCode !== 'all') params.set('jobPositionCode', jobPositionCode)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies${qs}`,
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch competencies: ${res.statusText}`)
  }

  const data: CompetencyDto[] = await res.json()

  return data.map((item) => ({
    ...item,
    code: item.code || item.id,
    skillIds: item.memberSkills
      ? Array.from(
          new Set(
            item.memberSkills.flatMap((s) => [s.id, s.code]).filter(Boolean),
          ),
        )
      : item.skillIds || [],
    memberSkills: item.memberSkills || [],
    levelCodes: item.levelName ? [item.levelName] : item.levelCodes || [],
  }))
}

export async function createCompetency(
  orgId: string,
  payload: {
    code?: string
    name: string
    description?: string
    skillIds?: string[]
    levelId?: string
    status?: string
    departmentId?: string | null
    departmentName?: string | null
    jobPositionCode?: string | null
    jobPositionTitle?: string | null
  },
): Promise<CompetencyDto> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: payload.code,
        name: payload.name,
        description: payload.description || '',
        levelId: payload.levelId,
        departmentId: payload.departmentId,
        departmentName: payload.departmentName,
        jobPositionCode: payload.jobPositionCode,
        jobPositionTitle: payload.jobPositionTitle,
        skillIds: payload.skillIds || [],
      }),
    },
  )

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.message || `Failed to create competency: ${res.statusText}`)
  }

  const item: CompetencyDto = await res.json()

  return {
    ...item,
    code: item.code || payload.code || item.id,
    skillIds: item.memberSkills
      ? Array.from(
          new Set(item.memberSkills.map((s) => s.id || s.code).filter(Boolean)),
        )
      : payload.skillIds || [],
    memberSkills: item.memberSkills || [],
  }
}

export async function updateCompetency(
  orgId: string,
  id: string,
  payload: {
    code?: string
    name: string
    description?: string
    skillIds?: string[]
    status?: string
    departmentId?: string | null
    departmentName?: string | null
    jobPositionCode?: string | null
    jobPositionTitle?: string | null
  },
): Promise<CompetencyDto> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: payload.code,
        name: payload.name,
        description: payload.description || '',
        departmentId: payload.departmentId,
        departmentName: payload.departmentName,
        jobPositionCode: payload.jobPositionCode,
        jobPositionTitle: payload.jobPositionTitle,
        skillIds: payload.skillIds || [],
      }),
    },
  )

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.message || `Failed to update competency: ${res.statusText}`)
  }

  const item: CompetencyDto = await res.json()

  return {
    ...item,
    code: item.code || payload.code || item.id,
    skillIds: item.memberSkills
      ? Array.from(
          new Set(item.memberSkills.map((s) => s.id || s.code).filter(Boolean)),
        )
      : payload.skillIds || [],
    memberSkills: item.memberSkills || [],
  }
}

export async function deleteCompetency(
  orgId: string,
  id: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error(errorBody?.message || `Failed to delete competency: ${res.statusText}`)
  }
}
