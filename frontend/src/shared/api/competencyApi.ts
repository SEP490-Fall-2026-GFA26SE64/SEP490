import { workspaceFetch as fetch } from './workspaceFetch'

const DEFAULT_ORG_UUID = 'e0000000-0000-0000-0000-000000000001'

function normalizeOrg(orgId?: string): string {
  if (!orgId || orgId === 'default-org' || orgId === 'comp-technova') {
    return DEFAULT_ORG_UUID
  }
  return orgId
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

  memberSkills?: CompetencyMemberSkill[]

  memberSkillCount?: number

  skillIds?: string[]

  levelCodes?: string[]

}



export async function fetchCompetencies(orgId: string = DEFAULT_ORG_UUID, search?: string): Promise<CompetencyDto[]> {

  const query = search ? `?search=${encodeURIComponent(search)}` : ''

  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies${query}`)

  if (!res.ok) {

    throw new Error(`Failed to fetch competencies: ${res.statusText}`)

  }

  const data: CompetencyDto[] = await res.json()

  return data.map((item) => ({

    ...item,

    code: item.code || item.id,

    skillIds: item.memberSkills
      ? Array.from(new Set(item.memberSkills.map((s) => s.id || s.code).filter(Boolean)))
      : (item.skillIds || []),
    memberSkills: item.memberSkills || [],

    levelCodes: item.levelName ? [item.levelName] : (item.levelCodes || []),

  }))

}



export async function createCompetency(

  orgId: string = DEFAULT_ORG_UUID,

  payload: { code?: string; name: string; description?: string; skillIds?: string[]; levelId?: string; status?: string }

): Promise<CompetencyDto> {

  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies`, {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      code: payload.code,

      name: payload.name,

      description: payload.description || '',

      levelId: payload.levelId,

      skillIds: payload.skillIds || [],

    }),

  })

  if (!res.ok) {

    throw new Error(`Failed to create competency: ${res.statusText}`)

  }

  const item: CompetencyDto = await res.json()

  return {

    ...item,

    code: item.code || payload.code || item.id,

    skillIds: item.memberSkills
      ? Array.from(new Set(item.memberSkills.map((s) => s.id || s.code).filter(Boolean)))
      : (payload.skillIds || []),
    memberSkills: item.memberSkills || [],

  }

}



export async function updateCompetency(

  orgId: string = DEFAULT_ORG_UUID,

  id: string,

  payload: { code?: string; name: string; description?: string; skillIds?: string[]; status?: string }

): Promise<CompetencyDto> {

  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies/${encodeURIComponent(id)}`, {

    method: 'PUT',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify({

      code: payload.code,

      name: payload.name,

      description: payload.description || '',

      skillIds: payload.skillIds || [],

    }),

  })

  if (!res.ok) {

    throw new Error(`Failed to update competency: ${res.statusText}`)

  }

  const item: CompetencyDto = await res.json()

  return {

    ...item,

    code: item.code || payload.code || item.id,

    skillIds: item.memberSkills
      ? Array.from(new Set(item.memberSkills.map((s) => s.id || s.code).filter(Boolean)))
      : (payload.skillIds || []),
    memberSkills: item.memberSkills || [],

  }

}



export async function deleteCompetency(orgId: string = DEFAULT_ORG_UUID, id: string): Promise<void> {

  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(normalizeOrg(orgId))}/competencies/${encodeURIComponent(id)}`, {

    method: 'DELETE',

  })

  if (!res.ok) {

    throw new Error(`Failed to delete competency: ${res.statusText}`)

  }

}

