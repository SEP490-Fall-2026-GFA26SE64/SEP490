import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'

async function loginAs(page: Page, email: string, password: string) {
  const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  const res = await page.request.post('/api/v1/workspace-auth/sign-in', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
}

const CASES = [
  { tab: 'Competencies', file: 'Competency_Import_Template.xlsx', sheets: ['Instructions', 'Competencies', 'Competency_Skills'], preview: 'COMP-SYS-01' },
  { tab: 'Micro-skills', file: 'MicroSkill_Import_Template.xlsx', sheets: ['Instructions', 'Micro_Skills', 'Competency_Skills', 'Prerequisites'], preview: 'MS-SKILL01' },
]

test.describe('FR-05.01 ontology import templates follow the organization structure template design', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000)
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await loginAs(page, process.env.SYSTEM_TEST_EXPERT_EMAIL ?? 'expert@workspace.dev.invalid',
      process.env.SYSTEM_TEST_EXPERT_PASSWORD ?? 'Workspace-Development-490!')
  })

  for (const c of CASES) {
    test(`${c.tab}: downloads styled template and the import preview reads it back`, async ({ page }, info) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
      await page.goto('/expert/ontology')
      await page.getByRole('tab', { name: c.tab, exact: true }).click()
      await page.getByRole('button', { name: 'Import Excel' }).click()
      const dialog = page.getByRole('dialog')
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), dialog.getByRole('button', { name: /Download Template/ }).click()])
        .catch(error => { throw new Error(`${error.message}\nBrowser errors: ${errors.join('\n')}`) })
      expect(download.suggestedFilename()).toBe(c.file)
      const path = info.outputPath(c.file)
      await download.saveAs(path)

      const workbook = XLSX.read(readFileSync(path), { type: 'buffer', cellStyles: true })
      expect(workbook.SheetNames).toEqual(c.sheets)
      expect(String(workbook.Sheets.Instructions.B2?.v)).toMatch(/import template/)
      const header = workbook.Sheets[c.sheets[1]].A1 as XLSX.CellObject & { s?: { fgColor?: { rgb?: string } } }
      expect(header.s?.fgColor?.rgb).toBe('EA580C')

      await dialog.locator('input[type="file"]').setInputFiles(path)
      await expect(dialog.getByText(c.preview).first()).toBeVisible()
      await page.screenshot({ path: info.outputPath(`${c.tab}-preview.png`) })
    })
  }
})
