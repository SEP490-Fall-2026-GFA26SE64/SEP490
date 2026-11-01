import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
const root = '/api/v1/module-management'
const settings = () => new Map(readFileSync(resolve(process.cwd(), '../local/dev-accounts/private.env'), 'utf8').split('\n').filter(Boolean).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)] }))
function sql(command: string) {
  return execFileSync('docker', ['exec', '-i', 'sep490-accounts-dev-postgres-1', 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph_dev_accounts', '-v', 'ON_ERROR_STOP=1', '-At'], { input: command, encoding: 'utf8' })
}
async function mutate(request: APIRequestContext, path: string, method = 'POST', data: unknown = {}) {
  const csrf = await (await request.get('/api/v1/workspace-auth/csrf')).json() as { headerName: string; token: string }
  return request.fetch(path, { method, data, headers: { [csrf.headerName]: csrf.token } })
}
async function login(page: Page, email: string, password: string, path: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()
  await page.goto(path)
}
test('one responsible Expert manages a module; another can only view its creator/editor/reviewer history', async ({ page, baseURL }) => {
  test.setTimeout(240_000)
  test.skip(baseURL !== 'http://localhost:8088', 'Requires the dedicated dev-accounts stack on the canonical port.')
  const values = settings(), password = values.get('DEV_ACCOUNT_PASSWORD_3')!, managerPassword = values.get('DEV_ACCOUNT_PASSWORD_2')!
  const viewer = randomUUID(), member = randomUUID(), email = `viewer-${viewer}@example.test`
  sql(`BEGIN;
    INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
      SELECT '${viewer}',organization_id,'${email}','${email}',password_hash FROM platform.account WHERE normalized_identifier='expert@example.test';
    INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES ('${viewer}','Read-only verification Expert',now());
    INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at)
      SELECT '${member}',account_id,organization_id,true,now(),now() FROM platform.account WHERE account_id='${viewer}';
    INSERT INTO platform.organization_membership_role VALUES ('${member}','DOMAIN_EXPERT'); COMMIT;`)
  try {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await login(page, 'expert@example.test', password, '/expert/modules')
    const occupations = await (await page.request.get(root + '/catalog/Occupation')).json() as { id: string }[]
    const skills = await (await page.request.get(root + '/catalog/MicroSkill')).json() as { id: string }[]
    const title = 'Single Expert verification ' + randomUUID().slice(0, 8)
    const contentResponse = await mutate(page.request, root + '/contents', 'POST', { title, markdown: '# Ownership verification\nPractice the skill.', occupationIds: [occupations[0].id] })
    expect(contentResponse.status()).toBe(201)
    const content = await contentResponse.json() as { id: string }
    await page.reload()
    const create = page.getByRole('button', { name: 'Create module', exact: true })
    await expect(create).toBeEnabled({ timeout: 30_000 }); await create.click()
    let editor = page.getByRole('dialog', { name: 'Module editor' })
    await editor.getByLabel('Title', { exact: true }).fill(title)
    await editor.getByLabel('Occupations (hold Ctrl / Cmd to select several)', { exact: true }).selectOption(occupations[0].id)
    await editor.getByLabel('Learning content', { exact: true }).selectOption(content.id)
    await editor.getByLabel('Duration (minutes)', { exact: true }).fill('30')
    await editor.getByLabel('Package price (VND)', { exact: true }).fill('120000')
    await editor.getByRole('button', { name: 'Add skill', exact: true }).click()
    await editor.getByLabel('Skill', { exact: true }).selectOption(skills[0].id)
    const createdResponse = page.waitForResponse(response => response.url().endsWith(root + '/modules') && response.request().method() === 'POST')
    await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
    const created = await (await createdResponse).json() as { id: string; createdBy: string }
    await expect(editor).not.toBeVisible()
    await page.getByLabel('Search name or ID', { exact: true }).fill(created.id)
    const card = page.locator('div.bg-card').filter({ has: page.getByText(created.id, { exact: true }) })
    await card.getByRole('button', { name: 'Edit', exact: true }).click()
    editor = page.getByRole('dialog', { name: 'Module editor' })
    await editor.getByLabel('Title', { exact: true }).fill(title + ' revised')
    await editor.getByRole('button', { name: 'Save draft', exact: true }).click(); await expect(editor).not.toBeVisible()
    await card.getByRole('button', { name: 'Submit for review', exact: true }).click()
    await page.getByRole('dialog', { name: 'Submit for review' }).getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card.getByText('Submitted', { exact: true })).toBeVisible()
    await mutate(page.request, '/api/v1/workspace-auth/sign-out')
    await login(page, 'ld.manager@example.test', managerPassword, '/ld-manager/modules')
    await page.getByLabel('Search name or ID', { exact: true }).fill(created.id)
    await card.getByRole('button', { name: 'Approve and release', exact: true }).click()
    await page.getByRole('dialog', { name: 'Approve and release' }).getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(card.getByText('Released', { exact: true })).toBeVisible({ timeout: 60_000 })
    await mutate(page.request, '/api/v1/workspace-auth/sign-out')
    await login(page, email, password, '/expert/modules')
    await page.getByLabel('Search name or ID', { exact: true }).fill(created.id)
    await expect(card.getByText('View only', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
    for (const name of ['Submit for review', 'Delete draft', 'Request archive']) await expect(card.getByRole('button', { name, exact: true })).toHaveCount(0)
    await card.getByRole('button', { name: 'Details & history', exact: true }).click()
    const history = page.getByRole('dialog', { name: 'Module details' })
    await expect(history.getByText('Created by / Responsible Expert: Dev DOMAIN_EXPERT', { exact: false })).toBeVisible()
    await expect(history.getByText('Decision by: Dev LD_MANAGER', { exact: false })).toBeVisible()
    await expect(history.getByText('Edited by: Dev DOMAIN_EXPERT', { exact: false }).first()).toBeVisible()
    await history.getByRole('button', { name: 'Close dialog' }).click()
    const document = await (await page.request.get(root + '/modules/' + created.id)).json() as { lockVersion: number; createdBy: string }
    expect(document.createdBy).toBe(created.createdBy)
    expect((await mutate(page.request, root + '/modules/' + created.id, 'PUT', { expectedVersion: document.lockVersion, value: {} })).status()).toBe(403)
    expect((await mutate(page.request, root + '/modules/' + created.id + '?expectedVersion=' + document.lockVersion, 'DELETE')).status()).toBe(403)
    expect((await mutate(page.request, root + '/modules/' + created.id + '/actions', 'POST', { expectedVersion: document.lockVersion, action: 'submit' })).status()).toBe(403)
    await page.reload(); await page.getByLabel('Search name or ID', { exact: true }).fill(created.id)
    await expect(card.getByText('View only', { exact: true })).toBeVisible()
    await page.getByRole('banner').scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/REQ-013-single-expert.png', fullPage: true })
    await mutate(page.request, '/api/v1/workspace-auth/sign-out')
  } finally {
    sql(`BEGIN; UPDATE platform.organization_membership SET active=false WHERE membership_id='${member}'; UPDATE platform.account SET active=false WHERE account_id='${viewer}'; COMMIT;`)
  }
})
