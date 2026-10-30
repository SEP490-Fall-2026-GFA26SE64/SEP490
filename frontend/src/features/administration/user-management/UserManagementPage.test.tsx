import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { ToastProvider } from '../../../shared/hooks/useToast'
import { UserManagementPage } from './UserManagementPage'
import { OrganizationSubscriptionPage } from '../subscription/OrganizationSubscriptionPage'
import { WorkspaceBoundary } from '../../subscription/WorkspaceBoundary'

const identity = { accountId: 'admin', organizationId: 'organization', email: 'actual-admin@example.test',
  fullName: 'Actual Administrator', roles: ['ORGANIZATION_ADMINISTRATOR'], stage: 'COMPLETE', workspaceReady: true }
const terms = { name: 'Starter', description: 'Purchased plan', priceVnd: 4900000, currency: 'VND', durationMonths: 1, employeeSeats: 20 }
const summary = { organizationId: 'organization', organizationName: 'Actual Organization', workspaceStatus: 'ACTIVE',
  subscriptionStatus: 'ACTIVE', current: { periodId: 'period', startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z', terms },
  scheduled: null, usedSeats: 1, allocatedSeats: 20, admissionLimit: 20, paymentHistory: [] }
const member = { membershipId: 'member', accountId: 'employee', fullName: 'Actual Employee', email: 'employee@example.test',
  active: true, accountActive: true, roles: ['EMPLOYEE'], revision: 1, departmentId: 'department', departmentName: 'Engineering',
  occupationReferenceId: 'occupation', occupationName: 'Developer' }
const invitation = { activationId: 'invitation', fullName: 'Pending Person', email: 'pending@example.test', roles: ['LD_MANAGER'],
  departmentId: null, departmentName: null, occupationReferenceId: null, occupationName: null,
  createdAt: '2026-10-26T00:00:00Z', expiresAt: '2026-10-26T00:10:00Z', state: 'PENDING', deliveryStatus: 'PENDING' }
let expired = false
let suspended = false
let manyMembers = false
const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
  let value: unknown
  if (path.endsWith('/csrf')) value = { headerName: 'X-CSRF-TOKEN', token: 'fixture' }
  else if (path.endsWith('/current')) value = identity
  else if (path.endsWith('/subscription')) value = { ...summary, subscriptionStatus: expired ? 'EXPIRED' : 'ACTIVE', workspaceStatus: suspended ? 'SUSPENDED' : 'ACTIVE' }
  else if (path.endsWith('/members')) value = manyMembers ? Array.from({ length: 12 }, (_, index) => ({
    ...member, membershipId: `member-${index}`, email: `employee-${index}@example.test`, fullName: `Employee ${index + 1}`,
  })) : [member]
  else if (path.endsWith('/activations')) value = [invitation]
  else if (path.endsWith('/member-references')) value = [{ departmentId: 'department', departmentName: 'Engineering', occupationReferenceId: 'occupation', occupationName: 'Developer' }]
  else if (path.endsWith('/current-order')) value = { order: null, applicationState: 'NOT_APPLIED', workspace: null }
  else if (path.endsWith('/profile') && init?.method === 'PUT') value = { ...member, fullName: 'Updated Employee', revision: 2 }
  else if (path.endsWith('/sign-out')) return new Response(null, { status: 204 })
  else throw new Error(`Unexpected request ${path}`)
  return new Response(JSON.stringify(value))
})
function show(subscription = false) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ToastProvider><LanguageProvider><MemoryRouter initialEntries={[subscription ? '/admin/subscription' : '/admin/users']}>
      <WorkspaceBoundary>{subscription ? <OrganizationSubscriptionPage /> : <UserManagementPage />}</WorkspaceBoundary>
    </MemoryRouter></LanguageProvider></ToastProvider>
  </QueryClientProvider>)
}
beforeEach(() => {
  expired = false
  suspended = false
  manyMembers = false
  localStorage.clear()
  fetcher.mockClear()
  vi.stubGlobal('fetch', fetcher)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('Administrator page ownership', () => {
  it('uses the existing sidebar, real account and retained demo role navigation', async () => {
    const { container } = show()
    expect(await screen.findByRole('heading', { name: 'User Accounts' })).toBeTruthy()
    expect(container.querySelector('.workspace .workspace-sidebar')).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Portal feature tabs' })
    expect(within(nav).getByRole('link', { name: 'User Accounts' }).getAttribute('aria-current')).toBe('page')
    await userEvent.setup().click(screen.getByRole('button', { name: 'User actions menu' }))
    expect(screen.getByText('actual-admin@example.test')).toBeTruthy()
    expect(screen.getByText('Actual Organization')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Employee' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Expert' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Platform Admin' })).toBeTruthy()
    expect(screen.queryByText('Elena Rostova')).toBeNull()
    expect(screen.queryByText('Active Workspace')).toBeNull()
  })

  it('lists real members and invitations with detail, search and status filters', async () => {
    show()
    const user = userEvent.setup()
    expect(await screen.findByText('Actual Employee')).toBeTruthy()
    expect(screen.getByText('Pending Person')).toBeTruthy()
    await user.type(screen.getByRole('textbox', { name: 'Search users' }), 'employee@example.test')
    expect(screen.queryByText('Pending Person')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'View' }))
    const detail = screen.getByRole('dialog', { name: 'User details' })
    expect(within(detail).getByText('Engineering')).toBeTruthy()
    expect(within(detail).getByText('Developer')).toBeTruthy()
    await user.click(within(detail).getByRole('button', { name: 'Close dialog' }))
    await user.clear(screen.getByRole('textbox', { name: 'Search users' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'PENDING')
    expect(screen.getByText('Pending Person')).toBeTruthy()
    expect(screen.queryByText('Actual Employee')).toBeNull()
  })

  it('edits allowed fields with revision/CSRF and leaves activated email read-only', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit User' })
    expect(within(dialog).getByLabelText('Email')).toHaveProperty('readOnly', true)
    await user.clear(within(dialog).getByLabelText('Full name'))
    await user.type(within(dialog).getByLabelText('Full name'), 'Updated Employee')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('User details saved.')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledWith('/api/v1/organizations/organization/subscription/members/member/profile',
      expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'fixture' }),
        body: JSON.stringify({ fullName: 'Updated Employee', roles: ['EMPLOYEE'], departmentId: 'department',
          occupationReferenceId: 'occupation', revision: 1 }) }))
  })

  it('keeps deactivation but disables creation and edits for expired subscriptions', async () => {
    expired = true
    show()
    await screen.findByText('Actual Employee')
    expect(screen.getByRole('button', { name: 'Create User' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Deactivate' })).toHaveProperty('disabled', false)
  })

  it('allows exactly one organization role in the account form', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit User' })
    await user.click(within(dialog).getByRole('radio', { name: 'Expert' }))
    expect(within(dialog).getByRole('radio', { name: 'Employee' })).toHaveProperty('checked', false)
    await user.click(within(dialog).getByRole('radio', { name: 'L&D Manager' }))
    expect(within(dialog).getByRole('radio', { name: 'Expert' })).toHaveProperty('checked', false)
    expect(within(dialog).getAllByRole('radio').filter(input => input instanceof HTMLInputElement && input.checked)).toHaveLength(1)
  })

  it('keeps subscription billing-only with navigation to the user directory', async () => {
    const { container } = show(true)
    expect(await screen.findByRole('heading', { name: 'Organization subscription' })).toBeTruthy()
    expect(await screen.findByText('Current paid period')).toBeTruthy()
    expect(container.querySelector('.workspace-sidebar')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Manage users' }).getAttribute('href')).toBe('/admin/users')
    expect(screen.queryByRole('button', { name: 'Send activation link' })).toBeNull()
    expect(screen.queryByText('Actual Employee')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'User directory' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Renew subscription' })).toBeTruthy()
  })

  it('paginates the directory and keeps a truthful filtered empty state', async () => {
    manyMembers = true
    show()
    const user = userEvent.setup()
    await screen.findByText('Employee 1')
    expect(screen.queryByText('Employee 11')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Employee 11')).toBeTruthy()
    await user.type(screen.getByRole('textbox', { name: 'Search users' }), 'not-a-member')
    expect(screen.getByText('No users match these filters.')).toBeTruthy()
  })

  it('denies the Users route while suspended but keeps the billing recovery link', async () => {
    suspended = true
    show()
    expect(await screen.findByText('Your authenticated role cannot enter this workspace.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'User Accounts' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Subscription and recovery' }).getAttribute('href')).toBe('/admin/subscription')
  })
})
