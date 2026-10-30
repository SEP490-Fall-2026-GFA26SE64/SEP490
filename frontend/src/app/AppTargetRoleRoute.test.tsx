import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const legacySelectionHandler = vi.hoisted(() => vi.fn())

vi.mock('../features/employee/target-roles/EmployeeTargetRolesPage', async () => ({
  ...await vi.importActual('../features/employee/target-roles/EmployeeTargetRolesPage'),
  EmployeeUpskillingPage: () => <div>Upskilling page</div>,
}))

vi.mock('../shared/hooks/useEmployeeLearningState', () => ({
  useEmployeeLearningState: () => ({ updateProfile: legacySelectionHandler }),
}))

describe('target-role application route', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/employee/target-roles')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/current') ? new Response(JSON.stringify({
      accountId: 'employee', organizationId: 'organization', email: 'employee@example.test', fullName: 'Test Employee',
      roles: ['EMPLOYEE'], stage: 'COMPLETE', workspaceReady: true,
    })) : new Response(null, { status: 204 })))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  it.each(['/employee/target-roles?search=Security&other=kept#catalog', '/employee/target-roles?tab=skills&search=Security&other=kept#catalog'])('RB01 redirects an authenticated employee from %s preserving query/hash without writes', async (path) => {
    window.history.replaceState({}, '', path)
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')

    render(<App />)

    expect(await screen.findByText('Upskilling page')).toBeTruthy()
    expect(window.location.pathname).toBe('/employee/upskilling')
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('roles')
    expect(new URLSearchParams(window.location.search).get('search')).toBe('Security')
    expect(new URLSearchParams(window.location.search).get('other')).toBe('kept')
    expect(window.location.hash).toBe('#catalog')
    expect(legacySelectionHandler).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()
  })
})
