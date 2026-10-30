import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EmployeeAccessNotice } from './EmployeeAccessNotice'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'
const demo = vi.hoisted(() => ({ enabled: true, choose: vi.fn() }))
vi.mock('../../../shared/hooks/useLocalDemoSession', () => ({ useLocalDemoSession: () => demo }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
beforeEach(() => { demo.enabled = true; demo.choose.mockReset().mockResolvedValue(false) })
afterEach(cleanup)
it.each([401, 403])('RB16 explicit %s recovery preserves destination, does not infer identity or auto-switch', async status => {
  const retry = vi.fn()
  render(<MemoryRouter initialEntries={['/employee/my-mastery?search=kept#original']}><EmployeeAccessNotice error={new RoleFlowError('DENIED', status)} message="outage" onRetry={retry} /></MemoryRouter>)
  expect(demo.choose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.openEmployee' }))
  await screen.findByText('roleFlow.sessionFailed')
  expect(demo.choose).toHaveBeenCalledWith('employee-a', '/employee/my-mastery?search=kept#original')
  await waitFor(() => expect((screen.getByRole('button', { name: 'roleFlow.openEmployee' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.retry' })); expect(retry).toHaveBeenCalledTimes(1)
})
it.each([401, 403, 503])('RB16 flag-off %s never offers identity switch', status => {
  demo.enabled = false
  render(<MemoryRouter><EmployeeAccessNotice error={new RoleFlowError('DENIED', status)} message="outage" onRetry={vi.fn()} /></MemoryRouter>)
  expect(screen.queryByRole('button', { name: 'roleFlow.openEmployee' })).toBeNull(); expect(demo.choose).not.toHaveBeenCalled()
})
