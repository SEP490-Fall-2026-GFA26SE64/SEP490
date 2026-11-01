import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const accounts = [
  ['platform.admin@example.test', '/platform-admin/subscriptions'],
  ['org.admin@example.test', 'MFA'],
  ['ld.manager@example.test', '/ld-manager/occupations'],
  ['expert@example.test', '/expert/target-roles'],
  ['employee@example.test', '/employee/overview'],
] as const
for (const [index, [email, destination]] of accounts.entries()) {
  test(`local seeded role ${index + 1}: existing login and role destination`, async ({ page, baseURL }) => {
    test.setTimeout(120_000)
    test.skip(baseURL !== 'http://localhost:8088', 'Requires the separate local dev-accounts environment.')
    const settings = new Map(readFileSync(resolve(process.cwd(), '../local/dev-accounts/private.env'), 'utf8')
      .split('\n').filter(Boolean).map(line => { const cut = line.indexOf('='); return [line.slice(0, cut), line.slice(cut + 1)] }))
    const password = settings.get(`DEV_ACCOUNT_PASSWORD_${index}`)
    if (!password) throw new Error('Private local account settings are required.')
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    if (destination === 'MFA') {
      await expect(page.getByRole('button', { name: 'Set up authenticator', exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByRole('button', { name: 'Continue to workspace', exact: true })).toHaveCount(0)
    } else {
      await page.getByRole('button', { name: 'Continue to workspace', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(destination + '$'))
      await expect(page.getByRole('button', { name: index === 0 ? 'Sign out' : 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
      if (index === 0) {
        await expect(page.getByRole('button', { name: 'Edit Starter', exact: true })).toBeVisible({ timeout: 30_000 })
        await expect(page.getByRole('button', { name: 'Suspend workspace', exact: true })).toBeVisible()
        await page.screenshot({ path: 'test-results/REQ-037-dev-accounts-platform.png', fullPage: true })
      }
    }
  })
}
