import { test, expect } from '@playwright/test'

for (const width of [1440, 390]) test(`M2 shared dropzone upload and confirmation at ${width}px`, async ({page}, info) => {
 test.setTimeout(180000)
 await page.setViewportSize({width,height:900})
 const request=page.context().request
 const csrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 expect((await request.post('/api/v1/workspace-auth/sign-in',{data:{email:'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'},headers:{[csrf.headerName]:csrf.token}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
 let uploads=0, commits=0
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.route('**/api/v1/module-management/**',async route=>{
  const path=new URL(route.request().url()).pathname
  if(path.endsWith('/session'))return route.fulfill({json:{id:'expert',organizationId:'fixture',roles:['EXPERT']}})
  if(path.endsWith('/module-list'))return route.fulfill({json:{items:[],total:0,page:1,pageSize:10}})
  if(path.includes('/catalog/')||path.endsWith('/contents'))return route.fulfill({json:[]})
  if(path.endsWith('/imports')&&route.request().method()==='POST'){
   uploads++;expect(route.request().postDataBuffer()?.toString()).toContain('module-lessons.zip')
   return route.fulfill({json:{id:'m2-batch',modules:[{moduleId:'M2',excelRow:2,module:{title:'Dropped module'},lessons:[],expectedVersion:null}],errors:[],ownedDuplicates:[],committed:false}})
  }
  if(path.endsWith('/imports/m2-batch/commit')){commits++;expect(route.request().postDataJSON()).toEqual({confirmOwnedDuplicates:true});return route.fulfill({json:{}})}
  return route.fulfill({status:500,json:{message:'Unexpected fixture request'}})
 })
 await page.goto('/workspace/workspace-development/expert/modules')
 await page.getByRole('button',{name:'Import',exact:true}).click({timeout:45000})
 const dialog=page.getByRole('dialog',{name:'Import modules',exact:true})
 await expect(dialog.getByText('Excel (.xlsx) or ZIP (.zip)',{exact:true})).toBeVisible()
 const browse=dialog.getByRole('button',{name:'Browse files',exact:true})
 await browse.focus();await expect(browse).toBeFocused()
 const chooser=page.waitForEvent('filechooser');await page.keyboard.press('Enter');await chooser
 const dropzone=dialog.getByText('Drag and drop your file here',{exact:true}).locator('..')
 const transfer=await page.evaluateHandle(()=>{const data=new DataTransfer();data.items.add(new File(['isolated ZIP upload fixture'],'module-lessons.zip',{type:'application/zip'}));return data})
 await dropzone.dispatchEvent('dragover',{dataTransfer:transfer})
 await expect(dropzone).toHaveClass(/border-primary/)
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await page.screenshot({path:info.outputPath('dropzone-active.png')})
 await dropzone.dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose()
 await expect(dialog.getByText('Dropped module',{exact:true})).toBeVisible({timeout:45000})
 expect(uploads).toBe(1);expect(commits).toBe(0)
 await expect(dialog.getByText('module-lessons.zip',{exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:'Continue import',exact:true}).click()
 await dialog.getByRole('button',{name:'Confirm import',exact:true}).click()
 await expect(dialog.getByText('Imported. Submit the drafts for review.',{exact:true})).toBeVisible({timeout:45000})
 expect(commits).toBe(1);expect(errors).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
