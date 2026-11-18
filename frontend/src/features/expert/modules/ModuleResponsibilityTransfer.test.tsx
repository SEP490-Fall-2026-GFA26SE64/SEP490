import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { ModuleManagementWorkspace } from './ModuleManagementWorkspace'
const request = vi.hoisted(() => vi.fn())
vi.mock('../../../shared/api/moduleAuthoringApi', async importOriginal => ({ ...await importOriginal<object>(), moduleRequest: request }))
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({ WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/components/ui/RowActions', () => ({ RowActions: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
const metadata = { id: 'module', version: '0.12.0', status: 'ACTIVE', reviewStatus: 'APPROVED', reviewedBy: null, reviewedAt: null }
function document(): ModuleDocument {
  const content = { id:'content', title:'Lesson', markdown:'Body', contentType:'text/markdown', contentVersion:'1', jobPositionIds:[], createdBy:'creator', createdAt:'2026-11-18T00:00:00Z' }
  return { id:'module', organizationId:'org', jobPositionIds:[], createdBy:'creator', responsibleExpertId:'owner-a', createdAt:content.createdAt, lockVersion:7, everReleased:true, archived:false, releasedRevision:1, history:[], revisions:[{number:1,state:'RELEASED',payload:{metadata,title:'Transferable module',moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:content',contentType:'text/markdown',contentVersion:'1',duration:1,teachings:[],content,knowledgeLevel:null,skillVersion:null},editedBy:'creator',editedAt:content.createdAt,decidedBy:'manager',decidedAt:content.createdAt,feedback:null}] }
}
function setup(role = 'LD_MANAGER', targets = [{id:'owner-a',name:'Expert A'},{id:'owner-b',name:'Expert B'}], conflict = false) {
  let doc = document()
  request.mockImplementation(async (path: string, method = 'GET', body?: {expertId:string; expectedVersion:number}) => {
    if (path === '/session') return {id:role === 'EXPERT'?'owner-a':'manager',organizationId:'org',roles:[role]}
    if (path.startsWith('/module-list?')) return {items:[{module:doc.revisions[0].payload,authoring:doc}],total:1,page:1,pageSize:10}
    if (path === '/catalog/Expert') return targets
    if (path === '/catalog/Staff') return [{id:'creator',name:'Original importer'},...targets]
    if (path === '/modules/module/responsible-expert' && method === 'PUT') {
      if (conflict) throw new Error('Module changed. Reload and review the latest revision')
      doc = {...doc,responsibleExpertId:body!.expertId,lockVersion:8}; return doc
    }
    if (path.startsWith('/catalog/') || path === '/contents') return []
    throw new Error('Unexpected request: '+path)
  })
  render(<MemoryRouter><ModuleManagementWorkspace /></MemoryRouter>)
}
afterEach(() => {cleanup();request.mockReset()})
it('shows current owner and submits only selected target with the current version', async () => {
  setup()
  const row = await screen.findByTestId('module-row')
  expect(within(row).getByText('Expert A')).toBeTruthy()
  expect(within(row).queryByText('Original importer')).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Change responsible person'}))
  const dialog = screen.getByRole('dialog',{name:'Change responsible person'})
  expect((within(dialog).getByRole('button',{name:'Confirm transfer'}) as HTMLButtonElement).disabled).toBe(true)
  const select = within(dialog).getByLabelText('New responsible person')
  expect(within(select).queryByRole('option',{name:'Expert A'})).toBeNull()
  fireEvent.change(select,{target:{value:'owner-b'}})
  fireEvent.click(within(dialog).getByRole('button',{name:'Confirm transfer'}))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/modules/module/responsible-expert','PUT',{expectedVersion:7,expertId:'owner-b'}))
  await waitFor(() => expect(screen.queryByRole('dialog',{name:'Change responsible person'})).toBeNull())
  expect(within(screen.getByTestId('module-row')).getByText('Expert B')).toBeTruthy()
})
it('keeps transfer unavailable when no eligible replacement exists', async () => {
  setup('LD_MANAGER',[{id:'owner-a',name:'Expert A'}])
  fireEvent.click(await screen.findByRole('button',{name:'Change responsible person'}))
  const dialog=screen.getByRole('dialog',{name:'Change responsible person'})
  expect(within(dialog).getByRole('status').textContent).toContain('No other active Expert')
  expect((within(dialog).getByRole('button',{name:'Confirm transfer'}) as HTMLButtonElement).disabled).toBe(true)
})
it('retains dialog and reports stale version without claiming a successful transfer', async () => {
  setup('LD_MANAGER',undefined,true)
  fireEvent.click(await screen.findByRole('button',{name:'Change responsible person'}))
  const dialog=screen.getByRole('dialog',{name:'Change responsible person'})
  fireEvent.change(within(dialog).getByLabelText('New responsible person'),{target:{value:'owner-b'}})
  fireEvent.click(within(dialog).getByRole('button',{name:'Confirm transfer'}))
  expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent','Module changed. Reload and review the latest revision')
  expect(within(screen.getByTestId('module-row')).getByText('Expert A')).toBeTruthy()
})
it('uses current ownership for Expert edit controls and never offers transfer to Experts', async () => {
  setup('EXPERT')
  await screen.findByTestId('module-row')
  expect(screen.getByRole('button',{name:'Edit'})).toBeTruthy()
  expect(screen.queryByRole('button',{name:'Change responsible person'})).toBeNull()
})
