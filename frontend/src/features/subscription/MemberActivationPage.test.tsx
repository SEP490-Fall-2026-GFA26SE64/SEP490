import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { MemberActivationPage } from './WorkspaceLoginPage'
import * as api from './subscriptionApi'

vi.mock('./subscriptionApi', async original => ({
  ...await original<typeof import('./subscriptionApi')>(), request: vi.fn(),
}))
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', `/activate#token=${'a'.repeat(64)}`)
  vi.mocked(api.request).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState(null, '', '/'); localStorage.clear() })
function show() {
  render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter>
    <MemberActivationPage />
  </MemoryRouter></LanguageProvider></QueryClientProvider>)
}
describe('member activation', () => {
  it('shares the workspace sign-in brand/footer without the organization onboarding wizard', () => {
    show()
    expect(screen.getByRole('link', { name: 'Adapt-Learn-Graph' })).toBeTruthy()
    expect(screen.getByRole('contentinfo')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Onboarding progress' })).toBeNull()
  })
  it('keeps invalid passwords on the form, links inline errors and focuses the summary', async () => {
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Activate account' }))
    expect(screen.getByRole('alert').textContent).toContain('Check your password fields')
    expect(screen.getByLabelText('Password').getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement?.textContent).toContain('Check your password fields')
    expect(api.request).not.toHaveBeenCalled()
  })
  it('uses the single-use token and clears passwords and URL proof after activation', async () => {
    show()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Password'), 'isolated-activation-password')
    await user.type(screen.getByLabelText('Confirm password'), 'isolated-activation-password')
    await user.click(screen.getByRole('button', { name: 'Activate account' }))
    await screen.findByText('Account activated.')
    expect(api.request).toHaveBeenCalledWith('/api/v1/workspace-auth/activate', 'POST',
      { token: 'a'.repeat(64), password: 'isolated-activation-password' })
    expect(window.location.hash).toBe('')
    expect(screen.queryByLabelText('Password')).toBeNull()
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
  })
})
