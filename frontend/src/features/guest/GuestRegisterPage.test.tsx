import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { GuestRegisterPage } from './GuestRegisterPage'
import * as api from './registrationApi'
import * as structureApi from './orgStructureApi'
import { buildStructureTemplate } from './orgStructureFile'

vi.mock('vis-network', () => ({
  Network: vi.fn(function Network() { return { on: vi.fn(), once: vi.fn(), destroy: vi.fn() } }),
}))
vi.mock('./StarterCatalogGraph', () => ({ StarterCatalogGraph: () => <div data-testid="catalog-graph" /> }))
vi.mock('./orgStructureApi', async importOriginal => ({
  ...await importOriginal<typeof import('./orgStructureApi')>(),
  validateOrganizationStructure: vi.fn(),
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
  vi.mocked(structureApi.validateOrganizationStructure).mockResolvedValue({
    departmentCount: 1, jobPositionCount: 1, targetRoleCount: 1, levelCount: 1,
    departments: [{ code: 'ENG', name: 'Engineering', description: 'Builds products', jobPositions: [{ code: 'DEV', name: 'Developer',
      targetRoles: [{ code: 'BE', name: 'Backend Developer', scope: 'Server code', levels: [{ code: 'L1', name: 'Junior', rank: 1 }] }] }] }],
  })
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
  await screen.findByLabelText(/Business name/)
  await user.type(screen.getByLabelText(/Business name/), 'Acme Learning')
  expect(screen.queryByLabelText(/Full name/)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Continue to account' }))
  expect(api.registerOrganization).not.toHaveBeenCalled()
  for (const [label, value] of [
    [/Full name/, 'Test Owner'],
    [/Login email/, 'owner@example.test'],
    [/Phone number/, '0901 234 567'],
    [/^Password/, password],
    [/Confirm Password/, confirmation],
  ] as const) {
    await user.click(screen.getByLabelText(label))
    await user.paste(value)
  }
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
  return user
}

describe('registration flow', () => {
  it('validates the organization step inline before account entry and preserves back navigation', async () => {
    page()
    const user = userEvent.setup()
    await screen.findByLabelText(/Business name/)
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    const error = await screen.findByRole('alert')
    expect(document.activeElement).toBe(error)
    expect(screen.getByLabelText(/Business name/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.queryByLabelText(/Full name/)).toBeNull()
    await user.type(screen.getByLabelText(/Business name/), 'Step Test Organization')
    await user.tab()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText(/Business name/).getAttribute('aria-invalid')).toBeNull()
    expect(document.activeElement).not.toBe(screen.getByRole('heading', { level: 1 }).parentElement)
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    await screen.findByLabelText(/Full name/)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByDisplayValue('Step Test Organization')).toBeTruthy()
    expect(api.registerOrganization).not.toHaveBeenCalled()
  })

  it('retains the current field set and submits null optional values with an omitted slug', async () => {
    page()
    const user = await fillRegistration()
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(api.registerOrganization).toHaveBeenCalledWith({
      organizationName: 'Acme Learning', subdomain: null, industry: null, headcount: null,
      adminName: 'Test Owner', adminEmail: 'owner@example.test', password: 'long test password', organizationStructure: null,
      country: null, adminPhone: '0901 234 567', policiesAccepted: true,
    })
    expect(screen.queryByText('Auto-fill Demo Code')).toBeNull()
    expect(localStorage.getItem('adaptlearn_guest_registration_draft')).toBeNull()
  })

  it('submits the organization structure imported during the organization step', async () => {
    page()
    const user = userEvent.setup()
    await screen.findByLabelText(/Business name/)
    await user.type(screen.getByLabelText(/Business name/), 'Acme Learning')
    await user.click(screen.getByRole('button', { name: /Import structure/ }))
    const workbook = await buildStructureTemplate()
    await user.upload(await screen.findByTestId('org-structure-file'), new File([await workbook.xlsx.writeBuffer()], 'structure.xlsx'))
    expect(await screen.findByRole('treeitem', { name: /Engineering/ }, { timeout: 15_000 })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /Apply structure/ }))
    expect(screen.getByText(/Imported from structure.xlsx/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    for (const [label, value] of [
      [/Full name/, 'Test Owner'],
      [/Login email/, 'owner@example.test'],
      [/Phone number/, '0901 234 567'],
      [/^Password/, 'long test password'],
      [/Confirm Password/, 'long test password'],
    ] as const) {
      await user.click(screen.getByLabelText(label))
      await user.paste(value)
    }
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(api.registerOrganization).toHaveBeenCalledWith(expect.objectContaining({ organizationStructure: expect.objectContaining({
      departments: expect.arrayContaining([expect.objectContaining({ row: 2, code: 'ENG' })]),
      levels: expect.arrayContaining([expect.objectContaining({ row: 2, targetRoleCode: 'BE-DEV', name: 'Junior', rank: '1' })]) }) }))
  }, 30_000)

  it('preserves entered values and focuses the error summary for invalid password confirmation', async () => {
    page()
    const user = await fillRegistration('long test password', 'different password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
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
    await user.type(screen.getByLabelText(/Workspace address/), 'acme-team')
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
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
    expect(screen.queryByLabelText(/Business name/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry connection' })).toBeTruthy()
  })

  it('requires explicit consent and a valid phone, keeps form data and provides placeholder links', async () => {
    page()
    const user = await fillRegistration()
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(api.registerOrganization).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox').getAttribute('aria-invalid')).toBe('true')
    await user.click(screen.getByRole('link', { name: 'Terms of Use' }))
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('placeholder'))
    expect(screen.getByLabelText(/Full name/)).toHaveProperty('value', 'Test Owner')
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }))
    await user.clear(screen.getByLabelText(/Phone number/))
    await user.type(screen.getByLabelText(/Phone number/), '123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('alert').textContent).toContain('7–15')
    expect(api.registerOrganization).not.toHaveBeenCalled()
  })

  it('searches country and industry, submits stable values and never shows headcount', async () => {
    page()
    const user = userEvent.setup()
    await screen.findByLabelText(/Business name/)
    expect(screen.queryByLabelText(/Headcount|company size/i)).toBeNull()
    await user.click(screen.getByRole('combobox', { name: 'Country' }))
    await user.type(screen.getByRole('textbox', { name: 'Search countries' }), 'Vietnam')
    await user.click(screen.getByRole('option', { name: 'Vietnam' }))
    await user.click(screen.getByRole('combobox', { name: 'Industry' }))
    await user.click(screen.getByRole('option', { name: 'Cloud & DevOps' }))
    await user.type(screen.getByLabelText(/Business name/), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Continue to account' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('combobox', { name: 'Country' }).textContent).toContain('Vietnam')
    expect(screen.getByRole('combobox', { name: 'Industry' }).textContent).toContain('Cloud & DevOps')
  })
})
