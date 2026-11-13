import {test,expect,type Page} from '@playwright/test'
const api='/api/v1/module-management'
function document(id:string,state:string) {
 const metadata={id,version:'0.12.0',status:'DRAFT',reviewStatus:'NEEDS_EXPERT_REVIEW',reviewedBy:null,reviewedAt:null}
 const content={id:'content-'+id,title:'Current lesson',markdown:'',contentType:'application/vnd.adapt-learning.lessons+json',contentVersion:'2',jobPositionIds:[],createdBy:'owner',createdAt:'2026-11-01T09:00:00Z',lessons:[{id:'lesson',title:'Recorded lesson',type:'TEXT',body:'<p>'+('Current revision learning content. '.repeat(45))+'</p>',bodyFormat:'HTML',durationSeconds:60,durationSource:'MANUAL',videoSource:null,assetId:null,videoUrl:null}]}
 const payload={metadata,title:'Requested '+id,moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:'+content.id,contentType:content.contentType,contentVersion:'2',duration:30,knowledgeLevel:'FOUNDATION',skillVersion:'0.12.0',teachings:[{metadata:{...metadata,id:'edge-'+id},skillId:'skill',skillName:'Database design'}],content}
 const oldPayload={...payload,title:'Released '+id,duration:15,content:{...content,contentVersion:'1',lessons:[{...content.lessons[0],body:'<p>Recorded released lesson.</p>'}]}}
 return {id,organizationId:'fixture',jobPositionIds:[],createdBy:'owner',createdAt:'2026-11-01T09:00:00Z',lockVersion:3,everReleased:true,archived:false,releasedRevision:1,revisions:[{number:1,state:'RELEASED',payload:oldPayload,editedBy:'owner',editedAt:'2026-11-01T09:00:00Z',decidedBy:'manager',decidedAt:'2026-11-02T09:00:00Z',feedback:null},{number:2,state,payload,editedBy:'editor',editedAt:'2026-11-03T09:00:00Z',decidedBy:null,decidedAt:null,feedback:null}],history:[{sequence:1,revision:2,action:state.startsWith('ARCHIVE')?'REQUEST-ARCHIVE':'SUBMIT',actorId:'sender',occurredAt:'2026-11-04T09:00:00Z',detail:null}]}
}
async function setup(page:Page) {
 const request=page.context().request,csrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in',{headers:{[csrf.headerName]:csrf.token},data:{email:'manager@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
 const docs=[document('publish','SUBMITTED'),document('return','SUBMITTED'),document('archive','ARCHIVE_REQUESTED'),document('retry','PUBLISH_PENDING'),document('archive-retry','ARCHIVE_PENDING')]
 const state={commands:[] as {action:string,feedback:string,expectedVersion:number}[],failReturn:true,queries:[] as string[]}
 await page.route('**/api/v1/module-management/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname
  if(path.endsWith('/session'))return route.fulfill({json:{id:'manager',organizationId:'fixture',roles:['LD_MANAGER']}})
  if(path.endsWith('/catalog/Staff'))return route.fulfill({json:[{id:'owner',name:'Responsible Expert'},{id:'sender',name:'Actual Submitter'},{id:'editor',name:'Last Editor'},{id:'manager',name:'L&D Reviewer'}]})
  if(path.endsWith('/catalog/MicroSkill'))return route.fulfill({json:[{id:'skill',name:'Database design'}]})
  if(path.includes('/catalog/')||path.endsWith('/grants'))return route.fulfill({json:[]})
  if(path.endsWith('/modules')){
   state.queries.push(url.search);expect(url.searchParams.get('pendingOnly')).toBe('true')
   const pending=docs.filter(doc=>['SUBMITTED','ARCHIVE_REQUESTED','PUBLISH_PENDING','ARCHIVE_PENDING'].includes(doc.revisions.at(-1)!.state)).filter(doc=>doc.revisions.at(-1)!.payload.title.toLowerCase().includes((url.searchParams.get('search')??'').toLowerCase()))
   return route.fulfill({json:{items:pending,total:pending.length,page:1,pageSize:10}})
  }
  if(path.endsWith('/text/preview'))return route.fulfill({json:{html:route.request().postDataJSON().body}})
  const doc=docs.find(doc=>path===api+'/modules/'+doc.id || path===api+'/modules/'+doc.id+'/actions')
  if(doc&&path.endsWith('/actions')){
   const command=route.request().postDataJSON();state.commands.push(command);expect(command.expectedVersion).toBe(doc.lockVersion)
   if(command.action==='return'&&state.failReturn){state.failReturn=false;doc.lockVersion++;return route.fulfill({status:409,json:{message:'Module changed. Reload and review.'}})}
   const revision=doc.revisions.at(-1)!
   if(command.action==='return'){expect(command.feedback.trim()).not.toBe('');revision.state='RETURNED'}
   else if(command.action==='approve')revision.state='RELEASED'
   else if(command.action==='approve-archive')revision.state='ARCHIVED'
   else if(command.action==='retry')revision.state=doc.id==='archive-retry'?'ARCHIVED':'RELEASED'
   else throw new Error('Unexpected action')
   doc.lockVersion++;return route.fulfill({json:doc})
  }
  if(doc)return route.fulfill({json:doc})
  return route.fulfill({status:500,json:{message:'Unexpected fixture request'}})
 })
 await page.goto('/workspace/workspace-development/ld-manager/approvals')
 await expect(page.getByTestId('approval-row')).toHaveCount(5,{timeout:45000})
 return state
}
async function open(page:Page,id:string){await page.getByTestId('approval-row').filter({has:page.getByRole('heading',{name:'Requested '+id,exact:true})}).getByRole('button',{name:'Review request',exact:true}).click();const panel=page.getByRole('dialog',{name:'Review module request',exact:true});await expect(panel).toBeVisible({timeout:45000});return panel}
for(const width of [1440,1280,768,390])test(`A1 queue, exact revision, comparison and sticky review actions at ${width}px`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page)
 await expect(page.getByRole('heading',{name:'Learning Content',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Create module',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Import',exact:true})).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('queue.png')})
 const panel=await open(page,'publish'),overview=panel.getByRole('region',{name:'Request overview'})
 await expect(overview.getByText('Actual Submitter',{exact:true})).toBeVisible();await expect(overview.getByText('Responsible Expert',{exact:true})).toHaveCount(2)
 await expect(panel.getByRole('region',{name:'Lesson 1: Recorded lesson'})).toBeVisible()
 await panel.getByRole('tab',{name:'Version history',exact:true}).click()
 await expect(panel.getByRole('definition').filter({hasText:'Released publish'})).toBeVisible()
 await panel.getByRole('button',{name:'View released content snapshot',exact:true}).click()
 await expect(panel.getByText('Recorded released lesson.',{exact:true})).toBeVisible({timeout:45000})
 const approve=panel.getByRole('button',{name:'Approve and release',exact:true});expect((await approve.boundingBox())!.y+(await approve.boundingBox())!.height).toBeLessThanOrEqual(900)
 expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('review-history.png')})
 await panel.getByRole('button',{name:'Close',exact:true}).click()
 expect(errors).toEqual([])
})
test('A1 review actions preserve feedback, conflicts, revision locks and request-state permissions',async({page})=>{
 test.setTimeout(240000);const state=await setup(page)
 const returned=await open(page,'return');await returned.getByRole('button',{name:'Return for changes',exact:true}).click()
 const confirm=page.getByRole('dialog',{name:'Return for changes',exact:true})
 await confirm.getByRole('button',{name:'Confirm',exact:true}).click();expect(state.commands).toHaveLength(0)
 await confirm.getByLabel('Required feedback').fill('Please clarify the lesson.')
 await confirm.getByRole('button',{name:'Confirm',exact:true}).click()
 await expect(confirm.getByRole('alert')).toHaveText('Module changed. Reload and review.',{timeout:45000})
 await expect(confirm.getByLabel('Required feedback')).toHaveValue('Please clarify the lesson.')
 await confirm.getByRole('button',{name:'Cancel',exact:true}).click();await returned.getByRole('button',{name:'Close',exact:true}).click()
 const refreshed=await open(page,'return');await refreshed.getByRole('button',{name:'Return for changes',exact:true}).click()
 const retry=page.getByRole('dialog',{name:'Return for changes',exact:true});await retry.getByLabel('Required feedback').fill('Please clarify the lesson.')
 await retry.getByRole('button',{name:'Confirm',exact:true}).click();await expect(retry).not.toBeVisible({timeout:45000});await expect(refreshed).not.toBeVisible()
 expect(state.commands.at(-1)?.expectedVersion).toBe(4)
 for(const [id,action,label] of [['publish','approve','Approve and release'],['archive','approve-archive','Approve archive'],['retry','retry','Retry publication'],['archive-retry','retry','Retry publication']]){
  const panel=await open(page,id)
  if(id!=='publish')await expect(panel.getByRole('button',{name:'Approve and release',exact:true})).toHaveCount(0)
  if(id==='archive-retry')await expect(panel.getByRole('button',{name:'Return for changes',exact:true})).toHaveCount(0)
  await panel.getByRole('button',{name:label,exact:true}).click()
  const dialog=page.getByRole('dialog',{name:label,exact:true});await dialog.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(dialog).not.toBeVisible({timeout:45000});await expect(panel).not.toBeVisible()
  expect(state.commands.at(-1)?.action).toBe(action)
 }
 await expect(page.getByText('No requests need your attention. New submissions will appear here.',{exact:true})).toBeVisible()
})
test('A1 real manager queue read preserves pending-only scope without deciding user requests',async({page},info)=>{
 test.setTimeout(180000)
 const request=page.context().request,csrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in',{headers:{[csrf.headerName]:csrf.token},data:{email:'manager@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
 const response=await request.get(api+'/modules?pendingOnly=true&page=1');expect(response.ok()).toBe(true)
 const data=await response.json() as {items:ReturnType<typeof document>[]}
 for(const doc of data.items)expect(['SUBMITTED','ARCHIVE_REQUESTED','PUBLISH_PENDING','ARCHIVE_PENDING']).toContain(doc.revisions.at(-1)!.state)
 const loaded=page.waitForResponse(response=>new URL(response.url()).pathname===api+'/modules' && new URL(response.url()).searchParams.get('pendingOnly')==='true' && response.ok())
 await page.goto('/workspace/workspace-development/ld-manager/approvals')
 await loaded
 await expect(page.getByRole('status',{name:'Loading learning content',exact:true})).toHaveCount(0,{timeout:45000})
 await expect(page.getByRole('heading',{name:'Learning Content',exact:true})).toBeVisible({timeout:45000})
 if(data.items.length)await expect(page.getByTestId('approval-row')).toHaveCount(data.items.length,{timeout:45000})
 else await expect(page.getByText('No requests need your attention. New submissions will appear here.',{exact:true})).toBeVisible({timeout:45000})
 await page.screenshot({path:info.outputPath('real-queue-read.png')})
})
