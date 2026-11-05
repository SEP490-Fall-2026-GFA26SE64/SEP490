import { test, expect as baseExpect, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test'
const expect = baseExpect.configure({ timeout: 20000 })
const root = '/api/v1/module-management'
async function command(request: APIRequestContext, method: 'post' | 'put', path: string, data: unknown = {}) {
  const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json() as { headerName: string; token: string }
  return request[method](path, { data, headers: { [csrf.headerName]: csrf.token } })
}
async function login(browser: Browser, baseURL: string, role: string, org = 'a') {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } })
  const response = await command(context.request, 'post', '/api/v1/workspace-auth/sign-in', { email: `${role}${org}@question-bank.test`, password: 'question-bank-test-password' })
  expect(response.status()).toBe(200)
  return context
}
test('real same-Skill optional learning, one-of-N eligibility, persistence, EN/VI and access isolation', async ({ browser, baseURL }) => {
  test.setTimeout(180000)
  const contexts: BrowserContext[] = []
  try {
    const employee = await login(browser, baseURL!, 'employee'); contexts.push(employee)
    const request = employee.request
    const list = await request.get(`${root}/skills/QB-TEST-SQL/modules`)
    expect(list.status()).toBe(200)
    const modules = await list.json() as { moduleId: string; title: string; started: boolean }[]
    expect(modules.length).toBe(3)
    const first = modules.find(m => m.title === 'Skill learning fixture 1')!
    const alternate = modules.find(m => m.title === 'Skill learning fixture 2')!
    const page = await employee.newPage(), errors: string[] = [], failed: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failed.push(r.url()) })
    await page.goto(`/workspace/question-bank-test-a/employee/modules/${first.moduleId}`)
    const panel = page.getByRole('region', { name: 'Skill learning eligibility and optional modules' })
    await expect(panel.getByText('Learning prerequisite not met', { exact: true })).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Study module', exact: true })).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Take Module Exam', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Mark as completed', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Mark as completed', exact: true }).click()
    await expect(panel.getByText('Learning prerequisite met for Skill Assessment', { exact: true })).toBeVisible()
    const result = await (await request.get(`${root}/skills/QB-TEST-SQL/assessment-eligibility`)).json()
    expect(result.eligible).toBe(true);expect(result.qualifyingCompletion.moduleId).toBe(first.moduleId)
    await expect(panel.getByRole('button', { name: 'Study module', exact: true })).toHaveCount(2)
    await panel.getByRole('listitem').filter({ hasText: 'Skill learning fixture 2' }).getByRole('button', { name: 'Study module', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/employee/modules/${alternate.moduleId}$`))
    await expect(page.getByRole('heading', { name: alternate.title, exact: true, level: 1 })).toBeVisible()
    await expect(page.getByText('Learning prerequisite met for Skill Assessment', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByText('Learning prerequisite met for Skill Assessment', { exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/skill-learning-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.evaluate(() => localStorage.setItem('app_language', 'vi'));await page.reload()
    await expect(page.getByText('Đủ điều kiện học tập để thi Skill', { exact: true })).toBeVisible()
    await expect(page.getByText('Module cùng kỹ năng để học thêm', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/skill-learning-mobile-vi.png', fullPage: true })
    expect(errors).toEqual([]);expect(failed).toEqual([])
    // Direct requests use genuine separate accounts and cannot borrow the first learner's proof.
    const foreign = await login(browser, baseURL!, 'employee', 'b');contexts.push(foreign)
    expect((await foreign.request.get(`${root}/skills/QB-TEST-SQL/assessment-eligibility`)).status()).toBe(404)
    expect((await command(foreign.request, 'post', `${root}/skills/QB-TEST-SQL/modules/${alternate.moduleId}/learning`)).status()).toBe(404)
    const expert = await login(browser, baseURL!, 'expert');contexts.push(expert)
    expect((await expert.request.get(`${root}/skills/QB-TEST-SQL/assessment-eligibility`)).status()).toBe(403)
    expect((await command(request, 'post', `${root}/skills/SKILL-OTHER/modules/${alternate.moduleId}/learning`)).status()).toBe(403)
    expect((await request.post(`${root}/skills/QB-TEST-SQL/modules/${alternate.moduleId}/learning`, { data: {} })).status()).toBe(403)
    // New authoring surface contains a single selector, with neither retired field or add-skill action.
    const editor = await expert.newPage();await editor.goto('/workspace/question-bank-test-a/expert/modules')
    await editor.getByRole('button', { name: 'Create module', exact: true }).click()
    const dialog = editor.getByRole('dialog', { name: 'Module editor' })
    await expect(dialog.getByLabel('Skill', { exact: true })).toHaveCount(1)
    await expect(dialog.getByLabel('Difficulty', { exact: true })).toHaveCount(0)
    await expect(dialog.getByLabel('Teaching focus', { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Add skill', exact: true })).toHaveCount(0)
    await editor.screenshot({ path: 'test-results/single-skill-module-editor.png', fullPage: true })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  } finally { for (const context of contexts) await context.close() }
})

test('mobile optional layout and visible single-Skill editor after completion', async ({ browser, baseURL }) => {
  test.setTimeout(90000)
  const employee = await login(browser, baseURL!, 'employee')
  const expert = await login(browser, baseURL!, 'expert')
  try {
    const modules = await (await employee.request.get(`${root}/skills/QB-TEST-SQL/modules`)).json() as { moduleId: string; title: string }[]
    const alternate = modules.find(m => m.title === 'Skill learning fixture 2')!
    const page = await employee.newPage();await page.setViewportSize({ width: 375, height: 812 })
    await page.addInitScript(() => localStorage.setItem('app_language', 'vi'))
    await page.goto(`/workspace/question-bank-test-a/employee/modules/${alternate.moduleId}`)
    await expect(page.getByText('Đủ điều kiện học tập để thi Skill', { exact: true })).toBeVisible()
    const first = page.getByRole('listitem').filter({ hasText: 'Skill learning fixture 1' })
    await expect(first.getByRole('button', { name: 'Học tiếp' })).toBeVisible()
    expect(await first.evaluate(e => { const css = getComputedStyle(e); const available = e.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight); return e.querySelector('span')!.getBoundingClientRect().width >= available * 0.95 })).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/skill-learning-mobile-vi-final.png', fullPage: true })
    const editor = await expert.newPage();await editor.goto('/workspace/question-bank-test-a/expert/modules')
    await editor.getByRole('button', { name: 'Create module', exact: true }).click()
    const dialog = editor.getByRole('dialog', { name: 'Module editor' })
    await expect(dialog.getByLabel('Skill', { exact: true })).toHaveCount(1)
    await dialog.getByLabel('Skill', { exact: true }).scrollIntoViewIfNeeded()
    await expect(dialog.getByLabel('Skill', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible()
    expect(await dialog.evaluate(e => { const skill=e.querySelector('select[required]')!, lesson=Array.from(e.querySelectorAll('label')).find(l => l.textContent === 'Lesson title')!; return Boolean(skill.compareDocumentPosition(lesson) & Node.DOCUMENT_POSITION_FOLLOWING) })).toBe(true)
    await dialog.getByLabel('Skill', { exact: true }).evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await expect.poll(() => dialog.getByLabel('Skill', { exact: true }).evaluate(e => { const a=e.getBoundingClientRect(), b=e.closest('form')!.getBoundingClientRect(); return a.top >= b.top && a.bottom <= b.bottom })).toBe(true)
    await editor.screenshot({ path: 'test-results/single-skill-module-editor-final.png', fullPage: true })
  } finally { await employee.close();await expert.close() }
})
