import { expect, test } from '@playwright/test'

test.describe('REQ-002-F02 Baseline Assessment Creation & Activation Lifecycle', () => {
  test('L&D Manager configures, saves, previews, and activates an adaptive baseline assessment', async ({ page }) => {
    // 1. Authenticate as L&D Manager
    await page.goto('/login')
    await page.getByRole('button', { name: 'L&D Manager' }).click()
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/.*\/ld-manager\/dashboard/)

    // 2. Navigate to Baseline Assessments Management Directory
    await page.goto('/ld-manager/baseline-assessments')
    await expect(page).toHaveURL(/.*\/ld-manager\/baseline-assessments/)

    // Verify directory controls
    const chooseBtn = page.getByRole('button', { name: /Choose Occupation|Chọn/i }).first()
    await expect(chooseBtn).toBeVisible()

    // 3. Open Occupation Picker Dialog
    await chooseBtn.click()
    const occupationDialog = page.getByRole('dialog', { name: /Choose Occupation|Chọn/i })
    await expect(occupationDialog).toBeVisible()

    const occOption = occupationDialog.getByRole('button', { name: /Information Security Analysts/i })
    await expect(occOption).toBeVisible()
    await occOption.click()

    // 4. Inspect Workspace for Information Security Analysts
    await expect(page).toHaveURL(/.*\/ld-manager\/baseline-assessments\/OCC-15-1212\.00/)
    await expect(page.getByText('Information Security Analysts').first()).toBeVisible()

    // Verify capacity metrics
    await expect(page.getByRole('heading', { name: '135' })).toBeVisible() // capacity
    await expect(page.getByRole('heading', { name: '15' })).toBeVisible()  // skillCount
    await expect(page.getByRole('heading', { name: '45' })).toBeVisible()  // minimumQuestions

    // Check if there is an existing draft, discard it to test fresh creation
    const deleteDraftBtn = page.getByRole('button', { name: /Delete draft|Xóa bản nháp/i })
    if (await deleteDraftBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await deleteDraftBtn.click()
      const confirmDialog = page.getByRole('dialog', { name: /Confirm|Xác nhận/i })
      await expect(confirmDialog).toBeVisible()
      await confirmDialog.getByRole('button', { name: /Confirm|Xác nhận/i }).click()
      await expect(page.getByText(/Draft deleted|Bản nháp đã xóa/i)).toBeVisible()
    }

    // 5. Fill Configuration Form
    const nameInput = page.getByRole('textbox', { name: /Baseline name|Tên/i })
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Enterprise Information Security Baseline 2026')

    const maxQuestionsInput = page.getByLabel(/Maximum questions|Số câu tối đa/i)
    await expect(maxQuestionsInput).toBeVisible()
    await maxQuestionsInput.fill('45')

    const totalMinutesInput = page.getByLabel(/Total duration \(minutes\)|Tổng thời gian \(phút\)/i)
    await expect(totalMinutesInput).toBeVisible()
    await totalMinutesInput.fill('45')

    // Verify calculated seconds is visible
    await expect(page.getByText(/2700/)).toBeVisible()

    // 6. Save Draft
    const savePromise = page.waitForResponse(response =>
      response.url().includes('/adaptive-baseline-blueprints/occupations/OCC-15-1212.00/working')
      && (response.request().method() === 'PUT' || response.request().method() === 'POST')
      && response.status() === 200,
    )
    const saveBtn = page.getByRole('button', { name: /Save draft|Lưu bản nháp/i })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()
    await savePromise

    // Verify Draft saved confirmation
    await expect(page.getByText(/Draft saved|Bản nháp đã lưu/i)).toBeVisible()

    // 7. Test Blueprint / Preview Assessment
    const testPromise = page.waitForResponse(response =>
      response.url().includes('/adaptive-baseline-blueprints/occupations/OCC-15-1212.00/test')
      && response.request().method() === 'POST'
      && response.status() === 200,
    )
    const testBtn = page.getByRole('button', { name: /Preview assessment|Kiểm tra đề/i }).first()
    await expect(testBtn).toBeEnabled()
    await testBtn.click()
    await testPromise

    // Verify preview reader modal renders
    const closePreviewBtn = page.getByRole('button', { name: /Close preview|Đóng xem trước/i })
    await expect(closePreviewBtn).toBeVisible()

    // Close preview reader modal
    await closePreviewBtn.click()
    await expect(closePreviewBtn).not.toBeVisible()

    // Verify Feasible preview badge is rendered on the page card
    await expect(page.getByText(/Assessment preview|Đạt yêu cầu/i).first()).toBeVisible()

    // 8. Test Cancellation on Finalize & Activate Modal
    const activateBtn = page.getByRole('button', { name: /Activate baseline|Kích hoạt/i })
    await expect(activateBtn).toBeEnabled()
    await activateBtn.click()

    const confirmModal = page.getByRole('dialog', { name: /Confirm|Xác nhận/i })
    await expect(confirmModal).toBeVisible()
    await expect(confirmModal.getByText(/Enterprise Information Security Baseline 2026/i).first()).toBeVisible()

    // Click Cancel first to verify non-destructive dismissal
    const cancelModalBtn = confirmModal.locator('button').filter({ hasText: /Cancel|Hủy/i })
    await cancelModalBtn.click()
    await expect(confirmModal).not.toBeVisible()

    // 9. Confirm Finalization & Activation
    await activateBtn.click()
    await expect(confirmModal).toBeVisible()

    const finalizePromise = page.waitForResponse(response =>
      response.url().includes('/adaptive-baseline-blueprints/occupations/OCC-15-1212.00/finalize')
      && response.request().method() === 'POST'
      && response.status() === 200,
    )
    const confirmBtn = confirmModal.locator('button').filter({ hasText: /Confirm|Xác nhận/i })
    await confirmBtn.click()
    await finalizePromise

    // Verify Active status updates immediately
    await expect(page.getByText(/Baseline activated for new starts|Đã kích hoạt/i)).toBeVisible()
    await expect(page.getByText(/Enterprise Information Security Baseline 2026 · v/i)).toBeVisible()
    await expect(page.getByText(/^Active$|^Đang kích hoạt$/i).first()).toBeVisible()

    // 10. Return to Baseline Directory and Confirm Persistence
    const backBtn = page.getByRole('button', { name: /Back to baselines|Quay lại/i })
    await backBtn.click()
    await expect(page).toHaveURL(/.*\/ld-manager\/baseline-assessments$/)

    // Verify newly active baseline is displayed in directory table
    await expect(page.getByText('Enterprise Information Security Baseline 2026').first()).toBeVisible()
    await expect(page.getByText('Information Security Analysts').first()).toBeVisible()
  })
})
