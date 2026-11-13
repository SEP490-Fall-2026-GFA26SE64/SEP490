import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ModuleManagementWorkspace } from './ModuleManagementWorkspace'
import { ModuleMarkdown } from '../../../shared/components/ui/ModuleMarkdown'
import { moduleRequest } from '../../../shared/api/moduleAuthoringApi'

vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const jobPosition = { id: 'occ', name: 'Software Developers' }
const content = { id: 'content', title: 'Lesson', markdown: '# Learn', jobPositionIds: ['occ'], createdBy: 'expert-a', createdAt: '2026-10-28T00:00:00Z', contentType: 'text/markdown', contentVersion: '1.0' }
function LocationProbe() { return <output aria-label="Current route">{useLocation().pathname}</output> }
let saved: unknown
beforeEach(() => {
  saved = null
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path.endsWith('/workspace-auth/csrf')) return Response.json({ headerName: 'X-CSRF-TOKEN', token: 'module-test-csrf' })
    if (path.endsWith('/session')) return Response.json({ id: 'expert-a', organizationId: 'org', roles: ['EXPERT'] })
    if (path.includes('/modules?') || path.includes('/module-list?')) return Response.json({ items: [], total: 0, page: 1, pageSize: 10 })
    if (path.endsWith('/catalog/Staff')) return Response.json([{ id: 'expert-a', name: 'expert-a' }])
    if (path.endsWith('/catalog/JobPosition')) return Response.json([])
    if (path.endsWith('/catalog/ModuleSkill')) return Response.json([{ id: 'skill', name: 'SQL' }])
    if (path.endsWith('/catalog/MicroSkill')) return Response.json([{ id: 'skill', name: 'SQL' }])
    if (path.endsWith('/contents')) return Response.json([content])
    if (path.endsWith('/contents/lessons') && init?.method === 'POST') return Response.json(content)
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
    const reviewContent = { ...content, lessons: [
      { id: 'one', title: 'Introduction', type: 'TEXT', body: '<p>First review body</p>', bodyFormat: 'HTML', durationSeconds: 60 },
      { id: 'two', title: 'Practice video', type: 'VIDEO', videoSource: 'UPLOAD', assetId: 'asset', durationSeconds: 120 },
      { id: 'three', title: 'Summary', type: 'TEXT', body: '<p>Last review body</p>', bodyFormat: 'HTML', durationSeconds: 180 },
    ] }
    const metadata = { id: 'review-module', version: '0.11.0', status: 'DRAFT', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }
    const doc = { id: 'review-module', organizationId: 'org', jobPositionIds: ['occ'], createdBy: 'expert-a', createdAt: '2026-10-28T00:00:00Z', lockVersion: 2, everReleased: false, archived: false, releasedRevision: null, history: [], revisions: [{ number: 1, state: 'SUBMITTED', editedBy: 'expert-a', editedAt: '2026-10-28T00:00:00Z', decidedBy: null, decidedAt: null, feedback: null, payload: { metadata, title: 'Submitted lesson', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'module-content:content', contentType: 'text/markdown', contentVersion: '1.0', duration: 30, price: 100000, teachings: [], content: reviewContent } }] }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      const url = String(path)
      if (url.endsWith('/text/preview')) return Response.json({ html: (JSON.parse(String(init?.body)) as { body: string }).body })
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
    expect(within(nav).queryByRole('link', { name: 'Learning content' })).toBeNull()
    fireEvent.click(within(nav).getByRole('link', { name: 'Modules' }))
    expect(await screen.findByRole('heading', { name: 'Learning Content' })).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/modules')
    await screen.findByRole('button', { name: 'View module' })
    expect(screen.queryByRole('button', { name: 'Approve and release' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Actions for review-module' })); fireEvent.click(screen.getByRole('button', { name: 'Details & history' }))
    const dialog = await screen.findByRole('dialog', { name: 'Module details' })
    for (const label of ['Lesson 1: Introduction', 'Lesson 2: Practice video', 'Lesson 3: Summary']) expect(within(dialog).getByRole('region', { name: label })).toBeTruthy()
    expect(within(dialog).queryByText('Preview this content version')).toBeNull()
    expect(within(dialog).getByText(/Created by \/ Responsible Expert: expert-a/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('tab', { name: 'View as learner' }))
    expect(await within(dialog).findByText('First review body')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next lesson' }))
    expect(dialog.querySelector('video')?.getAttribute('src')).toContain('/assets/asset')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next lesson' }))
    expect(await within(dialog).findByText('Last review body')).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/modules')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    fireEvent.change(screen.getByLabelText('Show modules'), {target:{value:'all'}})
    fireEvent.change(screen.getByLabelText('Lifecycle'), { target: { value: 'ACTIVE' } })
    fireEvent.click(screen.getByRole('link', { name: 'Approvals' }))
    expect(await screen.findByRole('heading', { name: 'Learning Content' })).toBeTruthy()
    expect(screen.getByLabelText('Current route').textContent).toBe('/ld-manager/approvals')
    fireEvent.click(await screen.findByRole('button', { name: 'Review request' })); expect(await screen.findByRole('button', { name: 'Approve and release' })).toBeTruthy()
    expect(vi.mocked(fetch).mock.calls.some(([path]) => String(path).includes('pendingOnly=true'))).toBe(true)
    const queue = vi.mocked(fetch).mock.calls.find(([path]) => String(path).includes('pendingOnly=true'))
    expect(new URL(String(queue?.[0]), 'http://test').searchParams.get('status')).toBe('')
    expect(screen.queryByLabelText('Lifecycle')).toBeNull()
    expect(screen.queryByText('Catalog intake permissions')).toBeNull()
  })
  it('shows another Expert module and history without edit, submit or delete controls', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const metadata = { id: 'read-only', version: '0.11.0', status: 'DRAFT', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }
    const doc = { id: 'read-only', organizationId: 'org', jobPositionIds: ['occ'], createdBy: 'expert-b', createdAt: '2026-10-28T00:00:00Z', lockVersion: 1, everReleased: false, archived: false, releasedRevision: null, history: [], revisions: [{ number: 1, state: 'DRAFT', editedBy: 'expert-b', editedAt: '2026-10-28T00:00:00Z', decidedBy: null, decidedAt: null, feedback: null, payload: { metadata, title: 'Another Expert lesson', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'module-content:content', contentType: 'text/markdown', contentVersion: '1.0', duration: 30, price: 100000, teachings: [], content } }] }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      if (String(path).includes('/module-list?')) return Response.json({ items: [{ module: doc.revisions[0].payload, authoring: doc }], total: 1, page: 1, pageSize: 10 })
      return original(path, init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    await screen.findByRole('button', { name: 'View module' })
    fireEvent.click(screen.getByRole('button', { name: 'Actions for read-only' })); expect(screen.getByRole('button', { name: 'Details & history' })).toBeTruthy()
    for (const name of ['Edit', 'Submit for review', 'Delete draft']) expect(screen.queryByRole('button', { name })).toBeNull()
  })
  it('requires an explicit manager assignment before intake and retains errors for retry', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const module = { metadata: { id: 'imported', version: '0.11.0', status: 'ACTIVE', reviewStatus: 'NEEDS_EXPERT_REVIEW', reviewedBy: null, reviewedAt: null }, title: 'Imported lesson', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'content/modules/lesson.md', contentType: 'text/markdown', contentVersion: '1.0', duration: 30, price: 100000, teachings: [] }
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      const url = String(path)
      if (url.endsWith('/session')) return Response.json({ id: 'reviewer', organizationId: 'org', roles: ['LD_MANAGER'] })
      if (url.endsWith('/catalog/Expert')) return Response.json([{ id: 'expert-a', name: 'Expert A' }])
      if (url.endsWith('/catalog/JobPosition')) return Response.json([jobPosition])
      if (url.endsWith('/grants')) return Response.json([])
      if (url.includes('/module-list?')) return Response.json({ items: [{ module, authoring: null, intake: null }], total: 1, page: 1, pageSize: 10 })
      if (url.endsWith('/assignment')) return Response.json({ message: 'Assignment changed. Reload the catalog.' }, { status: 409 })
      return original(path, init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'View module' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Assign for intake' }))
    let dialog = screen.getByRole('dialog', { name: 'Assign for intake' })
    await within(dialog).findByRole('option', { name: 'Software Developers' })
    expect(within(dialog).getByLabelText('Related job positions').hasAttribute('required')).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View module' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assign for intake' }))
    dialog = screen.getByRole('dialog', { name: 'Assign for intake' })
    await within(dialog).findByRole('option', { name: 'Expert A' })
    fireEvent.change(within(dialog).getByLabelText('Responsible Expert'), { target: { value: 'expert-a' } })
    fireEvent.change(within(dialog).getByLabelText('Related job positions'), { target: { value: 'occ' } })
    fireEvent.submit(within(dialog).getByRole('button', { name: /^Assign$/ }).closest('form')!)
    expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', 'Assignment changed. Reload the catalog.')
    const request = vi.mocked(fetch).mock.calls.find(([path]) => String(path).endsWith('/assignment'))
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ expertId: 'expert-a', jobPositionIds: ['occ'], expectedAssignedAt: null })
    expect(screen.queryByRole('button', { name: 'Approve and release' })).toBeNull()
  })
  it('loads real scoped choices and provides a useful empty state', async () => {
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>); await signIn()
    expect(await screen.findByText(/No modules match this view/)).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Learning workspace' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Content Studio/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Create module' })).toBeTruthy()
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([path]) => String(path).endsWith('/catalog/MicroSkill'))).toBe(true))
    const request = vi.mocked(fetch).mock.calls.find(([path]) => String(path).endsWith('/catalog/MicroSkill'))
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
    fireEvent.click(within(dialog).getByRole('button', { name: 'Technical metadata' })); expect(within(dialog).getByText('https://example.org/lesson.md')).toBeTruthy()
    expect(within(dialog).getByText('1.3')).toBeTruthy()
    expect(within(dialog).getByText('37')).toBeTruthy()
    expect(within(dialog).queryByText('123,456')).toBeNull()
    expect(within(dialog).getByText('EDGE-NEO')).toBeTruthy()
    expect(within(dialog).queryByText('Medium')).toBeNull()
    expect(within(dialog).queryByText(/Revision 1/)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.change(screen.getByLabelText('Search name or ID'), { target: { value: 'SQL' } })
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([path]) => String(path).includes('/module-list?search=SQL'))).toBe(true))
  })
  it('rejects missing skill before mutation and retains fields when the server rejects a write', async () => {
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>); await signIn()
    fireEvent.click(screen.getByRole('button', { name: 'Create module' }))
    expect(screen.queryByLabelText(/Copy lessons from existing content/)).toBeNull()
    const dialog = screen.getByRole('dialog', { name: 'Module editor' })
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'SQL practice' } })
    expect(within(dialog).queryByLabelText(/JobPositions/)).toBeNull()
    expect(within(dialog).getByLabelText('Lesson title')).toBeTruthy()
    fireEvent.submit(dialog.querySelector('form')!)
    expect(await within(dialog).findByText('Choose exactly one skill.')).toBeTruthy(); expect(saved).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Skill'), { target: { value: 'skill' } })
    fireEvent.submit(dialog.querySelector('form')!)
    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved).not.toHaveProperty('jobPositionIds')
    expect(await within(dialog).findByText(/Module changed/)).toBeTruthy()
    expect((within(dialog).getByLabelText('Title') as HTMLInputElement).value).toBe('SQL practice')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('saves the ordered lesson package before creating a draft without submitting it', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      if (String(path).endsWith('/modules') && init?.method === 'POST') { saved = JSON.parse(String(init.body)); return Response.json({ id: 'new-draft' }) }
      return original(path, init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>); await signIn()
    fireEvent.click(screen.getByRole('button', { name: 'Create module' }))
    const dialog = screen.getByRole('dialog', { name: 'Module editor' })
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Saved SQL draft' } })
    fireEvent.change(within(dialog).getByLabelText('Skill'), { target: { value: 'skill' } })
    fireEvent.change(within(dialog).getByLabelText('Knowledge level'), { target: { value: 'FOUNDATION' } })
    fireEvent.submit(dialog.querySelector('form')!)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Module editor' })).toBeNull())
    expect(saved).toMatchObject({title:'Saved SQL draft',contentId:'content',knowledgeLevel:'FOUNDATION',teachings:[{skillId:'skill'}]})
    const calls = vi.mocked(fetch).mock.calls
    const contentIndex = calls.findIndex(([path, init]) => String(path).endsWith('/contents/lessons') && init?.method === 'POST')
    const saveIndex = calls.findIndex(([path, init]) => String(path).endsWith('/modules') && init?.method === 'POST')
    expect(contentIndex).toBeGreaterThan(-1); expect(saveIndex).toBeGreaterThan(contentIndex)
    expect(JSON.parse(String(calls[contentIndex][1]?.body)).lessons).toHaveLength(1)
    expect(calls.some(([path]) => String(path).endsWith('/actions'))).toBe(false)
  })
  it('does not label a failed approval-queue load as an empty queue', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementation(async (path, init) => {
      if (String(path).endsWith('/session')) return Response.json({ id:'reviewer',organizationId:'org',roles:['LD_MANAGER'] })
      if (String(path).includes('/modules?')) return Response.json({message:'Queue temporarily unavailable'},{status:503})
      return original(path,init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace mode="approvals" /></MemoryRouter>)
    expect(await screen.findByText('Queue temporarily unavailable')).toBeTruthy()
    expect(screen.queryByText('No requests need your attention. New submissions will appear here.')).toBeNull()
  })
  it('defaults manager Modules to server-filtered released catalog and previews the retained release rather than the pending draft', async () => {
    const original = vi.mocked(fetch).getMockImplementation()!
    const metadata={id:'released-module',version:'1',status:'ACTIVE',reviewStatus:'APPROVED',reviewedBy:'reviewer',reviewedAt:'2026-11-01T00:00:00Z'}
    const releasedContent={...content,id:'released-content',markdown:'# Published lesson'}
    const releasedPayload={metadata,title:'Published SQL',moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:released-content',contentType:'text/markdown',contentVersion:'1',duration:30,knowledgeLevel:'FOUNDATION',skillVersion:'1',teachings:[],content:releasedContent}
    const doc={id:metadata.id,organizationId:'org',jobPositionIds:[],createdBy:'expert-a',createdAt:content.createdAt,lockVersion:3,everReleased:true,archived:false,releasedRevision:1,history:[],revisions:[{number:1,state:'RELEASED',payload:releasedPayload,editedBy:'expert-a',editedAt:content.createdAt,decidedBy:'reviewer',decidedAt:metadata.reviewedAt,feedback:null},{number:2,state:'SUBMITTED',payload:{...releasedPayload,title:'Draft SQL',contentUri:'module-content:draft-content',contentVersion:'2',content:{...content,id:'draft-content',markdown:'# Unapproved draft lesson'}},editedBy:'expert-a',editedAt:content.createdAt,decidedBy:null,decidedAt:null,feedback:null}]}
    vi.mocked(fetch).mockImplementation(async(path,init)=>{
      const url=String(path)
      if(url.endsWith('/session'))return Response.json({id:'reviewer',organizationId:'org',roles:['LD_MANAGER']})
      if(url.endsWith('/catalog/Expert'))return Response.json([])
      if(url.includes('/module-list?'))return Response.json({items:[{module:releasedPayload,authoring:doc}],total:1,page:1,pageSize:10})
      return original(path,init)
    })
    render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
    await screen.findByRole('heading',{name:'Published SQL'})
    expect(screen.queryByLabelText('Lifecycle')).toBeNull()
    const queries=()=>vi.mocked(fetch).mock.calls.filter(([path])=>String(path).includes('/module-list?')).map(([path])=>new URL(String(path),'http://test').searchParams)
    expect(queries().at(-1)?.get('status')).toBe('ACTIVE');expect(queries().at(-1)?.get('review')).toBe('APPROVED')
    fireEvent.click(screen.getByRole('button',{name:'View module'}))
    const dialog=screen.getByRole('dialog',{name:'Catalog module details'})
    expect(within(dialog).getByRole('heading',{name:'Published lesson'})).toBeTruthy()
    expect(within(dialog).queryByText('Unapproved draft lesson')).toBeNull()
    expect(within(dialog).getByRole('button',{name:'View working revisions & history'})).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button',{name:'Close'}))
    fireEvent.change(screen.getByLabelText('Show modules'),{target:{value:'all'}})
    await waitFor(()=>expect(queries().at(-1)?.get('review')).toBe(''))
    expect(screen.getByLabelText('Lifecycle')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Clear filters'}))
    await waitFor(()=>expect(queries().at(-1)?.get('review')).toBe('APPROVED'))
    expect((screen.getByLabelText('Show modules') as HTMLSelectElement).value).toBe('published')
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
  it('uses the real workspace CSRF token for mutations', async () => {
    await expect(moduleRequest('/modules', 'POST', { title: 'Protected draft' })).rejects.toThrow(/Module changed/)
    const write = vi.mocked(fetch).mock.calls.find(([path, init]) => String(path).endsWith('/modules') && init?.method === 'POST')
    expect(new Headers(write?.[1]?.headers).get('X-CSRF-TOKEN')).toBe('module-test-csrf')
    expect(write?.[1]?.credentials).toBe('same-origin')
  })
  it('surfaces HTTP errors instead of falling back to mock data', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ message: 'Permission revoked' }, { status: 403 }))
    await expect(moduleRequest('/modules')).rejects.toThrow('Permission revoked')
  })
})
