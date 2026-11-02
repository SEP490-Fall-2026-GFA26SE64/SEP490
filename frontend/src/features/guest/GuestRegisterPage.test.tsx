import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { GuestRegisterPage } from './GuestRegisterPage'
import * as api from './registrationApi'
import * as catalogApi from './platformCatalogApi'

vi.mock('vis-network', () => ({
  Network: vi.fn(function Network() { return { on: vi.fn(), once: vi.fn(), destroy: vi.fn() } }),
}))
vi.mock('./platformCatalogApi', async importOriginal => ({
  ...await importOriginal<typeof import('./platformCatalogApi')>(),
  getPlatformCatalog: vi.fn(),
  previewCatalogClosure: vi.fn(),
}))

vi.mock('./registrationApi', async importOriginal => ({
  ...await importOriginal<typeof import('./registrationApi')>(),
  getRegistration: vi.fn(),
  registerOrganization: vi.fn(),
  signInRegistration: vi.fn(),
  verifyRegistrationEmail: vi.fn(),
  setupRegistrationTotp: vi.fn(),
  confirmRegistrationTotp: vi.fn(),
  signOutRegistration: vi.fn(),
}))

const pending: api.RegistrationView = {
  registrationId: null, stage: 'VERIFY_EMAIL', email: 'owner@example.test', fields: null,
  deliveryStatus: 'SENT', resendAvailableAt: null, emailVerifiedAt: null, completedAt: null,
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.mocked(api.getRegistration).mockResolvedValue(null)
  vi.mocked(api.registerOrganization).mockResolvedValue(pending)
  vi.mocked(api.signOutRegistration).mockResolvedValue()
  vi.mocked(catalogApi.getPlatformCatalog).mockResolvedValue({ version: 'v1', edges: [], nodes: [
    { id: 'role-1', label: 'TargetRole', name: 'Backend Developer', code: 'BE' }] })
  vi.mocked(catalogApi.previewCatalogClosure).mockImplementation(async ids => ({
    templateVersion: 'v1', selected: ids, nodeCount: 3, relationshipCount: 2, nodesByLabel: { TargetRole: 1 } }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.resetAllMocks()
  localStorage.clear()
})

function page(mode: 'register' | 'resume' = 'register') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter>
    <GuestRegisterPage mode={mode} />
  </MemoryRouter></LanguageProvider></QueryClientProvider>)
  return client
}

