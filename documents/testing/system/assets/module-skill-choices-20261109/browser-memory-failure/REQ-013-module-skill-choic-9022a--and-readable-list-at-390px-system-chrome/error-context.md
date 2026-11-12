# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: REQ-013-module-skill-choices.spec.ts >> eligible Module Skill choices and readable list at 390px
- Location: system-tests/REQ-013-module-skill-choices.spec.ts:8:3

# Error details

```
SyntaxError: Unexpected end of JSON input
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | const metadata = { id: 'MODULE-INTERNAL-ID', version: '0.12.0', status: 'ACTIVE', reviewStatus: 'APPROVED', reviewedBy: null, reviewedAt: null }
  4  | const skill = {id: 'eligible', name: 'Approved skill with a long descriptive name for responsive layout verification'}
  5  | const module = {metadata, title: 'Module choice verification', moduleType:'LESSON_AND_PRACTICE', duration:30, contentUri:'content:fixture', contentType:'text/markdown', contentVersion:'1', outcomeCodes:[], knowledgeLevel:null, skillVersion:null, teachings:[{skillId:skill.id,skillName:skill.name,metadata:{...metadata,id:'EDGE-ID'}}]}
  6  | 
  7  | for (const width of [1280, 390]) {
  8  |   test(`eligible Module Skill choices and readable list at ${width}px`, async ({page, request}) => {
  9  |     test.setTimeout(180000)
  10 |     await page.setViewportSize({width,height:900})
> 11 |     const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
     |                  ^ SyntaxError: Unexpected end of JSON input
  12 |     const response = await request.post('/api/v1/workspace-auth/sign-in', {
  13 |       data:{email:process.env.MAIN_SMOKE_EMAIL ?? 'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!'},headers:{[csrf.headerName]:csrf.token},
  14 |     })
  15 |     expect(response.status()).toBe(200)
  16 |     // Check the real authenticated API before substituting presentation-only fixtures.
  17 |     const eligibleResponse = await request.get('/api/v1/module-management/catalog/ModuleSkill')
  18 |     expect(eligibleResponse.status()).toBe(200)
  19 |     expect(Array.isArray(await eligibleResponse.json())).toBe(true)
  20 |     await page.context().addCookies((await request.storageState()).cookies)
  21 |     const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  22 |     let empty = false
  23 |     await page.route('**/api/v1/module-management/**', async route => {
  24 |       const path=new URL(route.request().url()).pathname
  25 |       if(path.endsWith('/module-list')) return route.fulfill({json:{items:[{module,authoring:null}],total:1,page:1,pageSize:10}})
  26 |       if(path.endsWith('/catalog/ModuleSkill')) return route.fulfill({json:empty?[]:[skill]})
  27 |       if(path.endsWith('/catalog/MicroSkill')) return route.fulfill({json:[skill,{id:'pending',name:'Pending skill'}]})
  28 |       return route.continue()
  29 |     })
  30 |     await page.goto('/workspace/workspace-development/expert/modules',{waitUntil:'domcontentloaded',timeout:60000})
  31 |     await expect(page.getByRole('heading',{name:module.title})).toBeVisible({timeout:45000})
  32 |     await expect(page.getByText('MODULE-INTERNAL-ID',{exact:true})).toHaveCount(0)
  33 |     await expect(page.getByText(`Skill taught: ${skill.name}`,{exact:true})).toBeVisible()
  34 |     await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText('1')
  35 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
  36 |     await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/list-${width}.png`,fullPage:true})
  37 |     const browse=page.getByLabel('Skill',{exact:true})
  38 |     await expect(browse.locator('option[value="pending"]')).toHaveCount(1)
  39 |     await browse.selectOption('pending')
  40 |     await expect(browse).toHaveValue('pending')
  41 |     await page.getByRole('button',{name:'View module',exact:true}).click()
  42 |     const details=page.getByRole('dialog',{name:'Catalog module details'})
  43 |     await expect(details.getByText('MODULE-INTERNAL-ID',{exact:true})).toBeVisible()
  44 |     await details.getByRole('button',{name:'Close dialog'}).click()
  45 |     await page.getByRole('button',{name:'Create module',exact:true}).click()
  46 |     const editor=page.getByRole('dialog',{name:'Module editor'})
  47 |     await expect(editor.getByLabel('Skill',{exact:true}).locator('option')).toHaveText(['Select skill',skill.name])
  48 |     await editor.getByLabel('Skill',{exact:true}).selectOption('eligible')
  49 |     await expect(editor.getByLabel('Skill',{exact:true})).toHaveValue('eligible')
  50 |     await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/editor-${width}.png`})
  51 |     await editor.getByRole('button',{name:'Cancel',exact:true}).click()
  52 |     empty=true
  53 |     await page.reload({waitUntil:'domcontentloaded'})
  54 |     await expect(page.getByRole('heading',{name:module.title})).toBeVisible({timeout:45000})
  55 |     await page.getByRole('button',{name:'Create module',exact:true}).click()
  56 |     await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText('0')
  57 |     await expect(editor.getByLabel('Skill',{exact:true})).toBeDisabled()
  58 |     await expect(editor.getByText(/No active, approved skills are available/)).toBeVisible()
  59 |     await expect(editor.getByRole('button',{name:'Save draft'})).toBeDisabled()
  60 |     await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/empty-${width}.png`})
  61 |     expect(errors).toEqual([])
  62 |   })
  63 | }
  64 | 
  65 | test('real workspace lists taught Skills and editor matches eligible API choices', async ({page, request}) => {
  66 |   test.setTimeout(180000)
  67 |   const csrf=await (await request.get('/api/v1/workspace-auth/csrf')).json()
  68 |   expect((await request.post('/api/v1/workspace-auth/sign-in',{
  69 |     data:{email:process.env.MAIN_SMOKE_EMAIL ?? 'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!'},headers:{[csrf.headerName]:csrf.token},
  70 |   })).status()).toBe(200)
  71 |   const eligibleResponse=await request.get('/api/v1/module-management/catalog/ModuleSkill')
  72 |   expect(eligibleResponse.status()).toBe(200)
  73 |   const eligible=await eligibleResponse.json() as {id:string;name:string}[]
  74 |   const list=await request.get('/api/v1/module-management/module-list?page=1')
  75 |   expect(list.status()).toBe(200)
  76 |   const data=await list.json() as {items:{module:{metadata:{id:string};title:string;teachings:{skillName:string}[]}}[]}
  77 |   expect(data.items.length).toBeGreaterThan(0)
  78 |   await page.context().addCookies((await request.storageState()).cookies)
  79 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  80 |   await page.goto('/workspace/workspace-development/expert/modules',{waitUntil:'domcontentloaded',timeout:60000})
  81 |   const first=data.items[0].module
  82 |   await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText(String(eligible.length),{timeout:45000})
  83 |   await expect(page.getByRole('heading',{name:first.title,exact:true}).first()).toBeVisible({timeout:45000})
  84 |   await expect(page.getByText(first.metadata.id,{exact:true})).toHaveCount(0)
  85 |   if(first.teachings.length) await expect(page.getByText(`Skill taught: ${first.teachings.map(t=>t.skillName).join(', ')}`,{exact:true}).first()).toBeVisible()
  86 |   await page.screenshot({path:'../documents/testing/system/assets/module-skill-choices-20261109/real-list.png',fullPage:true})
  87 |   await page.getByRole('button',{name:'Create module',exact:true}).click()
  88 |   const editor=page.getByRole('dialog',{name:'Module editor'})
  89 |   const options=editor.getByLabel('Skill',{exact:true}).locator('option')
  90 |   await expect(options).toHaveText(['Select skill',...eligible.map(s=>s.name)])
  91 |   if(!eligible.length) await expect(editor.getByText(/No active, approved skills are available/)).toBeVisible()
  92 |   await page.screenshot({path:'../documents/testing/system/assets/module-skill-choices-20261109/real-editor.png'})
  93 |   expect(errors).toEqual([])
  94 | })
  95 | 
```