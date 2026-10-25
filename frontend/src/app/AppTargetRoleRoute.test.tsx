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
  })

  afterEach(() => {
    cleanup()
    window.history.pushState({}, '', '/')
  })

  it.each(['/employee/target-roles?search=Security&other=kept#catalog', '/employee/target-roles?tab=skills&search=Security&other=kept#catalog'])('RB01 redirects %s to Upskilling Roles preserving query/hash without writes', (path) => {
    window.history.replaceState({}, '', path)
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')

    render(<App />)

    expect(screen.getByText('Upskilling page')).toBeTruthy()
    expect(window.location.pathname).toBe('/employee/upskilling')
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('roles')
    expect(new URLSearchParams(window.location.search).get('search')).toBe('Security')
    expect(new URLSearchParams(window.location.search).get('other')).toBe('kept')
    expect(window.location.hash).toBe('#catalog')
    expect(legacySelectionHandler).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()
  })
})
