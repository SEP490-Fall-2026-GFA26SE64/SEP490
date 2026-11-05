import { test, expect } from '@playwright/test'

test('main workspace has real single-Skill catalog and Skill before content', async ({ page, request }) => {
  test.setTimeout(180000)
  await expect.poll(async () => { try { return (await request.get('/api/v1/workspace-auth/csrf')).status() } catch { return 0 } }, { timeout: 120000 }).toBe(200)
  const csrfResponse = await request.get('/api/v1/workspace-auth/csrf')
  expect(csrfResponse.status()).toBe(200)
  const csrf = await csrfResponse.json()
  const login = await request.post('/api/v1/workspace-auth/sign-in', {
    data: { email: process.env.MAIN_SMOKE_EMAIL ?? 'expert@technova.com', password: process.env.MAIN_SMOKE_PASSWORD ?? 'Password123!' },
    headers: { [csrf.headerName]: csrf.token },
  })
  expect(login.status()).toBe(200)
  const identity = await login.json() as { workspaceSlug: string }
  expect(identity.workspaceSlug).toBeTruthy()
  const skills = await request.get('/api/v1/module-management/catalog/MicroSkill')
  expect(skills.status()).toBe(200)
  expect((await skills.json()).length).toBe(79)
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.context().addCookies(await request.storageState().then(s => s.cookies))
  await page.goto(`/workspace/${identity.workspaceSlug}/expert/modules`)
  await expect(page.getByRole('button', { name: 'Create module', exact: true })).toBeEnabled({ timeout: 30000 })
  await page.getByRole('button', { name: 'Create module', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Module editor' })
  const skill = dialog.getByLabel('Skill', { exact: true })
  await expect(skill).toHaveCount(1)
  await expect(skill.locator('option')).toHaveCount(80)
  expect(await dialog.evaluate(e => {
    const skill=e.querySelector('select[required]')!
    const lesson=Array.from(e.querySelectorAll('label')).find(l => l.textContent==='Lesson title')!
    return Boolean(skill.compareDocumentPosition(lesson) & Node.DOCUMENT_POSITION_FOLLOWING)
  })).toBe(true)
  await expect(dialog.getByLabel('Difficulty', { exact: true })).toHaveCount(0)
  await skill.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await page.screenshot({ path: 'test-results/main-single-skill-editor.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(errors).toEqual([])
})
