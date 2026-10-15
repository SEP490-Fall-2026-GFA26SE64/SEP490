import { expect, test } from '@playwright/test'

interface BlueprintResponse {
  blueprintId: string
  version: number
}

interface AssessmentResponse {
  assessmentVersionId: string
  contentHash: string
  publicationState: 'DRAFT' | 'PUBLISHED'
  reviewedContentHash: string | null
  items: unknown[]
}

test('L&D saves, generates, retries, reloads, reviews and publishes a baseline assessment', async ({ page, request }) => {
  await page.goto('/ld-manager/assessment-bank')
  await expect(page.getByRole('heading', { name: 'Baseline assessment blueprint' })).toBeVisible()
  await expect(page.getByText('Java Backend Developer P3')).toBeVisible()
  await expect(page.getByText('Platform Engineer P4')).toBeVisible()

  const saveResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/v1/ld/baseline-blueprints')
      && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Save blueprint' }).click()
  const saveResponse = await saveResponsePromise
  expect(saveResponse.status()).toBe(201)
  const blueprint = await saveResponse.json() as BlueprintResponse
  expect(blueprint.version).toBe(1)
  await expect(page.getByText('Catalog and coverage validated')).toBeVisible()

  const generateResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/assessment-drafts')
      && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Generate assessment' }).click()
  const generateResponse = await generateResponsePromise
  expect(generateResponse.status()).toBe(201)
  const generated = await generateResponse.json() as AssessmentResponse
  expect(generated.items).toHaveLength(30)
  await expect(page.getByText('Assessment draft v1', { exact: true })).toBeVisible()
  await expect(page.getByText(/Items:\s*30/)).toBeVisible()

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
