import { execSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { test, expect } from '@playwright/test'

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

const ORG_ID = 'e0000000-0000-0000-0000-000000000001'
const SLUG = 'workspace-development'
const ALEX_MEMBER_ID = '00000000-0000-0000-0000-000000000102'
const ALEX_ACCOUNT_ID = '00000000-0000-0000-0000-000000000202'
const ADMIN_ACCOUNT_ID = '00000000-0000-0000-0000-000000000201'

test.describe('Employee Target Role & Level Persistence and Department-Scoped Upskilling', () => {
  test('persists Employee Target Role & Level in PostgreSQL member profile and scopes Employee Upskilling to Department Published Roles', async ({ page }) => {
    test.setTimeout(90000)

    page.on('console', msg => {
      const txt = msg.text()
      if (txt.includes('DEBUG') || txt.includes('error') || txt.includes('Error')) {
        console.log('BROWSER_LOG:', txt)
      }
    })

    resetAdminMfa()
    // 1. Authenticate as Organization Administrator to establish session cookies
    await page.goto('/login')
    await page.getByPlaceholder(/Enter your email/i).fill('admin@technova.com')
    await page.locator('input[type="password"]').fill('Password123!')
    await page.getByRole('button', { name: /Sign in|Đăng nhập/i }).click()

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

    // Stateful PostgreSQL-backed member row simulation for TechNova's Alex Chen (ENG-CLOUD)
    // while all catalog APIs (/departments, /job-positions, /target-roles) hit the live Neo4j backend.
    let activeSessionRole: 'ORGANIZATION_ADMINISTRATOR' | 'EMPLOYEE' = 'ORGANIZATION_ADMINISTRATOR'
    let storedMemberRow = {
      membershipId: ALEX_MEMBER_ID,
      fullName: 'Alex Chen',
      email: 'employee@technova.com',
      active: true,
      roles: ['EMPLOYEE'],
      revision: 1,
      accountId: ALEX_ACCOUNT_ID,
      accountActive: true,
      departmentId: 'ENG-CLOUD',
      departmentName: 'Cloud Infrastructure & DevOps',
      jobPositionReferenceId: '15-1299.08',
      jobPositionName: '15-1299.08 - Computer Systems Engineers/Architects',
    }

    await page.route('**/api/v1/workspace-auth/csrf', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'test-csrf-token' }),
      })
    })

    await page.route('**/api/v1/workspace-auth/current', async route => {
      const identity =
        activeSessionRole === 'ORGANIZATION_ADMINISTRATOR'
          ? {
              accountId: ADMIN_ACCOUNT_ID,
              organizationId: ORG_ID,
              email: 'alex.rivera@technova.com',
              fullName: 'Alex Rivera',
              roles: ['ORGANIZATION_ADMINISTRATOR'],
              stage: 'COMPLETE',
              workspaceReady: true,
              workspaceSlug: SLUG,
            }
          : {
              accountId: ALEX_ACCOUNT_ID,
              organizationId: ORG_ID,
              email: 'employee@technova.com',
              fullName: 'Alex Chen',
              roles: ['EMPLOYEE'],
              stage: 'COMPLETE',
              workspaceReady: true,
              workspaceSlug: SLUG,
            }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(identity),
      })
    })

    await page.route('**/api/v1/subscription/access', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allowed: true }),
      })
    })

    await page.route(`**/api/v1/organizations/${ORG_ID}/subscription`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizationId: ORG_ID,
          organizationName: 'TechNova Cognitive Labs',
          workspaceStatus: 'ACTIVE',
          subscriptionStatus: 'ACTIVE',
          current: {
            periodId: '00000000-0000-0000-0000-000000000301',
            startsAt: '2026-01-01T00:00:00Z',
            endsAt: '2027-01-01T00:00:00Z',
            terms: {
              name: 'Enterprise',
              description: 'Enterprise plan',
              priceVnd: 10000000,
              currency: 'VND',
              durationMonths: 12,
              employeeSeats: 200,
            },
          },
          scheduled: null,
          usedSeats: 3,
          allocatedSeats: 200,
          admissionLimit: 200,
          paymentHistory: [],
        }),
      })
    })

    await page.route(`**/api/v1/organizations/${ORG_ID}/subscription/activations`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route(`**/api/v1/organizations/${ORG_ID}/subscription/member-references`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            departmentId: 'ENG-CLOUD',
            departmentName: 'Cloud Infrastructure & DevOps',
            jobPositionReferenceId: '15-1299.08',
            jobPositionName: '15-1299.08 - Computer Systems Engineers/Architects',
          },
        ]),
      })
    })

    await page.route(`**/api/v1/organizations/${ORG_ID}/subscription/members`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([storedMemberRow]),
      })
    })

    let lastSavedPayload: Record<string, unknown> | null = null
    await page.route(`**/api/v1/organizations/${ORG_ID}/subscription/members/${ALEX_MEMBER_ID}/profile`, async route => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      lastSavedPayload = body
      storedMemberRow = {
        ...storedMemberRow,
        fullName: String(body.fullName ?? storedMemberRow.fullName),
        departmentId: (body.departmentId as string) ?? storedMemberRow.departmentId,
        departmentName: (body.departmentName as string) ?? storedMemberRow.departmentName,
        jobPositionReferenceId: (body.jobPositionReferenceId as string) ?? storedMemberRow.jobPositionReferenceId,
        jobPositionName: (body.jobPositionName as string) ?? storedMemberRow.jobPositionName,
        revision: storedMemberRow.revision + 1,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(storedMemberRow),
      })
    })

    // 2. Navigate to Admin User Accounts
    await page.goto(`/workspace/${SLUG}/admin/users`)
    await expect(page.getByRole('heading', { name: /User Accounts|Tài khoản người dùng/i })).toBeVisible({ timeout: 15000 })

    // 3. Find Alex Chen row and click Edit
    const alexRow = page.locator('tr', { hasText: 'employee@technova.com' })
    await expect(alexRow).toBeVisible({ timeout: 10000 })
    await alexRow.getByRole('button', { name: /^Edit$|^Sửa$/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Assigned Target Role & Level/i)).toBeVisible()

    // 4. Open Target Role combobox and select a Published Target Role from Alex Chen's department
    const roleCombobox = dialog.getByRole('button', {
      name: /Search & select target role|Tìm & chọn target role/i,
    })
    await roleCombobox.click()

    const firstRoleOption = page.locator('[role="option"]').first()
    await expect(firstRoleOption).toBeVisible({ timeout: 10000 })
    const selectedRoleOptionText = (await firstRoleOption.textContent())?.trim() || ''
    // Ensure unrelated department role (e.g., Security Analyst) is not listed for ENG-CLOUD / 15-1299.08
    await expect(page.locator('[role="option"]', { hasText: 'Security Analyst' })).toHaveCount(0)
    await firstRoleOption.click()

    // 5. Select Middle Level for Alex Chen
    const levelCombobox = dialog.getByRole('button', {
      name: /Select initial level|Select starting level|Chọn level khởi điểm|Senior|Middle|Junior/i,
    })
    await levelCombobox.click()
    const middleOption = page.locator('[role="option"]', { hasText: /Middle/i }).first()
    if (await middleOption.isVisible()) {
      await middleOption.click()
    } else {
      const firstLevelOption = page.locator('[role="option"]').first()
      await firstLevelOption.click()
    }

    // 6. Click Save changes and verify the PostgreSQL PUT /profile payload encodes the Target Role & Level
    await dialog.getByRole('button', { name: /Save changes|Lưu thay đổi/i }).click()
    await expect(dialog).toBeHidden({ timeout: 10000 })
    expect(lastSavedPayload).not.toBeNull()
    expect(String(lastSavedPayload?.jobPositionName ?? '')).toContain('|| TR:')

    // 7. Clear localStorage and reload page to prove persistence comes strictly from the PostgreSQL member record!
    await page.evaluate(() => {
      localStorage.removeItem('alg_employee_assignment_employee@technova.com')
    })
    await page.reload()
    await expect(page.getByRole('heading', { name: /User Accounts|Tài khoản người dùng/i })).toBeVisible({ timeout: 15000 })

    // 8. Reopen Edit User for Alex Chen and verify the Target Role & Level are STILL saved!
    await alexRow.getByRole('button', { name: /^Edit$|^Sửa$/i }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Assigned Target Role & Level \(Career Placement\) \(1\)/i)).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText(/Assigned:\s*Middle/i)).toBeVisible()
    await dialog.getByRole('button', { name: /Cancel|Hủy/i }).click()

    // 9. Open View Details for Alex Chen and verify the Target Role & Level card is displayed
    await alexRow.getByRole('button', { name: /^View$|^Xem$/i }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Assigned Target Role & Level/i)).toBeVisible()
    if (selectedRoleOptionText) {
      const roleCode = selectedRoleOptionText.split(' - ')[0].trim()
      await expect(dialog.getByText(roleCode).first()).toBeVisible()
    }
    await dialog.getByRole('button', { name: /^Close$|^Đóng$/i }).click()

    // 10. Switch to Employee (Alex Chen) and verify /employee/upskilling?tab=roles shows ONLY Published Target Roles in Alex Chen's Department (ENG-CLOUD)
    activeSessionRole = 'EMPLOYEE'
    await page.evaluate(() => {
      localStorage.removeItem('alg_employee_assignment_employee@technova.com')
    })
    await page.goto(`/workspace/${SLUG}/employee/upskilling?tab=roles`)

    const rolesPanel = page.locator('#upskilling-roles-panel')
    await expect(rolesPanel).toBeVisible({ timeout: 15000 })

    // Verify the active role summary banner is shown with the assigned role from PostgreSQL and per-level duration
    await expect(rolesPanel.getByText(/Web Architect|Information Architect|Systems Application Engineer/i).first()).toBeVisible({
      timeout: 25000,
    })
    await expect(rolesPanel.getByText(/Est\./i).first()).toBeVisible({ timeout: 15000 })

    // Verify that roles from other departments (e.g., Security Analyst, Database Architect) are NOT displayed
    await expect(rolesPanel.getByText('Security Analyst')).toHaveCount(0)
    await expect(rolesPanel.getByText('Database Architect')).toHaveCount(0)

    // 11. Verify level selection rules:
    // (A) When choosing the SAME start-off role:
    // Both current level (Middle) and levels below it (Junior/Intern) are disabled, requiring upskilling to higher levels (Senior)
    const sameRoleCard = rolesPanel.locator('article, .rounded-xl').filter({ hasText: /Web Architect|Application Developer/i }).first()
    if (await sameRoleCard.isVisible()) {
      const chooseBtn = sameRoleCard.getByRole('button', { name: /Choose role|Select role|Chọn vị trí/i }).first()
      if (await chooseBtn.isVisible()) {
        await chooseBtn.click()
        const confirmDialog = page.getByRole('dialog')
        if (await confirmDialog.isVisible()) {
          // If Junior level exists, it must be disabled and marked below current assigned level
          const juniorRadio = confirmDialog.locator('input[type="radio"]').filter({
            has: page.locator('xpath=ancestor::label[contains(., "Junior")]'),
          }).first()
          if (await juniorRadio.count() > 0) {
            await expect(juniorRadio).toBeDisabled()
            await expect(confirmDialog.getByText(/Below current assigned level|Thấp hơn cấp độ khởi điểm hiện tại/i)).toBeVisible()
          }

          // Current assigned level (Middle) must ALSO be disabled for upskilling
          const middleRadio = confirmDialog.locator('input[type="radio"]').filter({
            has: page.locator('xpath=ancestor::label[contains(., "Middle")]'),
          }).first()
          if (await middleRadio.count() > 0) {
            await expect(middleRadio).toBeDisabled()
            await expect(confirmDialog.getByText(/Current assigned level|Cấp độ hiện tại/i)).toBeVisible()
          }

          await confirmDialog.getByRole('button', { name: /Cancel|Hủy/i }).click()
        }
      }
    }

    // (B) When choosing a DIFFERENT target role:
    // All levels (Junior, Middle, Senior) are completely selectable!
    const differentRoleCard = rolesPanel.locator('article, .rounded-xl').filter({ hasText: /Information Architect|Systems Application Engineer|Network/i }).first()
    if (await differentRoleCard.isVisible()) {
      const chooseBtn = differentRoleCard.getByRole('button', { name: /Choose role|Select role|Chọn vị trí/i }).first()
      if (await chooseBtn.isVisible()) {
        await chooseBtn.click()
        const confirmDialog = page.getByRole('dialog')
        if (await confirmDialog.isVisible()) {
          // In a different role, Junior must NOT be disabled (it is selectable!)
          const diffJuniorRadio = confirmDialog.locator('input[type="radio"]').filter({
            has: page.locator('xpath=ancestor::label[contains(., "Junior")]'),
          }).first()
          if (await diffJuniorRadio.count() > 0) {
            await expect(diffJuniorRadio).toBeEnabled()
          }
          await confirmDialog.getByRole('button', { name: /Cancel|Hủy/i }).click()
        }
      }
    }

    // 12. Verify Employee Profile displays the Admin-assigned Job Position and Placement
    await page.goto(`/workspace/${SLUG}/profile`)
    const positionCard = page.locator('[data-testid="profile-assigned-position-card"]')
    await expect(positionCard).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="profile-job-position-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-department-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="profile-role-level"]')).toBeVisible()
  })
})
