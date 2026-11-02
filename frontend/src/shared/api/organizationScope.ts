const ORGANIZATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Tenant APIs require the signed-in member's organization; there is no default organization. */
export function requireOrganizationId(organizationId?: string | null): string {
  if (!organizationId || !ORGANIZATION_ID.test(organizationId)) throw new Error('An authenticated organization is required.')
  return organizationId
}
