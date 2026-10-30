import { expect, test } from '@playwright/test'

interface BlueprintResponse {
  blueprintId: string
  version: number
  occupationId: string
  roles: Array<{
    roleId: string
    totalQuestionCount: number
    easyScoreWeight: number
    mediumScoreWeight: number
    hardScoreWeight: number
  }>
}

interface AssessmentResponse {
  assessmentVersionId: string
  contentHash: string
  publicationState: 'DRAFT' | 'PUBLISHED'
  reviewedContentHash: string | null
  items: Array<{ roleId: string }>
}

test('L&D saves, generates, retries, reloads, reviews and publishes a baseline assessment', async ({ page, request }) => {
  await page.goto('/ld-manager/assessment-bank')
  await expect(page.getByRole('heading', { name: 'Baseline assessment blueprint' })).toBeVisible()
  await expect(page.getByText('Java Backend Developer P3')).toBeVisible()
  await expect(page.getByText('Platform Engineer P4')).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)

  const javaRole = page.locator('[data-value="20000000-0000-0000-0000-000000000001"]')
  const javaTrigger = page.getByRole('button', { name: /Java Backend Developer P3/ })
  const platformTrigger = page.getByRole('button', { name: /Platform Engineer P4/ })
  await platformTrigger.click()
  await expect(javaTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(platformTrigger).toHaveAttribute('aria-expanded', 'true')

  const totalInput = javaRole.getByLabel('Total questions for this role')
  await totalInput.fill('15')
  await expect(javaRole.getByText('0 questions · not included')).toBeVisible()
  await javaRole.getByRole('button', { name: 'Apply and distribute' }).click()
  await expect(javaRole.getByText('15 questions')).toBeVisible()
  await expect(javaRole.getByLabel('Easy score weight (%)')).toHaveValue('20')
  await expect(javaRole.getByLabel('Medium score weight (%)')).toHaveValue('30')
  await expect(javaRole.getByLabel('Hard score weight (%)')).toHaveValue('50')

  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cấu hình đề đánh giá đầu vào' })).toBeVisible()
  await expect(javaRole.getByLabel('Tổng số câu cho vai trò này')).toHaveValue('15')
  await expect(javaTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(platformTrigger).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'EN', exact: true }).click()

  await expect(page.getByText(/0 questions.*not included/)).toBeVisible()

  const saveResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/ld/baseline-blueprints')
      && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save blueprint' }).click()
  const saveResponse = await saveResponsePromise
  expect(saveResponse.status(), await saveResponse.text()).toBe(201)
  const blueprint = await saveResponse.json() as BlueprintResponse
  const saveRequest = saveResponse.request().postDataJSON() as {
    roles: Array<{
      roleId: string
      easyScoreWeight: number
      mediumScoreWeight: number
      hardScoreWeight: number
    }>
  }
  const javaRequest = saveRequest.roles.find((role) =>
    role.roleId === '20000000-0000-0000-0000-000000000001')
  expect(javaRequest).toMatchObject({
    easyScoreWeight: 0.2,
    mediumScoreWeight: 0.3,
    hardScoreWeight: 0.5,
  })
  expect(blueprint.version).toBe(1)
  expect(blueprint.occupationId).toBe('10000000-0000-0000-0000-000000000001')
  expect(blueprint.roles).toHaveLength(2)
  expect(blueprint.roles.find((role) => role.roleId === '20000000-0000-0000-0000-000000000002')
    ?.totalQuestionCount).toBe(0)
  const javaSaved = blueprint.roles.find((role) =>
    role.roleId === '20000000-0000-0000-0000-000000000001')
  expect((javaSaved?.easyScoreWeight ?? 0)
    + (javaSaved?.mediumScoreWeight ?? 0)
    + (javaSaved?.hardScoreWeight ?? 0)).toBeCloseTo(1, 10)
  await expect(page.getByText('Catalog and coverage validated')).toBeVisible()

  const reloadedBlueprintResponse = await request.get(
    `/api/v1/ld/baseline-blueprints/occupations/${blueprint.occupationId}`,
  )
  expect(reloadedBlueprintResponse.ok()).toBeTruthy()
  const reloadedBlueprint = await reloadedBlueprintResponse.json() as BlueprintResponse
  expect(reloadedBlueprint.blueprintId).toBe(blueprint.blueprintId)
  expect(reloadedBlueprint.roles.find((role) => role.roleId === '20000000-0000-0000-0000-000000000002')
    ?.totalQuestionCount).toBe(0)

  const generateResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/assessment-drafts')
      && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate assessment' }).click()
  const generateResponse = await generateResponsePromise
  expect(generateResponse.status()).toBe(201)
  const generated = await generateResponse.json() as AssessmentResponse
  expect(generated.items).toHaveLength(15)
  expect(generated.items.every((item) =>
    item.roleId === '20000000-0000-0000-0000-000000000001')).toBeTruthy()
  await expect(page.getByText('Assessment draft v1', { exact: true })).toBeVisible()
  await expect(page.getByText(/Items:\s*15/)).toBeVisible()

  const generationKey = generateResponse.request().headers()['idempotency-key']
  expect(generationKey).toBeTruthy()
  const generationPath = new URL(generateResponse.url()).pathname
  const replayResponse = await request.post(generationPath, {
    headers: { 'Idempotency-Key': generationKey },
  })
  expect(replayResponse.status()).toBe(201)
  const replay = await replayResponse.json() as AssessmentResponse
  expect(replay.assessmentVersionId).toBe(generated.assessmentVersionId)
  expect(replay.contentHash).toBe(generated.contentHash)

  const reloadResponse = await request.get(
    `/api/v1/ld/baseline-blueprints/assessment-drafts/${generated.assessmentVersionId}`,
  )
  expect(reloadResponse.ok()).toBeTruthy()
  const reloaded = await reloadResponse.json() as AssessmentResponse
  expect(reloaded.contentHash).toBe(generated.contentHash)
  expect(JSON.stringify(reloaded)).not.toMatch(/protected[_-]?key|answer[_-]?key/i)
  await expect(page.locator('body')).not.toContainText(/protected[_-]?key|answer[_-]?key/i)

  const reviewResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/${generated.assessmentVersionId}/review`)
      && response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Review this hash' }).click()
  expect((await reviewResponsePromise).status()).toBe(200)
  await expect(page.getByText('REVIEWED', { exact: true })).toBeVisible()

  const publishResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith(`/${generated.assessmentVersionId}/publish`)
      && response.request().method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Publish' }).click()
  expect((await publishResponsePromise).status()).toBe(200)
  await expect(page.getByText('PUBLISHED').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review this hash' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled()

  const publishedResponse = await request.get(
    `/api/v1/ld/baseline-blueprints/assessment-drafts/${generated.assessmentVersionId}`,
  )
  const published = await publishedResponse.json() as AssessmentResponse
  expect(published.publicationState).toBe('PUBLISHED')
  expect(published.reviewedContentHash).toBe(generated.contentHash)
})
