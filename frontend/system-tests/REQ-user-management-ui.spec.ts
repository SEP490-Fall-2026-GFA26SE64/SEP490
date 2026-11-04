import { expect, test } from '@playwright/test'

test.describe('Capstone Standard: User Management Department & Job Position Display & Modal Enhancements', () => {
  test.setTimeout(120_000)

  test('User Accounts displays clean department and job position names, enlarged edit modal, and redesigned user details', async ({ page }) => {
    // 1. Authenticate as Administrator (Elena Rostova)
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('admin@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2. Navigate to User Accounts
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/.*\/admin\/users/)
    await expect(page.getByRole('heading', { name: /User Accounts|Tài khoản người dùng/i })).toBeVisible({ timeout: 15_000 })

    // 3. Verify Table is loaded and does not contain raw UUID text in the department/job position column
    const directoryTable = page.getByRole('region', { name: /User directory table|Bảng danh sách người dùng/i })
    await expect(directoryTable).toBeVisible()

    // Ensure raw UUID strings like f96361d1- are never exposed in user rows
    const pageContent = await page.content()
    expect(pageContent).not.toContain('Department f96361d1-')
    expect(pageContent).not.toContain('Job Position c0560ad6-')

    // 4. Click View Details (Eye icon) on the first user row
    const viewButtons = page.getByTitle(/View user details|Xem chi tiết người dùng/i)
    await expect(viewButtons.first()).toBeVisible()
    await viewButtons.first().click()

    // Verify Redesigned User Details Modal is open and contains polished elevation cards
    const userDetailsDialog = page.getByRole('dialog', { name: /User details|Chi tiết người dùng/i })
    await expect(userDetailsDialog).toBeVisible()
    await expect(userDetailsDialog.getByText(/Role & Security Permissions|Vai trò & Quyền bảo mật/i)).toBeVisible()
    await expect(userDetailsDialog.getByText(/Department & Organizational Unit|Phòng ban & Đơn vị kinh doanh/i)).toBeVisible()
    await expect(userDetailsDialog.getByText(/Assigned Job Position|Vị trí công việc đã phân công/i)).toBeVisible()

    // Close User Details using exact footer button
    await userDetailsDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(userDetailsDialog).toBeHidden()

    // 5. Click Edit on the first editable user
    const editButtons = page.getByTitle(/Edit user|Sửa người dùng/i)
    await expect(editButtons.first()).toBeVisible()
    await editButtons.first().click()

    // Verify Enlarged Edit User Modal
    const editDialog = page.getByRole('dialog', { name: /Edit User|Sửa người dùng/i })
    await expect(editDialog).toBeVisible()

    // Verify width & height classes (max-w-4xl min-h-[640px])
    const classAttr = await editDialog.getAttribute('class')
    expect(classAttr).toContain('max-w-4xl')
    expect(classAttr).toContain('min-h-[640px]')

    // Ensure assigned sections exist and do not show raw UUID names
    await expect(editDialog.getByText(/Assigned Department \(\d+\)|Phòng ban đã phân công \(\d+\)/i)).toBeVisible()
    await expect(editDialog.getByText(/Assigned Job Position \(\d+\)|Vị trí công việc đã phân công \(\d+\)/i)).toBeVisible()

    const modalContent = await editDialog.innerHTML()
    expect(modalContent).not.toContain('Department f96361d1-')
    expect(modalContent).not.toContain('Job Position c0560ad6-')

    // Close Edit Modal
    await editDialog.getByRole('button', { name: /Cancel|Hủy/i }).click()
    await expect(editDialog).toBeHidden()
  })
})
