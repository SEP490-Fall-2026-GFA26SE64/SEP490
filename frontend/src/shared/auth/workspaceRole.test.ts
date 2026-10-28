import { describe, expect, it } from 'vitest'
import { ROLE_HOME, singleWorkspaceRole } from './workspaceRole'

describe('trusted single-role entry', () => {
  it.each([
    ['DOMAIN_EXPERT', '/expert/target-roles'],
    ['LD_MANAGER', '/ld-manager/occupations'],
    ['EMPLOYEE', '/employee/overview'],
    ['ORGANIZATION_ADMINISTRATOR', '/admin/subscription'],
    ['PLATFORM_ADMINISTRATOR', '/platform-admin/subscriptions'],
  ])('routes %s to its own layout', (role, path) => {
    const selected = singleWorkspaceRole([role])
    expect(selected).toBe(role)
    if (!selected) throw new Error('Expected a valid fixture role')
    expect(ROLE_HOME[selected]).toBe(path)
  })
  it('does not silently treat missing or ambiguous authority as Employee', () => {
    expect(singleWorkspaceRole([])).toBeUndefined()
    expect(singleWorkspaceRole(['UNKNOWN'])).toBeUndefined()
    expect(singleWorkspaceRole(['EMPLOYEE', 'DOMAIN_EXPERT'])).toBeUndefined()
  })
})
