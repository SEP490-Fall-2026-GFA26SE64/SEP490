import { expect as baseExpect, test, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

const expect = baseExpect.configure({ timeout: 15000 })
test.setTimeout(120000)

async function ensureBenchmarkRouteReady(page: Page, targetPath: string) {
  await page.goto(process.env.RQ3_REVIEW_PAGE ?? targetPath)
  if (page.url().includes('/login')) {
    await page.locator('#workspace-email').fill('platform.admin@adaptlearngraph.com')
    await page.locator('#workspace-password').fill('Platform-Admin-490!')
    await page.getByRole('button', { name: /Sign in|Đăng nhập/i }).click()
    await waitForWorkspaceEntry(page)
    await page.goto(process.env.RQ3_REVIEW_PAGE ?? targetPath)
  }
}

test.describe('Experiment 3 (RQ3) Adaptive Pathway Efficiency Benchmark Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app_language', 'vi')
    })
  })

  test('displays 100-profile × 30-replicate RQ3 trajectory comparison, reloads saved results, inspects strata & sensitivity grid, filters individual learner profiles, and passes desktop & mobile layout checks', async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = []
    const failedFixtureRequests: string[] = []
    page.on('pageerror', (error) => browserErrors.push(error.message))
    page.on('requestfailed', (request) => {
      if (request.url().includes('/fixtures/rq3-samples/')) {
        failedFixtureRequests.push(request.url())
      }
    })

    await ensureBenchmarkRouteReady(page, '/platform-admin/rq3-benchmark')
    await expect(page.locator('main')).toBeVisible()

    // 1. Verify KPI cards and Checkpoint Trajectory Table (0, 10, 20, 30, 40)
    await expect(page.getByText('100 × 30')).toBeVisible()
    await expect(page.getByText('+0.0427').first()).toBeVisible()
    await expect(page.getByText('72 / 27 / 1')).toBeVisible()
    await expect(page.getByTestId('rq3-checkpoint-table')).toBeVisible()
    await expect(page.getByText('0.7067').first()).toBeVisible()
    await expect(page.getByText('0.6128').first()).toBeVisible()
    await expect(page.getByText('0.5701').first()).toBeVisible()

    // 2. Click the reload button (it reloads saved results, not a new simulation) and verify the load badge
    const runBtn = page.getByTestId('rq3-run-button')
    await expect(runBtn).toBeEnabled()
    await runBtn.click()
    await expect(runBtn).toHaveText(/Tải lại kết quả đã lưu|Reload saved results/)
    await expect(page.getByText(/lần tải #2|load #2/i)).toBeVisible()

    // 3. Switch to Tab 2: Strata & Sensitivity Analysis
    await page.getByTestId('rq3-tab-strata').click()
    await expect(page.getByText('HAS_UNACHIEVED_PREREQUISITES')).toBeVisible()
    await expect(page.getByText('ALL_PREREQUISITES_ALREADY_ACHIEVED')).toBeVisible()
    await expect(page.getByText('Primary (η=0.20, λ=0.50, assessment cost 1, budget 40)')).toBeVisible()
    await expect(page.getByTestId('rq3-secondary-outcomes')).toBeVisible()
    await expect(page.getByTestId('rq3-sensitivity-table').getByText('Long horizon (budget 80)')).toBeVisible()
    await expect(page.getByTestId('rq3-sensitivity-table').getByText('Equal initial knowledge control')).toBeVisible()

    // 4. Switch to Tab 3: 100-Profile Trajectory Inspector
    await page.getByTestId('rq3-tab-inspector').click()
    await expect(page.getByText('SYN-76155D6F7B2C').first()).toBeVisible()

    // Test empty search state and reset filter edge case
    const searchInput = page.getByPlaceholder(/Tìm mã hồ sơ|Search profile ID/i)
    await searchInput.fill('NON-EXISTENT-PROFILE-XYZ')
    await expect(
      page.getByText(/Không tìm thấy hồ sơ phù hợp|No learner profiles match/i),
    ).toBeVisible()
    await page.getByRole('button', { name: /Đặt lại bộ lọc|Reset filters/i }).click()
    await expect(page.getByText('SYN-76155D6F7B2C').first()).toBeVisible()

    await page.screenshot({ path: testInfo.outputPath('rq3-desktop.png'), fullPage: false })

    // 5. Verify mobile viewport (390×844) layout
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId('rq3-run-button')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('rq3-mobile.png'), fullPage: false })

    expect(browserErrors).toEqual([])
    expect(failedFixtureRequests).toEqual([])
  })
})
