import { workspaceFetch as fetch } from './workspaceFetch'

export interface OccupationDto {
  id: string
  code: string
  name: string
  jobZone: number
  interestRealistic: number
  interestInvestigative: number
  interestArtistic: number
  interestSocial: number
  interestEnterprising: number
  interestConventional: number
  status: string
  version: string
  roleCount: number
  microSkillCount: number
}

export interface SaveOccupationPayload {
  id?: string
  code: string
  name: string
  jobZone?: number
  interestRealistic?: number
  interestInvestigative?: number
  interestArtistic?: number
  interestSocial?: number
  interestEnterprising?: number
  interestConventional?: number
  status?: string
  version?: string
}

const DEFAULT_ORG_ID = 'e0000000-0000-0000-0000-000000000001'

function normalizeOrg(orgId?: string): string {
  if (!orgId || orgId === 'comp-technova' || orgId === 'default-org') {
    return DEFAULT_ORG_ID
  }
  return orgId
}

export async function fetchOccupations(orgId: string = DEFAULT_ORG_ID): Promise<OccupationDto[]> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/occupations`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch occupations: ${res.statusText}`)
  }
  return res.json()
}

export async function createOccupation(
  orgId: string = DEFAULT_ORG_ID,
  payload: SaveOccupationPayload
): Promise<OccupationDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/occupations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create occupation: ${res.statusText}`)
  }
  return res.json()
}

export async function updateOccupation(
  orgId: string = DEFAULT_ORG_ID,
  id: string,
  payload: SaveOccupationPayload
): Promise<OccupationDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/occupations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update occupation: ${res.statusText}`)
  }
  return res.json()
}

export async function deleteOccupation(orgId: string = DEFAULT_ORG_ID, id: string): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/occupations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete occupation: ${res.statusText}`)
  }
}
