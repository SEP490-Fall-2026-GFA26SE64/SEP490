import { expect, test } from '@playwright/test'

// Run against a fresh, isolated Compose project seeded with ontology 0.9.
// This checks the baseline consumer; Module authoring/publication is a separate owner boundary.
test('REQ-016 catalog update preserves role detail, cancel, selection and persisted reload', async ({ page }) => {
  test.setTimeout(180_000)
  expect((await page.request.post('/api/v1/local-baseline-demo/session', {
    data: { persona: 'employee-a' },
  })).status()).toBe(204)
  const rolesResponse = await page.request.get('/api/v1/employee/target-roles')
  expect(rolesResponse.status()).toBe(200)
  const roles = await rolesResponse.json() as { id: string; name: string; catalogVersion: string; levels: { skills: { id: string }[] }[] }[]
  expect(roles).toHaveLength(48)
  expect(roles.every(role => role.catalogVersion === '0.9.0' && role.name.trim() && role.levels.length === 3)).toBeTruthy()
  const before = await (await page.request.get('/api/v1/employee/target-role-selection')).json() as { selection: { selectionId: string } | null }
  const previousSelectionId = before.selection?.selectionId ?? null

  await page.goto('/employee/target-roles')
  await page.getByRole('button', { name: 'Role requirements', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading', { level: 3 })).toHaveCount(3)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 45_000 })

  await page.getByRole('button', { name: 'Choose Role', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).filter({ hasText: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 45_000 })
  const cancelled = await (await page.request.get('/api/v1/employee/target-role-selection')).json() as { selection: { selectionId: string } | null }
  expect(cancelled.selection?.selectionId ?? null).toBe(previousSelectionId)

  await page.getByRole('button', { name: 'Choose Role', exact: true }).first().click()
  const chosenResponse = page.waitForResponse(response => response.url().endsWith('/target-role-selection') && response.request().method() === 'PUT')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  expect((await chosenResponse).status()).toBe(200)
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 45_000 })
  await expect(page.getByRole('button', { name: 'Selected', exact: true })).toBeDisabled({ timeout: 45_000 })
  const selected = await (await page.request.get('/api/v1/employee/target-role-selection')).json() as {
    selection: { selectionId: string; role: { catalogVersion: string } }
  }
  expect(selected.selection.role.catalogVersion).toBe('0.9.0')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Selected', exact: true })).toBeDisabled({ timeout: 45_000 })
  await page.screenshot({ path: test.info().outputPath('roles-v09-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: test.info().outputPath('roles-v09-mobile-vi.png'), fullPage: true })
})
