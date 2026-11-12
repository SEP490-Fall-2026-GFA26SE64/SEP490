import {expect,it} from 'vitest'
import type {ModuleCatalogItem} from '../../../shared/api/moduleAuthoringApi'
import {publishedModuleRevision} from './publishedModulePresentation'
function item():ModuleCatalogItem {
 const metadata={id:'module',version:'1',status:'ACTIVE',reviewStatus:'APPROVED',reviewedBy:null,reviewedAt:null}
 const module={metadata,title:'Published',moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:old',contentType:'text/markdown',contentVersion:'1',duration:30,teachings:[],knowledgeLevel:null,skillVersion:null}
 const payload={...module,content:{id:'old',title:'Published content',markdown:'Published text',contentType:'text/markdown',contentVersion:'1',createdBy:null,createdAt:'2026-11-01T00:00:00Z',jobPositionIds:[]}}
 return {module,authoring:{id:'module',organizationId:'org',createdBy:null,createdAt:'2026-11-01T00:00:00Z',jobPositionIds:[],lockVersion:3,everReleased:true,archived:false,releasedRevision:1,history:[],revisions:[{number:1,state:'RELEASED',payload,editedBy:'expert',editedAt:'2026-11-01T00:00:00Z',decidedBy:null,decidedAt:null,feedback:null},{number:2,state:'SUBMITTED',payload:{...payload,title:'Pending revision',contentUri:'module-content:new',contentVersion:'2',content:{...payload.content,id:'new',markdown:'Unapproved text'}},editedBy:'expert',editedAt:'2026-11-02T00:00:00Z',decidedBy:null,decidedAt:null,feedback:null}]}}
}
it('returns the catalog-matched retained release even with a newer pending revision',()=>{expect(publishedModuleRevision(item())?.payload.content.markdown).toBe('Published text')})
it('never substitutes latest draft content when the release is missing or mismatched',()=>{
 const row=item();row.authoring!.releasedRevision=99;expect(publishedModuleRevision(row)).toBeNull()
 row.authoring!.releasedRevision=1;row.module.contentVersion='other';expect(publishedModuleRevision(row)).toBeNull()
 row.module.contentVersion='1';row.module.contentUri='different';expect(publishedModuleRevision(row)).toBeNull()
})
it('does not infer released content for unapproved or unreceived catalog entries',()=>{
 const row=item();row.module.metadata.reviewStatus='NEEDS_EXPERT_REVIEW';expect(publishedModuleRevision(row)).toBeNull()
 row.module.metadata.reviewStatus='APPROVED';row.authoring=null;expect(publishedModuleRevision(row)).toBeNull()
})
