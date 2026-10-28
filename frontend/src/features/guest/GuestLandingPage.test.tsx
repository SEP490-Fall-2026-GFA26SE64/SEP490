import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../shared/i18n/LanguageContext'
import { ToastProvider } from '../../shared/hooks/useToast'
import { LoginPage } from '../auth/LoginPage'
import { GuestLandingPage } from './GuestLandingPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion)', media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })))
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

function page(component = <GuestLandingPage />) {
  return render(<MemoryRouter><ToastProvider><LanguageProvider>{component}</LanguageProvider></ToastProvider></MemoryRouter>)
}

describe('public landing', () => {
  it('shows the complete public introduction and routes to existing dedicated registration flows', () => {
    const { container } = page()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Connect the skills.')
    for (const heading of ['Make learning part of the bigger picture.', 'Start with your organization.', 'A clear start. A secure account.', 'Give your team a place to begin.']) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    }
    expect(screen.getByText('Illustrative pathway, not live learner data.')).toBeTruthy()
    for (const link of screen.getAllByRole('link', { name: 'Register your organization' })) {
      expect(link.getAttribute('href')).toBe('/guest/register')
    }
    for (const link of screen.getAllByRole('link', { name: 'Resume registration' })) {
      expect(link.getAttribute('href')).toBe('/guest/resume')
    }
    for (const link of screen.getAllByRole('link', { name: 'Workspace sign in' })) {
      expect(link.getAttribute('href')).toBe('/login')
    }
    expect(container.querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('reduced')
  })

  it('provides keyboard-operated FAQ disclosure with matching labels and controls', async () => {
    page()
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Does registration activate a workspace?' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const content = screen.getByRole('region', { name: 'Does registration activate a workspace?' })
    expect(content.id).toBe(trigger.getAttribute('aria-controls'))
    expect(content.textContent).toContain('not activated by this step')
    await user.keyboard(' ')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('region', { name: 'Does registration activate a workspace?' })).toBeNull()
  })

  it('closes mobile navigation with Escape and restores focus to its trigger', async () => {
    page()
    const user = userEvent.setup()
    const menu = screen.getByRole('button', { name: 'Toggle navigation' })
    await user.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
    const nav = document.getElementById(menu.getAttribute('aria-controls') ?? '')
    expect(nav?.hidden).toBe(false)
    nav?.querySelector('a')?.focus()
    await user.keyboard('{Escape}')
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(menu)
    expect(nav?.hidden).toBe(true)
  })

  it('translates its content and controls through the existing EN/VI provider', async () => {
    page()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'VI' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Kết nối kỹ năng.')
    expect(screen.getAllByRole('link', { name: 'Đăng ký tổ chức' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Tôi cần gì để đăng ký?' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Connect the skills.')
  })

  it('keeps guest entry on the landing and uses real workspace sign-in without demo controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    page(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LoginPage /></QueryClientProvider>)
    expect(screen.getByRole('heading', { name: 'Enterprise Sign In' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Sign Up as Guest' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Resume organization registration securely' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Adapt-Learn-Graph' }).getAttribute('href')).toBe('/')
    expect(await screen.findByLabelText('Email')).toHaveProperty('value', '')
    expect(screen.queryByDisplayValue('chen.wei@adaptlearn.internal')).toBeNull()
  })
})
