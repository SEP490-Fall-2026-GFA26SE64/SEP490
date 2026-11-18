import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { readSkillKnowledgeProfile } from '../baseline-assessment/knowledgeProfileApi'
import { UpskillSkillsPanel } from './UpskillSkillsPanel'
import { fetchMicroSkills } from '../../../shared/api/microSkillApi'
import { readSkillModules, searchSkillModules, startSkillModule } from '../../../shared/api/skillLearningApi'
vi.mock('../../../shared/api/microSkillApi', () => ({ fetchMicroSkills: vi.fn() }))
vi.mock('../../../shared/api/skillLearningApi', () => ({ readSkillModules: vi.fn(), searchSkillModules: vi.fn(), startSkillModule: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../baseline-assessment/knowledgeProfileApi', () => ({ readSkillKnowledgeProfile: vi.fn() }))
beforeEach(() => { vi.mocked(readSkillKnowledgeProfile).mockResolvedValue([]) })
afterEach(cleanup)
function LocationProbe() {
  const loc = useLocation()
  return <output data-testid="nav-location">{loc.pathname}{loc.search}</output>
}
function mount(initialEntry = '/') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter initialEntries={[initialEntry]}><WorkspaceSessionContext.Provider value={{ identity: { accountId: 'learner', organizationId: 'org', fullName: 'Employee', email: 'test@example.test', organizationName: 'Org' }, onSignOut: async () => {} }}><LocationProbe /><UpskillSkillsPanel /></WorkspaceSessionContext.Provider></MemoryRouter></QueryClientProvider>)
}
it('lists actual modules, preserves locked state and starts the selected eligible module', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockResolvedValue([
    { moduleId: 'locked', title: 'Locked module', contentVersion: 'v1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', started: false, completed: false, unavailableReason: 'PREREQUISITE_NOT_MET' },
    { moduleId: 'open', title: 'Open module', contentVersion: 'v1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', started: false, completed: false, unavailableReason: null },
  ])
  vi.mocked(startSkillModule).mockResolvedValue()
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View modules' }))
  expect(await screen.findByText('Prerequisite knowledge has not been achieved.')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Locked' }) as HTMLButtonElement).disabled).toBe(true)
  const start = screen.getByRole('button', { name: 'Start learning' }) as HTMLButtonElement
  expect(start.disabled).toBe(false)
  await act(async () => { fireEvent.click(start) })
  await waitFor(() => expect(startSkillModule).toHaveBeenCalledWith('java', 'open'))
})
it('distinguishes missing content from an API failure and offers retry', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce([])
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View modules' }))
  expect(await screen.findByText('Could not load modules. Please retry.')).toBeTruthy()
  expect(screen.queryByText('No approved modules are available at this knowledge level.')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No approved modules are available at this knowledge level.')).toBeTruthy()
})

it('groups actual module levels and shows only compatible official achievements, preserving review work', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockResolvedValue([
    { moduleId: 'foundation', title: 'Foundation module', contentVersion: '1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', started: false, completed: true },
    { moduleId: 'advanced', title: 'Advanced module', contentVersion: '2', knowledgeLevel: 'ADVANCED', skillVersion: 'v1', started: false, completed: false },
  ])
  vi.mocked(readSkillKnowledgeProfile).mockResolvedValue([
    { kind: 'EVIDENCE', skillId: 'java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION' },
    { kind: 'EVIDENCE', skillId: 'java', skillVersion: 'old', knowledgeLevel: 'ADVANCED' },
    { kind: 'REVIEW', skillId: 'java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION', reviewState: 'NEED_REVIEW' },
  ] as Awaited<ReturnType<typeof readSkillKnowledgeProfile>>)
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View modules' }))
  await screen.findByText('Foundation module')
  await waitFor(() => expect(screen.getByRole('tab', { name: /Foundation/ }).textContent).toContain('Needs review'))
  expect(screen.getByText(/Your existing achievement is retained/)).toBeTruthy()
  expect(screen.queryByText('Advanced module')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: /Advanced/ }))
  expect(screen.getByText('Advanced module')).toBeTruthy()
  expect(screen.getByRole('tab', { name: /Advanced/ }).textContent).toContain('Not achieved')
})
it('shows achievement unavailable rather than Not achieved when the profile request fails', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockResolvedValue([])
  vi.mocked(readSkillKnowledgeProfile).mockRejectedValue(new Error('unavailable'))
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'View modules' }))
  await screen.findByText('Achievement could not be loaded. Achievement status is unknown.')
  expect(screen.getByRole('tab', { name: /Foundation/ }).textContent).toContain('Unavailable')
  expect(screen.queryByText('Not achieved')).toBeNull()
})

