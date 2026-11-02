import { describe, expect, it } from 'vitest'
import { isSharedPath, isTenantPath, isWorkspaceSlug, safeReturnPath, workspaceBase, workspaceUrl } from './workspacePaths'

describe('workspace paths', () => {
  it('detects the workspace basename, including unknown or malformed slugs', () => {
    expect(workspaceBase('/workspace/acme/employee/overview')).toEqual({ slug: 'acme', basename: '/workspace/acme' })
    expect(workspaceBase('/workspace/acme')).toEqual({ slug: 'acme', basename: '/workspace/acme' })
    expect(workspaceBase('/workspace/Not_Valid/admin')?.slug).toBe('Not_Valid')
    expect(workspaceBase('/workspaces/acme')).toBeNull()
    expect(workspaceBase('/workspace/%E0/admin')).toEqual({ slug: '%E0', basename: '/workspace/%E0' })
    expect(workspaceBase('/employee/overview')).toBeNull()
  })

  it('validates slugs and builds workspace URLs', () => {
    expect(isWorkspaceSlug('tech-nova')).toBe(true)
    expect(isWorkspaceSlug('-bad')).toBe(false)
    expect(isWorkspaceSlug(null)).toBe(false)
    expect(workspaceUrl('acme', '/admin/users')).toBe('/workspace/acme/admin/users')
    expect(workspaceUrl('acme')).toBe('/workspace/acme')
    expect(() => workspaceUrl('../x', '/admin')).toThrow()
  })

  it('separates organization pages from guest and platform pages', () => {
    expect(isTenantPath('/ld-manager/modules')).toBe(true)
    expect(isTenantPath('/employee')).toBe(true)
    expect(isTenantPath('/login')).toBe(false)
    expect(isTenantPath('/platform-admin/plans')).toBe(false)
    expect(isTenantPath('/employees')).toBe(false)
    expect(isSharedPath('/system-status')).toBe(true)
    expect(isTenantPath('/system-status')).toBe(false)
  })

  it('accepts return paths only inside the member workspace', () => {
    expect(safeReturnPath('/workspace/acme/expert/modules?x=1#y', 'acme')).toBe('/workspace/acme/expert/modules?x=1#y')
    expect(safeReturnPath('/expert/modules?x=1', 'acme')).toBe('/workspace/acme/expert/modules?x=1')
    expect(safeReturnPath('/workspace/other/expert/modules', 'acme')).toBeNull()
    expect(safeReturnPath('/workspace/acme/login', 'acme')).toBeNull()
    expect(safeReturnPath('//evil.example/admin', 'acme')).toBeNull()
    expect(safeReturnPath('https://evil.example/admin', 'acme')).toBeNull()
    expect(safeReturnPath('/\\evil.example', 'acme')).toBeNull()
    expect(safeReturnPath('/admin/users', null)).toBeNull()
    expect(safeReturnPath(null, 'acme')).toBeNull()
    for (const escape of ['/workspace/acme/admin/../../rival/admin/users', '/workspace/acme/admin/%2e%2e/%2E%2e/rival/admin',
      '/workspace/acme/admin/../../../platform-admin', '/admin/../../rival/admin', '/admin/./users', '/admin/..?x=1']) {
      expect(safeReturnPath(escape, 'acme'), escape).toBeNull()
    }
    expect(safeReturnPath('/workspace/acme/admin/users..backup', 'acme')).toBe('/workspace/acme/admin/users..backup')
  })
})