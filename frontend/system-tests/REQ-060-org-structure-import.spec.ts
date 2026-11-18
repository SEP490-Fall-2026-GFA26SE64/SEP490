import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import type ExcelModule from 'exceljs'
import { mutate, observe, record, text } from './subscriptionHelpers'

// Playwright's ESM loader cannot resolve exceljs' module entry; its CommonJS build loads directly.
const ExcelJS = createRequire(import.meta.url)('exceljs') as typeof ExcelModule

const STACK = process.env.ORG_STRUCTURE_STACK ?? 'alg-orgimport'
test.setTimeout(240_000)
test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:8097') throw new Error('Use only the isolated alg-orgimport stack on port 8097.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
async function downloadTemplate(page: Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download template', exact: true }).click()
  const template = await download
  expect(template.suggestedFilename()).toBe('organization-structure-template.xlsx')
  return readFileSync(await template.path())
}
/** The downloaded template with a duplicate rank, an unknown department reference and a non-numeric rank. */
async function invalidWorkbook(template: Buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(template)
  const jobs = workbook.getWorksheet('Job positions')!
  jobs.getCell('A4').value = 'HR'; jobs.getCell('C4').value = 'REC'; jobs.getCell('D4').value = 'Recruiter'
  const levels = workbook.getWorksheet('Levels')!
  levels.getCell('D3').value = 1
  levels.getCell('D6').value = 'abc'
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function watch(page: Page) {
  const seen = observe(page)
  page.on('console', message => {
    if (message.type() !== 'error') return
    const path = new URL(message.location().url || page.url()).pathname
    if (path === '/favicon.ico') return
    if (message.text().includes('status of 401') && ['/api/v1/registration/current', '/api/v1/workspace-auth/current'].includes(path)) return
    // The invalid-workbook case deliberately receives a 400 validation response.
    if (message.text().includes('status of 400') && path === '/api/v1/registration/org-structure/validate') return
    seen.errors.push(`${message.text()} (${path})`)
  })
  page.on('response', response => { if (response.status() >= 500) seen.errors.push(`${response.status()} ${response.url()}`) })
  return seen
}

async function upload(page: Page, name: string, buffer: Buffer, mimeType = XLSX) {
  await page.getByTestId('org-structure-file').setInputFiles({ name, mimeType, buffer })
}
async function openImport(page: Page) {
  await page.goto('/guest/register')
  await page.getByRole('button', { name: 'Import structure', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Import organization structure' })).toBeVisible()
}
async function panel(page: Page, name: string) {
  const button = page.getByRole('group', { name: 'Structure panels' }).getByRole('button', { name, exact: true })
  if (await button.isVisible()) await button.click()
}
function psql(sql: string) {
  return execFileSync('docker', ['exec', `${STACK}-postgres-1`, 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-At', '-c', sql],
    { encoding: 'utf8' }).trim()
}
function graphOf(organization: string) {
  if (!/^[a-f0-9-]{36}$/.test(organization)) throw new Error('Invalid test organization')
  const query = `MATCH (n {organizationId:"${organization}"}) RETURN "NODE|" + labels(n)[0] + "|" + n.code + "|" + n.name AS value `
    + `UNION ALL MATCH (a {organizationId:"${organization}"})-[r]->(b) RETURN "EDGE|" + type(r) + "|" + a.code + ">" + b.code AS value`
  const output = execFileSync('docker', ['exec', `${STACK}-neo4j-1`, 'sh', '-c',
    `cypher-shell -u neo4j -p "\${NEO4J_AUTH#*/}" --format plain '${query}'`], { encoding: 'utf8' })
  return output.trim().split(/\r?\n/).slice(1).map(line => String(JSON.parse(line))).sort()
}

async function finishRegistration(page: Page, width: number) {
  const email = `org-import-${randomUUID()}@example.test`
  await page.getByLabel('Business name', { exact: false }).fill(`Org Import ${width} ${randomUUID().slice(0, 6)}`)
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.getByLabel('Full name', { exact: false }).fill('Structure Test Owner')
  await page.getByLabel('Login email', { exact: false }).fill(email)
  await page.getByLabel('Phone number', { exact: false }).fill('0901234567')
  await page.getByRole('checkbox', { name: /I agree/ }).check()
  await page.getByLabel(/^Password/).fill('Isolated structure test password!')
  await page.getByLabel(/^Confirm Password/).fill('Isolated structure test password!')
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/registration') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const registered = await response
  expect(registered.status()).toBe(201)
  const sent = JSON.parse(registered.request().postData()!).organizationStructure
  expect([sent.departments.length, sent.jobPositions.length, sent.targetRoles.length, sent.levels.length]).toEqual([2, 2, 3, 5])
  expect(psql(`SELECT s.node_count || '/' || s.relationship_count FROM platform.registration_org_structure s JOIN platform.organization_registration r USING (registration_id) JOIN platform.account a ON a.account_id=r.account_id WHERE a.normalized_identifier='${email}'`)).toBe('12/10')
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  await page.goto('/guest/plans')
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  await page.getByRole('dialog', { name: 'Confirm purchase terms' }).getByRole('button', { name: 'Create payment order', exact: true }).click()
  await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Enter workspace', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
  await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+\/admin\/subscription$/, { timeout: 30_000 })
  const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
  return text(identity.organizationId)
}

for (const width of [1440, 390]) {
  test(`imports, reviews and provisions the organization structure workbook (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const seen = watch(page)
    await openImport(page)
    await expect(page.getByRole('button', { name: 'Apply structure', exact: true })).toBeDisabled()
    // Before a workbook is chosen the full dialog shows zero counts, an empty list and only the organization root.
    await expect(page.getByText('No structure yet. Upload your workbook to see it here.')).toBeVisible()
    await expect(page.getByLabel('Imported structure counts')).toContainText('Department: 0')
    await panel(page, 'Graph')
    await expect(page.locator('.starter-catalog-graph')).toContainText('1 nodeOrganization')
    await page.screenshot({ path: test.info().outputPath(`org-structure-empty-${width}.png`), animations: 'disabled' })
    await panel(page, 'Structure')
    const downloaded = await downloadTemplate(page)
    expect(downloaded.subarray(0, 2).toString()).toBe('PK')

    // Uploading the downloaded template itself proves the browser-generated workbook round-trips.
    await upload(page, 'company.xlsx', downloaded)
    await expect(page.getByTestId('org-structure-file-name')).toHaveText('company.xlsx')
    const tree = page.getByRole('tree', { name: 'Imported organization structure' })
    await expect(tree.getByRole('treeitem')).toHaveCount(12, { timeout: 30_000 })
    await page.getByRole('textbox', { name: 'Search structure' }).fill('frontend')
    await expect(tree.getByRole('treeitem')).toHaveCount(3)
    await tree.getByRole('button', { name: /^Frontend Developer/ }).click()
    await panel(page, 'Graph')
    await expect(page.getByTestId('org-structure-detail')).toContainText('FE-DEV')
    await expect(page.getByTestId('org-structure-detail')).toContainText('Builds accessible web interfaces.')
    await expect(page.getByTestId('catalog-graph').locator('canvas')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Graph node types' })).toContainText('Organization')
    await expect(page.getByRole('list', { name: 'Graph node types' })).toContainText('Department')
    // Root node plus 2 departments, 2 job positions, 3 roles and the merged Junior/Senior levels.
    await expect(page.locator('.starter-catalog-graph')).toContainText('10 nodes')
    await expect.poll(() => page.getByTestId('catalog-graph').locator('canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      let painted = 0
      // The canvas itself is transparent; only drawn nodes and edges leave opaque pixels.
      for (let i = 3; i < data.length; i += 4) if (data[i] > 100) painted++
      return painted
    }), { message: 'Graph draws nodes, not only an empty canvas' }).toBeGreaterThan(500)
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    await page.screenshot({ path: test.info().outputPath(`org-structure-dialog-${width}.png`), animations: 'disabled' })

    await page.getByRole('button', { name: 'Apply structure', exact: true }).click()
    await expect(page.getByText('Imported from company.xlsx', { exact: false })).toBeVisible()
    await expect(page.getByLabel('Imported structure counts')).toContainText('Department: 2')
    await expect(page.getByLabel('Imported structure counts')).toContainText('Level: 2')
    const organization = await finishRegistration(page, width)
    await expect.poll(() => graphOf(organization), { timeout: 30_000 }).toEqual([
      'EDGE|HAS_JOB_POSITION|ENG>DEV', 'EDGE|HAS_JOB_POSITION|QA>QA-ENG',
      'EDGE|HAS_LEVEL|BE-DEV>L1', 'EDGE|HAS_LEVEL|BE-DEV>L2', 'EDGE|HAS_LEVEL|FE-DEV>L1', 'EDGE|HAS_LEVEL|QA-AUTO>L1', 'EDGE|HAS_LEVEL|QA-AUTO>L2',
      'EDGE|HAS_ROLE|DEV>BE-DEV', 'EDGE|HAS_ROLE|DEV>FE-DEV', 'EDGE|HAS_ROLE|QA-ENG>QA-AUTO',
      'NODE|Department|ENG|Software Engineering', 'NODE|Department|QA|Quality Assurance',
      'NODE|JobPosition|DEV|Software Developer', 'NODE|JobPosition|QA-ENG|QA Engineer',
      'NODE|Level|L1|Junior', 'NODE|Level|L1|Junior', 'NODE|Level|L1|Junior', 'NODE|Level|L2|Senior', 'NODE|Level|L2|Senior',
      'NODE|TargetRole|BE-DEV|Backend Developer', 'NODE|TargetRole|FE-DEV|Frontend Developer', 'NODE|TargetRole|QA-AUTO|Automation Tester',
    ].sort())
    await page.screenshot({ path: test.info().outputPath(`workspace-ready-${width}.png`), fullPage: true })
    expect(seen.errors).toEqual([])
    expect(seen.network).toEqual([])
  })
}

test('invalid workbooks list errors by sheet and row, never apply, and the API requires CSRF (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const seen = watch(page)
  await openImport(page)
  expect((await page.request.post('/api/v1/registration/org-structure/validate', { data: {} })).status()).toBe(403)
  const rejected = await mutate(page.request, '/api/v1/registration/org-structure/validate', {})
  expect(rejected.status()).toBe(400)
  expect(record(await rejected.json()).field).toBe('organizationStructure')

  await upload(page, 'broken.xlsx', await invalidWorkbook(await downloadTemplate(page)))
  const errors = page.getByTestId('org-structure-errors')
  await expect(errors).toContainText('Level rank', { timeout: 30_000 })
  await expect(errors.getByRole('row')).toHaveCount(4)
  await expect(errors).toContainText('Department code HR is not defined in the Departments sheet.')
  await expect(errors.getByRole('row').nth(1)).toContainText('Job positions')
  await expect(errors.getByRole('row').nth(2)).toContainText('Levels')
  await expect(page.getByRole('button', { name: 'Apply structure', exact: true })).toBeDisabled()
  await page.screenshot({ path: test.info().outputPath('org-structure-errors-375.png') })

  await upload(page, 'old-format.csv', Buffer.from('Department code,Department name\nENG,Engineering'), 'text/csv')
  await expect(page.getByRole('alert')).toContainText('Upload the .xlsx workbook made from the template.')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Imported from', { exact: false })).toHaveCount(0)
  expect(seen.errors).toEqual([])
})
