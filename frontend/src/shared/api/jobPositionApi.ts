import { workspaceFetch as fetch } from './workspaceFetch'
import { requireOrganizationId } from './organizationScope'

export class JobPositionApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) { super(code); this.name = 'JobPositionApiError'; this.status = status; this.code = code }
}
async function requireOk(response: Response) {
  if (response.ok) return
  const body = await response.json().catch(() => null)
  throw new JobPositionApiError(response.status, typeof body?.code === 'string' ? body.code : 'CATALOG_UNAVAILABLE')
}

export interface JobPositionDto {
  description?: string | null
  interestRealistic?: number | null
  interestInvestigative?: number | null
  interestArtistic?: number | null
  interestSocial?: number | null
  interestEnterprising?: number | null
  interestConventional?: number | null
  id: string
  code: string
  name: string
  jobZone: number
  status: string
  version: string
  roleCount: number
  microSkillCount: number
}

export interface SaveJobPositionPayload {
  description?: string
  interestRealistic?: number | null
  interestInvestigative?: number | null
  interestArtistic?: number | null
  interestSocial?: number | null
  interestEnterprising?: number | null
  interestConventional?: number | null
  id?: string
  code: string
  name: string
  jobZone?: number
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
  await requireOk(res)
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
  await requireOk(res)
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
  await requireOk(res)
  return res.json()
}

export async function deleteJobPosition(orgId: string, id: string): Promise<void> {
  const effectiveOrg = normalizeOrg(orgId)
  const res = await fetch(`/api/v1/organizations/${encodeURIComponent(effectiveOrg)}/job-positions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  await requireOk(res)
}
