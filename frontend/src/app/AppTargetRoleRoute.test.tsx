import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const legacySelectionHandler = vi.hoisted(() => vi.fn())

vi.mock('../features/employee/target-roles/EmployeeTargetRolesPage', () => ({
  EmployeeTargetRolesPage: () => <div>Server-backed target-role page</div>,
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

  it('routes to the server-backed F02 page without legacy selection or localStorage writes', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')

    render(<App />)

    expect(screen.getByText('Server-backed target-role page')).toBeTruthy()
    expect(legacySelectionHandler).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()
  })
})
