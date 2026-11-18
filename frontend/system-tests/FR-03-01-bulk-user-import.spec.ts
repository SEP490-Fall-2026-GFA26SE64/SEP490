import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type ExcelJS from 'exceljs'

async function newWorkbook(): Promise<ExcelJS.Workbook> {
  // The Node entry of exceljs does not load under the Playwright transpiler; the browser bundle does.
  const mod = await import('exceljs/dist/exceljs.min.js') as unknown as { default?: typeof ExcelJS } & typeof ExcelJS
  const lib = mod.default ?? mod
  return new lib.Workbook()
}

const ARTIFACTS = path.resolve('test-results/FR-03-01-import')
mkdirSync(ARTIFACTS, { recursive: true })

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill('admin@technova.com')
  await page.locator('input[type="password"]').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const proceed = page.getByRole('button', { name: 'Continue to workspace', exact: true })
  await proceed.click({ timeout: 10_000 }).catch(() => undefined)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: /User Accounts|Tài khoản người dùng/i })).toBeVisible({ timeout: 20_000 })
}

async function openImport(page: Page) {
  await page.getByRole('button', { name: /^(Import Excel|Nhập Excel)$/ }).click()
  const dialog = page.getByRole('dialog', { name: /Import users from Excel|Nhập người dùng từ Excel/ })
  await expect(dialog).toBeVisible()
  return dialog
}

async function downloadTemplate(page: Page, dialog: ReturnType<Page['getByRole']>) {
  const button = dialog.getByRole('button', { name: /Download template|Tải file mẫu/ })
  await expect(button).toBeEnabled({ timeout: 15_000 })
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()])
  const file = path.join(ARTIFACTS, download.suggestedFilename())
  await download.saveAs(file)
  const workbook = await newWorkbook()
  await workbook.xlsx.load(readFileSync(file) as unknown as ArrayBuffer)
  return { workbook, file }
}

/** First Department → Job position pair listed on the Lists tab (skips italic "none" placeholders). */
function firstAssignment(workbook: ExcelJS.Workbook) {
  const lists = workbook.worksheets[2]
  let inTable = false
  let department = ''
  for (let r = 1; r <= lists.rowCount; r++) {
    const b = String(lists.getCell(r, 2).text ?? '').trim()
    const c = lists.getCell(r, 3)
    if (!inTable) { inTable = b === 'Department' || b === 'Phòng ban'; continue }
    if (b) department = b
    if (department && c.text && !c.font?.italic) return { department, jobPosition: String(c.text).trim() }
  }
  throw new Error('No department/job position pair in Lists tab')
}

async function buildUpload(workbook: ExcelJS.Workbook, rows: string[][], name: string) {
  const users = workbook.worksheets[1]
  rows.forEach((values, index) => {
    values.forEach((value, col) => { users.getCell(4 + index, col + 1).value = value || null })
  })
  const file = path.join(ARTIFACTS, name)
  writeFileSync(file, Buffer.from(await workbook.xlsx.writeBuffer()))
  return file
}