it('searches module results with owner and exact level filters, showing badges and direct authorized start', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(searchSkillModules).mockResolvedValue({ items: [{ skillId: 'java', skillName: 'Java', module: { moduleId: 'collections', title: 'Collections', knowledgeLevel: 'INTERMEDIATE', skillVersion: 'v1', contentVersion: 'v1', started: true, completed: false } }], page: 0, pageSize: 20, totalItems: 1 })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Modules' }))
  expect(await screen.findByText('Collections')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Java · View skill' })).toBeTruthy(); expect(screen.getByText('Intermediate')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.click(screen.getByLabelText('Belongs to skill')); fireEvent.click(screen.getByRole('option', { name: /Java/ }))
  fireEvent.click(screen.getByLabelText('Module knowledge level')); fireEvent.click(screen.getByRole('option', { name: 'Intermediate' }))
  expect(searchSkillModules).toHaveBeenLastCalledWith('', '', '', 0, expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Show results' }))
  await waitFor(() => expect(searchSkillModules).toHaveBeenLastCalledWith('', 'java', 'INTERMEDIATE', 0, expect.anything()))
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Collections' } })
  await waitFor(() => expect(searchSkillModules).toHaveBeenLastCalledWith('Collections', 'java', 'INTERMEDIATE', 0, expect.anything()))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue learning' }))
  await waitFor(() => expect(startSkillModule).toHaveBeenLastCalledWith('java', 'collections'))
})
it('retries module search failure and returns to skill results', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(searchSkillModules).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: [], page: 0, pageSize: 20, totalItems: 0 })
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Modules' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry module search' }))
  expect(await screen.findByText(/No matching modules/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Skills' }))
  expect(await screen.findByRole('button', { name: 'View modules' })).toBeTruthy()
  expect(screen.queryByRole('region', { name: 'Modules' })).toBeNull()
})

it('cancels draft filters, switches list/cards and removes an applied level chip', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(searchSkillModules).mockResolvedValue({ items: [{ skillId: 'java', skillName: 'Java', module: { moduleId: 'm', title: 'Java module', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', contentVersion: '1', started: false, completed: false, unavailableReason: 'PREREQUISITE_NOT_MET' } }], page: 0, pageSize: 20, totalItems: 1 })
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Modules' }))
  await screen.findByRole('heading', { name: 'Java module' })
  expect(screen.queryByRole('table', { name: 'Learning modules' })).toBeNull()
  expect((screen.getByRole('button', { name: 'Locked' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'List view' }))
  expect(screen.getByRole('table', { name: 'Learning modules' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Card view' }))
  expect(screen.queryByRole('table')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
  fireEvent.click(screen.getByLabelText('Module knowledge level')); fireEvent.click(screen.getByRole('option', { name: 'Advanced' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(searchSkillModules).toHaveBeenLastCalledWith('', '', '', 0, expect.anything())
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
  fireEvent.click(screen.getByLabelText('Module knowledge level')); fireEvent.click(screen.getByRole('option', { name: 'Foundation' }))
  fireEvent.click(screen.getByRole('button', { name: 'Show results' }))
  await waitFor(() => expect(searchSkillModules).toHaveBeenLastCalledWith('', '', 'FOUNDATION', 0, expect.anything()))
  fireEvent.click(screen.getByRole('button', { name: 'Remove level filter' }))
  await waitFor(() => expect(searchSkillModules).toHaveBeenLastCalledWith('', '', '', 0, expect.anything()))
})
it('shows direct module admission errors on the results page', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([])
  vi.mocked(searchSkillModules).mockResolvedValue({ items: [{ skillId: 'java', skillName: 'Java', module: { moduleId: 'm', title: 'Java module', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', contentVersion: '1', started: false, completed: false } }], page: 0, pageSize: 20, totalItems: 1 })
  vi.mocked(startSkillModule).mockRejectedValueOnce(new Error('Access changed'))
  mount(); fireEvent.click(screen.getByRole('button', { name: 'Modules' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Start learning' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Access changed')
})

it('keeps the catalog toolbar without a repeated page title or Skills heading', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  mount(); expect(await screen.findByRole('button', { name: 'View modules' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Learning library' })).toBeNull()
  expect(screen.queryByText('Explore skills and modules for your learning goals.')).toBeNull()
  expect(screen.queryByRole('heading', { name: 'Skills' })).toBeNull()
})

it('uses a Skills list and in-page module cards, restoring search and focus on back', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }, { id: 'sql', code: 'SQL', name: 'SQL', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockResolvedValue([{ moduleId: 'm', title: 'Java foundation', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', contentVersion: '1', started: false, completed: false }])
  mount(); await screen.findByRole('heading', { name: 'Java' })
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Java' } })
  const action = screen.getByRole('button', { name: 'View modules' }); fireEvent.click(action)
  expect(await screen.findByRole('heading', { name: 'Java foundation' })).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.getByRole('region', { name: 'Skill modules' })).toBe(document.activeElement)
  fireEvent.click(screen.getByRole('button', { name: 'Back to skills' }))
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Java')
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'View modules' })).toBe(document.activeElement)
})

it('restores selected skill and knowledge level from URL query params and passes upskilling origin when opening a module', async () => {
  vi.mocked(fetchMicroSkills).mockResolvedValue([{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }])
  vi.mocked(readSkillModules).mockResolvedValue([
    { moduleId: 'adv-mod', title: 'Advanced Java Module', knowledgeLevel: 'ADVANCED', skillVersion: 'v1', contentVersion: '1', started: false, completed: false },
  ])
  vi.mocked(startSkillModule).mockResolvedValue()
  mount('/employee/upskilling?tab=skills&skillId=java&level=ADVANCED')
  expect(await screen.findByRole('heading', { name: 'Advanced Java Module' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: /Advanced/ }).getAttribute('data-state')).toBe('active')
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start learning' }))
  })
  await waitFor(() => expect(startSkillModule).toHaveBeenCalledWith('java', 'adv-mod'))
  expect(screen.getByTestId('nav-location').textContent).toBe(
    '/employee/modules/adv-mod?from=upskilling&skillId=java&level=ADVANCED',
  )
})
