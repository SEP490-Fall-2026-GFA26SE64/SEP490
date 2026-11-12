import {test,expect,type Page} from '@playwright/test'
const api='/api/v1/module-management',base='/workspace/workspace-development/ld-manager'
async function login(page:Page){
 const request=page.context().request,csrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in',{headers:{[csrf.headerName]:csrf.token},data:{email:'manager@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
}
async function setup(page:Page){
 await login(page)
 const metadata={id:'published',version:'1',status:'ACTIVE',reviewStatus:'APPROVED',reviewedBy:'manager' as string|null,reviewedAt:'2026-11-01T00:00:00Z' as string|null}
 const lesson={id:'lesson',title:'Lesson snapshot',type:'TEXT',body:'<p>Released lesson body</p>',bodyFormat:'HTML',durationSeconds:60,durationSource:'MANUAL',videoSource:null,assetId:null,videoUrl:null}
 const oldContent={id:'old-content',title:'Released lessons',markdown:'',contentType:'application/vnd.adapt-learning.lessons+json',contentVersion:'1',jobPositionIds:[],createdBy:'expert',createdAt:'2026-11-01T00:00:00Z',lessons:[lesson]}
 const released={metadata,title:'Released module title',moduleType:'LESSON_AND_PRACTICE',contentUri:'module-content:old-content',contentType:oldContent.contentType,contentVersion:'1',duration:30,knowledgeLevel:'FOUNDATION',skillVersion:'1',teachings:[{metadata:{...metadata,id:'edge'},skillId:'skill',skillName:'Database design'}],content:oldContent}
 const working={...released,metadata:{...metadata,status:'DRAFT',reviewStatus:'NEEDS_EXPERT_REVIEW',reviewedBy:null as string|null,reviewedAt:null as string|null},title:'Proposed module title',contentUri:'module-content:new-content',contentVersion:'2',duration:40,content:{...oldContent,id:'new-content',contentVersion:'2',lessons:[{...lesson,body:'<p>Unapproved proposed lesson body</p>'}]}}
 const doc={id:'published',organizationId:'fixture',jobPositionIds:[],createdBy:'expert',createdAt:'2026-11-01T00:00:00Z',lockVersion:3,everReleased:true,archived:false,releasedRevision:1,history:[{sequence:1,revision:2,action:'SUBMIT',actorId:'expert',occurredAt:'2026-11-02T00:00:00Z',detail:null}],revisions:[{number:1,state:'RELEASED',payload:released,editedBy:'expert',editedAt:'2026-11-01T00:00:00Z',decidedBy:'manager' as string|null,decidedAt:'2026-11-01T00:00:00Z' as string|null,feedback:null as string|null},{number:2,state:'SUBMITTED',payload:working,editedBy:'expert',editedAt:'2026-11-02T00:00:00Z',decidedBy:null as string|null,decidedAt:null as string|null,feedback:null as string|null}]}
 const catalog=(payload:typeof released)=>{const {content,...record}=payload;void content;return record}
 let published=catalog(released)
 const state={queries:[] as URL[],commands:[] as string[],doc,resubmit(){doc.revisions[1].state='SUBMITTED';doc.lockVersion++;doc.history.push({sequence:doc.history.length+1,revision:2,action:'SUBMIT',actorId:'expert',occurredAt:'2026-11-03T00:00:00Z',detail:null})}}
 await page.route('**/api/v1/module-management/**',async route=>{
  const url=new URL(route.request().url()),path=url.pathname
  if(path.endsWith('/session'))return route.fulfill({json:{id:'manager',organizationId:'fixture',roles:['LD_MANAGER']}})
  if(path.endsWith('/catalog/Staff'))return route.fulfill({json:[{id:'expert',name:'Actual Expert'},{id:'manager',name:'L&D Manager'}]})
  if(path.endsWith('/catalog/MicroSkill'))return route.fulfill({json:[{id:'skill',name:'Database design'}]})
  if(path.includes('/catalog/'))return route.fulfill({json:[]})
  if(path.endsWith('/module-list')){
   state.queries.push(url)
   let items=[{module:published,authoring:doc},{module:{...published,metadata:{...metadata,id:'draft-only',status:'DRAFT',reviewStatus:'NEEDS_EXPERT_REVIEW'},title:'Draft only module'},authoring:null}]
   items=items.filter(item=>(!url.searchParams.get('status')||item.module.metadata.status===url.searchParams.get('status'))&&(!url.searchParams.get('review')||item.module.metadata.reviewStatus===url.searchParams.get('review'))&&item.module.title.toLowerCase().includes((url.searchParams.get('search')??'').toLowerCase()))
   return route.fulfill({json:{items,total:items.length,page:1,pageSize:10}})
  }
  if(path.endsWith('/modules')){expect(url.searchParams.get('pendingOnly')).toBe('true');const pending=['SUBMITTED','PUBLISH_PENDING'].includes(doc.revisions[1].state) && doc.revisions[1].payload.title.toLowerCase().includes((url.searchParams.get('search')??'').toLowerCase());return route.fulfill({json:{items:pending?[doc]:[],total:pending?1:0,page:1,pageSize:10}})}
  if(path.endsWith('/text/preview'))return route.fulfill({json:{html:route.request().postDataJSON().body}})
  if(path.endsWith('/modules/published/actions')){
   const command=route.request().postDataJSON();expect(command.expectedVersion).toBe(doc.lockVersion);state.commands.push(command.action)
   if(command.action==='return'){expect(command.feedback.trim()).not.toBe('');doc.revisions[1].state='RETURNED'}
   else if(command.action==='approve'){doc.revisions[1].state='PUBLISH_PENDING';doc.revisions[1].decidedBy='manager';doc.revisions[1].decidedAt='2026-11-03T00:00:00Z'}
   else if(command.action==='retry'){doc.revisions[1].state='RELEASED';doc.releasedRevision=2;doc.revisions[1].payload.metadata={...metadata,reviewedAt:'2026-11-03T00:00:00Z'};published=catalog(doc.revisions[1].payload)}
   else throw new Error('Unexpected decision')
   doc.lockVersion++;return route.fulfill({json:doc})
  }
  if(path.endsWith('/modules/published'))return route.fulfill({json:doc})
  return route.fulfill({status:500,json:{message:'Unexpected fixture request'}})
 })
 return state
}
async function switchTab(page:Page,name:'Modules'|'Approvals'){await page.getByRole('navigation',{name:'Learning workspace'}).getByRole('link',{name,exact:true}).click()}
for(const width of [1440,1280,768,390])test(`L1 unified Learning Content and released snapshots at ${width}px`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});const state=await setup(page)
 await page.goto(base+'/modules',{waitUntil:'domcontentloaded'})
 await expect(page.getByRole('heading',{name:'Learning Content',exact:true})).toBeVisible({timeout:45000})
 await expect(page.getByRole('heading',{name:'Released module title',exact:true})).toBeVisible({timeout:45000})
 expect(state.queries.at(-1)?.searchParams.get('status')).toBe('ACTIVE');expect(state.queries.at(-1)?.searchParams.get('review')).toBe('APPROVED')
 await expect(page.getByRole('heading',{name:'Draft only module',exact:true})).toHaveCount(0)
 if(width>=1280){const sidebar=page.getByRole('link',{name:'Learning Content',exact:true});await expect(sidebar).toHaveAttribute('aria-current','page');await expect(sidebar).toHaveAttribute('href',base+'/approvals')}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('published-modules.png')})
 await page.getByTestId('module-row').getByRole('button',{name:'View module',exact:true}).click()
 const details=page.getByRole('dialog',{name:'Catalog module details',exact:true})
 await expect(details.getByText('Released lesson body',{exact:true})).toBeVisible({timeout:45000})
 await expect(details.getByText('Unapproved proposed lesson body',{exact:true})).toHaveCount(0)
 await details.getByRole('button',{name:'Close',exact:true}).click()
 await page.getByLabel('Show modules',{exact:true}).selectOption('all')
 await expect(page.getByRole('heading',{name:'Draft only module',exact:true})).toBeVisible({timeout:45000})
 expect(state.queries.at(-1)?.searchParams.get('status')).toBe('');expect(state.queries.at(-1)?.searchParams.get('review')).toBe('')
 await page.getByRole('button',{name:'Clear filters',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Draft only module',exact:true})).toHaveCount(0,{timeout:45000})
 await switchTab(page,'Approvals')
 await expect(page.getByRole('heading',{name:'Learning Content',exact:true})).toBeVisible()
 await expect(page.getByTestId('approval-row')).toHaveCount(1,{timeout:45000})
 await page.getByLabel('Search name or ID',{exact:true}).fill('no match')
 await expect(page.getByText('No requests match your filters. Clear filters to see pending requests.',{exact:true})).toBeVisible({timeout:45000})
 await page.getByRole('button',{name:'Clear filters',exact:true}).click()
 await expect(page.getByTestId('approval-row')).toHaveCount(1,{timeout:45000})
 await page.screenshot({path:info.outputPath('approval-queue.png')})
})
test('L1 return, pending publication and confirmed release keep the old catalog until projection succeeds',async({page})=>{
 test.setTimeout(240000);const state=await setup(page);await page.goto(base+'/approvals',{waitUntil:'domcontentloaded'})
 const open=async()=>{await page.getByRole('button',{name:'Review request',exact:true}).click({timeout:45000});return page.getByRole('dialog',{name:'Review module request',exact:true})}
 const decide=async(label:string,feedback?:string)=>{const panel=await open();await panel.getByRole('button',{name:label,exact:true}).click();const dialog=page.getByRole('dialog',{name:label,exact:true});if(feedback)await dialog.getByLabel('Required feedback').fill(feedback);await dialog.getByRole('button',{name:'Confirm',exact:true}).click();await expect(dialog).not.toBeVisible({timeout:45000});await expect(panel).not.toBeVisible()}
 await decide('Return for changes','Clarify the examples.')
 await switchTab(page,'Modules');await expect(page.getByRole('heading',{name:'Released module title',exact:true})).toBeVisible({timeout:45000})
 state.resubmit();await switchTab(page,'Approvals');await decide('Approve and release')
 await switchTab(page,'Modules');await expect(page.getByRole('heading',{name:'Released module title',exact:true})).toBeVisible({timeout:45000})
 await expect(page.getByRole('heading',{name:'Proposed module title',exact:true})).toHaveCount(0)
 await switchTab(page,'Approvals');await decide('Retry publication')
 await switchTab(page,'Modules');await expect(page.getByRole('heading',{name:'Proposed module title',exact:true})).toBeVisible({timeout:45000})
 await page.getByTestId('module-row').getByRole('button',{name:'View module',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Catalog module details',exact:true}).getByText('Unapproved proposed lesson body',{exact:true})).toBeVisible({timeout:45000})
 expect(state.commands).toEqual(['return','approve','retry'])
})
test('L1 real manager published-only read uses server filters and default Learning Content entry',async({page},info)=>{
 test.setTimeout(180000);await login(page)
 const response=await page.context().request.get(api+'/module-list?status=ACTIVE&review=APPROVED&page=1');expect(response.ok()).toBe(true)
 const data=await response.json() as {items:{module:{metadata:{status:string,reviewStatus:string}}}[]}
 for(const item of data.items){expect(item.module.metadata.status).toBe('ACTIVE');expect(item.module.metadata.reviewStatus).toBe('APPROVED')}
 const loaded=page.waitForResponse(response=>new URL(response.url()).pathname===api+'/module-list'&&new URL(response.url()).searchParams.get('review')==='APPROVED'&&response.ok())
 await page.goto(base+'/modules',{waitUntil:'domcontentloaded'});await loaded
 await expect(page.getByRole('status',{name:'Loading learning content',exact:true})).toHaveCount(0,{timeout:45000})
 await expect(page.getByLabel('Show modules',{exact:true})).toHaveValue('published')
 if(data.items.length)await expect(page.getByTestId('module-row')).toHaveCount(data.items.length,{timeout:45000})
 else await expect(page.getByText('No published modules yet. Approved publication requests will appear here after release.',{exact:true})).toBeVisible({timeout:45000})
 await page.getByRole('link',{name:'Learning Content',exact:true}).click()
 await expect(page).toHaveURL(/\/ld-manager\/approvals$/)
 await expect(page.getByRole('heading',{name:'Learning Content',exact:true})).toBeVisible()
 await page.screenshot({path:info.outputPath('real-learning-content.png')})
})
