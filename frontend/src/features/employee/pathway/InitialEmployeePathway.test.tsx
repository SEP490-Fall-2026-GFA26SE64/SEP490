import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { InitialEmployeePathway } from './InitialEmployeePathway'
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/hooks/useInitialPathwaySession', () => ({ useInitialPathwaySession: () => ({ scope: 'org:employee', data: { role: 'EMPLOYEE' }, isPending: false }) }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('../../../shared/api/initialPathway', async importOriginal => ({ ...await importOriginal<typeof import('../../../shared/api/initialPathway')>(), readInitialPathway: vi.fn(async () => ({ status: null, baseline: null, modules: [], archived: false })) }))
afterEach(cleanup)
it('keeps guided empty state and role CTA without reading manual assignments', async () => {
  const fetch = vi.fn(() => { throw new Error('Manual assignment request is forbidden') })
  vi.stubGlobal('fetch', fetch)
  try {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/employee/pathway?view=assigned']}><InitialEmployeePathway /></MemoryRouter></QueryClientProvider>)
    await screen.findByTestId('empty-initial-pathway')
    expect(screen.getByRole('link', { name: 'initialPathway.roles' }).getAttribute('href')).toBe('/employee/upskilling?tab=roles')
    expect(fetch).not.toHaveBeenCalled()
  } finally { vi.unstubAllGlobals() }
})
