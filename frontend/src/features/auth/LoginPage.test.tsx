import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { MemberActivationPage } from '../subscription/WorkspaceLoginPage'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'

function renderPage(component = <LoginPage />) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LanguageProvider><MemoryRouter>{component}</MemoryRouter></LanguageProvider>
  </QueryClientProvider>)
}

const signedIn = {
  accountId: 'test-account', organizationId: 'test-organization', email: 'admin@example.test', fullName: 'Test Administrator',
  roles: ['ORGANIZATION_ADMINISTRATOR'], stage: 'COMPLETE', workspaceReady: true,
}
const partial = { ...signedIn, accountId: null, organizationId: null, fullName: null, roles: [], workspaceReady: false }
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'isolated-csrf' }
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('Workspace login appearance and authentication', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

  it('restores the original frame and assets without demo credentials or guest shortcuts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 401)))
    const { container } = renderPage()
    expect(screen.getByRole('heading', { name: 'Enterprise Sign In' })).toBeTruthy()
    expect(container.querySelector('.razor-login-page .razor-stage .razor-card')).toBeTruthy()
    const illustrations = container.querySelectorAll('.razor-illustration-img')
    expect(illustrations).toHaveLength(2)
    expect(illustrations[0].getAttribute('src')).toBe('/illustrations/ill_left_opt.webp')
    expect(illustrations[1].getAttribute('src')).toBe('/illustrations/ill_right_opt.webp')
    for (const image of illustrations) expect(image.getAttribute('alt')).toBe('')
    expect(await screen.findByLabelText('Email')).toHaveProperty('value', '')
    expect(screen.getByLabelText('Password')).toHaveProperty('value', '')
    expect(screen.queryByText('Sign Up as Guest')).toBeNull()
    expect(screen.queryByText('Alex Chen (Employee)')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
  })

  it('toggles password visibility with a correct next-action label and supports EN/VI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 401)))
    renderPage()
    const user = userEvent.setup()
    const password = await screen.findByLabelText('Password')
    await user.type(password, 'user-entered-password')
    expect(password.getAttribute('type')).toBe('password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password.getAttribute('type')).toBe('text')
    expect(password).toHaveProperty('value', 'user-entered-password')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password.getAttribute('type')).toBe('password')
    await user.click(screen.getByRole('button', { name: 'VI' }))
    expect(screen.getByRole('heading', { name: 'Đăng nhập doanh nghiệp' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: 'Enterprise Sign In' })).toBeTruthy()
  })

  it('keeps loading and credential errors inside the original frame', async () => {
    let respond: ((response: Response) => void) | undefined
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { respond = resolve })))
    const { container } = renderPage()
    expect(screen.getByRole('status').textContent).toContain('Loading')
    expect(container.querySelector('.razor-card [role="status"]')).toBeTruthy()
    respond?.(response({}, 401))
    expect(await screen.findByLabelText('Email')).toBeTruthy()
    vi.stubGlobal('fetch', vi.fn(async (path: string) => path.endsWith('/csrf') ? response(csrf) :
      response({ code: 'UNAUTHENTICATED', message: 'Email or password is incorrect.' }, 401)))
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'user@example.test')
    await user.type(screen.getByLabelText('Password'), 'invalid-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy()
    expect(container.querySelector('.razor-card [role="alert"]')).toBeTruthy()
    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'user@example.test')
  })

  it('retains the exact sign-in, CSRF and MFA request contracts', async () => {
    const fetcher = vi.fn(async (path: string) => {
      if (path.endsWith('/current')) return response({}, 401)
      if (path.endsWith('/csrf')) return response(csrf)
      if (path.endsWith('/sign-in')) return response({ ...partial, stage: 'CHALLENGE_MFA' })
      if (path.endsWith('/totp/verify')) return response(signedIn)
      throw new Error(`Unexpected authentication request: ${path}`)
    })
    vi.stubGlobal('fetch', fetcher)
    const { container } = renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email'), 'admin@example.test')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    const proof = await screen.findByLabelText('Authenticator code')
    expect(container.querySelector('.razor-card .razor-form')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledWith('/api/v1/workspace-auth/sign-in', expect.objectContaining({
      method: 'POST', credentials: 'same-origin', headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'isolated-csrf' }),
      body: JSON.stringify({ email: 'admin@example.test', password: 'secret-password' }),
    }))
    await user.type(proof, '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByText('Authentication complete.')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledWith('/api/v1/workspace-auth/totp/verify', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ code: '123456' }),
    }))
    expect(screen.getByRole('button', { name: 'Continue to workspace' })).toBeTruthy()
    expect(localStorage.getItem('auth_user')).toBeNull()
    expect(localStorage.getItem('active_actor')).toBeNull()
  })

  it('retains recovery, re-enrollment and one-time recovery-code acknowledgement', async () => {
    const recoveryCodes = Array.from({ length: 10 }, (_, index) => `${index}`.padStart(32, '0'))
    const fetcher = vi.fn(async (path: string) => {
      if (path.endsWith('/current')) return response({ ...partial, stage: 'CHALLENGE_MFA' })
      if (path.endsWith('/csrf')) return response(csrf)
      if (path.endsWith('/recovery')) return response({ ...partial, stage: 'SETUP_MFA_RECOVERY' })
      if (path.endsWith('/totp/setup')) return response({ manualSecret: 'A'.repeat(32), email: partial.email })
      if (path.endsWith('/totp/confirm')) return response({ identity: signedIn, recoveryCodes })
      throw new Error(`Unexpected recovery request: ${path}`)
    })
    vi.stubGlobal('fetch', fetcher)
    const { container } = renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Use recovery code' }))
    await user.type(screen.getByLabelText('Recovery code'), '0'.repeat(32))
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    await user.click(await screen.findByRole('button', { name: 'Set up authenticator' }))
    await user.type(await screen.findByLabelText('Authenticator code'), '123456')
    expect(container.querySelector('.razor-card [data-sensitive]')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Confirm authenticator' }))
    const continueButton = await screen.findByRole('button', { name: 'Continue to workspace' })
    expect(continueButton).toHaveProperty('disabled', true)
    expect(container.querySelector('pre')?.textContent).toBe(recoveryCodes.join('\n'))
    await user.click(screen.getByRole('button', { name: 'I saved the recovery codes' }))
    expect(continueButton).toHaveProperty('disabled', false)
    expect(container.querySelector('[data-sensitive]')).toBeNull()
    expect(fetcher).toHaveBeenCalledWith('/api/v1/workspace-auth/recovery', expect.objectContaining({
      body: JSON.stringify({ code: '0'.repeat(32) }),
    }))
  })

  it('keeps the fresh sign-in action after a role assurance change', async () => {
    let signedOut = false
    const fetcher = vi.fn(async (path: string) => {
      if (path.endsWith('/csrf')) return response(csrf)
      if (path.endsWith('/current')) return signedOut ? response({}, 401) : response({ ...partial, stage: 'SIGN_IN_REQUIRED' })
      if (path.endsWith('/sign-out')) { signedOut = true; return new Response(null, { status: 204 }) }
      throw new Error('Unexpected request')
    })
    vi.stubGlobal('fetch', fetcher)
    renderPage()
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign in again' }))
    expect(await screen.findByLabelText('Password')).toHaveProperty('value', '')
    expect(fetcher).toHaveBeenCalledWith('/api/v1/workspace-auth/sign-out', expect.objectContaining({ method: 'POST' }))
  })

  it('reuses the workspace login frame for member activation', () => {
    const { container } = renderPage(<MemberActivationPage />)
    expect(screen.getByRole('heading', { name: 'Activate your account' })).toBeTruthy()
    expect(container.querySelector('.razor-login-page')).toBeTruthy()
    expect(container.querySelectorAll('.razor-card')).toHaveLength(1)
    expect(container.querySelectorAll('.razor-illustration-img')).toHaveLength(2)
    expect(screen.getByText('Employee, Expert and L&D Manager accounts sign in with a password, without MFA.')).toBeTruthy()
  })
})
