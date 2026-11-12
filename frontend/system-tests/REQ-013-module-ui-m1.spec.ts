import { test, expect, type Page } from '@playwright/test'
async function login(page:Page) {
 const request=page.context().request
 const csrf=await (await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in',{data:{email:'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'},headers:{[csrf.headerName]:csrf.token}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
}
async function fixture(page:Page) {
 const module={metadata:{id:'MOD-M1-LONG-ID-000000000000000000000000000000000000000000000000000000000000000',version:'0.12.0',status:'ACTIVE',reviewStatus:'APPROVED',reviewedBy:null,reviewedAt:null},title:'Practical database design',moduleType:'LESSON_AND_PRACTICE',contentUri:'content/'+ 'long-path'.repeat(35),contentType:'text/markdown',contentVersion:'1',duration:30,knowledgeLevel:'FOUNDATION',skillVersion:null,teachings:[{skillId:'SQL',skillName:'Database design',metadata:{id:'edge',version:'0.12.0',status:'ACTIVE',reviewStatus:'APPROVED',reviewedBy:null,reviewedAt:null}}]}
 const preview={id:'batch',modules:[{moduleId:'M1',excelRow:2,module:{title:'Imported lesson'},lessons:[],expectedVersion:1}],errors:[] as {moduleId:string,row:number,reason:string}[],ownedDuplicates:['M1'],committed:false}
 const state={committed:false,saves:[] as Record<string, unknown>[],lessons:[] as {title:string,type:string}[]}
 await page.route('**/api/v1/module-management/**',async route=>{
 const url=new URL(route.request().url()), path=url.pathname
 if(path.endsWith('/session'))return route.fulfill({json:{id:'expert',organizationId:'fixture',roles:['EXPERT']}})
 if(path.endsWith('/module-list'))return route.fulfill({json:{items:[{module,authoring:null}],total:1,page:1,pageSize:10}})
 if(path.endsWith('/catalog/MicroSkill')||path.endsWith('/catalog/ModuleSkill'))return route.fulfill({json:[{id:'SQL',name:'Database design'}]})
 if(path.includes('/catalog/')||path.endsWith('/contents'))return route.fulfill({json:[]})
 if(path.endsWith('/contents/lessons')&&route.request().method()==='POST'){const body=route.request().postDataJSON();state.lessons=body.lessons;return route.fulfill({json:{...body,id:'new-content',markdown:'',contentType:'text/markdown',contentVersion:'1',jobPositionIds:[],createdBy:'expert',createdAt:'2026-11-11T00:00:00Z'}})}
 if(path.endsWith('/modules')&&route.request().method()==='POST'){state.saves.push(route.request().postDataJSON());return route.fulfill({json:{id:'saved'}})}
 if(path.endsWith('/text/preview'))return route.fulfill({json:{html:route.request().postDataJSON().body}})
 if(path.endsWith('/imports')&&route.request().method()==='POST')return route.fulfill({json:preview})
 if(path.endsWith('/imports/batch/commit')){state.committed=true;expect(route.request().postDataJSON()).toEqual({confirmOwnedDuplicates:true});return route.fulfill({json:{}})}
 if(path.endsWith('/imports/batch'))return route.fulfill({json:preview})
 return route.fulfill({status:500,json:{message:'Unexpected M1 request '+path}})
 })
 return {module,preview,state}
}
for(const width of [1440,1280,768,390])test(`M1 directory, catalog detail, editor and import at ${width}px`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});await login(page);const data=await fixture(page)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/workspace/workspace-development/expert/modules')
 const row=page.getByTestId('module-row');await expect(row).toBeVisible({timeout:45000})
 await page.getByLabel('Search name or ID',{exact:true}).fill('database')
 await page.getByRole('button',{name:'Clear filters',exact:true}).click()
 await expect(page.getByLabel('Search name or ID',{exact:true})).toHaveValue('')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await row.getByRole('button',{name:'View module',exact:true}).click()
 const details=page.getByRole('dialog',{name:'Catalog module details'})
 await expect(details.getByRole('region',{name:'Overview',exact:true})).toBeVisible()
 await page.context().grantPermissions(['clipboard-read','clipboard-write'])
 await details.getByRole('button',{name:'Copy ID '+data.module.metadata.id,exact:true}).click()
 await expect(page.getByText('Copied to clipboard!',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(data.module.metadata.id)
 await expect(details.getByText('Knowledge level',{exact:true})).toHaveCount(1)
 await expect(details.getByText(data.module.contentUri,{exact:true})).not.toBeVisible()
 await details.getByRole('button',{name:'Technical metadata'}).click()
 await expect(details.getByText(data.module.contentUri,{exact:true})).toBeVisible()
 expect(await details.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('catalog-detail.png')})
 await page.keyboard.press('Escape')
 await expect(details).not.toBeVisible()
 await expect(row.getByRole('button',{name:'View module',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'Create module',exact:true}).click()
 const editor=page.getByRole('dialog',{name:'Module editor'})
 await editor.getByLabel('Title',{exact:true}).fill('Retained draft')
 await editor.getByLabel('Skill',{exact:true}).selectOption('SQL')
 await editor.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(editor.getByLabel('Title',{exact:true})).toHaveValue('Retained draft')
 await editor.getByRole('button',{name:'Save draft',exact:true}).scrollIntoViewIfNeeded()
 expect(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 const box=await editor.getByRole('button',{name:'Save draft',exact:true}).boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(900)
 await page.screenshot({path:info.outputPath('editor.png')})
 await editor.getByLabel('Knowledge level',{exact:true}).selectOption('FOUNDATION')
 await editor.getByLabel('Lesson title',{exact:true}).fill('First text')
 await editor.getByRole('button',{name:'Add Video lesson',exact:true}).click()
 await editor.getByLabel('Lesson title',{exact:true}).nth(1).fill('Second video')
 await editor.getByRole('button',{name:'Move lesson up',exact:true}).nth(1).click()
 await editor.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(editor).not.toBeVisible({timeout:45000})
 expect(data.state.lessons.map(l=>l.title)).toEqual(['Second video','First text'])
 expect(data.state.saves).toEqual([expect.objectContaining({title:'Retained draft',contentId:'new-content',knowledgeLevel:'FOUNDATION'})])
 await page.getByRole('button',{name:'Import',exact:true}).click()
 const importer=page.getByRole('dialog',{name:'Import modules'})
 await importer.getByLabel('Module import file').setInputFiles({name:'modules.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('isolated UI fixture')})
 await expect(importer.getByText('Imported lesson',{exact:true})).toBeVisible({timeout:45000})
 await importer.getByRole('button',{name:'Continue import',exact:true}).click()
 expect(data.state.committed).toBe(false)
 await expect(importer.getByText(/creates new draft revisions/)).toBeVisible()
 expect(await importer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('import-confirm.png')})
 await importer.getByRole('button',{name:'Confirm import',exact:true}).click()
 await expect(importer.getByText('Imported. Submit the drafts for review.',{exact:true})).toBeVisible({timeout:45000})
 expect(data.state.committed).toBe(true);expect(errors).toEqual([])
})
