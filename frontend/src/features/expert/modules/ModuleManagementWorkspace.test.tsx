import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ModuleManagementWorkspace } from './ModuleManagementWorkspace'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { moduleRequest } from '../../../shared/api/moduleAuthoringApi'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
const occupation = { id: 'occ', name: 'Software Developers' }
const content = { id: 'content', title: 'Lesson', markdown: '# Learn', occupationIds: ['occ'], createdBy: 'expert-a', createdAt: '2026-10-28T00:00:00Z', contentType: 'text/markdown', contentVersion: '1.0' }
function LocationProbe() { return <output aria-label="Current route">{useLocation().pathname}</output> }
let saved: unknown
beforeEach(() => {
  saved = null
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path.endsWith('/session')) return Response.json({ id: 'expert-a', organizationId: 'org', roles: ['EXPERT'] })
    if (path.includes('/modules?') || path.includes('/module-list?')) return Response.json({ items: [], total: 0, page: 1, pageSize: 10 })
    if (path.endsWith('/catalog/Occupation')) return Response.json([occupation])
    if (path.endsWith('/catalog/MicroSkill')) return Response.json([{ id: 'skill', name: 'SQL' }])
    if (path.endsWith('/contents')) return Response.json([content])
    if (path.endsWith('/modules') && init?.method === 'POST') {
      saved = JSON.parse(String(init.body)); return Response.json({ message: 'Module changed. Reload and review the latest revision' }, { status: 409 })
    }
    return Response.json({ message: 'Unexpected request' }, { status: 500 })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

async function signIn() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Create module' }) as HTMLButtonElement).disabled).toBe(false))
}
describe('REQ-013 module workspace', () => {
  it('keeps L&D navigation, content and review decisions inside the manager workspace', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const metadata = { id: 'review-module', version: '0.11.0', status: 'DRAFT', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }
    const doc = { id: 'review-module', organizationId: 'org', occupationIds: ['occ'], createdBy: 'expert-a', createdAt: '2026-10-28T00:00:00Z', lockVersion: 2, everReleased: false, archived: false, releasedRevision: null, history: [], revisions: [{ number: 1, state: 'SUBMITTED', editedBy: 'expert-a', editedAt: '2026-10-28T00:00:00Z', decidedBy: null, decidedAt: null, feedback: null, payload: { metadata, title: 'Submitted lesson', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'module-content:content', contentType: 'text/markdown', contentVersion: '1.0', duration: 30, price: 100000, teachings: [], content } }] }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      const url = String(path)
      if (url.endsWith('/session')) return Response.json({ id: 'reviewer', organizationId: 'org', roles: ['LD_MANAGER'] })
      if (url.endsWith('/grants') || url.endsWith('/catalog/Expert')) return Response.json([])
      if (url.includes('/modules?')) return Response.json({ items: [doc], total: 1, page: 1, pageSize: 10 })
      if (url.includes('/module-list?')) return Response.json({ items: [{ module: doc.revisions[0].payload, authoring: doc }], total: 1, page: 1, pageSize: 10 })
      if (url.endsWith('/modules/review-module')) return Response.json(doc)
      return original(path, init)
    })
    const view = (mode: 'modules' | 'content' | 'approvals') => <><LocationProbe /><ModuleManagementWorkspace mode={mode} /></>
    render(<MemoryRouter initialEntries={['/ld-manager/approvals']}><Routes>
      <Route path="/ld-manager/approvals" element={view('approvals')} />
      <Route path="/ld-manager/modules" element={view('modules')} />
      <Route path="/ld-manager/learning-content" element={view('content')} />
    </Routes></MemoryRouter>)
    const nav = await screen.findByRole('navigation', { name: 'Learning workspace' })
    expect(within(nav).getByRole('link', { name: 'Modules' }).getAttribute('href')).toBe('/ld-manager/modules')
    expect(within(nav).getByRole('link', { name: 'Learning content' }).getAttribute('href')).toBe('/ld-manager/learning-content')
    fireEvent.click(within(nav).getByRole('link', { name: 'Modules' }))
    expect(await screen.findByRole('heading', { name: 'Learning modules' })).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/modules')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve and release' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Details & history' }))
    const dialog = await screen.findByRole('dialog', { name: 'Module details' })
    expect(within(dialog).getByText(/Created by: expert-a/)).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/modules')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    fireEvent.click(screen.getByRole('link', { name: 'Learning content' }))
    expect(await screen.findByRole('heading', { name: 'Learning content' })).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/learning-content')
    expect(screen.queryByRole('button', { name: 'Create content' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Approvals & assignments' }))
    expect(await screen.findByRole('heading', { name: 'Learning approvals' })).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/approvals')
  })
  it('requires an explicit manager assignment before intake and retains errors for retry', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const module = { metadata: { id: 'imported', version: '0.11.0', status: 'ACTIVE', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }, title: 'Imported lesson', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'content/modules/lesson.md', contentType: 'text/markdown', contentVersion: '1.0', duration: 30, price: 100000, teachings: [] }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      const url = String(path)
      if (url.endsWith('/session')) return Response.json({ id: 'reviewer', organizationId: 'org', roles: ['LD_MANAGER'] })
      if (url.endsWith('/grants') || url.endsWith('/catalog/Expert')) return Response.json([])
      if (url.includes('/module-list?')) return Response.json({ items: [{ module, authoring: null, intake: null }], total: 1, page: 1, pageSize: 10 })
      if (url.endsWith('/assignment')) return Response.json({ message: 'Assignment changed. Reload the catalog.' }, { status: 409 })
      return original(path, init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Assign for intake' }))
    let dialog = screen.getByRole('dialog', { name: 'Assign for intake' })
    expect(within(dialog).getByLabelText('Responsible occupations').hasAttribute('required')).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Assign for intake' }))
    dialog = screen.getByRole('dialog', { name: 'Assign for intake' })
    fireEvent.change(within(dialog).getByLabelText('Responsible occupations'), { target: { value: 'occ' } })
    fireEvent.submit(within(dialog).getByRole('button', { name: /^Assign$/ }).closest('form')!)
    expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', 'Assignment changed. Reload the catalog.')
    const request = vi.mocked(fetch).mock.calls.find(([path]) => String(path).endsWith('/assignment'))
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ occupationIds: ['occ'], expectedAssignedAt: null })
    expect(screen.queryByRole('button', { name: 'Approve and release' })).toBeNull()
  })
  it('loads real scoped choices and provides a useful empty state', async () => {
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>); await signIn()
    expect(await screen.findByText(/No modules match this view/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open Content Studio' })).toBeTruthy()
    const request = vi.mocked(fetch).mock.calls.find(([path]) => String(path).endsWith('/catalog/Occupation'))
    expect(new Headers(request?.[1]?.headers).has('Authorization')).toBe(false)
    expect(request?.[1]?.credentials).toBe('same-origin')
    expect(screen.queryByLabelText('Password')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
  })
  it('renders the Neo4j catalog, complete details and missing history without granting edit actions', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const metadata = { id: 'MOD-NEO', version: '0.11.0', status: 'ACTIVE', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      if (String(path).includes('/module-list?')) return Response.json({ items: [{ module: { metadata, title: 'Existing Neo4j lesson', moduleType: 'RESOURCE_GUIDED_PRACTICE', contentUri: 'https://example.org/lesson.md', contentType: 'text/markdown', contentVersion: '1.3', duration: 37, price: 123456, teachings: [{ metadata: { ...metadata, id: 'EDGE-NEO' }, skillId: 'skill', skillName: 'SQL', teachingFocus: 'PRIMARY', difficultyLevel: 'MEDIUM' }] }, authoring: null }], total: 1, page: 1, pageSize: 10 })
      return original(path, init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Existing Neo4j lesson' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Edit$/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Details & history' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^View module$/ }))
    const dialog = screen.getByRole('dialog', { name: 'Catalog module details' })
    expect(within(dialog).getByText('No edit history has been recorded for this module.')).toBeTruthy()
    expect(within(dialog).getByText('https://example.org/lesson.md')).toBeTruthy()
    expect(within(dialog).getByText('1.3')).toBeTruthy()
    expect(within(dialog).getByText('37')).toBeTruthy()
    expect(within(dialog).getByText('123,456')).toBeTruthy()
    expect(within(dialog).getByText('EDGE-NEO')).toBeTruthy()
    expect(within(dialog).getByText('Medium')).toBeTruthy()
    expect(within(dialog).queryByText(/Revision 1/)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.change(screen.getByLabelText('Search name or ID'), { target: { value: 'SQL' } })
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([path]) => String(path).includes('/module-list?search=SQL'))).toBe(true))
  })
  it('rejects missing primary before mutation and retains fields when the server rejects a write', async () => {
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>); await signIn()
    fireEvent.click(screen.getByRole('button', { name: 'Create module' }))
    const dialog = screen.getByRole('dialog', { name: 'Module editor' })
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'SQL practice' } })
    const occupationSelect = within(dialog).getByLabelText(/Occupations/) as HTMLSelectElement
    occupationSelect.options[0].selected = true; fireEvent.change(occupationSelect)
    fireEvent.change(within(dialog).getByLabelText('Learning content'), { target: { value: 'content' } })
    fireEvent.submit(dialog.querySelector('form')!)
    expect(await within(dialog).findByText('Choose exactly one primary skill.')).toBeTruthy(); expect(saved).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add skill' }))
    fireEvent.change(within(dialog).getByLabelText('Skill'), { target: { value: 'skill' } })
    fireEvent.submit(dialog.querySelector('form')!)
    await waitFor(() => expect(saved).not.toBeNull())
    expect(await within(dialog).findByText(/Module changed/)).toBeTruthy()
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe('SQL practice')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('never renders raw HTML or javascript links as executable content', () => {
    const { container } = render(<ModuleMarkdown markdown={'# Title\n<script>alert(1)</script>\n[x](javascript:alert(1))\n[video](https://example.org/video.mp4)'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('video')?.getAttribute('src')).toBe('https://example.org/video.mp4')
    fireEvent.error(container.querySelector('video')!)
    expect(screen.getByRole('link', { name: /Video unavailable/ })).toBeTruthy()
  })
  it('offers the main login and retry when the shared session is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 401 }))
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    expect(await screen.findByRole('button', { name: 'Go to login' })).toBeTruthy()
    expect(screen.queryByLabelText('Password')).toBeNull()
    vi.mocked(fetch).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
  it('surfaces HTTP errors instead of falling back to mock data', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ message: 'Permission revoked' }, { status: 403 }))
    await expect(moduleRequest('/modules')).rejects.toThrow('Permission revoked')
  })
})
