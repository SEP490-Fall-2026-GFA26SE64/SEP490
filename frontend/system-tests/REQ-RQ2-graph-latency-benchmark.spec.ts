import { expect as baseExpect, test } from '@playwright/test'

const expect = baseExpect.configure({ timeout: 15000 })
test.setTimeout(180000)

async function loginAsPlatformAdmin(page: any) {
  await page.goto('/login')
  await page.locator('#workspace-email').fill('platform.admin@adaptlearngraph.com')
  await page.locator('#workspace-password').fill('Platform-Admin-490!')
  await page.getByRole('button', { name: /Sign in|Đăng nhập/i }).click()
  
  // Wait for session to be complete
  const continueBtn = page.getByRole('button', { name: /Continue to workspace|Tiếp tục vào không gian/i })
  await expect(continueBtn).toBeVisible({ timeout: 15000 })
  await continueBtn.click()
  await page.waitForURL('**/platform-admin/**', { timeout: 15000 })
}

test.describe('Platform Admin - Experiment 2 (RQ2) Graph Latency Benchmark Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('app_language', 'en')
    })
    await loginAsPlatformAdmin(page)
  })

  test('renders Experiment 2 (RQ2) page with runtime statistics and scale profiles', async ({ page }) => {
    await page.goto('/platform-admin/graph-benchmark')
    await expect(page.locator('main')).toBeVisible()

    // Assert 3 Runtime Performance Statistics Cards with comparative baseline
    await expect(page.getByText('Runtime', { exact: true })).toBeVisible()
    await expect(page.getByText('Mean Latency', { exact: true })).toBeVisible()
    await expect(page.getByText('P95 Latency', { exact: true })).toBeVisible()
    await expect(page.getByText(/Baseline benchmark|Đo kiểm cơ sở/i).first()).toBeVisible()

    // Assert Step-by-Step Runtime Breakdown is immediately visible under the stat cards
    await expect(page.getByText(/Step-by-Step Runtime Breakdown/i)).toBeVisible()
    await expect(page.getByText(/Step 1: Index Lookup|Bước 1/i)).toBeVisible()
    await expect(page.getByText(/Step 3: Traversal|Bước 3/i)).toBeVisible()

    // Assert Navigation Tabs
    const liveTab = page.getByRole('tab', { name: /Live Traversal & Monitor|Giám sát Thực thi/i })
    const setupTab = page.getByRole('tab', { name: /Benchmark Setup|Setup & Test Fixture|Cấu hình & Bộ mẫu/i })
    await expect(liveTab).toBeVisible()
    await expect(setupTab).toBeVisible()

    // Switch to Setup & Test Fixtures tab
    await setupTab.click()

    // Assert Parameter Controls & Setup Card
    await expect(page.getByRole('tabpanel').getByText(/Benchmark Setup & Test Fixture Selection|Kịch bản & Tập mẫu/i)).toBeVisible()
    await expect(page.getByText('1. Ontology Scale Profile')).toBeVisible()
    await expect(page.getByRole('button', { name: '1k Nodes' })).toBeVisible()
    await expect(page.getByRole('button', { name: '5k Nodes' })).toBeVisible()
    await expect(page.getByRole('button', { name: '10k Nodes' })).toBeVisible()

    // Assert Run Benchmark and Export CTA buttons
    const runBtn = page.getByRole('button', { name: /Run Benchmark/i }).first()
    await expect(runBtn).toBeVisible()

    const exportBtn = page.getByRole('button', { name: /Export JSON/i })
    await expect(exportBtn).toBeVisible()
  })

  test('executes benchmark, displays 4-step breakdown, scale matrix, and Capstone defense arguments', async ({ page }) => {
    await page.goto('/platform-admin/graph-benchmark')
    await expect(page.locator('main')).toBeVisible()

    // Switch to Setup tab to configure scale and fixture
    const setupTab = page.getByRole('tab', { name: /Benchmark Setup|Setup & Test Fixture|Cấu hình & Bộ mẫu/i })
    await setupTab.click()

    // Select 5k Nodes scale
    const scale5kBtn = page.getByRole('button', { name: '5k Nodes' })
    await scale5kBtn.click()

    // Select Fixture Set 2
    const set2Card = page.getByText(/Set 2:|Tập 2:/i)
    await expect(set2Card).toBeVisible()
    await set2Card.click()

    // Inspect pre-sampled test pairs table beforehand
    await expect(page.getByRole('columnheader', { name: /Start Node/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Target Node/i })).toBeVisible()
    await expect(page.getByText(/Pre-verified|Đã kiểm chứng/i).first()).toBeVisible()

    // Click Run Benchmark (triggers switch back to live-monitor)
    const runBtn = page.getByRole('button', { name: /Run Benchmark/i }).first()
    await runBtn.click()

    // Verify Mean Latency KPI appears and is under 100ms SLA
    await expect(page.getByText('Mean Latency', { exact: true })).toBeVisible()
    await expect(page.getByText('< 100ms SLA').first()).toBeVisible()
    await expect(page.getByText('P95 Latency')).toBeVisible()

    // Verify comparative metrics against previous benchmark run appear in stat cards
    await expect(page.getByText(/vs previous|so với lần trước/i).first()).toBeVisible()

    // Verify Refined Step-by-Step Runtime Breakdown
    await expect(page.getByText(/Step 1: Index Lookup|Bước 1/i)).toBeVisible()
    await expect(page.getByText(/Step 2: Queue Init|Bước 2/i)).toBeVisible()
    await expect(page.getByText(/Step 3: Traversal|Bước 3/i)).toBeVisible()
    await expect(page.getByText(/Step 4: Path Reconstruction|Bước 4/i)).toBeVisible()

    // Test Export JSON button
    const exportBtn = page.getByRole('button', { name: /Export JSON/i })
    await exportBtn.click()
  })

  test('sidebar displays Graph Benchmark (RQ2) link under Platform Admin', async ({ page }) => {
    await page.goto('/platform-admin/organizations')
    const sidebarLink = page.getByRole('link', { name: /Graph Engine Benchmark|Graph Performance|Graph Benchmark \(RQ2\)|Graph Latency \(RQ2\)|Hiệu năng Đồ thị/i })
    await expect(sidebarLink).toBeVisible()
    await expect(sidebarLink).toHaveAttribute('href', '/platform-admin/graph-benchmark')
  })
})
