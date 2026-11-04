import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

export interface JobPositionDto {
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

export interface SaveJobPositionPayload {
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

function normalizeOrg(orgId?: string): string {
  return requireOrganizationId(orgId)
}

export async function fetchJobPositions(orgId: string): Promise<JobPositionDto[]> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/job-positions`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch job positions: ${res.statusText}`)
  }
  return res.json()
}

export async function createJobPosition(
  orgId: string,
  payload: SaveJobPositionPayload
): Promise<JobPositionDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/job-positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to create job position: ${res.statusText}`)
  }
  return res.json()
}

export async function updateJobPosition(
  orgId: string,
  id: string,
  payload: SaveJobPositionPayload
): Promise<JobPositionDto> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/job-positions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to update job position: ${res.statusText}`)
  }
  return res.json()
}

export async function deleteJobPosition(orgId: string, id: string): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/job-positions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete job position: ${res.statusText}`)
  }
}
