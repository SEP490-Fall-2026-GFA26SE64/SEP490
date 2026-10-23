import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AdaptiveBaselineRoute } from './AdaptiveBaselinePage'
import { getAdaptiveVersion, type AdaptiveWorkspace } from './adaptiveBaselineApi'
import { boundsDraft } from './adaptiveBaselineDraft'
const mock=vi.hoisted(()=>({ command:vi.fn(), edit:vi.fn(), refresh:vi.fn() }))
vi.mock('./adaptiveBaselineApi',async()=>({...await vi.importActual('./adaptiveBaselineApi'),getAdaptiveVersion:vi.fn()}))
vi.mock('./useAdaptiveBaselineWorkspace',async()=>({...await vi.importActual('./useAdaptiveBaselineWorkspace'),useAdaptiveBaselineWorkspace:()=>state}))
vi.mock('../../../shared/layouts/WorkspaceLayout',()=>({WorkspaceLayout:({children}:{children:React.ReactNode})=><div>{children}</div>}))
vi.mock('../../../shared/i18n/LanguageContext',()=>({useTranslation:()=>({language:'en',t:(key:string)=>key})}))
const current={id:{blueprintId:'blueprint',version:2},configuration:{name:'Active v2',occupationBounds:{maxQuestions:50,timeLimitSeconds:3000}},occupationName:'Fixture',catalogFingerprint:'f1',pins:{modelVersionId:'m1',masteryMappingVersionId:'mm1',parameterSetId:'p1'},roles:{},createdAt:'2026-10-23T00:00:00Z'}
const workspace:AdaptiveWorkspace={occupationId:'occ-a',current,working:{blueprintId:'blueprint',workingRevisionId:'draft-1',revision:1,configuration:{name:'Saved Draft',occupationBounds:{maxQuestions:100,timeLimitSeconds:6600}},updatedAt:'2026-10-23T00:00:00Z',noOp:false},activation:{revision:2,current:current.id,changedAt:'2026-10-23T00:00:00Z'},admissionReadiness:'READY',capacity:{occupationName:'Fixture',catalogFingerprint:'f1',explorationCapacity:135,explorationMissingParameterCount:0,roles:{},occupation:{eligibleCapacity:135,skillCount:15,minimumPerSkill:3,minimumQuestions:45,modelMaxQuestions:4096}}}
const state={workspace,draft:{name:'Saved Draft',occupation:boundsDraft({maxQuestions:100,timeLimitSeconds:6600})},busy:false,pending:false,writeCommitted:false,needsRefresh:false,error:null,preview:null,notice:null,dirty:false,saved:true,legacy:false,canActivate:false,valid:true,command:mock.command,edit:mock.edit,refresh:mock.refresh,test:vi.fn(),retry:vi.fn()}
function Switch(){const go=useNavigate();return <button onClick={()=>go('?draft=draft-1')}>Switch fixture to Draft</button>}
function show(query:string){render(<MemoryRouter initialEntries={['/ld-manager/baseline-assessments/occ-a'+query]}><Switch/><Routes><Route path="/ld-manager/baseline-assessments/:occupationId" element={<AdaptiveBaselineRoute/>}/></Routes></MemoryRouter>)}
beforeEach(()=>{vi.stubEnv('VITE_ADAPTIVE_BASELINE_ENABLED','true');vi.mocked(getAdaptiveVersion).mockResolvedValue({...current,id:{blueprintId:'blueprint',version:1},configuration:{name:'Historical v1',occupationBounds:{maxQuestions:45,timeLimitSeconds:3000}},status:'INACTIVE'})})
afterEach(()=>{cleanup();vi.unstubAllEnvs()})
it('VB02/MM04 identified historical version never borrows Draft/Active values, then Draft restores its own values',async()=>{
 show('?blueprint=blueprint&version=1')
 await waitFor(()=>expect((screen.getByLabelText('adaptiveBaseline.name') as HTMLInputElement).value).toBe('Historical v1'))
 expect((screen.getByLabelText('adaptiveBaseline.maximum') as HTMLInputElement).value).toBe('45')
 expect((screen.getByLabelText('adaptiveBaseline.totalMinutes') as HTMLInputElement).value).toBe('50')
 expect((screen.getByLabelText('adaptiveBaseline.name') as HTMLInputElement).disabled).toBe(true)
 expect(screen.getByText('Active v2 · v2')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Switch fixture to Draft'}))
 expect((screen.getByLabelText('adaptiveBaseline.name') as HTMLInputElement).value).toBe('Saved Draft')
 expect((screen.getByLabelText('adaptiveBaseline.maximum') as HTMLInputElement).value).toBe('100')
 expect((screen.getByLabelText('adaptiveBaseline.totalMinutes') as HTMLInputElement).value).toBe('110')
 expect(mock.command).not.toHaveBeenCalled()
})
it('VB03 stale Draft URL requires reconciliation and disables writes',()=>{
 show('?draft=stale-draft')
 expect(screen.getByText('adaptiveBaseline.refreshRequired')).toBeTruthy()
 expect((screen.getByLabelText('adaptiveBaseline.name') as HTMLInputElement).disabled).toBe(true)
 expect(mock.command).not.toHaveBeenCalled()
})
