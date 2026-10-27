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

export async function fetchOccupations(orgId: string = 'comp-technova'): Promise<OccupationDto[]> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/occupations`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch occupations: ${res.statusText}`)
  }
  return res.json()
}

export async function createOccupation(
  orgId: string = 'comp-technova',
  payload: SaveOccupationPayload
): Promise<OccupationDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/occupations`, {
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
  orgId: string = 'comp-technova',
  id: string,
  payload: SaveOccupationPayload
): Promise<OccupationDto> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/occupations/${encodeURIComponent(id)}`, {
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

export async function deleteOccupation(orgId: string = 'comp-technova', id: string): Promise<void> {
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/occupations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete occupation: ${res.statusText}`)
  }
}
