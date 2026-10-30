import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'

interface RoleSummary {
  id: string
  name: string
}

interface Selection {
  selectionId: string
  roleId: string
  targetRevision: number
  changed: boolean
  roleSnapshot: { name: string }
}

interface ErrorResponse {
  code: string
}

const selectionEndpoint = '/api/v1/employee/target-role-selection'

async function readSelection(request: APIRequestContext): Promise<Selection | null> {
  const response = await request.get(selectionEndpoint)
  if (response.status() === 204) return null
  expect(response.ok()).toBeTruthy()
  return await response.json() as Selection
}

async function chooseRole(
  request: APIRequestContext,
  roleId: string,
  expectedCurrentSelectionId: string | null,
): Promise<APIResponse> {
  return request.put(selectionEndpoint, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      roleId,
      ...(expectedCurrentSelectionId === null ? {} : { expectedCurrentSelectionId }),
    },
  })
}

async function ensureSelection(
  request: APIRequestContext,
  roles: RoleSummary[],
): Promise<Selection> {
  const existing = await readSelection(request)
  if (existing) return existing

  const response = await chooseRole(request, roles[0].id, null)
  expect(response.status()).toBe(200)
  return await response.json() as Selection
}

test('learner reviews, cancels, then confirms a target-role change', async ({ page, request }) => {
  const rolesResponse = await request.get('/api/v1/employee/target-roles')
  expect(rolesResponse.ok()).toBeTruthy()
  const roles = await rolesResponse.json() as RoleSummary[]
  expect(roles.length).toBeGreaterThanOrEqual(2)

  const current = await ensureSelection(request, roles)
  const alternate = roles.find((role) => role.id !== current.roleId)
  expect(alternate, 'the deterministic local fixture must expose a competing role').toBeTruthy()

  await page.goto('/employee/upskilling?tab=roles')
  await expect(page.locator('#active-target-role-heading')).toBeVisible()
  await expect(page.getByText(current.roleSnapshot.name).first()).toBeVisible()

  const alternateCard = page.getByLabel(`Target role ${alternate!.name}`)
  await alternateCard.getByRole('button', { name: 'View details' }).click()
  const detailDialog = page.getByRole('dialog', { name: alternate!.name })
  const detailHeading = detailDialog.getByRole('heading', { name: alternate!.name, level: 2 })
  await expect(detailHeading).toBeVisible()
  await expect(detailDialog.getByRole('heading', { name: 'Responsibilities' })).toBeVisible()
  await expect(detailDialog.getByText('required mastery').first()).toBeVisible()
  await detailDialog.getByRole('button', { name: 'Back to roles' }).click()
  await expect(detailHeading).toBeHidden()

  await alternateCard.getByRole('button', { name: 'Choose' }).click()
  const confirmationDialog = page.getByRole('dialog', { name: 'Change target role' })
  const confirmationHeading = confirmationDialog.getByRole('heading', { name: 'Change target role' })
  await expect(confirmationHeading).toBeVisible()
  await confirmationDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirmationHeading).toBeHidden()

  expect((await readSelection(request))?.roleId).toBe(current.roleId)

  await alternateCard.getByRole('button', { name: 'Choose' }).click()
  const updateResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/employee/target-role-selection')
      && response.request().method() === 'PUT',
  )
  await confirmationDialog.getByRole('button', { name: 'Confirm role change' }).click()
  expect((await updateResponse).status()).toBe(200)

  await expect(confirmationHeading).toBeHidden()
  await expect(page.locator('[aria-labelledby="active-target-role-heading"]').getByText(alternate!.name).first()).toBeVisible()
  await expect(alternateCard.getByRole('button', { name: 'Active' })).toBeDisabled()
})

test('API rejects a stale selection and serializes competing role changes', async ({ request }) => {
  const rolesResponse = await request.get('/api/v1/employee/target-roles')
  expect(rolesResponse.ok()).toBeTruthy()
  const roles = await rolesResponse.json() as RoleSummary[]
  expect(roles.length).toBeGreaterThanOrEqual(2)

  const current = await ensureSelection(request, roles)
  const alternate = roles.find((role) => role.id !== current.roleId)
  expect(alternate, 'the deterministic local fixture must expose a competing role').toBeTruthy()

  const staleResponse = await chooseRole(request, alternate!.id, randomUUID())
  expect(staleResponse.status()).toBe(409)
  expect((await staleResponse.json() as ErrorResponse).code).toBe('STALE_SELECTION')

  const afterStale = await readSelection(request)
  expect(afterStale?.selectionId).toBe(current.selectionId)
  expect(afterStale?.targetRevision).toBe(current.targetRevision)

  const competing = await Promise.all([
    chooseRole(request, alternate!.id, current.selectionId),
    chooseRole(request, alternate!.id, current.selectionId),
  ])
  expect(competing.map((response) => response.status()).sort()).toEqual([200, 409])

  const rejected = competing.find((response) => response.status() === 409)
  expect((await rejected!.json() as ErrorResponse).code).toBe('STALE_SELECTION')

  const finalSelection = await readSelection(request)
  expect(finalSelection?.roleId).toBe(alternate!.id)
  expect(finalSelection?.targetRevision).toBe(current.targetRevision + 1)
})
