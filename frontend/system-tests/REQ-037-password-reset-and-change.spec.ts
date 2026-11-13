import { expect, test } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { execSync } from 'node:child_process'

const HMAC_KEY_BASE64 = 'aGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGg='
const DEFAULT_EMPLOYEE_HASH = '{pbkdf2@SpringSecurity_v5_8}d4025b24e39cbea1cbbd36ce879dfba5dace12a8a2eeb81f71e6c21aa22f704c7286fd409dadf03f009b01e442df77f1'

function computeTokenDigest(token: string): string {
  const key = Buffer.from(HMAC_KEY_BASE64, 'base64')
  return createHmac('sha256', key).update(`password-reset:${token}`).digest('hex')
}

function insertResetToken(token: string, accountId: string) {
  const digest = computeTokenDigest(token)
  const sql = `INSERT INTO platform.password_reset (reset_id, account_id, token_digest, expires_at, created_at) VALUES (gen_random_uuid(), '${accountId}', '${digest}', NOW() + INTERVAL '15 minutes', NOW());`
  execSync(`docker exec adapt-learn-graph-dev-postgres-1 psql -U adapt_learn_graph -d adapt_learn_graph -c "${sql}"`, {
    stdio: 'ignore',
  })
}

function restoreDefaultPassword() {
  const sql = `UPDATE platform.account SET password_hash = '${DEFAULT_EMPLOYEE_HASH}' WHERE identifier = 'employee@technova.com';`
  execSync(`docker exec adapt-learn-graph-dev-postgres-1 psql -U adapt_learn_graph -d adapt_learn_graph -c "${sql}"`, {
    stdio: 'ignore',
  })
}