async function fillRegistration(password = 'long test password', confirmation = password) {
  const user = userEvent.setup()
  await screen.findByLabelText(/Organization Legal Name/)
  await user.type(screen.getByLabelText(/Organization Legal Name/), 'Acme Learning')
  expect(screen.queryByLabelText(/Administrator Full Name/)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Continue to account' }))
  expect(api.registerOrganization).not.toHaveBeenCalled()
  for (const [label, value] of [
    [/Administrator Full Name/, 'Test Owner'],
    [/Work Email Address/, 'owner@example.test'],
    [/^Password/, password],
    [/Confirm Password/, confirmation],
  ] as const) {
    await user.click(screen.getByLabelText(label))
    await user.paste(value)
  }
  return user
}

describe('registration flow', () => {
  it('validates the organization step inline before account entry and preserves back navigation', async () => {
    page()
    const user = userEvent.setup()
    await screen.findByLabelText(/Organization Legal Name/)
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    const error = await screen.findByRole('alert')
    expect(document.activeElement).toBe(error)
    expect(screen.getByLabelText(/Organization Legal Name/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByLabelText(/Administrator Full Name/)).toBeNull()
    await user.type(screen.getByLabelText(/Organization Legal Name/), 'Step Test Organization')
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    await screen.findByLabelText(/Administrator Full Name/)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByDisplayValue('Step Test Organization')).toBeTruthy()
    expect(api.registerOrganization).not.toHaveBeenCalled()
  })

  it('retains the current field set and submits null optional values with an omitted slug', async () => {
    page()
    const user = await fillRegistration()
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(api.registerOrganization).toHaveBeenCalledWith({
      organizationName: 'Acme Learning', subdomain: null, industry: null, headcount: null,
      adminName: 'Test Owner', adminEmail: 'owner@example.test', password: 'long test password', catalogSelection: [],
    })
    expect(screen.queryByText('Auto-fill Demo Code')).toBeNull()
    expect(localStorage.getItem('adaptlearn_guest_registration_draft')).toBeNull()
  })

  it('submits the catalog items picked during the organization step', async () => {
    page()
    const user = userEvent.setup()
    await screen.findByLabelText(/Organization Legal Name/)
    await user.type(screen.getByLabelText(/Organization Legal Name/), 'Acme Learning')
    await user.click(await screen.findByRole('button', { name: 'Add Backend Developer' }))
    expect((await screen.findByTestId('catalog-closure-summary')).textContent).toBe('3 items and 2 relationships will be copied')
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    for (const [label, value] of [
      [/Administrator Full Name/, 'Test Owner'],
      [/Work Email Address/, 'owner@example.test'],
      [/^Password/, 'long test password'],
      [/Confirm Password/, 'long test password'],
    ] as const) {
      await user.click(screen.getByLabelText(label))
      await user.paste(value)
    }
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(api.registerOrganization).toHaveBeenCalledWith(expect.objectContaining({ catalogSelection: ['role-1'] }))
  })

  it('preserves entered values and focuses the error summary for invalid password confirmation', async () => {
    page()
    const user = await fillRegistration('long test password', 'different password')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    const error = await screen.findByRole('alert')
    expect(error.textContent).toContain('Passwords do not match')
    expect(document.activeElement).toBe(error)
    expect(screen.getByText('Acme Learning')).toBeTruthy()
    expect(api.registerOrganization).not.toHaveBeenCalled()
  })

  it('surfaces backend field errors without discarding organization input', async () => {
    vi.mocked(api.registerOrganization).mockRejectedValue(new api.RegistrationApiError(
      409, 'SLUG_UNAVAILABLE', 'This workspace slug is already reserved.', 'subdomain'))
    page()
    const user = await fillRegistration()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.type(screen.getByLabelText('Workspace URL Slug'), 'acme-team')
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    expect((await screen.findByRole('alert')).textContent).toContain('already reserved')
    expect(screen.getByDisplayValue('Acme Learning')).toBeTruthy()
    expect(screen.getByDisplayValue('acme-team').getAttribute('aria-invalid')).toBe('true')
  })

  it('ignores legacy browser verification flags and shows the server-owned stage', async () => {
    localStorage.setItem('adaptlearn_guest_registration_draft', JSON.stringify({ isEmailVerified: true }))
    vi.mocked(api.getRegistration).mockResolvedValue(pending)
    page()
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(screen.queryByRole('heading', { name: 'Registration complete' })).toBeNull()
    expect(screen.queryByRole('link', { name: /subscription plans/i })).toBeNull()
  })

  it('clears authenticator material on sign-out', async () => {
    vi.mocked(api.getRegistration).mockResolvedValue({ ...pending, stage: 'SETUP_MFA' })
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    vi.mocked(api.setupRegistrationTotp).mockResolvedValue({ manualSecret: secret, email: pending.email })
    page('resume')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    expect(await screen.findByText(secret)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Sign out of registration' }))
    await waitFor(() => expect(screen.queryByText(secret)).toBeNull())
    expect(api.signOutRegistration).toHaveBeenCalledOnce()
  })

  it('shows a real dependency failure rather than a fake registration form', async () => {
    vi.mocked(api.getRegistration).mockRejectedValue(new api.RegistrationApiError(
      503, 'SERVICE_UNAVAILABLE', 'Registration security keys are not configured.'))
    page()
    expect((await screen.findByRole('alert')).textContent).toContain('security keys are not configured')
    expect(screen.queryByLabelText(/Organization Legal Name/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeTruthy()
  })
})
