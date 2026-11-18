import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { ToastProvider } from '../../../shared/hooks/useToast'
import { WorkspaceSlugContext } from '../../../shared/auth/workspacePaths'
import { WorkspaceBoundary } from '../../subscription/WorkspaceBoundary'
import { AdminDashboardPage } from './AdminDashboardPage'

const adminIdentity = { accountId: 'admin', organizationId: '00000000-0000-4000-8000-000000000001', email: 'admin@example.test',
  fullName: 'Actual Administrator', roles: ['ORGANIZATION_ADMINISTRATOR'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: 'actual' }
const terms = { name: 'Starter', description: 'Plan', priceVnd: 4900000, currency: 'VND', durationMonths: 1, employeeSeats: 10 }
const member = (id: string, extra: Record<string, unknown> = {}) => ({ membershipId: id, accountId: id, fullName: id, email: `${id}@example.test`,
  active: true, accountActive: true, roles: ['EMPLOYEE'], revision: 1, departmentId: 'd', departmentName: 'Engineering',
  jobPositionReferenceId: 'j', jobPositionName: 'Developer', targetRoleId: 'r', ...extra })

let identity: Record<string, unknown> = adminIdentity
let usedSeats = 3
let targetRolesFail = false
const fetcher = vi.fn(async (path: string) => {
  let value: unknown
  if (path.endsWith('/csrf')) value = { headerName: 'X-CSRF-TOKEN', token: 'fixture' }
  else if (path.endsWith('/current')) value = identity
  else if (path.endsWith('/subscription/access')) value = { allowed: true }
  else if (path.endsWith('/subscription')) value = { organizationId: adminIdentity.organizationId, organizationName: 'Actual Organization', workspaceStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE', current: { periodId: 'p', startsAt: '2026-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z', terms },
    scheduled: null, usedSeats, allocatedSeats: 10, admissionLimit: 10, paymentHistory: [] }
  else if (path.endsWith('/members')) value = [
    member('e1'), member('e2', { targetRoleId: null }), member('m1', { roles: ['LD_MANAGER'], departmentName: 'People' }),
    member('gone', { active: false }),
  ]
  else if (path.endsWith('/activations')) value = [
    { activationId: 'a1', fullName: 'Pending', email: 'p@example.test', roles: ['EMPLOYEE'], state: 'PENDING', deliveryStatus: 'FAILED',
      departmentId: null, departmentName: null, jobPositionReferenceId: null, jobPositionName: null,
      createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-01-02T00:00:00Z' },
  ]
  else if (path.endsWith('/target-roles')) {
    if (targetRolesFail) return new Response('{}', { status: 500 })
    value = [{ status: 'PUBLISHED' }, { status: 'DRAFT' }]
  }
  else if (path.endsWith('/departments')) value = [{ id: 'd1' }, { id: 'd2' }]
  else if (path.endsWith('/job-positions')) value = [{ id: 'j1' }]
  else if (path.endsWith('/current-order')) value = { order: null, applicationState: 'NOT_APPLIED', workspace: null }
  else if (path.endsWith('/member-references') || path.includes('/platform-catalog')) value = []
  else throw new Error(`Unexpected request ${path}`)
  return new Response(JSON.stringify(value))
})

function show() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ToastProvider><LanguageProvider><WorkspaceSlugContext.Provider value="actual"><MemoryRouter initialEntries={['/admin/dashboard']}>
      <WorkspaceBoundary><AdminDashboardPage /></WorkspaceBoundary>
    </MemoryRouter></WorkspaceSlugContext.Provider></LanguageProvider></ToastProvider>
  </QueryClientProvider>)
}

beforeEach(() => {
  identity = adminIdentity
  usedSeats = 3
  targetRolesFail = false
  localStorage.clear()
  fetcher.mockClear()
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('AdminDashboardPage', () => {
  it('shows organization KPIs and action items from the real APIs', async () => {
    show()
    const members = await screen.findByTestId('kpi-members')
    expect(await within(members).findByText('3')).toBeTruthy()
    expect(within(members).getByText('1 inactive · 4 total')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-seats')).getByText('3 / 10')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-subscription')).getByText('Starter')).toBeTruthy()
    expect(await within(screen.getByTestId('kpi-target-roles')).findByText('2 target roles in total')).toBeTruthy()
    const attention = screen.getByTestId('dashboard-attention')
    expect((await within(attention).findByText('Invitation emails failed')).closest('a')?.textContent).toContain('1')
    expect(within(attention).getByText('Employees missing department, job position or target role').closest('a')?.textContent).toContain('1')
    expect(await within(screen.getByTestId('structure-departments')).findByText('2')).toBeTruthy()
    expect(screen.queryByTestId('dashboard-alerts')).toBeNull()
  })

  it('warns when seats are at least 90% used', async () => {
    usedSeats = 9
    show()
    const alerts = await screen.findByTestId('dashboard-alerts')
    expect(within(alerts).getByText('Employee seats are at least 90% used.')).toBeTruthy()
  })

  it('shows a per-card error with retry when one source fails', async () => {
    targetRolesFail = true
    show()
    const card = await screen.findByTestId('kpi-target-roles')
    const retry = await within(card).findByRole('button', { name: 'Failed to load. Retry' })
    targetRolesFail = false
    await userEvent.setup().click(retry)
    expect(await within(card).findByText('2 target roles in total')).toBeTruthy()
    expect(within(screen.getByTestId('kpi-seats')).getByText('3 / 10')).toBeTruthy()
  })

  it('denies non-administrators', async () => {
    identity = { ...adminIdentity, roles: ['EMPLOYEE'] }
    show()
    expect(await screen.findByText('Your authenticated role cannot enter this workspace.')).toBeTruthy()
    expect(screen.queryByTestId('kpi-members')).toBeNull()
  })
})
