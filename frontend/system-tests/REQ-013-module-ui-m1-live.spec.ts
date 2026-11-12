import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
const root='/api/v1/module-management'
test('M1 real authenticated directory, draft save and Excel import',async({page},info)=>{
 test.setTimeout(360000)
 const request=page.context().request
 const csrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 const headers={[csrf.headerName]:csrf.token}
 expect((await request.post('/api/v1/workspace-auth/sign-in',{headers,data:{email:'expert@technova.com',password:process.env.MAIN_SMOKE_PASSWORD??'Password123!'}})).status()).toBe(200)
 await page.addInitScript(()=>localStorage.setItem('app_language','en'))
 const choices=await request.get(root+'/catalog/ModuleSkill');expect(choices.ok()).toBe(true)
 const skills=await choices.json() as {id:string,name:string}[];expect(skills.length).toBeGreaterThan(0)
 const unique='M1-UI-'+Date.now(), title='M1 draft verification '+Date.now()
 const cleanupIds:string[]=[]
 try {
 await page.goto('/workspace/workspace-development/expert/modules')
 await expect(page.getByRole('button',{name:'Create module',exact:true})).toBeEnabled({timeout:45000})
 await page.getByRole('button',{name:'Create module',exact:true}).click()
 const editor=page.getByRole('dialog',{name:'Module editor'})
 await editor.getByLabel('Title',{exact:true}).fill(title)
 await editor.getByLabel('Skill',{exact:true}).selectOption(skills[0].id)
 await editor.getByLabel('Knowledge level',{exact:true}).selectOption('FOUNDATION')
 await editor.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(editor).not.toBeVisible({timeout:45000})
 const saved=await(await request.get(root+'/modules?search='+encodeURIComponent(title))).json()
 const draft=saved.items.find((d:{revisions:{payload:{title:string}}[]})=>d.revisions.at(-1)?.payload.title===title)
 expect(draft).toBeTruthy();cleanupIds.push(draft.id)
 expect(draft.revisions.at(-1).state).toBe('DRAFT')
 await page.getByLabel('Search name or ID',{exact:true}).fill(title)
 const row=page.getByTestId('module-row').filter({has:page.getByRole('heading',{name:title,exact:true})})
 await expect(row).toBeVisible({timeout:45000})
 await page.screenshot({path:info.outputPath('live-directory.png')})
 await row.getByRole('button',{name:'View module',exact:true}).click()
 await page.getByRole('dialog',{name:'Catalog module details'}).getByRole('button',{name:'View workspace lessons & history',exact:true}).click()
 const detail=page.getByRole('dialog',{name:'Module details',exact:true})
 await expect(detail).toBeVisible({timeout:45000})
 await expect(detail.getByText('Workflow',{exact:true})).toBeVisible()
 await expect(detail.getByText('Knowledge level',{exact:true})).toHaveCount(1)
 await page.screenshot({path:info.outputPath('live-authoring-detail.png')})
 await detail.getByRole('button',{name:'Close',exact:true}).click()
 const workbook=XLSX.utils.book_new()
 XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([
 ['moduleId','title','moduleType','durationMinutes','teachings','knowledgeLevel'],
 [unique,'M1 import verification','LESSON_AND_PRACTICE',10,JSON.stringify([{skillId:skills[0].id}]),'FOUNDATION']]),'Modules')
 XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([
 ['moduleId','lessonId','order','title','type','text','markdownPath','videoSource','videoUrl','videoPath','durationSeconds'],
 [unique,'lesson-1',1,'Introduction','TEXT','# Introduction\nA dedicated UI verification lesson.','','','','',60]]),'Lessons')
 await page.getByRole('button',{name:'Import',exact:true}).click()
 const importer=page.getByRole('dialog',{name:'Import modules',exact:true})
 await importer.getByLabel('Module import file').setInputFiles({name:'m1-verification.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:XLSX.write(workbook,{type:'buffer',bookType:'xlsx'})})
 await expect(importer.getByRole('button',{name:'Continue import',exact:true})).toBeEnabled({timeout:45000})
 await importer.getByRole('button',{name:'Continue import',exact:true}).click()
 await importer.getByRole('button',{name:'Confirm import',exact:true}).click()
 cleanupIds.push(unique)
 await expect(importer.getByText('Imported. Submit the drafts for review.',{exact:true})).toBeVisible({timeout:45000})
 const imported=await request.get(root+'/modules/'+unique);expect(imported.ok()).toBe(true)
 const doc=await imported.json();expect(doc.revisions.at(-1).state).toBe('DRAFT');expect(doc.revisions.at(-1).payload.content.lessons).toHaveLength(1)
 await page.screenshot({path:info.outputPath('live-import-success.png')})
 } finally {
 const freshCsrf=await(await request.get('/api/v1/workspace-auth/csrf')).json()
 for(const id of cleanupIds){const response=await request.get(root+'/modules/'+id);if(!response.ok())continue;const doc=await response.json();expect((await request.delete(root+'/modules/'+id+'?expectedVersion='+doc.lockVersion,{headers:{[freshCsrf.headerName]:freshCsrf.token}})).status()).toBe(204)}
 }
})
