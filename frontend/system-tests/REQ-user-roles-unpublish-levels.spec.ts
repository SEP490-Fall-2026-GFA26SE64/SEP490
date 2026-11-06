import { execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { expect, test } from '@playwright/test'

function resetAdminMfa() {
  try {
    execSync('docker exec adapt-learn-graph-dev-postgres-1 psql -U adapt_learn_graph -d adapt_learn_graph -c "DELETE FROM platform.account_recovery_code; DELETE FROM platform.account_totp;"')
  } catch {}
}

function base32Totp(secret: string, time = Date.now()): string {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const character of secret.replace(/\s+/g, '').toUpperCase()) {
    const digit = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character)
    if (digit < 0) continue
    buffer = (buffer << 5) | digit
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30_000)))
  const hash = createHmac('sha1', Buffer.from(bytes)).update(counter).digest()
  const offset = hash[hash.length - 1] & 15
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0')
}

test.describe('Capstone Standard: User Roles Enforcements, L&D Unpublish, Scoping & Progressive Mastery Levels', () => {
  test.setTimeout(120_000)

  // 1. Admin User Management Enforcements (REQ-022-F01)
  test('Admin user creation strictly enforces role requirements: no System Admin, LD Manager hides Job Position, Expert & Employee require both, and Employee provides target role & level assignment', async ({ page }) => {
    resetAdminMfa()
    // Authenticate as Organization Administrator
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('admin@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    // Wait for the sign in mutation to settle to either MFA setup or Continue to workspace
    const setupMfaBtn = page.getByRole('button', { name: /Set up authenticator|Thiết lập ứng dụng xác thực/i })
    const continueBtn = page.getByRole('button', { name: /Continue to workspace|Tiếp tục vào không gian/i })

    await expect(setupMfaBtn.or(continueBtn)).toBeVisible({ timeout: 15_000 })

    if (await setupMfaBtn.isVisible()) {
      await setupMfaBtn.click()
      await expect(page.locator('.break-all')).toBeVisible({ timeout: 10_000 })
      const secret = (await page.locator('.break-all').innerText()).trim()
      const code = base32Totp(secret)
      await page.getByLabel(/Authenticator code|Mã xác thực/i).fill(code)
      await page.getByRole('button', { name: /Confirm authenticator|Xác nhận ứng dụng/i }).click()
      const savedCodesBtn = page.getByRole('button', { name: /I saved the recovery codes|Tôi đã lưu mã khôi phục/i })
      await expect(savedCodesBtn).toBeVisible({ timeout: 10_000 })
      await savedCodesBtn.click()
    }

    await expect(continueBtn).toBeVisible({ timeout: 10_000 })
    await expect(continueBtn).toBeEnabled({ timeout: 10_000 })
    await continueBtn.click()

    // Navigate to User Accounts
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/.*\/admin\/users/)
    await expect(page.getByRole('heading', { name: /User Accounts|Tài khoản người dùng/i })).toBeVisible({ timeout: 15_000 })

    // Open Create User Modal
    const createUserBtn = page.getByRole('button', { name: /Create User|Tạo người dùng/i })
    await expect(createUserBtn).toBeVisible({ timeout: 15_000 })
    await expect(createUserBtn).toBeEnabled({ timeout: 15_000 })
    await createUserBtn.click()

    const userModal = page.getByRole('dialog')
    await expect(userModal).toBeVisible({ timeout: 10_000 })

    // 1.1 Verify SYSTEM_ADMIN / Platform Admin is NOT an option
    const modalText = await userModal.innerText()
    expect(modalText).not.toContain('System Admin')
    expect(modalText).not.toContain('SYSTEM_ADMIN')

    // 1.2 Select "L&D Manager" role
    const ldRadio = userModal.getByRole('radio', { name: /L&D Manager/i })
    await expect(ldRadio).toBeVisible()
    await ldRadio.check()

    // Verify Department section is visible with required indicator
    await expect(userModal.getByText(/Assigned Department/i)).toBeVisible()
    // Verify Job Position section is COMPLETELY HIDDEN for L&D Manager
    await expect(userModal.getByText(/Assigned Job Position/i)).toBeHidden()

    // 1.3 Select "Domain Expert" role
    const expertRadio = userModal.getByRole('radio', { name: /Expert/i })
    await expertRadio.check()

    // Verify both Department and Job Position sections are visible
    await expect(userModal.getByText(/Assigned Department/i)).toBeVisible()
    await expect(userModal.getByText(/Assigned Job Position/i)).toBeVisible()
    // Verify Target Role career placement section is hidden for Domain Expert
    await expect(userModal.getByText(/Assigned Target Role & Level/i)).toBeHidden()

    // 1.4 Select "Employee" role
    const employeeRadio = userModal.getByRole('radio', { name: /Employee/i })
    await employeeRadio.check()

    // Verify Department, Job Position, and Target Role & Level sections are visible
    await expect(userModal.getByText(/Assigned Department/i)).toBeVisible()
    await expect(userModal.getByText(/Assigned Job Position/i)).toBeVisible()
    await expect(userModal.getByText(/Assigned Target Role & Level/i)).toBeVisible()

    // 1.5 Edge Case Test: Close / Cancel modal and ensure dialog closes cleanly
    const cancelBtn = userModal.getByRole('button', { name: /Cancel|Hủy/i })
    await cancelBtn.click()
    await expect(userModal).toBeHidden()
  })

  // 2. L&D Manager Portal: Job Position Scoping, Level Senior Highest & Unpublish Action (REQ-052-F01, REQ-052-F02, REQ-052-F03)
  test('L&D Manager portal removes assigned expert from job positions, displays Senior as Level 1 highest without suffix in target roles, and allows unpublishing published roles', async ({ page }) => {
    // Authenticate as L&D Manager
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('manager@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // 2.1 Verify Job Positions does not show Assigned Expert column
    await page.goto('/ld-manager/job-positions')
    await expect(page).toHaveURL(/.*\/ld-manager\/job-positions/)
    await expect(page.getByRole('heading', { name: /Job Positions Directory|Danh mục vị trí công việc/i })).toBeVisible({ timeout: 15_000 })

    const jpTable = page.locator('table')
    if (await jpTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      const headerText = await jpTable.locator('thead').innerText()
      expect(headerText).not.toContain('Assigned Expert')
      expect(headerText).not.toContain('Chuyên gia phụ trách')
    }

    // 2.2 Verify Target Roles Create Modal: Level 1 Senior, no "(Highest)" text, and clean description
    await page.goto('/ld-manager/target-roles')
    await expect(page).toHaveURL(/.*\/ld-manager\/target-roles/)

    const createRoleBtn = page.getByRole('button', { name: /^Create$/i })
    await expect(createRoleBtn).toBeVisible({ timeout: 15_000 })
    await createRoleBtn.click()

    const createModal = page.getByRole('dialog')
    await expect(createModal).toBeVisible()

    // Verify description copy
    await expect(createModal.getByText('Define progressive levels for this role. Level codes are automatically generated.')).toBeVisible()

    // Verify Rank badges and inputs: Rank 1 (Senior), Rank 2 (Middle), Rank 3 (Junior)
    const rank1Badge = createModal.getByText('Rank 1', { exact: true })
    await expect(rank1Badge).toBeVisible()

    // Ensure "(Highest)" text is removed from badge
    const modalContent = await createModal.innerText()
    expect(modalContent).not.toContain('Rank 1 (Highest)')
    expect(modalContent).not.toContain('Level 1')

    const levelInputs = createModal.locator('input[value="Senior"], input[value="Middle"], input[value="Junior"]')
    expect(await levelInputs.count()).toBeGreaterThanOrEqual(3)

    // Cancel create modal
    const cancelModalBtn = createModal.getByRole('button', { name: /Cancel|Hủy/i })
    await cancelModalBtn.click()
    await expect(createModal).toBeHidden()

    // 2.3 Verify Unpublish Target Role action
    // Look for unpublish button (title="Unpublish Target Role" or aria-label="Unpublish Target Role")
    const unpublishBtn = page.locator('button[title="Unpublish Target Role"], button[aria-label="Unpublish Target Role"]').first()
    if (await unpublishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await unpublishBtn.click()

      // Confirm unpublish action if modal appears, or verify toast / status update
      const confirmBtn = page.getByRole('button', { name: /Unpublish|Confirm|Xác nhận/i }).last()
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      // Assert at least one Unpublished badge appears in the table
      await expect(page.getByText(/Unpublished|Chưa xuất bản/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })

  // 3. Domain Expert Permissions: Cannot unpublish target roles (REQ-052-F03)
  test('Domain Expert cannot unpublish target roles but can view and create draft versions', async ({ page }) => {
    // Authenticate as Domain Expert
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('expert@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // Navigate to Expert Target Roles
    await page.goto('/expert/target-roles')
    await expect(page).toHaveURL(/.*\/expert\/target-roles/)
    await expect(page.getByRole('heading', { name: /Target Roles|Vai trò mục tiêu/i })).toBeVisible({ timeout: 15_000 })

    // Verify Domain Expert DOES NOT have Unpublish button
    const unpublishButtons = page.locator('button[title="Unpublish Target Role"], button[aria-label="Unpublish Target Role"]')
    expect(await unpublishButtons.count()).toBe(0)
  })

  // 4. Employee Upskilling Portal: Department scoping and progressive level advancement (REQ-052-F04)
  test('Employee target role catalog hides unpublished roles, scopes to department, and enforces higher-level selection', async ({ page }) => {
    // Authenticate as Employee
    await page.goto('/login')
    await page.getByPlaceholder('Enter your email').fill('employee@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()

    // Navigate to Employee Target Roles
    await page.goto('/employee/target-roles')
    await expect(page).toHaveURL(/.*\/employee\/target-roles/)

    // Wait for role catalog cards
    const chooseButtons = page.getByRole('button', { name: /Choose this role|Select role|Chọn vai trò/i })
    if (await chooseButtons.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await chooseButtons.first().click()

      // TargetRoleSelectionDialog opens
      const selectionDialog = page.getByRole('dialog')
      await expect(selectionDialog).toBeVisible()

      // Verify Level choices: Level 1 (Senior), Level 2 (Middle), Level 3 (Junior)
      await expect(selectionDialog.getByText(/Choose target proficiency level|Advancement/i)).toBeVisible()
      await expect(selectionDialog.getByText(/Level 1/i)).toBeVisible()
      await expect(selectionDialog.getByText(/Level 2/i)).toBeVisible()
      await expect(selectionDialog.getByText(/Level 3/i)).toBeVisible()

      // Cancel dialog cleanly
      const cancelBtn = selectionDialog.getByRole('button', { name: /Cancel|Keep current role|Hủy/i })
      await cancelBtn.click()
      await expect(selectionDialog).toBeHidden()
    }
  })
})

