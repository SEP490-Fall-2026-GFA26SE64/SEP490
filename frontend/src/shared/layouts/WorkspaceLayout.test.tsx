import { cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import { ToastProvider } from '../hooks/useToast'
import { WorkspaceLayout } from './WorkspaceLayout'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })

it.each([
  ['ORGANIZATION_ADMINISTRATOR', '/system-status?portal=admin'],
  ['DOMAIN_EXPERT', '/system-status?portal=expert'],
])('uses the signed-in %s portal on shared pages regardless of saved demo state', (role, statusLink) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() })))
  localStorage.setItem('active_actor', 'employee')
  render(<QueryClientProvider client={new QueryClient()}><ToastProvider><LanguageProvider>
    <MemoryRouter initialEntries={['/system-status']}>
      <WorkspaceLayout identity={{ accountId: 'a', fullName: 'Member', email: 'member@example.test', organizationId: 'o', organizationName: 'Organization', roles: [role] }}>
        <p>content</p>
      </WorkspaceLayout>
    </MemoryRouter>
  </LanguageProvider></ToastProvider></QueryClientProvider>)
  const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href'))
  expect(hrefs).toContain(statusLink)
  expect(hrefs).not.toContain('/employee/overview')
})
it.each(['/ld-manager/modules','/ld-manager/approvals'])('groups %s under Learning Content with Approvals as its entry', path => {
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404})))
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn(),addListener:vi.fn(),removeListener:vi.fn()})))
  localStorage.setItem('app_language','en')
  render(<QueryClientProvider client={new QueryClient()}><ToastProvider><LanguageProvider><MemoryRouter initialEntries={[path]}>
    <WorkspaceLayout identity={{accountId:'manager',fullName:'Manager',email:'manager@example.test',organizationId:'org',organizationName:'Organization',roles:['LD_MANAGER']}}><p>content</p></WorkspaceLayout>
  </MemoryRouter></LanguageProvider></ToastProvider></QueryClientProvider>)
  const link=screen.getByRole('link',{name:'Learning Content'})
  expect(link.getAttribute('href')).toMatch(/\/ld-manager\/approvals$/)
  expect(link.getAttribute('aria-current')).toBe('page')
  expect(screen.queryByRole('link',{name:'Content Approvals'})).toBeNull()
})

it.each(['workspace', 'lesson'] as const)('renders %s navigation structurally and preserves the saved preference', variant => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  localStorage.setItem('app_language', 'en')
  localStorage.setItem('sidebar_collapsed_employee', 'false')
  render(<QueryClientProvider client={new QueryClient()}><ToastProvider><LanguageProvider>
    <MemoryRouter initialEntries={['/employee/modules/test']}>
      <WorkspaceLayout variant={variant} identity={{ accountId: 'employee', fullName: 'Learner', email: 'learner@example.test', organizationId: 'org', organizationName: 'Organization', roles: ['EMPLOYEE'] }}>
        <p>Lesson content</p>
      </WorkspaceLayout>
    </MemoryRouter>
  </LanguageProvider></ToastProvider></QueryClientProvider>)
  expect(screen.getByRole('banner')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'My Learning' })).toBeTruthy()
  expect(screen.queryByRole('complementary', { name: 'Sidebar navigation' }) !== null).toBe(variant === 'workspace')
  expect(screen.queryByRole('button', { name: 'Collapse sidebar' }) !== null).toBe(variant === 'workspace')
  expect(screen.getByRole('main').classList.contains('module-reading-main')).toBe(variant === 'lesson')
  expect(localStorage.getItem('sidebar_collapsed_employee')).toBe('false')
})