test.describe('FR-07.01-F03 / FR-03.01-F04: Password Reset and Profile Password Management', () => {
  test.beforeEach(async ({ page }) => {
    restoreDefaultPassword()
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  })

  test.afterEach(async () => {
    restoreDefaultPassword()
  })

  test('Public Forgot Password request renders human-centric feedback and records token in store', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Enterprise Sign In' })).toBeVisible()

    // 2. Click Forgot Password link
    const forgotLink = page.getByRole('link', { name: 'Forgot password?' })
    await expect(forgotLink).toBeVisible()
    await forgotLink.click()

    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
    await expect(page.getByText(/Enter your work email address and we will send you/i)).toBeVisible()

    // 3. Submit password reset request for employee
    const emailInput = page.getByLabel(/Work Email Address|Email/i)
    await emailInput.fill('employee@technova.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()

    // 4. Assert anti-enumeration success card is displayed
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/If an active account exists for employee@technova.com/i)).toBeVisible()

    const returnBtn = page.getByRole('link', { name: 'Return to sign in' })
    await expect(returnBtn).toBeVisible()
    await returnBtn.click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Reset Password page handles missing and invalid tokens gracefully', async ({ page }) => {
    // 1. Visit reset page with no token
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: 'Invalid Reset Link' })).toBeVisible()
    await expect(page.getByText(/This password reset link is missing or malformed/i)).toBeVisible()

    // 2. Visit reset page with invalid/unrecognized token
    await page.goto('/reset-password#token=completely-bogus-token-xyz')
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()

    await page.getByLabel(/^New Password/i).fill('ValidPassword123!')
    await page.getByLabel(/^Confirm New Password/i).fill('ValidPassword123!')
    await page.getByRole('button', { name: 'Reset password' }).click()

    await expect(page.getByRole('alert')).toContainText('Password reset token is invalid or has already been used.')
  })

  test('Full Reset Password flow consumes token and activates new password for sign in', async ({ page }) => {
    const testToken = `e2e-reset-${Date.now()}`
    const employeeAccountId = 'a0000000-0000-0000-0000-000000000003'
    const newResetPassword = 'ResetPassWorkflow123!'

    // Seed token into DB
    insertResetToken(testToken, employeeAccountId)

    // 1. Visit reset page with valid token
    await page.goto(`/reset-password#token=${testToken}`)
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()

    // 2. Client validation check (less than 12 chars)
    await page.getByLabel(/^New Password/i).fill('short-pw')
    await page.getByLabel(/^Confirm New Password/i).fill('short-pw')
    await page.getByRole('button', { name: 'Reset password' }).click()
    await expect(page.getByText(/Use 12–128 characters|Password must be at least 12 characters/i)).toBeVisible()

    // 3. Fill valid new password and submit
    await page.getByLabel(/^New Password/i).fill(newResetPassword)
    await page.getByLabel(/^Confirm New Password/i).fill(newResetPassword)
    await page.getByRole('button', { name: 'Reset password' }).click()

    // 4. Assert success state
    await expect(page.getByText('Password reset successfully.')).toBeVisible()
    await expect(page.getByText(/Your password has been updated/i)).toBeVisible()

    // 5. Sign in with the new password
    const signInLink = page.getByRole('link', { name: 'Sign in with new password' })
    await expect(signInLink).toBeVisible()
    await signInLink.click()
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel('Email', { exact: true }).fill('employee@technova.com')
    await page.getByLabel('Password', { exact: true }).fill(newResetPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Verify employee workspace access
    const continueBtn = page.getByRole('button', { name: 'Continue to workspace' })
    await expect(continueBtn).toBeVisible({ timeout: 15000 })
    await continueBtn.click()
    await expect(page).toHaveURL(/overview|upskilling/)

    // 6. Cleanup: restore original password via profile
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible()
    await page.getByLabel(/Current Password/i).fill(newResetPassword)
    await page.getByLabel(/^New Password/i).fill('Password123!')
    await page.getByLabel(/Confirm New Password/i).fill('Password123!')
    await page.getByRole('button', { name: 'Change Password' }).click()

    // Assert redirection to login after password change
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Profile password change enforces current password verification and revokes old session', async ({ page }) => {
    // 1. Sign in as employee
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill('employee@technova.com')
    await page.getByLabel('Password', { exact: true }).fill('Password123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    const continueBtn = page.getByRole('button', { name: 'Continue to workspace' })
    await expect(continueBtn).toBeVisible({ timeout: 15000 })
    await continueBtn.click()
    await expect(page).toHaveURL(/overview|upskilling/)

    // 2. Navigate to Profile
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible()

    // 3. Try mismatched passwords
    await page.getByLabel(/Current Password/i).fill('Password123!')
    await page.getByLabel(/^New Password/i).fill('ValidPassword123!')
    await page.getByLabel(/Confirm New Password/i).fill('DifferentPassword123!')
    await expect(page.getByText('Passwords do not match')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change Password' })).toBeDisabled()

    // 4. Try wrong current password
    await page.getByLabel(/Current Password/i).fill('IncorrectCurrentPassword123!')
    await page.getByLabel(/^New Password/i).fill('NewSecurePassword123!')
    await page.getByLabel(/Confirm New Password/i).fill('NewSecurePassword123!')
    await expect(page.getByRole('button', { name: 'Change Password' })).toBeEnabled()
    await page.getByRole('button', { name: 'Change Password' }).click()
    await expect(page.getByText(/Current password does not match/i)).toBeVisible()

    // 5. Submit valid change to temporary password
    await page.getByLabel(/Current Password/i).fill('Password123!')
    await page.getByRole('button', { name: 'Change Password' }).click()

    // Assert session revoked and redirected to /login
    await expect(page).toHaveURL(/\/login$/, { timeout: 15000 })

    // 6. Verify old password no longer works
    await page.getByLabel('Email', { exact: true }).fill('employee@technova.com')
    await page.getByLabel('Password', { exact: true }).fill('Password123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    // 7. Verify new password works
    await page.getByLabel('Password', { exact: true }).fill('NewSecurePassword123!')
    await page.getByRole('button', { name: 'Sign in' }).click()
    const continueBtn2 = page.getByRole('button', { name: 'Continue to workspace' })
    await expect(continueBtn2).toBeVisible({ timeout: 15000 })
    await continueBtn2.click()
    await expect(page).toHaveURL(/overview|upskilling/)

    // 8. Restore original password back to Password123!
    await page.goto('/profile')
    await page.getByLabel(/Current Password/i).fill('NewSecurePassword123!')
    await page.getByLabel(/^New Password/i).fill('Password123!')
    await page.getByLabel(/Confirm New Password/i).fill('Password123!')
    await page.getByRole('button', { name: 'Change Password' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
