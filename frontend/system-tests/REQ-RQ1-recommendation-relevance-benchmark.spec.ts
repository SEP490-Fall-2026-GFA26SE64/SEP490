import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const XLSX: typeof import('xlsx') = createRequire(import.meta.url)('xlsx')
import { expect as baseExpect, test, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../..')
const STEP1_EXCEL_PATH = path.join(REPO_ROOT, 'documents/research/RQ1_Input_1_50_Golden_Profiles_Baseline.xlsx')
const GOLDEN_SET_PATH = path.join(REPO_ROOT, 'documents/research/RQ1_Golden_Set_50_Dong_Thuan.xlsx')

const expect = baseExpect.configure({ timeout: 15000 })
test.setTimeout(180000)

async function ensureBenchmarkRouteReady(page: Page, targetPath: string) {
  await page.goto(process.env.RQ1_REVIEW_PAGE ?? targetPath)
  if (page.url().includes('/login')) {
    await page.locator('#workspace-email').fill('platform.admin@adaptlearngraph.com')
    await page.locator('#workspace-password').fill('Platform-Admin-490!')
    await page.getByRole('button', { name: /Sign in|Đăng nhập/i }).click()
    await waitForWorkspaceEntry(page)
    await page.goto(process.env.RQ1_REVIEW_PAGE ?? targetPath)
  }
}

test.describe('Experiment 1 (RQ1) Recommendation Relevance Benchmark Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app_language', 'vi')
    })
  })

  test('executes complete 2-step workflow: Step 1 upload 50 baseline profiles Excel -> generate skill gaps & module pathways -> Step 2 upload expert evaluation Excel -> compute Hit Rate@5', async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = []
    const failedCatalogRequests: string[] = []
    page.on('pageerror', error => browserErrors.push(error.message))
    page.on('requestfailed', request => { if (request.url().includes('/fixtures/rq1-catalog/')) failedCatalogRequests.push(request.url()) })
    await ensureBenchmarkRouteReady(page, '/platform-admin/rq1-benchmark')
    await expect(page.locator('main')).toBeVisible()

    // 1. Verify stored catalog KPI (20 Skills • 72 Modules) and initial locked Step 2 state
    await expect(page.getByText('20 Skills • 72 Modules')).toBeVisible()
    await expect(page.getByText(/Chờ nộp phiếu chuyên gia|Awaiting Expert File/i)).toBeVisible()
    await expect(page.getByTestId('rq1-step2-upload-btn')).toBeDisabled()

    // 2. Step 1: Upload the 50 Golden Set Baseline Profiles Excel file
    const step1Input = page.getByTestId('rq1-step1-file-input')
    await step1Input.setInputFiles(STEP1_EXCEL_PATH)

    // Verify all 50 profiles are parsed and pathway inspector renders
    await expect(page.getByText('50 Profiles')).toBeVisible()
    await expect(page.getByTestId('rq1-profile-item-SYN-0DBAA5DE1F7F')).toBeVisible()
    await expect(page.getByTestId('rq1-profile-item-SYN-0E35D5A7A52B')).toBeVisible()
    await expect(page.getByTestId('rq1-active-gap-count')).toHaveText('1')

    // Click second profile SYN-0E35D5A7A52B (Middle, 7 skill gaps)
    await page.getByTestId('rq1-profile-item-SYN-0E35D5A7A52B').click()
    await expect(page.getByTestId('rq1-active-gap-count')).toHaveText('7')
    // Top-5 lists for G0 and C0 are shown in the comparison tab.
    await page.getByRole('tab', { name: /2\. So sánh G0 và CBF|2\. Compare G0 and CBF/i }).click()
    await expect(page.getByText(/Graph-Traversal của Hệ thống \(G0 Top-5\)|System Graph-Traversal/i)).toBeVisible()
    await expect(page.getByText(/Content-Based Filtering \(C0 TF-IDF Top-5\)/i)).toBeVisible()

    // Before Step 2 upload, expert scoring badge shows awaiting Step 2
    await expect(
      page.getByText(/Chờ file đối chiếu ở Bước 2|Awaiting a reference file in Step 2/i)
    ).toBeVisible()

    // 3. Step 2: Upload the Expert Golden Set Evaluation Excel file
    await expect(page.getByTestId('rq1-step2-upload-btn')).toBeEnabled()
    const step2Input = page.getByTestId('rq1-step2-file-input')
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('rq1-step2-template-btn').click()
    const download = await downloadPromise
    const templatePath = await download.path()
    const workbook = XLSX.readFile(templatePath!)
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Expert_Evaluations, { defval: '' })
    expect(rows).toHaveLength(50)
    expect(rows.every(row => row['Grade 0 Module IDs'] === '' && row['Grade 2 Module IDs'] === '')).toBe(true)
    await step2Input.setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) })
    await expect(page.getByRole('alert')).toContainText('Chưa xác nhận nhãn từ chuyên gia độc lập')
    const modules = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Module_Reference).map(row => row['Module ID'])
    // Software-test labels only; no claim of real expert annotation.
    rows.forEach(row => {
      row['Evaluation Source'] = 'HUMAN_EXPERT'
      row['Grade 2 Module IDs'] = modules[0]
      row['Grade 0 Module IDs'] = modules.slice(1).join(', ')
      row['Reviewer Note'] = 'PLAYWRIGHT TEST DOUBLE ONLY'
    })
    const upload = async () => {
      workbook.Sheets.Expert_Evaluations = XLSX.utils.json_to_sheet(rows)
      await step2Input.setInputFiles({ name: 'expert-test-only.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) })
    }
    await upload()

    // Verify Step 2 unlocks Hit Rate@5 and per-profile Grade 2 badges
    await expect(page.getByText(/Đã chấm 50 hồ sơ|Scored 50 profiles/i)).toBeVisible()
    await expect(page.getByText(/Chuyên gia: Grade|Expert: Grade/i).first()).toBeVisible()

    // 4. Switch to Tab 2: 50 Golden Set Expert Comparison & RQ1 Metrics
    const tab2 = page.getByRole('tab', { name: /2\. So sánh G0 và CBF|2\. Compare G0 and CBF/i })
    await tab2.click()
    await expect(page.getByText('Hit Rate@5 (HR@5 — Primary Metric)')).toBeVisible()
    await expect(page.getByText('Graded nDCG@5 (Linear Gain)')).toBeVisible()
    await expect(page.getByText('Junior').first()).toBeVisible()
    await expect(page.getByText('Middle').first()).toBeVisible()
    await expect(page.getByText('Senior').first()).toBeVisible()

    // 5. Switch to Tab 3: Stored Catalog Repository (20 Skills & 72 Modules)
    const tab3 = page.getByRole('tab', {
      name: /3\. Kho Học Liệu & Kỹ Năng Lưu Trữ|3\. Stored Catalog Repository/i,
    })
    await tab3.click()
    await expect(page.getByText('MS-CORE01')).toBeVisible()
    await page.getByRole('button', { name: /72 Học phần|72 Learning Modules/i }).click()
    await expect(page.getByText('RQM-36A294466D67')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('rq1-desktop.png'), fullPage: false })
    rows[0]['Grade 0 Module IDs'] = ''
    await upload()
    await expect(page.getByRole('alert')).toContainText('Chưa đủ dữ liệu đánh giá toàn bộ catalog')
    await expect(page.getByText(/Đã chấm 50 hồ sơ/)).toHaveCount(0)
    rows[0]['Grade 0 Module IDs'] = modules.slice(1).join(', ')
    const snapshot = JSON.parse(String(rows[0]['Profile JSON Snapshot']))
    const passed = snapshot.baselineObservations.find((b: { outcome: string }) => b.outcome === 'PASSED')
    const failed = snapshot.baselineObservations.find((b: { outcome: string }) => b.outcome === 'FAILED')
    passed.outcome = 'FAILED'; failed.outcome = 'PASSED'
    rows[0]['Profile JSON Snapshot'] = JSON.stringify(snapshot)
    await upload()
    await expect(page.getByRole('alert')).toContainText('Hồ sơ/baseline hoặc catalog của hai file không khớp')
    await page.setViewportSize({ width: 390, height: 844 })
    const collapseNav = page.getByRole('button', { name: /Thu gọn thanh điều hướng|Collapse navigation/i })
    if (await collapseNav.isVisible()) await collapseNav.click()
    // Toasts may auto-dismiss between listing and clicking.
    for (const button of await page.getByRole('button', { name: /Đóng thông báo|Dismiss notification/i }).all()) await button.click({ timeout: 2000 }).catch(() => {})
    await page.getByTestId('rq1-step2-template-btn').scrollIntoViewIfNeeded()
    await expect(page.getByTestId('rq1-step2-template-btn')).toBeVisible()
    const templateBounds = await page.getByTestId('rq1-step2-template-btn').boundingBox()
    expect(templateBounds!.x + templateBounds!.width).toBeLessThanOrEqual(390)
    await page.screenshot({ path: testInfo.outputPath('rq1-mobile.png'), fullPage: false })
    expect(browserErrors).toEqual([])
    expect(failedCatalogRequests).toEqual([])
  })

  test('compares G0/C0 top-5 with the consensus Golden Set workbook and reproduces 48/50 vs 41/50', async ({ page }) => {
    const browserErrors: string[] = []
    page.on('pageerror', error => browserErrors.push(error.message))
    await ensureBenchmarkRouteReady(page, '/platform-admin/rq1-benchmark')
    await page.getByTestId('rq1-step1-file-input').setInputFiles(STEP1_EXCEL_PATH)
    await expect(page.getByText('50 Profiles')).toBeVisible()
    await page.getByTestId('rq1-step2-file-input').setInputFiles(GOLDEN_SET_PATH)
    await expect(page.getByText(/Đã đối chiếu 50 hồ sơ|50 profiles compared/i)).toBeVisible()
    await page.getByRole('tab', { name: /2\. So sánh G0 và CBF|2\. Compare G0 and CBF/i }).click()
    await expect(page.getByText('48/50 · 96%')).toBeVisible()
    await expect(page.getByText('41/50 · 82%')).toBeVisible()
    expect(browserErrors).toEqual([])
  })
})
