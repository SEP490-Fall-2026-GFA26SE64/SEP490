import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { ModuleManagementWorkspace } from './ModuleManagementWorkspace'
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const metadata = { id: 'MODULE-INTERNAL-ID', version: '0.12.0', status: 'ACTIVE', reviewStatus: 'APPROVED', reviewedBy: null, reviewedAt: null }
const catalogModule = { metadata, title: 'Learn databases', moduleType: 'LESSON_AND_PRACTICE', contentUri: 'content:test', contentType: 'text/markdown', contentVersion: '1', duration: 30, knowledgeLevel: null, outcomeCodes: [], skillVersion: null, teachings: [{ skillId: 'eligible', skillName: 'Approved SQL skill', metadata: {...metadata,id:'EDGE-ID'} }] }
function setup(eligible: {id: string; name: string}[] = [{id: 'eligible', name: 'Approved SQL skill'}], module = catalogModule, authoring: ModuleDocument | null = null) {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = String(input)
    if (path.endsWith('/session')) return Response.json({id: 'expert', organizationId: 'org', roles: ['EXPERT']})
    if (path.includes('/module-list?')) return Response.json({ items: [{module, authoring}], total: 1, page: 1, pageSize: 10 })
    if (path.endsWith('/catalog/ModuleSkill')) return Response.json(eligible)
    if (path.endsWith('/catalog/MicroSkill')) return Response.json([{id: 'eligible', name: 'Approved SQL skill'}, {id: 'pending', name: 'Pending skill'}])
    if (path.endsWith('/contents') || path.includes('/catalog/')) return Response.json([])
    return Response.json({message: 'Unexpected request'}, {status: 500})
  }))
  render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('Module Skill selection and list presentation', () => {
  it('uses eligible editor choices while preserving browse choices and details', async () => {
    setup()
    await screen.findByRole('heading', {name: 'Learn databases'}, {timeout:10000})
    expect(screen.queryByText('MODULE-INTERNAL-ID')).toBeNull()
    expect(screen.getByText('Skill taught: Approved SQL skill')).toBeTruthy()
    expect(within(screen.getByRole('group',{name:'Available skills'})).getByRole('heading',{name:'1'})).toBeTruthy()
    expect(within(screen.getByLabelText('Skill', {exact: true})).getByRole('option', {name:'Pending skill'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: 'View module'}))
    expect(within(screen.getByRole('dialog')).getByText('MODULE-INTERNAL-ID')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name:'Close dialog'}))
    fireEvent.click(screen.getByRole('button', {name:'Create module'}))
    const dialog = screen.getByRole('dialog', {name:'Module editor'})
    const options = within(dialog).getAllByRole('option').map(option => option.textContent)
    expect(options).toContain('Approved SQL skill')
    expect(options).not.toContain('Pending skill')
    expect(within(dialog).getByText('Only active, approved skills in this organization are listed.')).toBeTruthy()
  })
  it('explains empty choices and prevents saving', async () => {
    setup([])
    await screen.findByRole('heading', {name:'Learn databases'}, {timeout:10000})
    expect(within(screen.getByRole('group',{name:'Available skills'})).getByRole('heading',{name:'0'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name:'Create module'}))
    const dialog=screen.getByRole('dialog', {name:'Module editor'})
    expect((within(dialog).getByLabelText('Skill', {exact:true}) as HTMLSelectElement).disabled).toBe(true)
    expect(within(dialog).getByText(/No active, approved skills/).textContent).toContain('No active, approved skills')
    expect((within(dialog).getByRole('button', {name:'Save draft'}) as HTMLButtonElement).disabled).toBe(true)
  })
  it('does not substitute IDs when title or Skill mapping is missing', async () => {
    setup([], {...catalogModule, title:'', teachings:[]})
    expect(await screen.findByRole('heading', {name:'Untitled module'}, {timeout:10000})).toBeTruthy()
    expect(screen.getByText('Skill taught: No skill linked')).toBeTruthy()
    expect(screen.queryByText('MODULE-INTERNAL-ID')).toBeNull()
  })
  it('requires replacing a formerly selected Skill that is no longer eligible when editing', async () => {
    const content = {id:'content',title:'Lesson',markdown:'Body',contentType:'text/markdown',contentVersion:'1',jobPositionIds:[],createdBy:'expert',createdAt:'2026-11-09T00:00:00Z',lessons:[]}
    const payload = {...catalogModule, teachings:[{...catalogModule.teachings[0],skillId:'pending',skillName:'Pending skill'}],content}
    const doc: ModuleDocument = {id:metadata.id,organizationId:'org',jobPositionIds:[],createdBy:'expert',createdAt:'2026-11-09T00:00:00Z',lockVersion:1,everReleased:false,archived:false,releasedRevision:null,history:[],revisions:[{number:1,state:'DRAFT',payload,editedBy:'expert',editedAt:'2026-11-09T00:00:00Z',decidedBy:null,decidedAt:null,feedback:null}]}
    setup(undefined,catalogModule,doc)
    fireEvent.click(await screen.findByRole('button',{name:'Edit'},{timeout:10000}))
    const dialog=screen.getByRole('dialog',{name:'Module editor'})
    expect(within(dialog).getByText(/The selected skill is no longer eligible/)).toBeTruthy()
    expect((within(dialog).getByRole('button',{name:'Save draft'}) as HTMLButtonElement).disabled).toBe(true)
    expect(within(dialog).queryByRole('option',{name:'Pending skill'})).toBeNull()
    fireEvent.change(within(dialog).getByLabelText('Skill',{exact:true}),{target:{value:'eligible'}})
    expect(within(dialog).queryByText(/The selected skill is no longer eligible/)).toBeNull()
  })

})
