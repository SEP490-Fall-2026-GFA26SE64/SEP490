export const ROLE_HOME = {
  PLATFORM_ADMINISTRATOR: '/platform-admin/subscriptions',
  ORGANIZATION_ADMINISTRATOR: '/admin/subscription',
  DOMAIN_EXPERT: '/expert/target-roles',
  LD_MANAGER: '/ld-manager/occupations',
  EMPLOYEE: '/employee/overview',
} as const

export type WorkspaceRole = keyof typeof ROLE_HOME

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return Object.hasOwn(ROLE_HOME, value)
}

export function singleWorkspaceRole(roles: readonly string[]): WorkspaceRole | undefined {
  const role = roles[0]
  return roles.length === 1 && isWorkspaceRole(role) ? role : undefined
}
