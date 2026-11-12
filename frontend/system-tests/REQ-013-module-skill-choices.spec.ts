import { test, expect } from '@playwright/test'

const metadata = { id: 'MODULE-INTERNAL-ID', version: '0.12.0', status: 'ACTIVE', reviewStatus: 'APPROVED', reviewedBy: null, reviewedAt: null }
const skill = {id: 'eligible', name: 'Approved skill with a long descriptive name for responsive layout verification'}
const module = {metadata, title: 'Module choice verification', moduleType:'LESSON_AND_PRACTICE', duration:30, contentUri:'content:fixture', contentType:'text/markdown', contentVersion:'1', outcomeCodes:[], knowledgeLevel:null, skillVersion:null, teachings:[{skillId:skill.id,skillName:skill.name,metadata:{...metadata,id:'EDGE-ID'}}]}

for (const width of [1280, 390]) {
  test(`eligible Module Skill choices and readable list at ${width}px`, async ({page, request}) => {
    test.setTimeout(180000)
    await page.setViewportSize({width,height:900})
    const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json()
    const response = await request.post('/api/v1/workspace-auth/sign-in', {
      data:{email:process.env.MAIN_SMOKE_EMAIL ?? 'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!'},headers:{[csrf.headerName]:csrf.token},
    })
    expect(response.status()).toBe(200)
    // Check the real authenticated API before substituting presentation-only fixtures.
    const eligibleResponse = await request.get('/api/v1/module-management/catalog/ModuleSkill')
    expect(eligibleResponse.status()).toBe(200)
    expect(Array.isArray(await eligibleResponse.json())).toBe(true)
    await page.context().addCookies((await request.storageState()).cookies)
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
    let empty = false
    await page.route('**/api/v1/module-management/**', async route => {
      const path=new URL(route.request().url()).pathname
      if(path.endsWith('/module-list')) return route.fulfill({json:{items:[{module,authoring:null}],total:1,page:1,pageSize:10}})
      if(path.endsWith('/catalog/ModuleSkill')) return route.fulfill({json:empty?[]:[skill]})
      if(path.endsWith('/catalog/MicroSkill')) return route.fulfill({json:[skill,{id:'pending',name:'Pending skill'}]})
      return route.continue()
    })
    await page.goto('/workspace/workspace-development/expert/modules',{waitUntil:'domcontentloaded',timeout:60000})
    await expect(page.getByRole('heading',{name:module.title})).toBeVisible({timeout:45000})
    await expect(page.getByRole('button',{name:'Create module',exact:true})).toBeEnabled({timeout:45000})
    await expect(page.getByText('MODULE-INTERNAL-ID',{exact:true})).toHaveCount(0)
    await expect(page.getByText(`Skill taught: ${skill.name}`,{exact:true})).toBeVisible()
    await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText('1')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
    await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/list-${width}.png`,fullPage:true})
    const browse=page.getByLabel('Skill',{exact:true})
    await expect(browse.locator('option[value="pending"]')).toHaveCount(1)
    await browse.selectOption('pending')
    await expect(browse).toHaveValue('pending')
    await page.getByRole('button',{name:'View module',exact:true}).click()
    const details=page.getByRole('dialog',{name:'Catalog module details'})
    await expect(details.getByText('MODULE-INTERNAL-ID',{exact:true})).toBeVisible()
    await details.getByRole('button',{name:'Close dialog'}).click()
    await page.getByRole('button',{name:'Create module',exact:true}).click()
    const editor=page.getByRole('dialog',{name:'Module editor'})
    await expect(editor.getByLabel('Skill',{exact:true}).locator('option')).toHaveText(['Select skill',skill.name])
    await editor.getByLabel('Skill',{exact:true}).selectOption('eligible')
    await expect(editor.getByLabel('Skill',{exact:true})).toHaveValue('eligible')
    await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/editor-${width}.png`})
    await editor.getByRole('button',{name:'Cancel',exact:true}).click()
    empty=true
    await page.reload({waitUntil:'domcontentloaded'})
    await expect(page.getByRole('heading',{name:module.title})).toBeVisible({timeout:45000})
    await page.getByRole('button',{name:'Create module',exact:true}).click()
    await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText('0')
    await expect(editor.getByLabel('Skill',{exact:true})).toBeDisabled()
    await expect(editor.getByText(/No active, approved skills are available/)).toBeVisible()
    await expect(editor.getByRole('button',{name:'Save draft'})).toBeDisabled()
    await page.screenshot({path:`../documents/testing/system/assets/module-skill-choices-20261109/empty-${width}.png`})
    expect(errors).toEqual([])
  })
}

test('real workspace lists taught Skills and editor matches eligible API choices', async ({page, request}) => {
  test.setTimeout(180000)
  const csrf=await (await request.get('/api/v1/workspace-auth/csrf')).json()
  expect((await request.post('/api/v1/workspace-auth/sign-in',{
    data:{email:process.env.MAIN_SMOKE_EMAIL ?? 'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!'},headers:{[csrf.headerName]:csrf.token},
  })).status()).toBe(200)
  const eligibleResponse=await request.get('/api/v1/module-management/catalog/ModuleSkill')
  expect(eligibleResponse.status()).toBe(200)
  const eligible=await eligibleResponse.json() as {id:string;name:string}[]
  const list=await request.get('/api/v1/module-management/module-list?page=1')
  expect(list.status()).toBe(200)
  const data=await list.json() as {items:{module:{metadata:{id:string};title:string;teachings:{skillName:string}[]}}[]}
  expect(data.items.length).toBeGreaterThan(0)
  await page.context().addCookies((await request.storageState()).cookies)
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/workspace/workspace-development/expert/modules',{waitUntil:'domcontentloaded',timeout:60000})
  const first=data.items[0].module
  await expect(page.getByRole('button',{name:'Create module',exact:true})).toBeEnabled({timeout:45000})
  await expect(page.getByRole('group',{name:'Available skills'}).getByRole('heading')).toHaveText(String(eligible.length),{timeout:45000})
  await expect(page.getByRole('heading',{name:first.title,exact:true}).first()).toBeVisible({timeout:45000})
  await expect(page.getByText(first.metadata.id,{exact:true})).toHaveCount(0)
  if(first.teachings.length) await expect(page.getByText(`Skill taught: ${first.teachings.map(t=>t.skillName).join(', ')}`,{exact:true}).first()).toBeVisible()
  await page.screenshot({path:'../documents/testing/system/assets/module-skill-choices-20261109/real-list.png',fullPage:true})
  await page.getByRole('button',{name:'Create module',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'Module editor'})
  const options=editor.getByLabel('Skill',{exact:true}).locator('option')
  await expect(options).toHaveText(['Select skill',...eligible.map(s=>s.name)])
  if(!eligible.length) await expect(editor.getByText(/No active, approved skills are available/)).toBeVisible()
  await page.screenshot({path:'../documents/testing/system/assets/module-skill-choices-20261109/real-editor.png'})
  expect(errors).toEqual([])
})
