import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'

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
})