test.describe('FR-03.01 bulk user import from Excel', () => {
  test.setTimeout(180_000)

  test('desktop: template, validation preview, error report and partial import', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    const failed: string[] = []
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.request().method()} ${new URL(response.url()).pathname}`) })
    const dialog = await openImport(page)
    await page.screenshot({ path: path.join(ARTIFACTS, 'upload-desktop.png') })

    const { workbook } = await downloadTemplate(page, dialog)
    const visible = workbook.worksheets.filter(sheet => sheet.state === 'visible').map(sheet => sheet.name)
    expect(visible).toEqual(['Guide', 'Users', 'Lists'])
    expect(workbook.worksheets[0].name).toBe('Guide')
    expect(workbook.worksheets[3].state).toBe('veryHidden')
    expect(workbook.worksheets[1].getCell('B3').text).toContain('Email')

    await dialog.getByLabel('Choose Excel file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(dialog.getByRole('alert')).toContainText('Only .xlsx files are supported')

    const { department, jobPosition } = firstAssignment(workbook)
    const stamp = Date.now()
    const expertEmail = `import-qa-expert-${stamp}@example.com`
    const employeeEmail = `import-qa-employee-${stamp}@example.com`
    const upload = await buildUpload(workbook, [
      ['Import QA Expert', expertEmail, 'Domain Expert', department, jobPosition],
      ['Import QA Employee', employeeEmail, 'Employee', department, jobPosition],
      ['Broken Email', 'not-an-email', 'Employee', department, jobPosition],
      ['Existing Member', 'employee@technova.com', 'Employee', department, jobPosition],
      ['Manager Without Department', `import-qa-ld-${stamp}@example.com`, 'L&D Manager'],
    ], 'upload-mixed.xlsx')

    await dialog.getByLabel('Choose Excel file').setInputFiles(upload)
    await expect(dialog.getByText('5 rows', { exact: true })).toBeVisible()
    await expect(dialog.getByText('2 valid', { exact: true })).toBeVisible()
    await expect(dialog.getByText('3 with errors', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Email format is invalid.').first()).toBeVisible()
    await expect(dialog.getByText(/already has an account/).first()).toBeVisible()
    await page.screenshot({ path: path.join(ARTIFACTS, 'preview-desktop.png') })

    await dialog.getByLabel('Show rows with errors only').check()
    await expect(dialog.locator('tbody tr')).toHaveCount(3)
    await dialog.getByLabel('Show rows with errors only').uncheck()

    const [reportDownload] = await Promise.all([
      page.waitForEvent('download'),
      dialog.getByRole('button', { name: 'Download error report' }).click(),
    ])
    const reportFile = path.join(ARTIFACTS, reportDownload.suggestedFilename())
    await reportDownload.saveAs(reportFile)
    const report = await newWorkbook()
    await report.xlsx.load(readFileSync(reportFile) as unknown as ArrayBuffer)
    const reportUsers = report.worksheets[1]
    expect(reportUsers.getCell('B4').text).toBe('not-an-email')
    expect(reportUsers.getCell('B6').text).toContain('import-qa-ld-')
    expect(reportUsers.getCell('H4').text.length).toBeGreaterThan(0)
    expect(reportUsers.getCell('B7').text).toBe('')

    await dialog.getByRole('button', { name: 'Import 2 valid user(s)' }).click()
    await expect(dialog.getByText(/2 invitation\(s\) sent\. 3 row\(s\) not imported\./)).toBeVisible({ timeout: 60_000 })
    await page.screenshot({ path: path.join(ARTIFACTS, 'done-desktop.png') })
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(dialog).toBeHidden()

    await page.reload()
    const search = page.getByPlaceholder(/Search name or email/i)
    await search.fill(expertEmail)
    await expect(page.getByText(expertEmail).first()).toBeVisible({ timeout: 20_000 })
    await page.screenshot({ path: path.join(ARTIFACTS, 'directory-after-import.png') })
    await search.fill(employeeEmail)
    await expect(page.getByText(employeeEmail).first()).toBeVisible()
    expect(failed).toEqual([])
  })

  test('mobile 390x844: upload and preview stay usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    const dialog = await openImport(page)
    await expect(dialog.getByRole('button', { name: 'Choose file' })).toBeVisible()
    await page.screenshot({ path: path.join(ARTIFACTS, 'upload-mobile.png') })
    const { workbook } = await downloadTemplate(page, dialog)
    const upload = await buildUpload(workbook, [
      ['Mobile Broken', 'still-not-an-email', 'Employee'],
      ['Mobile Unknown Role', 'mobile-role@example.com', 'Supervisor'],
    ], 'upload-mobile.xlsx')
    await dialog.getByLabel('Choose Excel file').setInputFiles(upload)
    await expect(dialog.getByText('2 with errors', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Import 0 valid user(s)' })).toBeDisabled()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({ path: path.join(ARTIFACTS, 'preview-mobile.png') })
  })
})
