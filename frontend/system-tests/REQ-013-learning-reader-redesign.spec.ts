import { expect as baseExpect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { LearningView, LessonProgress, ModuleDocument } from '../src/shared/api/moduleAuthoringApi'

// Explicit local QA inputs; no credentials or runtime mock is shipped with the application.
const fixtureFile = process.env.LEARNER_READER_FIXTURE_PATH
const inputs = fixtureFile ? JSON.parse(readFileSync(fixtureFile, 'utf8')) : null
const moduleRoot = '/api/v1/module-management'
test.setTimeout(180000)
test.use({ actionTimeout: 30000 })
const expect = baseExpect.configure({ timeout: 30000 })
test.beforeEach(async ({ page }, info) => {
  test.skip(!inputs, 'Set LEARNER_READER_FIXTURE_PATH to the private local QA setup file.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  if (info.title.startsWith('isolated presentation:')) {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/v1/workspace-auth/current') return route.fulfill({ json: { accountId: inputs.members.qa.accountId, organizationId: inputs.org, email: inputs.members.qa.email, fullName: 'Reader QA', roles: ['EMPLOYEE'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: inputs.slug } })
      if (path.endsWith('/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'isolated-browser-fixture' } })
      if (path === '/api/v1/subscription/access') return route.fulfill({ json: {} })
      if (path.endsWith('/text/preview')) return route.fulfill({ json: { html: route.request().postDataJSON().body } })
      if (path.endsWith('/assessment-eligibility')) return route.fulfill({ json: { skillId: 'fixture', eligible: false, reason: 'CONTENT_REQUIRED', qualifyingCompletion: null } })
      if (path.endsWith('/modules')) return route.fulfill({ json: [] })
      return route.fulfill({ status: 404, json: { message: 'Outside isolated reader fixture' } })
    })
    return
  }
  const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  const response = await page.request.post('/api/v1/workspace-auth/sign-in', { headers: { [csrf.headerName]: csrf.token }, data: { email: inputs.members.qa.email, password: inputs.password } })
  expect(response.status()).toBe(200)
  const currentCsrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  await page.route('**/api/v1/workspace-auth/csrf', route => route.fulfill({ json: currentCsrf }))
})
async function presentationFixture(page: Page) {
  const document = Object.values(inputs.modules)[0] as ModuleDocument
  const payload = structuredClone(document.revisions.at(-1)!.payload)
  payload.title = 'A readable learning workspace'
  payload.content.lessons = [
    { id: 'reading', title: 'Understand and verify a change', type: 'TEXT', body: '<h2>Start with an observable requirement</h2><p>Connect the requirement to clear acceptance conditions.</p><blockquote><p>Tip: describe the result the learner can verify.</p></blockquote><ul><li>Identify the actor</li><li>Check the result</li></ul><table><thead><tr><th>Input</th><th>Expected result</th></tr></thead><tbody><tr><td>Valid request</td><td>Defined response</td></tr></tbody></table><pre><code>const acceptance = "' + 'wide sample code '.repeat(20) + '";</code></pre>', bodyFormat: 'HTML', durationSeconds: 60, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null },
    { id: 'video', title: 'Watch an example', type: 'VIDEO', body: null, bodyFormat: null, durationSeconds: 10, durationSource: 'MEDIA', videoSource: 'UPLOAD', assetId: 'reader-test-video', videoUrl: null },
    { id: 'recap', title: 'Key takeaways', type: 'TEXT', body: '<h2>Apply the idea</h2><p>Write acceptance conditions for your own example.</p>', bodyFormat: 'HTML', durationSeconds: 60, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null },
  ]
  const view: LearningView = { revision: { ...document.revisions.at(-1)!, payload }, latestRevision: 1, activeLessonId: 'reading', progress: [] }
  let failSave = false
  await page.route('**' + moduleRoot + '/learning/reader-presentation/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/begin')) return route.fulfill({ json: view })
    if (path.endsWith('/progress')) {
      if (failSave) return route.fulfill({ status: 503, json: { message: 'Progress save unavailable' } })
      const id = decodeURIComponent(path.split('/lessons/')[1].split('/')[0]), patch = route.request().postDataJSON()
      const previous = view.progress.find(p => p.lessonId === id)
      const row: LessonProgress = { lessonId: id, positionSeconds: patch.positionSeconds, reachedEnd: Boolean(previous?.reachedEnd || patch.reachedEnd), watchedIntervals: previous?.watchedIntervals ?? [], completedAt: previous?.completedAt ?? (patch.complete ? new Date().toISOString() : null), updatedAt: new Date().toISOString(), coverageUpdatedAt: null }
      view.progress = [...view.progress.filter(p => p.lessonId !== id), row]
      view.activeLessonId = id
      return route.fulfill({ json: row })
    }
    return route.fulfill({ status: 404, json: { message: 'Unsupported test action' } })
  })
  const mediaPath = process.env.LEARNER_READER_VIDEO_PATH
  if (mediaPath) await page.route('**' + moduleRoot + '/assets/reader-test-video', route => route.fulfill({ contentType: 'video/mp4', body: readFileSync(mediaPath) }))
  return { view, fail: (value: boolean) => { failSave = value } }
}
for (const viewport of [{ width: 1440, height: 1000 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
  test(`isolated presentation: read, navigate, persist, responsive ${viewport.width}`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await presentationFixture(page)
    await page.goto(`/workspace/${inputs.slug}/employee/modules/reader-presentation`)
    await expect(page.getByRole('heading', { level: 1, name: 'A readable learning workspace' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Learning breadcrumb' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Start with an observable requirement' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    await page.getByRole('button', { name: 'Hide lessons', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Module syllabus' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Show lessons', exact: true }).click()
    const complete = page.getByRole('button', { name: 'Mark as completed', exact: true })
    await complete.scrollIntoViewIfNeeded(); await expect(complete).toBeEnabled(); await complete.click()
    await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Module content progress' })).toHaveAttribute('aria-valuenow', '33')
    await page.getByRole('button', { name: 'Next lesson', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Watch an example', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mark as completed', exact: true })).toBeDisabled()
    if (process.env.LEARNER_READER_VIDEO_PATH) {
      const video = page.locator('video'); await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).readyState)).toBeGreaterThan(0)
      await video.evaluate(v => { (v as HTMLVideoElement).muted = true; return (v as HTMLVideoElement).play() })
      await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0)
      await video.evaluate(v => (v as HTMLVideoElement).pause())
    }
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Watch an example', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Previous lesson', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Understand and verify a change', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByText('Saving progress…', { exact: true })).toHaveCount(0)
    await page.screenshot({ path: info.outputPath(`reader-${viewport.width}.png`), fullPage: true })
    expect(errors).toEqual([])
  })
}
test('isolated presentation: save error blocks navigation; empty, loading and retry states', async ({ page }) => {
  const fixture = await presentationFixture(page)
  await page.goto(`/workspace/${inputs.slug}/employee/modules/reader-presentation`)
  await expect(page.getByRole('heading', { name: 'Understand and verify a change', exact: true })).toBeVisible()
  fixture.fail(true)
  await page.getByRole('button', { name: 'Next lesson', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Progress save unavailable' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Understand and verify a change', exact: true })).toBeVisible()
  fixture.fail(false)
  await page.getByRole('button', { name: 'Next lesson', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Watch an example', exact: true })).toBeVisible()
  fixture.view.revision.payload.content.lessons = []; fixture.view.activeLessonId = null; fixture.view.progress = []
  await page.reload(); await expect(page.getByRole('heading', { name: 'No lessons available' })).toBeVisible()
  await page.route('**' + moduleRoot + '/learning/reader-presentation/begin', route => route.fulfill({ status: 503, json: { message: 'Module unavailable' } }))
  await page.reload(); await expect(page.getByRole('alert').filter({ hasText: 'Module unavailable' })).toBeVisible()
  await page.unroute('**' + moduleRoot + '/learning/reader-presentation/begin')
  let release!: () => void
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route('**' + moduleRoot + '/learning/reader-presentation/begin', async route => { await waiting; await route.fulfill({ json: fixture.view }) })
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Loading lessons' })).toBeVisible()
  release(); await expect(page.getByRole('heading', { name: 'No lessons available' })).toBeVisible()
})

test('live QA: approved pathway, real content completion, reload, assessment handoff and return', async ({ page }, info) => {
  const errors: string[] = []; const failures: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.status() >= 500) failures.push(`${response.status()} ${new URL(response.url()).pathname}`) })
  const response = await page.request.get('/api/v1/employee/pathway'); expect(response.ok()).toBe(true)
  const pathway = await response.json(); expect(pathway?.reviewStatus).toBe('APPROVED')
  const option = pathway.steps.flatMap((step: { options: { moduleId: string; moduleRevision: number; title: string }[] }) => step.options)[0]
  expect(option).toBeTruthy()
  await page.goto(`/workspace/${inputs.slug}/employee/pathway`)
  await expect(page.getByText(option.title, { exact: true }).first()).toBeVisible()
  await page.goto(`/workspace/${inputs.slug}/employee/modules/${encodeURIComponent(option.moduleId)}`)
  await expect(page.getByRole('heading', { level: 1, name: option.title })).toBeVisible()
  const complete = page.getByRole('button', { name: 'Mark as completed', exact: true })
  if (await complete.count()) { await complete.scrollIntoViewIfNeeded(); await expect(complete).toBeEnabled(); await complete.click() }
  await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
  await expect(page.getByText('Module content completed', { exact: true })).toBeVisible()
  const persisted = await (await page.request.get('/api/v1/employee/pathway')).json()
  const saved = persisted.steps.flatMap((step: { options: { moduleId: string; completedAt: string | null }[] }) => step.options).find((item: { moduleId: string }) => item.moduleId === option.moduleId)
  expect(saved.completedAt).toBeTruthy()
  await expect(page.getByRole('button', { name: /Open Skill Assessment|Retake Skill Assessment|Resume Skill Assessment/i }).first()).toBeVisible()
  await page.screenshot({ path: info.outputPath('live-content-completed.png'), fullPage: true })
  await page.getByRole('link', { name: 'Back to Pathway', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/workspace/${inputs.slug}/employee/pathway$`))
  expect(errors).toEqual([]); expect(failures).toEqual([])
})
