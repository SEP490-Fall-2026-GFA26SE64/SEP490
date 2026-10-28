import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
const demo = vi.hoisted(() => ({ enabled: true, establish: vi.fn() }))
vi.mock('../../shared/hooks/useLocalDemoSession', () => ({ useLocalDemoSession: () => demo }))
const toast = vi.hoisted(() => vi.fn())
vi.mock('../../shared/hooks/useToast', () => ({ useToast: () => ({ toast }) }))

function renderLoginPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </LanguageProvider>
  )
}

describe('LoginPage Guest Sign-Up Button', () => {
  beforeEach(() => { localStorage.clear(); demo.enabled = true; demo.establish.mockReset().mockResolvedValue(false) })
  afterEach(() => {
    cleanup()
  })

  it('does not render guest sign-up button in top navbar', () => {
    const { container } = renderLoginPage()
    const navBtn = container.querySelector('#nav-guest-signup-btn')
    expect(navBtn).toBeNull()
  })

  it('renders guest sign-up inline caption in main login card', () => {
    const { container } = renderLoginPage()
    const signupLink = container.querySelector('#guest-signup-link')
    expect(signupLink).not.toBeNull()
    expect(signupLink?.getAttribute('href')).toBe('/guest/register')
    expect(signupLink?.textContent).toContain('Sign Up as Guest')

    expect(screen.getByText("Don't have an account?")).toBeTruthy()
  })
  it.each([['Employee', 'employee-a'], ['L&D Manager', 'ld'], ['Admin', 'admin'], ['Expert', 'expert-chen']])('RB16 %s waits for server session before storage/navigation, failed session stays put', async (account, persona) => {
    let resolve!: (value: boolean) => void
    demo.establish.mockImplementation(() => new Promise<boolean>(done => { resolve = done }))
    renderLoginPage(); fireEvent.click(screen.getByRole('button', { name: account }))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(demo.establish).toHaveBeenCalledWith(persona); expect(write).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Signing in...' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => resolve(false))
    expect(localStorage.getItem('auth_user')).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy())
  })
  it('RB16 unknown demo account cannot select a persona or persist shell identity', () => {
    renderLoginPage(); fireEvent.change(screen.getByPlaceholderText('Enter your email'), { target: { value: 'employee-in-url@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(demo.establish).not.toHaveBeenCalled(); expect(localStorage.getItem('active_actor')).toBeNull()
  })
  it('RB16 flag-off does not call local demo session endpoint', async () => {
    demo.enabled = false; renderLoginPage(); fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(localStorage.getItem('active_actor')).toBe('employee'))
    expect(demo.establish).not.toHaveBeenCalled()
  })
})
