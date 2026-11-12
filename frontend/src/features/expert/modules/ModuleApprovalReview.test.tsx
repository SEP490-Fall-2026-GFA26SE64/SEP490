import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ModuleDocument } from '../../../shared/api/moduleAuthoringApi'
import { approvalRequest, releasedComparison } from './moduleApprovalPresentation'
import { ModuleApprovalReview } from './ModuleApprovalReview'
vi.mock('../../../shared/i18n/LanguageContext',()=>({useTranslation:()=>({language:'en'})}))
afterEach(cleanup)
function document(): ModuleDocument {
 const metadata={id:'module',version:'1',status:'DRAFT',reviewStatus:'NEEDS_EXPERT_REVIEW',reviewedBy:null,reviewedAt:null}
 const payload={metadata,title:'Released title',moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:one',contentType:'text/markdown',contentVersion:'1',duration:15,teachings:[],knowledgeLevel:'FOUNDATION',skillVersion:'1',content:{id:'one',title:'Text',markdown:'',lessons:[],contentType:'text/markdown',contentVersion:'1',jobPositionIds:[],createdBy:'owner',createdAt:'2026-11-01T00:00:00Z'}}
 return {id:'module',organizationId:'org',jobPositionIds:[],createdBy:'owner',createdAt:'2026-11-01T00:00:00Z',lockVersion:3,everReleased:true,archived:false,releasedRevision:1,revisions:[{number:1,state:'RELEASED',payload,editedBy:'editor',editedAt:'2026-11-01T00:00:00Z',decidedBy:'reviewer',decidedAt:'2026-11-02T00:00:00Z',feedback:null},{number:2,state:'SUBMITTED',payload:{...payload,title:'Requested title',duration:25},editedBy:'editor',editedAt:'2026-11-03T00:00:00Z',decidedBy:null,decidedAt:null,feedback:null}],history:[{sequence:1,revision:1,action:'SUBMIT',actorId:'old-sender',occurredAt:'2026-11-01T00:00:00Z',detail:null},{sequence:2,revision:2,action:'SUBMIT',actorId:'sender',occurredAt:'2026-11-04T00:00:00Z',detail:null}]}
}
it('uses the request event of the exact current revision, never the creator or edit date',()=>{
 const doc=document(), request=approvalRequest(doc)
 expect(request.event?.actorId).toBe('sender');expect(request.event?.occurredAt).toBe('2026-11-04T00:00:00Z')
 doc.history=doc.history.filter(event=>event.revision!==2)
 expect(approvalRequest(doc).event).toBeUndefined()
})
it.each(['ARCHIVE_REQUESTED','ARCHIVE_PENDING'])('identifies %s using archive request events rather than submission',state=>{
 const doc=document();doc.revisions[1].state=state
 doc.history.push({sequence:3,revision:2,action:state==='ARCHIVE_PENDING'?'REQUEST-ARCHIVE':'REQUEST_ARCHIVE',actorId:'archive-sender',occurredAt:'2026-11-05T00:00:00Z',detail:'Reason'})
 expect(approvalRequest(doc)).toMatchObject({archive:true,retry:state==='ARCHIVE_PENDING',event:{actorId:'archive-sender'}})
})
it('only compares an actually retained released revision',()=>{
 const doc=document();expect(releasedComparison(doc)?.number).toBe(1)
 doc.releasedRevision=99;expect(releasedComparison(doc)).toBeNull()
 doc.releasedRevision=null;expect(releasedComparison(doc)).toBeNull()
})
it('keeps current content separate from historical comparison and recorded snapshots',()=>{
 const doc=document(), person=(id:string|null|undefined)=>id??'—'
 doc.revisions[1].feedback='Previously recorded feedback'
 render(<ModuleApprovalReview doc={doc} staff={[]} person={person} formatTime={person} labels={{FOUNDATION:'Foundation'}} history={<p>Actual recorded timeline</p>} copy={en=>en} />)
 const overview=screen.getByRole('region',{name:'Request overview'})
 expect(within(overview).getByText('sender')).toBeTruthy();expect(within(overview).getByText('owner')).toBeTruthy()
 expect(within(overview).getByText('editor')).toBeTruthy()
 expect(screen.getByText('Previously recorded feedback')).toBeTruthy()
 expect(screen.queryByText('Released title')).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'History & comparison'}))
 expect(screen.getByText('Released title')).toBeTruthy();expect(screen.getByText('Requested title')).toBeTruthy()
 expect(screen.getByText('Actual recorded timeline')).toBeTruthy()
 expect(screen.getByRole('button',{name:'View released content snapshot'})).toBeTruthy()
})
it('states absent released snapshots without fabricating one',()=>{
 const doc=document();doc.releasedRevision=99
 render(<ModuleApprovalReview doc={doc} staff={[]} person={id=>id??'—'} formatTime={date=>date??'—'} labels={{}} history={null} copy={en=>en}/>)
 fireEvent.click(screen.getByRole('tab',{name:'History & comparison'}))
 expect(screen.getByText('The released revision snapshot is unavailable.')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'View released content snapshot'})).toBeNull()
})
