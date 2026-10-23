import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
const occ='OCC-15-1212.00'
const root='/api/v1/employee'
const manager='/api/v1/ld/adaptive-baseline-blueprints/occupations/'+occ
type Role={id:string;name:string;occupationId:string}
type Attempt={id:string;revision:number;state:string;deadlineAt:string;items:{position:number;itemVersionId:string;options:{id:string;text:string}[];selectedOptionId:string|null}[]}
async function json<T>(response:APIResponse):Promise<T>{expect(response.status(),await response.text()).toBe(200);return await response.json() as T}
async function persona(request:APIRequestContext,who:string){expect((await request.post('/api/v1/local-baseline-demo/session',{data:{persona:who}})).status()).toBe(204)}
async function choose(request:APIRequestContext,id:string){
 const view=await json<{selection:{selectionId:string}|null}>(await request.get(root+'/target-role-selection'))
 return json(await request.put(root+'/target-role-selection',{headers:{'Idempotency-Key':randomUUID()},data:{roleId:id,expectedCurrentSelectionId:view.selection?.selectionId??null}}))
}
async function roles(request:APIRequestContext){return json<Role[]>(await request.get(root+'/target-roles'))}
async function start(request:APIRequestContext,key=randomUUID()){return json<Attempt>(await request.post(root+'/baseline-attempts',{headers:{'Idempotency-Key':key},data:{entry:'SELECTED_ROLE'}}))}
async function workspace(request:APIRequestContext){return json<{working:null|{workingRevisionId:string;revision:number;configuration:{name:string;occupationBounds:{maxQuestions:number;timeLimitSeconds:number}}};current:null|{id:{blueprintId:string;version:number};configuration:{name:string;occupationBounds:{maxQuestions:number;timeLimitSeconds:number}}};activation:{revision:number;current:{blueprintId:string;version:number}|null}|null}>(await request.get(manager))}
test.beforeAll(async({playwright})=>{
 const request=await playwright.request.newContext({baseURL:'http://127.0.0.1:28088'})
 await persona(request,'ld')
 const before=await workspace(request)
 if (before.current) {
  expect(before.current.configuration).toEqual({name:'C3 isolated baseline v1',occupationBounds:{maxQuestions:45,timeLimitSeconds:3000}})
  expect(before.current.id.version).toBe(1)
  await request.dispose();return // Worker restart: recognize this run's immutable fixture; never reset it.
 }
 expect(before.working).toBeNull()
 const draft=await json<{workingRevisionId:string;revision:number}>(await request.put(manager+'/working',{headers:{'Idempotency-Key':'c3-fixture-save-v1'},data:{expectedRevision:0,expectedWorkingRevisionId:null,configuration:{name:'C3 isolated baseline v1',occupationBounds:{maxQuestions:45,timeLimitSeconds:3000}}}}))
 await json(await request.post(manager+'/finalize',{headers:{'Idempotency-Key':'c3-fixture-activate-v1'},data:{workingRevisionId:draft.workingRevisionId,expectedWorkingRevision:draft.revision,expectedActivationRevision:0,expectedCurrent:null}}))
 await request.dispose()
})
test('RB01/02/MM05 Role-first alias, search, Level detail, keyboard and EN/VI mobile',async({page})=>{
 await persona(page.request,'employee-b')
 await page.goto('/employee/upskilling?tab=roles&search=Security')
 await expect(page).toHaveURL(/employee\/target-roles\?search=Security/)
 await expect(page.getByRole('heading',{name:'Target Roles',exact:true})).toBeVisible()
 const details=page.getByRole('button',{name:'Role requirements',exact:true}).first()
 await expect(details).toBeVisible()
 await details.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('dialog')).toBeVisible()
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'VI',exact:true}).click()
 await expect(page.getByRole('heading',{name:/Vị trí/}).first()).toBeVisible()
 await page.setViewportSize({width:390,height:844})
 const layout=await page.evaluate(()=>({viewport:window.innerWidth,document:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>window.innerWidth).slice(0,15).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,90)}))}))
 await test.info().attach('mobile-layout.json',{body:JSON.stringify(layout,null,2),contentType:'application/json'})
 await page.screenshot({path:test.info().outputPath('roles-mobile-vi.png'),fullPage:true})
 expect(layout.document,JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport)
})
test('VB01/02/03/MM04 version-specific settings, sole Draft, confirmed discard',async({page})=>{
 await persona(page.request,'ld');const before=await workspace(page.request);const id=before.current!.id
 await page.goto('/ld-manager/baseline-assessments/'+occ+'?blueprint='+id.blueprintId+'&version=1')
 await expect(page.getByLabel('Maximum questions',{exact:true})).toHaveValue('45')
 await expect(page.getByLabel('Total duration (minutes)',{exact:true})).toHaveValue('50')
 await page.getByRole('button',{name:'Edit as draft',exact:true}).click()
 await page.getByLabel('Baseline name',{exact:true}).fill('C3 edited Draft')
 await page.getByLabel('Maximum questions',{exact:true}).fill('100')
 await page.getByLabel('Total duration (minutes)',{exact:true}).fill('110')
 await page.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(page).toHaveURL(/draft=/)
 const saved=await workspace(page.request)
 expect(saved.working!.configuration.occupationBounds).toEqual({maxQuestions:100,timeLimitSeconds:6600})
 expect(saved.current).toEqual(before.current)
 await page.getByRole('button',{name:'Create new',exact:true}).click()
 await expect(page.getByText('A draft already exists. Continue editing it, or delete it before creating a new draft.',{exact:true})).toBeVisible()
 expect((await workspace(page.request)).working!.workingRevisionId).toBe(saved.working!.workingRevisionId)
 await page.getByRole('button',{name:'Continue editing draft',exact:true}).click()
 await page.getByRole('button',{name:'Delete draft',exact:true}).click()
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible()
 expect((await workspace(page.request)).working).not.toBeNull()
 await dialog.getByRole('button',{name:'Confirm',exact:true}).click()
 await expect.poll(async()=> (await workspace(page.request)).working).toBeNull()
 expect((await workspace(page.request)).current).toEqual(before.current)
})
test('RB04/09/10/16 empty other-Occupation baseline and actor boundaries',async({page,playwright})=>{
 await persona(page.request,'employee-b')
 const list=await roles(page.request);const other=list.find(r=>r.occupationId!==occ)!
 await choose(page.request,other.id)
 const view=await json<{progress:{state:string}}>(await page.request.get(root+'/target-role-selection'))
 expect(view.progress.state).toBe('NO_BASELINE')
 await page.goto('/employee/target-roles')
 await expect(page.getByText('No baseline configured',{exact:false}).first()).toBeVisible()
 expect(await json(await page.request.get(root+'/baseline-attempts/history'))).toEqual([])
 const denied=await playwright.request.newContext({baseURL:'http://127.0.0.1:28088'})
 await persona(denied,'admin')
 for(const path of ['/target-roles','/target-role-selection','/target-role-selection/mastery'])expect((await denied.get(root+path)).status()).toBe(403)
 expect((await denied.post('/api/v1/local-baseline-demo/session',{data:{persona:'arbitrary-learner'}})).status()).toBe(400)
 await denied.dispose()
})
test('RB13/15/MM05 answer review, early invalidation, no profile and linked replacement',async({page})=>{
 await persona(page.request,'employee-c');const role=(await roles(page.request)).find(r=>r.occupationId===occ)!
 await choose(page.request,role.id);await page.goto('/employee/target-roles')
 await page.getByRole('button',{name:'Take required baseline',exact:true}).click()
 await expect(page).toHaveURL(/baseline-assessment\//)
 const id=page.url().split('/').at(-1)!
 const attempt=await json<Attempt>(await page.request.get(root+'/baseline-attempts/'+id))
 const selection=await json<{selection:{selectionId:string}}>(await page.request.get(root+'/target-role-selection'))
 const another=(await roles(page.request)).find(r=>r.occupationId===occ&&r.id!==role.id)!
 expect((await page.request.put(root+'/target-role-selection',{headers:{'Idempotency-Key':randomUUID()},data:{roleId:another.id,expectedCurrentSelectionId:selection.selection.selectionId}})).status()).toBe(409)
 await page.getByRole('radio').first().check()
 await page.getByRole('button',{name:'Save answer and continue',exact:true}).click()
 await expect.poll(async()=> (await json<Attempt>(await page.request.get(root+'/baseline-attempts/'+id))).revision).toBe(2)
 await page.reload()
 await page.getByRole('button',{name:/Question 1: Answered/}).click()
 await expect(page.getByRole('radio').first()).toBeDisabled()
 expect((await json<Attempt>(await page.request.get(root+'/baseline-attempts/'+id))).deadlineAt).toBe(attempt.deadlineAt)
 await page.getByRole('button',{name:'Submit assessment',exact:true}).click()
 await page.getByRole('button',{name:'Confirm submission',exact:true}).click()
 await expect(page.getByText('This submission did not have enough evidence to calculate mastery. Your profile has not been updated.',{exact:true})).toBeVisible()
 expect(await json(await page.request.get(root+'/target-role-selection/mastery'))).toEqual([])
 const replacement=await start(page.request)
 const result=await json<{state:string;completionReason:string;replacementAttemptId:string}>(await page.request.get(root+'/baseline-attempts/'+id+'/result'))
 expect(result.state).toBe('INVALIDATED');expect(result.completionReason).toBe('MANUAL');expect(result.replacementAttemptId).toBe(replacement.id)
})
test('RB07/14/MM01/03 result/history/profile preserve full scope and sufficient evidence',async({page,playwright})=>{
 await persona(page.request,'employee-a');const role=(await roles(page.request)).find(r=>r.occupationId===occ)!
 await choose(page.request,role.id);let attempt=await start(page.request)
 for(let i=0;i<45&&attempt.state==='IN_PROGRESS';i++){
  const item=attempt.items.at(-1)!
  attempt=await json<Attempt>(await page.request.post(root+'/baseline-attempts/'+attempt.id+'/answers',{headers:{'Idempotency-Key':'c3-answer-'+i},data:{expectedRevision:attempt.revision,position:item.position,itemVersionId:item.itemVersionId,selectedOptionId:item.options[0].id}}))
 }
 expect(attempt.state).toBe('AUTO_SUBMITTED')
 const result=await json<{skills:{microSkillId:string;microSkillName:string;mastery:number;confidence:string}[]}>(await page.request.get(root+'/baseline-attempts/'+attempt.id+'/result'))
 const profiles=await json<{attemptId:string;baselineVersion:number;skills:{id:string;name:string;mastery:number;confidence:string}[]}[]>(await page.request.get(root+'/target-role-selection/mastery'))
 expect(result.skills).toHaveLength(15);expect(profiles).toHaveLength(1);expect(profiles[0].baselineVersion).toBe(1)
 expect(profiles[0].skills).toEqual(result.skills.map(s=>({id:s.microSkillId,name:s.microSkillName,mastery:s.mastery,confidence:s.confidence})))
 const safe=JSON.stringify(result);expect(safe).not.toMatch(/protectedKey|correctOptionId|rationale|standardError|theta/)
 await page.goto('/employee/my-mastery');await expect(page.getByRole('progressbar')).toHaveCount(15)
 await page.getByRole('button',{name:'Understanding mastery and confidence'}).click()
 await expect(page.getByText('This view currently shows mastery recorded from baseline. Module activity is not yet connected to update this profile. The original baseline result remains unchanged.',{exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 const foreign=await playwright.request.newContext({baseURL:'http://127.0.0.1:28088'});await persona(foreign,'employee-b')
 expect((await foreign.get(root+'/baseline-attempts/'+attempt.id+'/result')).status()).toBe(404);await foreign.dispose()
 expect((await page.request.post(root+'/baseline-attempts',{headers:{'Idempotency-Key':randomUUID()},data:{entry:'SELECTED_ROLE'}})).status()).toBe(409)
 await page.screenshot({path:test.info().outputPath('mastery-desktop-en.png'),fullPage:true})
})

test('RB14/VB04 replacement v2 affects new learner, old profile and attempts stay v1',async({request})=>{
 await persona(request,'employee-a')
 const profilesBefore=await json<{attemptId:string;baselineVersion:number}[]>(await request.get(root+'/target-role-selection/mastery'))
 expect(profilesBefore).toHaveLength(1)
 await persona(request,'employee-c')
 const prior=await json<{progress:{attemptId:string;baselineVersion:number}}>(await request.get(root+'/target-role-selection'))
 expect(prior.progress.baselineVersion).toBe(1)
 const pinned=await json<Attempt>(await request.get(root+'/baseline-attempts/'+prior.progress.attemptId))
 await persona(request,'ld');const previous=await workspace(request)
 const draft=await json<{workingRevisionId:string;revision:number}>(await request.put(manager+'/working',{headers:{'Idempotency-Key':'c3-v2-save'},data:{expectedRevision:0,expectedWorkingRevisionId:null,configuration:{name:'C3 isolated baseline v2',occupationBounds:{maxQuestions:50,timeLimitSeconds:3000}}}}))
 const v2=await json<{id:{blueprintId:string;version:number}}>(await request.post(manager+'/finalize',{headers:{'Idempotency-Key':'c3-v2-activate'},data:{workingRevisionId:draft.workingRevisionId,expectedWorkingRevision:draft.revision,expectedActivationRevision:previous.activation!.revision,expectedCurrent:previous.current!.id}}))
 expect(v2.id.version).toBe(2)
 await persona(request,'employee-c')
 const resumed=await json<Attempt>(await request.get(root+'/baseline-attempts/'+pinned.id))
 expect(resumed.deadlineAt).toBe(pinned.deadlineAt);expect(resumed.items).toEqual(pinned.items)
 expect((await json<{progress:{baselineVersion:number}}>(await request.get(root+'/target-role-selection'))).progress.baselineVersion).toBe(1)
 await persona(request,'employee-a')
 expect(await json(await request.get(root+'/target-role-selection/mastery'))).toEqual(profilesBefore)
 expect((await json<{progress:{state:string;baselineVersion:number}}>(await request.get(root+'/target-role-selection'))).progress).toMatchObject({state:'COMPLETE',baselineVersion:1})
 await persona(request,'employee-b');const security=(await roles(request)).find(r=>r.occupationId===occ)!
 await choose(request,security.id);const fresh=await start(request)
 expect((await json<{progress:{baselineVersion:number}}>(await request.get(root+'/target-role-selection'))).progress.baselineVersion).toBe(2)
 await persona(request,'ld');const active=await workspace(request)
 await json(await request.post(manager+'/disable',{headers:{'Idempotency-Key':'c3-deactivate-v2'},data:{expectedActivationRevision:active.activation!.revision,expectedCurrent:active.current!.id,reason:'C3 isolated regression'}}))
 await persona(request,'employee-b')
 const after=await json<Attempt>(await request.get(root+'/baseline-attempts/'+fresh.id))
 expect(after.deadlineAt).toBe(fresh.deadlineAt);expect(after.items).toEqual(fresh.items)
})
