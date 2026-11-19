export const ROLE_HOME = {
  PLATFORM_ADMINISTRATOR: '/platform-admin/organizations',
  ORGANIZATION_ADMINISTRATOR: '/admin/dashboard',
  DOMAIN_EXPERT: '/expert/roles',
  LD_MANAGER: '/ld-manager/dashboard',
  EMPLOYEE: '/employee/overview',
} as const

export type WorkspaceRole = keyof typeof ROLE_HOME

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return Object.hasOwn(ROLE_HOME, value)
}

const ROLE_AREA: Record<WorkspaceRole, RegExp> = {
  PLATFORM_ADMINISTRATOR: /^\/platform-admin(\/|$)/,
  ORGANIZATION_ADMINISTRATOR: /^\/(admin|knowledge-graph|design-system)(\/|$)/,
  DOMAIN_EXPERT: /^\/expert(\/|$)/,
  LD_MANAGER: /^\/(ld-manager|manager)(\/|$)/,
  EMPLOYEE: /^\/(employee|learner|assessment)(\/|$)/,
}

/** Whether a workspace-relative path belongs to the portal of the given role. */
export function roleOwnsPath(role: WorkspaceRole, path: string): boolean {
  return ROLE_AREA[role].test(path.split(/[?#]/)[0])
}

export function singleWorkspaceRole(roles: readonly string[]): WorkspaceRole | undefined {
  const role = roles[0]
  return roles.length === 1 && isWorkspaceRole(role) ? role : undefined
}
