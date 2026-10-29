import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import type {
  ModuleDocument,
  CatalogChoice,
  ModuleContent,
  LearningView,
  LearningAsset,
  LearningLesson,
  ImportPreview,
  LearningLimits,
} from '../src/shared/api/moduleAuthoringApi'
import * as XLSX from 'xlsx'
const root = '/api/v1/module-management'
const r6Artifact = (name: string) =>
  fileURLToPath(
    new URL(
      '../../documents/testing/system/artifacts/REQ-013-learning-content-R6/' +
        name,
      import.meta.url,
    ),
  )
const values = new Map(
  readFileSync(
    new URL('../../local/dev-accounts/private.env', import.meta.url),
    'utf8',
  )
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf('=')
      return [line.slice(0, at), line.slice(at + 1)]
    }),
)
async function mutate(
  request: APIRequestContext,
  path: string,
  method = 'POST',
  data: unknown = {},
) {
  const csrf = (await (
    await request.get('/api/v1/workspace-auth/csrf')
  ).json()) as { headerName: string; token: string }
  return request.fetch(path, {
    method,
    data,
    headers: { [csrf.headerName]: csrf.token },
  })
}
async function login(page: Page, role: number, path: string) {
  const email =
    ['platform.admin', 'org.admin', 'ld.manager', 'expert', 'employee'][role] +
    '@example.test'
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page
    .getByLabel('Password', { exact: true })
    .fill(values.get(`DEV_ACCOUNT_PASSWORD_${role}`)!)
  const signedIn = page.waitForResponse(
    (r) =>
      r.url().endsWith('/workspace-auth/sign-in') &&
      r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  expect((await signedIn).status()).toBe(200)
  await page
    .getByRole('button', { name: 'Continue to workspace', exact: true })
    .click()
  await page.goto(path)
}
async function signOut(page: Page) {
  expect(
    (await mutate(page.request, '/api/v1/workspace-auth/sign-out')).ok(),
  ).toBeTruthy()
}
test('real authoring, L&D preview/approval, confirmed pathway, explicit text completion and version opt-in', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await login(page, 3, '/expert/modules')
  const title = `Learning content ${randomUUID().slice(0, 8)}`
  const skills = (await (
    await page.request.get(root + '/catalog/MicroSkill', { timeout: 30000 })
  ).json()) as CatalogChoice[]
  await page.getByRole('button', { name: 'Create module', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Module editor' })
  await editor.getByLabel('Title', { exact: true }).fill(title)
  await expect(editor.getByLabel(/Occupations/)).toHaveCount(0)
  await editor.getByLabel('Lesson title', { exact: true }).fill('Reading one')
  await editor
    .locator('[contenteditable=true]')
    .fill('A complete reading lesson with meaningful content for the learner.')
  await editor.getByRole('button', { name: 'Add skill', exact: true }).click()
  await editor.getByLabel('Skill', { exact: true }).selectOption(skills[0].id)
  const createdResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(root + '/modules') && r.request().method() === 'POST',
  )
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  const response = await createdResponse
  expect(await response.text()).not.toContain('message')
  expect(response.status()).toBe(201)
  let doc = (await response.json()) as ModuleDocument
  await expect(editor).not.toBeVisible()
  expect(doc.revisions[0].payload.content.lessons).toHaveLength(1)
  expect(
    (
      await mutate(page.request, root + `/modules/${doc.id}/actions`, 'POST', {
        expectedVersion: doc.lockVersion,
        action: 'submit',
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 2, '/ld-manager/modules')
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  const card = page
    .locator('div.bg-card')
    .filter({ has: page.getByText(doc.id, { exact: true }) })
  await card
    .getByRole('button', { name: 'Details & history', exact: true })
    .click()
  const details = page.getByRole('dialog', { name: 'Module details' })
  await expect(
    details.getByRole('region', { name: 'Lesson 1: Reading one', exact: true }),
  ).toBeVisible()
  await expect(
    details.getByText('Preview this content version', { exact: true }),
  ).toHaveCount(0)
  await expect(
    details.getByText(
      'A complete reading lesson with meaningful content for the learner.',
      { exact: true },
    ),
  ).toBeVisible({ timeout: 30000 })
  await details.getByRole('button', { name: 'Close dialog' }).click()
  await card
    .getByRole('button', { name: 'Approve and release', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Approve and release' })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click()
  await expect(card.getByText('Released', { exact: true })).toBeVisible({
    timeout: 60000,
  })
  await signOut(page)
  await login(page, 3, '/expert/modules')
  await page.getByText('Assign a learning pathway', { exact: true }).click()
  const people = (await (
    await page.request.get(root + '/catalog/Employee')
  ).json()) as CatalogChoice[]
  const employee = people.find((p) => p.name === 'Dev EMPLOYEE') ?? people[0]
  await page.getByLabel('Employee', { exact: true }).selectOption(employee.id)
  await page
    .getByLabel('Pathway title', { exact: true })
    .fill(title + ' pathway')
  await page.getByLabel(title, { exact: true }).check()
  await page
    .getByRole('button', { name: 'Confirm and assign pathway', exact: true })
    .click()
  await expect(
    page.getByText('Pathway confirmed. The Employee can now learn.', {
      exact: true,
    }),
  ).toBeVisible()
  await signOut(page)
  await login(page, 4, '/employee/pathway?view=assigned')
  await expect(
    page.getByRole('heading', { name: title + ' pathway', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await page
    .getByRole('region', { name: title + ' pathway', exact: true })
    .getByRole('link')
    .click()
  await expect(
    page.getByRole('heading', { name: 'Reading one', exact: true }),
  ).toBeVisible()
  const complete = page.getByRole('button', {
    name: 'Mark as completed',
    exact: true,
  })
  await expect(complete).toBeEnabled()
  await complete.click()
  await expect(
    page.getByText('Content completed', { exact: false }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  const initial = (await (
    await page.request.get(root + `/learning/${doc.id}/view`)
  ).json()) as LearningView
  expect(initial.progress[0].completedAt).toBeTruthy()
  await page.screenshot({
    path: 'test-results/REQ-013-learning-content-reader.png',
    fullPage: true,
  })
  await signOut(page)
  await login(page, 3, '/expert/modules')
  doc = (await (
    await page.request.get(root + `/modules/${doc.id}`)
  ).json()) as ModuleDocument
  const old = doc.revisions.at(-1)!.payload
  const content = (await (
    await mutate(page.request, root + '/contents/lessons', 'POST', {
      title: title + ' updated',
      occupationIds: doc.occupationIds,
      lessons: old.content.lessons,
    })
  ).json()) as ModuleContent
  let revised = (await (
    await mutate(page.request, root + `/modules/${doc.id}`, 'PUT', {
      expectedVersion: doc.lockVersion,
      value: {
        title: title + ' updated',
        moduleType: old.moduleType,
        contentId: content.id,
        duration: old.duration,
        price: old.price,
        occupationIds: doc.occupationIds,
        teachings: old.teachings.map((t) => ({
          skillId: t.skillId,
          teachingFocus: t.teachingFocus,
          difficultyLevel: t.difficultyLevel,
        })),
      },
    })
  ).json()) as ModuleDocument
  revised = (await (
    await mutate(page.request, root + `/modules/${doc.id}/actions`, 'POST', {
      expectedVersion: revised.lockVersion,
      action: 'submit',
    })
  ).json()) as ModuleDocument
  await signOut(page)
  await login(page, 2, '/ld-manager/modules')
  const released = await mutate(
    page.request,
    root + `/modules/${doc.id}/actions`,
    'POST',
    { expectedVersion: revised.lockVersion, action: 'approve' },
  )
  expect(released.ok()).toBeTruthy()
  await signOut(page)
  await login(page, 4, `/employee/modules/${doc.id}`)
  await expect(
    page.getByRole('button', { name: 'New version available', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'New version available', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Switch version', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: title + ' updated', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Report content issue', exact: true })
    .click()
  await page
    .getByLabel('Issue description', { exact: true })
    .fill('Please check the reading example.')
  await page.getByRole('button', { name: 'Send report', exact: true }).click()
  await expect(
    page.getByText('Issue reported to the responsible Expert.', {
      exact: true,
    }),
  ).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(
    page.getByRole('heading', { name: 'Reading one', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: 'test-results/REQ-013-learning-content-mobile.png',
    fullPage: true,
  })
  expect(errors).toEqual([])
})

async function upload(
  request: APIRequestContext,
  path: string,
  filename: string,
  buffer: Buffer,
) {
  const csrf = (await (
    await request.get('/api/v1/workspace-auth/csrf')
  ).json()) as { headerName: string; token: string }
  return request.post(root + path, {
    headers: { [csrf.headerName]: csrf.token },
    multipart: {
      file: {
        name: filename,
        mimeType: filename.endsWith('.mp4')
          ? 'video/mp4'
          : 'application/octet-stream',
        buffer,
      },
    },
  })
}
async function draft(
  request: APIRequestContext,
  title: string,
  lessons: LearningLesson[],
) {
  const skills = (await (
    await request.get(root + '/catalog/MicroSkill')
  ).json()) as CatalogChoice[]
  const createdContent = await mutate(
    request,
    root + '/contents/lessons',
    'POST',
    { title, lessons },
  )
  expect(createdContent.status()).toBe(201)
  const content = (await createdContent.json()) as ModuleContent
  const created = await mutate(request, root + '/modules', 'POST', {
    title,
    moduleType: 'LESSON_AND_PRACTICE',
    duration: 10,
    price: 1000,
    contentId: content.id,
    teachings: [
      {
        skillId: skills[0].id,
        teachingFocus: 'PRIMARY',
        difficultyLevel: 'LOW',
      },
    ],
  })
  expect(created.status()).toBe(201)
  return created.json() as Promise<ModuleDocument>
}
test('private MP4 upload, L&D approval, assignment admission, byte ranges and actual 90-percent playback', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const path =
    process.env.LEARNING_TEST_MP4 ??
    '/tmp/sep490-learning-content/fixtures/flower.mp4'
  test.skip(
    !existsSync(path),
    'Provide a CC0 H.264 MP4 fixture via LEARNING_TEST_MP4',
  )
  await login(page, 3, '/expert/modules')
  const uploaded = await upload(
    page.request,
    '/assets',
    'flower.mp4',
    readFileSync(path),
  )
  expect(uploaded.status()).toBe(200)
  const asset = (await uploaded.json()) as LearningAsset
  expect(asset.durationSeconds).toBeGreaterThan(0)
  const invalid = await upload(
    page.request,
    '/assets',
    'fake.mp4',
    Buffer.from('not a video'),
  )
  expect(invalid.status()).toBe(400)
  const lesson: LearningLesson = {
    id: randomUUID(),
    title: 'Video playback',
    type: 'VIDEO',
    body: null,
    bodyFormat: null,
    durationSeconds: asset.durationSeconds!,
    durationSource: 'MEDIA',
    videoSource: 'UPLOAD',
    assetId: asset.id,
    videoUrl: null,
  }
  let doc = await draft(
    page.request,
    'Private video ' + randomUUID().slice(0, 8),
    [lesson],
  )
  doc = (await (
    await mutate(page.request, root + `/modules/${doc.id}/actions`, 'POST', {
      expectedVersion: doc.lockVersion,
      action: 'submit',
    })
  ).json()) as ModuleDocument
  await signOut(page)
  await login(page, 2, '/ld-manager/modules')
  expect(
    (
      await mutate(page.request, root + `/modules/${doc.id}/actions`, 'POST', {
        expectedVersion: doc.lockVersion,
        action: 'approve',
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 4, '/employee/pathway?view=assigned')
  expect(
    (await mutate(page.request, root + `/learning/${doc.id}/begin`)).status(),
  ).toBe(403)
  expect((await page.request.get(root + '/assets/' + asset.id)).status()).toBe(
    404,
  )
  await signOut(page)
  await login(page, 3, '/expert/modules')
  const employees = (await (
    await page.request.get(root + '/catalog/Employee')
  ).json()) as CatalogChoice[]
  const employee =
    employees.find((e) => e.name === 'Dev EMPLOYEE') ?? employees[0]
  expect(
    (
      await mutate(page.request, root + '/pathways', 'POST', {
        learnerId: employee.id,
        title: 'Video fixture pathway',
        moduleIds: [doc.id],
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 4, `/employee/modules/${doc.id}`)
  const video = page.locator('video')
  await expect(video).toBeVisible({ timeout: 30000 })
  await expect
    .poll(
      () =>
        video.evaluate((v) => Number.isFinite(v.duration) && v.duration > 0),
      { timeout: 30000 },
    )
    .toBeTruthy()
  const range = await page.request.get(root + '/assets/' + asset.id, {
    headers: { Range: 'bytes=0-15' },
  })
  expect(range.status()).toBe(206)
  expect((await range.body()).length).toBe(16)
  await video.evaluate(async (v) => {
    v.currentTime = Math.max(0, v.duration - 0.1)
    await v.play()
  })
  await expect.poll(() => video.evaluate((v) => v.ended)).toBeTruthy()
  await expect(
    page.getByRole('button', { name: 'Mark as completed', exact: true }),
  ).toBeDisabled()
  await video.evaluate(async (v) => {
    v.currentTime = 0
    await v.play()
  })
  const complete = page.getByRole('button', {
    name: 'Mark as completed',
    exact: true,
  })
  await expect(complete).toBeEnabled({ timeout: 30000 })
  await complete.click()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  const saved = (await (
    await page.request.get(root + `/learning/${doc.id}/view`)
  ).json()) as LearningView
  expect(saved.progress[0].completedAt).toBeTruthy()
  expect(
    saved.progress[0].watchedIntervals.reduce(
      (sum, interval) => sum + interval.end - interval.start,
      0,
    ),
  ).toBeGreaterThanOrEqual(asset.durationSeconds! * 0.9)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  await page.screenshot({
    path: 'test-results/REQ-013-learning-content-video.png',
    fullPage: true,
  })
})
function workbook(
  code: string,
  _occupation: string,
  skill: string,
  title: string,
) {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      [
        'moduleId',
        'title',
        'moduleType',
        'durationMinutes',
        'priceVnd',
        'teachings',
      ],
      [
        code,
        title,
        'LESSON_AND_PRACTICE',
        10,
        1000,
        JSON.stringify([
          { skillId: skill, teachingFocus: 'PRIMARY', difficultyLevel: 'LOW' },
        ]),
      ],
    ]),
    'Modules',
  )
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      [
        'moduleId',
        'lessonId',
        'order',
        'title',
        'type',
        'text',
        'markdownPath',
        'videoSource',
        'videoUrl',
        'videoPath',
        'durationSeconds',
      ],
      [
        code,
        'reading-stable',
        1,
        'Imported reading',
        'TEXT',
        '# Real imported content',
        '',
        '',
        '',
        '',
        60,
      ],
    ]),
    'Lessons',
  )
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
test('Excel import validates, blocks unresolved drafts and requires explicit confirmation for owned revisions', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 3, '/expert/modules')
  const occupations = (await (
    await page.request.get(root + '/catalog/Occupation')
  ).json()) as CatalogChoice[]
  const skills = (await (
    await page.request.get(root + '/catalog/MicroSkill')
  ).json()) as CatalogChoice[]
  const code = 'LC-' + randomUUID().slice(0, 8)
  const file = workbook(
    code,
    occupations[0].id,
    skills[0].id,
    'Excel import ' + code,
  )
  const template = await page.request.get(root + '/imports/template')
  expect(template.ok()).toBeTruthy()
  const templateBook = XLSX.read(await template.body(), { type: 'buffer' })
  const templateRows = XLSX.utils.sheet_to_json<string[]>(
    templateBook.Sheets.Modules,
    { header: 1 },
  )
  expect(templateRows[0]).not.toContain('occupationIds')
  await page.getByText('Import Excel / ZIP', { exact: true }).click()
  await page.getByLabel('Module import file', { exact: true }).setInputFiles({
    name: 'modules.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: file,
  })
  await expect(
    page.getByRole('button', { name: 'Continue import', exact: true }),
  ).toBeEnabled({ timeout: 30000 })
  await page
    .getByRole('button', { name: 'Continue import', exact: true })
    .click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await page.request.get(root + '/modules/' + code)).status()).toBe(404)
  await page
    .getByRole('button', { name: 'Continue import', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Confirm import', exact: true })
    .click()
  await expect(
    page.getByText('Imported. Submit the drafts for review.', { exact: true }),
  ).toBeVisible()
  let doc = (await (
    await page.request.get(root + '/modules/' + code)
  ).json()) as ModuleDocument
  let preview = (await (
    await upload(page.request, '/imports', 'modules.xlsx', file)
  ).json()) as ImportPreview
  expect(
    preview.errors.some((e) => /draft|review/i.test(e.reason)),
  ).toBeTruthy()
  expect(
    (
      await mutate(
        page.request,
        root + `/imports/${preview.id}/commit`,
        'POST',
        { confirmOwnedDuplicates: true },
      )
    ).status(),
  ).toBe(409)
  doc = (await (
    await mutate(page.request, root + `/modules/${code}/actions`, 'POST', {
      expectedVersion: doc.lockVersion,
      action: 'submit',
    })
  ).json()) as ModuleDocument
  await signOut(page)
  await login(page, 2, '/ld-manager/modules')
  expect(
    (
      await mutate(page.request, root + `/modules/${code}/actions`, 'POST', {
        expectedVersion: doc.lockVersion,
        action: 'approve',
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 3, '/expert/modules')
  preview = (await (
    await upload(
      page.request,
      '/imports',
      'modules.xlsx',
      workbook(code, occupations[0].id, skills[0].id, 'Revised ' + code),
    )
  ).json()) as ImportPreview
  expect(preview.errors).toEqual([])
  expect(preview.ownedDuplicates).toEqual([code])
  expect(
    (
      await mutate(
        page.request,
        root + `/imports/${preview.id}/commit`,
        'POST',
        { confirmOwnedDuplicates: false },
      )
    ).status(),
  ).toBe(409)
  const committed = await mutate(
    page.request,
    root + `/imports/${preview.id}/commit`,
    'POST',
    { confirmOwnedDuplicates: true },
  )
  expect(committed.ok()).toBeTruthy()
  const revised = ((await committed.json()) as ModuleDocument[])[0]
  expect(revised.releasedRevision).toBe(1)
  expect(revised.revisions.at(-1)?.state).toBe('DRAFT')
  expect(revised.createdBy).toBe(doc.createdBy)
  expect(revised.occupationIds).toEqual([])
  const legacyBook = XLSX.read(file, { type: 'buffer' })
  const legacyRows = XLSX.utils.sheet_to_json<unknown[]>(
    legacyBook.Sheets.Modules,
    { header: 1 },
  )
  legacyRows[0].splice(5, 0, 'occupationIds')
  legacyRows[1].splice(5, 0, 'obsolete-occupation-not-an-access-grant')
  legacyRows[1][0] = 'LEGACY-' + randomUUID().slice(0, 8)
  const legacyLessons = XLSX.utils.sheet_to_json<unknown[]>(
    legacyBook.Sheets.Lessons,
    { header: 1 },
  )
  legacyLessons[1][0] = legacyRows[1][0]
  legacyBook.Sheets.Modules = XLSX.utils.aoa_to_sheet(legacyRows)
  legacyBook.Sheets.Lessons = XLSX.utils.aoa_to_sheet(legacyLessons)
  const legacyPreview = (await (
    await upload(
      page.request,
      '/imports',
      'modules.xlsx',
      XLSX.write(legacyBook, { type: 'buffer', bookType: 'xlsx' }),
    )
  ).json()) as ImportPreview
  expect(legacyPreview.errors).toEqual([])
  expect(legacyPreview.modules[0].module.occupationIds).toEqual([])
})
test('Platform Administrator upload settings are audited and other roles cannot edit them', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 0, '/platform-admin/learning-upload-settings')
  await expect(
    page.getByRole('heading', { name: 'Learning upload limits', exact: true }),
  ).toBeVisible()
  const initial = (await (
    await page.request.get(root + '/upload-settings')
  ).json()) as LearningLimits
  const fields = page.getByLabel('Image (MB)', { exact: true })
  await fields.fill(String(initial.imageBytes / 1048576 === 5 ? 4 : 5))
  await page.getByRole('button', { name: 'Save settings', exact: true }).click()
  await expect(
    page.getByText('Upload limits updated.', { exact: true }),
  ).toBeVisible()
  const current = (await (
    await page.request.get(root + '/upload-settings')
  ).json()) as LearningLimits
  expect(current.changedBy).toBeTruthy()
  expect(current.version).toBe(initial.version + 1)
  expect(
    (
      await mutate(page.request, root + '/upload-settings', 'PUT', initial)
    ).status(),
  ).toBe(409)
  expect(
    (
      await mutate(page.request, root + '/upload-settings', 'PUT', {
        ...initial,
        version: current.version,
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 3, '/expert/modules')
  expect(
    (
      await mutate(page.request, root + '/upload-settings', 'PUT', {
        ...initial,
        version: current.version + 1,
      })
    ).status(),
  ).toBe(403)
})

function fixtureSql(query: string) {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'sep490-accounts-dev-postgres-1',
      'psql',
      '-U',
      'adapt_learn_graph',
      '-d',
      'adapt_learn_graph_dev_accounts',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
    ],
    { input: query, encoding: 'utf8' },
  )
}
test('real second organization cannot read private content; peer cannot import another Expert module', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 3, '/expert/modules')
  const uploaded = await upload(
    page.request,
    '/assets',
    'pixel.png',
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ba8AAAAASUVORK5CYII=',
      'base64',
    ),
  )
  expect(uploaded.ok()).toBeTruthy()
  const asset = (await uploaded.json()) as LearningAsset
  const doc = await draft(
    page.request,
    'Isolation content ' + randomUUID().slice(0, 8),
    [
      {
        id: 'isolation-text',
        title: 'Private reading',
        type: 'TEXT',
        body: '<p>Private organization content.</p>',
        bodyFormat: 'HTML',
        durationSeconds: 60,
        durationSource: 'MANUAL',
        videoSource: null,
        assetId: null,
        videoUrl: null,
      },
    ],
  )
  const occupations = (await (
    await page.request.get(root + '/catalog/Occupation')
  ).json()) as CatalogChoice[]
  const skills = (await (
    await page.request.get(root + '/catalog/MicroSkill')
  ).json()) as CatalogChoice[]
  const otherOrg = randomUUID(),
    foreign = randomUUID(),
    peer = randomUUID(),
    foreignMember = randomUUID(),
    peerMember = randomUUID(),
    registration = randomUUID(),
    workspace = randomUUID(),
    intent = randomUUID(),
    order = randomUUID(),
    subscription = randomUUID(),
    period = randomUUID(),
    application = randomUUID()
  const foreignEmail = 'lc-foreign-' + foreign + '@example.test',
    peerEmail = 'lc-peer-' + peer + '@example.test'
  fixtureSql(`BEGIN;
    INSERT INTO platform.organization(organization_id,code,name) VALUES ('${otherOrg}','LC-${otherOrg.toUpperCase()}','Synthetic Learning Content isolation workspace');
    INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
      SELECT '${foreign}','${otherOrg}','${foreignEmail}','${foreignEmail}',password_hash FROM platform.account WHERE normalized_identifier='expert@example.test';
    INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash)
      SELECT '${peer}',organization_id,'${peerEmail}','${peerEmail}',password_hash FROM platform.account WHERE normalized_identifier='expert@example.test';
    INSERT INTO platform.workspace_account_profile(account_id,full_name,email_verified_at) VALUES ('${foreign}','Synthetic isolated Expert',now()),('${peer}','Synthetic peer Expert',now());
    INSERT INTO platform.organization_registration(registration_id,account_id,organization_name,workspace_slug,admin_name,state,email_verified_at,completed_at,created_at,updated_at)
      VALUES ('${registration}','${foreign}','Synthetic Learning Content isolation workspace','lc-${otherOrg}','Synthetic fixture','REGISTERED',now(),now(),now(),now());
    INSERT INTO platform.organization_workspace(workspace_id,organization_id,registration_id,slug,setup_state,created_at,ready_at)
      VALUES ('${workspace}','${otherOrg}','${registration}','lc-${otherOrg}','READY',now(),now());
    INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at)
      SELECT '${foreignMember}',account_id,organization_id,true,now(),now() FROM platform.account WHERE account_id='${foreign}';
    INSERT INTO platform.organization_membership(membership_id,account_id,organization_id,active,created_at,updated_at)
      SELECT '${peerMember}',account_id,organization_id,true,now(),now() FROM platform.account WHERE account_id='${peer}';
    INSERT INTO platform.organization_membership_role VALUES ('${foreignMember}','DOMAIN_EXPERT'),('${peerMember}','DOMAIN_EXPERT');
    INSERT INTO platform.subscription_intent(intent_id,kind,state,registration_id,owner_account_id,created_at,updated_at)
      VALUES ('${intent}','PURCHASE','OPEN','${registration}','${foreign}',now(),now());
    INSERT INTO platform.payment_order SELECT (jsonb_populate_record(NULL::platform.payment_order,to_jsonb(p)||jsonb_build_object(
      'order_id','${order}','intent_id','${intent}','created_by','${foreign}','provider_order_code',nextval('platform.payos_order_code_seq'),
      'idempotency_key','${order}','payment_link_id',null,'checkout_url',null,'supersedes_order_id',null,
      'name','Synthetic local isolation fixture','description','Test-only paid snapshot; no real payment'))).* FROM platform.payment_order p
      JOIN platform.subscription_period period ON period.order_id=p.order_id JOIN platform.subscription s USING(subscription_id)
      JOIN platform.account a ON a.organization_id=s.organization_id WHERE a.normalized_identifier='expert@example.test' LIMIT 1;
    UPDATE platform.subscription_intent SET state='APPLIED',applied_order_id='${order}' WHERE intent_id='${intent}';
    INSERT INTO platform.subscription VALUES ('${subscription}','${otherOrg}',0,now());
    INSERT INTO platform.subscription_period SELECT (jsonb_populate_record(NULL::platform.subscription_period,to_jsonb(p)||jsonb_build_object('period_id','${period}','subscription_id','${subscription}','order_id','${order}'))).* FROM platform.subscription_period p
      JOIN platform.subscription s USING(subscription_id) JOIN platform.account a ON a.organization_id=s.organization_id WHERE a.normalized_identifier='expert@example.test' LIMIT 1;
    INSERT INTO platform.payment_application(application_id,order_id,intent_id,state,period_id,applied_at,updated_at) VALUES ('${application}','${order}','${intent}','APPLIED','${period}',now(),now());
    COMMIT;`)
  try {
    await signOut(page)
    async function fixtureLogin(email: string) {
      await page.goto('/login')
      await page.getByLabel('Email', { exact: true }).fill(email)
      await page
        .getByLabel('Password', { exact: true })
        .fill(values.get('DEV_ACCOUNT_PASSWORD_3')!)
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith('/workspace-auth/sign-in') &&
          r.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      expect((await response).status()).toBe(200)
      await page
        .getByRole('button', { name: 'Continue to workspace', exact: true })
        .click()
    }
    await fixtureLogin(foreignEmail)
    expect((await page.request.get(root + '/modules/' + doc.id)).status()).toBe(
      404,
    )
    expect(
      (await page.request.get(root + '/assets/' + asset.id)).status(),
    ).toBe(404)
    expect((await page.request.get(root + '/pathways')).ok()).toBeTruthy()
    await signOut(page)
    await fixtureLogin(peerEmail)
    expect(
      (await page.request.get(root + '/modules/' + doc.id)).ok(),
    ).toBeTruthy()
    expect(
      (
        await mutate(page.request, root + '/modules/' + doc.id, 'PUT', {
          expectedVersion: doc.lockVersion,
          value: {},
        })
      ).status(),
    ).toBe(403)
    const preview = (await (
      await upload(
        page.request,
        '/imports',
        'modules.xlsx',
        workbook(
          doc.id,
          occupations[0].id,
          skills[0].id,
          'Forbidden peer edit',
        ),
      )
    ).json()) as ImportPreview
    expect(
      preview.errors.some((e) => /another Expert/.test(e.reason)),
    ).toBeTruthy()
    expect(
      (
        await mutate(
          page.request,
          root + `/imports/${preview.id}/commit`,
          'POST',
          { confirmOwnedDuplicates: true },
        )
      ).status(),
    ).toBe(409)
  } finally {
    fixtureSql(
      `BEGIN; UPDATE platform.organization_membership SET active=false WHERE membership_id IN ('${foreignMember}','${peerMember}'); UPDATE platform.account SET active=false WHERE account_id IN ('${foreign}','${peer}'); UPDATE platform.organization SET status='SUSPENDED' WHERE organization_id='${otherOrg}'; COMMIT;`,
    )
  }
})

test('ZIP includes Markdown, private images and MP4; missing assets block the whole batch', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(180000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const videoPath =
    process.env.LEARNING_TEST_MP4 ??
    '/tmp/sep490-learning-content/fixtures/flower.mp4'
  test.skip(!existsSync(videoPath), 'Provide the CC0 MP4 fixture')
  await login(page, 3, '/expert/modules')
  const occupations = (await (
    await page.request.get(root + '/catalog/Occupation')
  ).json()) as CatalogChoice[]
  const skills = (await (
    await page.request.get(root + '/catalog/MicroSkill')
  ).json()) as CatalogChoice[]
  const code = 'ZIP-' + randomUUID().slice(0, 8)
  const book = XLSX.read(
    workbook(code, occupations[0].id, skills[0].id, 'ZIP import ' + code),
    { type: 'buffer' },
  )
  const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets.Lessons, {
    header: 1,
  })
  rows[1][5] = ''
  rows[1][6] = 'readings/intro.md'
  rows.push([
    code,
    'video-two',
    2,
    'Imported video',
    'VIDEO',
    '',
    '',
    'UPLOAD',
    '',
    'videos/flower.mp4',
    0,
  ])
  book.Sheets.Lessons = XLSX.utils.aoa_to_sheet(rows)
  const excel = XLSX.write(book, {
    type: 'buffer',
    bookType: 'xlsx',
  }) as Buffer
  const zip = (entries: Record<string, string>) =>
    execFileSync(
      'python3',
      [
        '-c',
        'import sys,json,base64,zipfile,io; data=json.load(sys.stdin); out=io.BytesIO(); z=zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED); [z.writestr(name,base64.b64decode(value)) for name,value in data.items()]; z.close(); sys.stdout.buffer.write(out.getvalue())',
      ],
      { input: JSON.stringify(entries), maxBuffer: 10 * 1024 * 1024 },
    )
  const bad = (await (
    await upload(
      page.request,
      '/imports',
      'content.zip',
      zip({ 'modules.xlsx': excel.toString('base64') }),
    )
  ).json()) as ImportPreview
  expect(bad.errors.length).toBeGreaterThan(0)
  expect(
    (
      await mutate(page.request, root + `/imports/${bad.id}/commit`, 'POST', {
        confirmOwnedDuplicates: true,
      })
    ).status(),
  ).toBe(409)
  expect((await page.request.get(root + '/modules/' + code)).status()).toBe(404)
  const valid = zip({
    'modules.xlsx': excel.toString('base64'),
    'readings/intro.md': Buffer.from(
      '# Imported ZIP reading\n\n![Diagram](../images/pixel.png)',
    ).toString('base64'),
    'images/pixel.png':
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ba8AAAAASUVORK5CYII=',
    'videos/flower.mp4': readFileSync(videoPath).toString('base64'),
  })
  const preview = (await (
    await upload(page.request, '/imports', 'content.zip', valid)
  ).json()) as ImportPreview
  expect(preview.errors).toEqual([])
  expect(preview.modules[0].lessons).toHaveLength(2)
  const result = await mutate(
    page.request,
    root + `/imports/${preview.id}/commit`,
    'POST',
    { confirmOwnedDuplicates: true },
  )
  expect(result.ok()).toBeTruthy()
  const doc = ((await result.json()) as ModuleDocument[])[0]
  const lessons = doc.revisions[0].payload.content.lessons!
  expect(lessons[0].body).toContain('/api/v1/module-management/assets/')
  expect(lessons[1].assetId).toBeTruthy()
  expect(lessons[1].durationSeconds).toBeGreaterThan(0)
  expect(
    (await page.request.get(root + '/assets/' + lessons[1].assetId)).ok(),
  ).toBeTruthy()
  await page.screenshot({
    path: 'test-results/REQ-013-learning-content-import.png',
    fullPage: true,
  })
})
test('learning issue/version notifications persist in-app and deliver only into the local SMTP capture', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 3, '/expert/modules')
  const notifications = (await (
    await page.request.get(root + '/notifications')
  ).json()) as {
    id: string
    kind: string
    title: string
    body: string
    readAt: string | null
  }[]
  const report = notifications.find(
    (n) =>
      n.kind === 'CONTENT_ISSUE' &&
      n.body.includes('Please check the reading example.'),
  )
  expect(report).toBeTruthy()
  await page.getByRole('button', { name: /Notifications \(/ }).click()
  await expect(
    page.getByText(report!.title, { exact: true }).last(),
  ).toBeVisible()
  expect(
    (
      await mutate(
        page.request,
        root + `/notifications/${report!.id}/read`,
        'PUT',
      )
    ).ok(),
  ).toBeTruthy()
  await expect
    .poll(
      async () => {
        const result = await page.request.get(
          'http://localhost:28125/api/v1/messages',
        )
        const inbox = (await result.json()) as {
          messages: { Subject: string; To: { Address: string }[] }[]
        }
        return inbox.messages.some(
          (m) =>
            m.Subject === report!.title &&
            m.To.some((to) => to.Address === 'expert@example.test'),
        )
      },
      { timeout: 30000 },
    )
    .toBeTruthy()
  await signOut(page)
  await login(page, 4, '/employee/pathway?view=assigned')
  const learnerNotices = (await (
    await page.request.get(root + '/notifications')
  ).json()) as { kind: string; title: string }[]
  const versionNotice = learnerNotices.find((n) => n.kind === 'NEW_VERSION')
  expect(versionNotice).toBeTruthy()
  await expect
    .poll(
      async () => {
        const inbox = (await (
          await page.request.get('http://localhost:28125/api/v1/messages')
        ).json()) as {
          messages: { Subject: string; To: { Address: string }[] }[]
        }
        return inbox.messages.some(
          (m) =>
            m.Subject === versionNotice!.title &&
            m.To.some((to) => to.Address === 'employee@example.test'),
        )
      },
      { timeout: 30000 },
    )
    .toBeTruthy()
})

for (const provider of [
  {
    source: 'YOUTUBE',
    url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    iframe: 'iframe[src*="youtube.com/embed"]',
  },
  {
    source: 'VIMEO',
    url: 'https://vimeo.com/19231868',
    iframe: 'iframe[src*="player.vimeo.com/video"]',
  },
]) {
  test(`live ${provider.source} playback and staff verification`, async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120000)
    test.skip(
      baseURL !== 'http://localhost:8088' ||
        process.env.LEARNING_EXTERNAL_PROVIDER_TESTS !== 'true',
      'Live provider access must be explicitly enabled; this is not isolated adapter evidence',
    )
    await login(page, 3, '/expert/learning-content')
    await page
      .getByRole('button', { name: 'Create content', exact: true })
      .click()
    const editor = page.getByRole('dialog', {
      name: 'Create content',
      exact: true,
    })
    await editor
      .getByRole('button', { name: 'Add Video lesson', exact: true })
      .click()
    await editor
      .getByLabel('Video source', { exact: true })
      .selectOption(provider.source)
    await editor
      .getByLabel('HTTPS video link', { exact: true })
      .fill(provider.url)
    const frame = page.frameLocator(provider.iframe)
    await frame
      .getByRole('button', { name: /play/i })
      .first()
      .click({ timeout: 30000 })
    const verify = editor.getByRole('button', {
      name: 'Verify playback',
      exact: true,
    })
    await expect(verify).toBeEnabled({ timeout: 30000 })
    await verify.click()
    await expect(
      editor.getByRole('button', { name: 'Video verified', exact: true }),
    ).toBeVisible({ timeout: 30000 })
    await editor.screenshot({
      path: `test-results/REQ-013-learning-content-${provider.source.toLowerCase()}.png`,
    })
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click()
  })
}

test('R4 creates without occupation and L&D reviews three numbered lessons directly', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const path =
    process.env.LEARNING_TEST_MP4 ??
    '/tmp/sep490-learning-content/fixtures/flower.mp4'
  test.skip(!existsSync(path), 'Provide the CC0 MP4 fixture')
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await login(page, 3, '/expert/modules')
  const title = 'R4 - Lesson review ' + randomUUID().slice(0, 8)
  await page.getByRole('button', { name: 'Create module', exact: true }).click()
  const editor = page.getByRole('dialog', {
    name: 'Module editor',
    exact: true,
  })
  await expect(editor.getByLabel(/Occupation|Nghề/)).toHaveCount(0)
  await editor.getByLabel('Title', { exact: true }).fill(title)
  await editor.getByLabel('Lesson title', { exact: true }).fill('Introduction')
  await editor
    .locator('[contenteditable=true]')
    .fill('Introduction to the skill with a concrete example.')
  await editor
    .getByRole('button', { name: 'Add Text lesson', exact: true })
    .click()
  await editor
    .getByLabel('Lesson title', { exact: true })
    .nth(1)
    .fill('Guided practice')
  await editor
    .locator('[contenteditable=true]')
    .nth(1)
    .fill('Apply the example and compare your result.')
  await editor
    .getByRole('button', { name: 'Add Video lesson', exact: true })
    .click()
  await editor
    .getByLabel('Lesson title', { exact: true })
    .nth(2)
    .fill('Video demonstration')
  const videoUploaded = page.waitForResponse(
    (response) =>
      response.url().endsWith(root + '/assets') &&
      response.request().method() === 'POST',
    { timeout: 90000 },
  )
  await editor
    .getByLabel('Upload MP4 video', { exact: true })
    .setInputFiles(path)
  const uploadResponse = await videoUploaded
  expect(uploadResponse.status()).toBe(200)
  expect(
    ((await uploadResponse.json()) as LearningAsset).durationSeconds,
  ).toBeGreaterThan(0)
  await expect(
    editor.getByRole('button', { name: 'Save draft', exact: true }),
  ).toBeEnabled({ timeout: 30000 })
  await editor.getByRole('button', { name: 'Add skill', exact: true }).click()
  await editor.getByLabel('Skill', { exact: true }).selectOption({ index: 1 })
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith(root + '/modules') &&
      response.request().method() === 'POST',
  )
  await editor.getByRole('button', { name: 'Save draft', exact: true }).click()
  const response = await created
  expect(response.status()).toBe(201)
  const doc = (await response.json()) as ModuleDocument
  expect(doc.occupationIds).toEqual([])
  expect(doc.revisions[0].payload.content.occupationIds).toEqual([])
  expect(doc.revisions[0].payload.content.lessons).toHaveLength(3)
  expect(
    (
      await mutate(page.request, root + `/modules/${doc.id}/actions`, 'POST', {
        expectedVersion: doc.lockVersion,
        action: 'submit',
      })
    ).ok(),
  ).toBeTruthy()
  await signOut(page)
  await login(page, 2, '/ld-manager/modules')
  await page.getByLabel('Search name or ID', { exact: true }).fill(doc.id)
  const card = page
    .locator('div.bg-card')
    .filter({ has: page.getByText(doc.id, { exact: true }) })
  await card
    .getByRole('button', { name: 'Details & history', exact: true })
    .click()
  const details = page.getByRole('dialog', {
    name: 'Module details',
    exact: true,
  })
  await expect(
    details.getByText('Preview this content version', { exact: true }),
  ).toHaveCount(0)
  for (const name of [
    'Lesson 1: Introduction',
    'Lesson 2: Guided practice',
    'Lesson 3: Video demonstration',
  ])
    await expect(
      details.getByRole('region', { name, exact: true }),
    ).toHaveCount(1)
  await expect(
    details.getByText('Introduction to the skill with a concrete example.', {
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 })
  await expect(
    details.getByText('Apply the example and compare your result.', {
      exact: true,
    }),
  ).toHaveCount(1)
  const video = details
    .getByRole('region', { name: 'Lesson 3: Video demonstration', exact: true })
    .locator('video')
  await video.scrollIntoViewIfNeeded()
  await expect
    .poll(
      () =>
        video.evaluate((v) => Number.isFinite(v.duration) && v.duration > 0),
      { timeout: 30000 },
    )
    .toBeTruthy()
  await video.evaluate((v) => v.play())
  await expect
    .poll(() => video.evaluate((v) => v.currentTime > 0), { timeout: 15000 })
    .toBeTruthy()
  await video.evaluate((v) => v.pause())
  await details.screenshot({
    path: 'test-results/REQ-013-R4-numbered-lessons.png',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await details
    .getByRole('heading', { name: 'Lesson 2: Guided practice', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(
    details.getByText('Apply the example and compare your result.', {
      exact: true,
    }),
  ).toBeVisible()
  await details.screenshot({
    path: 'test-results/REQ-013-R4-numbered-lessons-mobile.png',
  })
  await details
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click()
  await page.setViewportSize({ width: 1280, height: 900 })
  await card
    .getByRole('button', { name: 'Approve and release', exact: true })
    .click()
  await page
    .getByRole('dialog', { name: 'Approve and release', exact: true })
    .getByRole('button', { name: 'Confirm', exact: true })
    .click()
  await expect(card.getByText('Released', { exact: true })).toBeVisible({
    timeout: 60000,
  })
  expect(browserErrors).toEqual([])
})

test('R5 restores roadmap and timeline with a real assigned R4 module and persisted learning', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED'))
      failedRequests.push(request.url())
  })
  await login(page, 3, '/expert/modules')
  const released = await page.request.get(root + '/catalog/ReleasedModule')
  expect(released.ok()).toBeTruthy()
  const module = ((await released.json()) as CatalogChoice[]).find(
    (m) => m.name === 'R4 - Lesson review cef9f873',
  )
  expect(module, 'Keep the existing approved R4 demo module').toBeTruthy()
  expect(
    (await page.request.get(root + `/learning/${module!.id}/view`)).status(),
  ).toBe(403)
  const people = (await (
    await page.request.get(root + '/catalog/Employee')
  ).json()) as CatalogChoice[]
  const employee = people.find((p) => p.name === 'Dev EMPLOYEE')
  expect(employee).toBeTruthy()
  const pathways = (await (
    await page.request.get(root + '/pathways')
  ).json()) as import('../src/shared/api/moduleAuthoringApi').ManualPathway[]
  let assignment = pathways.find(
    (p) => p.learnerId === employee!.id && p.moduleIds.includes(module!.id),
  )
  if (!assignment) {
    await page.getByText('Assign a learning pathway', { exact: true }).click()
    await page
      .getByLabel('Employee', { exact: true })
      .selectOption(employee!.id)
    await page
      .getByLabel('Pathway title', { exact: true })
      .fill('R4 - Learning content practice')
    await page.getByLabel(module!.name, { exact: true }).check()
    const assigned = page.waitForResponse(
      (r) =>
        r.url().endsWith(root + '/pathways') && r.request().method() === 'POST',
    )
    await page
      .getByRole('button', { name: 'Confirm and assign pathway', exact: true })
      .click()
    const response = await assigned
    expect(response.ok()).toBeTruthy()
    assignment =
      (await response.json()) as import('../src/shared/api/moduleAuthoringApi').ManualPathway
    await expect(
      page.getByText('Pathway confirmed. The Employee can now learn.', {
        exact: true,
      }),
    ).toBeVisible()
  }
  await signOut(page)
  await login(page, 4, '/employee/pathway?view=assigned')
  const section = page.getByRole('region', {
    name: assignment.title,
    exact: true,
  })
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption({ label: assignment.title })
  await expect(
    section.getByRole('button', { name: new RegExp(module!.name) }),
  ).toBeVisible({ timeout: 90000 })
  await expect(
    page.getByRole('button', { name: 'Interactive roadmap', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByText(
      /Quick Unlock|AI-Driven Adaptive Learning|Simulate Prerequisite/,
    ),
  ).toHaveCount(0)
  const preview = await page.request.get(root + `/learning/${module!.id}/view`)
  expect(preview.ok()).toBeTruthy()
  const before = (await preview.json()) as LearningView
  expect(before.revision.payload.teachings.length).toBeGreaterThan(0)
  for (const skill of before.revision.payload.teachings)
    await expect(
      section.getByText(skill.skillName, { exact: true }).first(),
    ).toBeVisible()
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: 'frontend/test-results/REQ-013-R5-roadmap.png',
    fullPage: false,
  })
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await expect(
    section.getByRole('heading', { name: module!.name, exact: true }),
  ).toBeVisible()
  await section.getByRole('link').click()
  await page
    .getByRole('navigation', { name: 'Module lessons' })
    .getByRole('button', { name: /1. Introduction/ })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Introduction', exact: true }),
  ).toBeVisible({ timeout: 60000 })
  const complete = page.getByRole('button', {
    name: 'Mark as completed',
    exact: true,
  })
  const completed = page.getByRole('button', {
    name: 'Lesson completed',
    exact: true,
  })
  if (!(await completed.isVisible())) {
    await expect(complete).toBeEnabled({ timeout: 30000 })
    await complete.click()
  }
  await expect(completed).toBeDisabled()
  await page.reload()
  await expect(completed).toBeDisabled({ timeout: 60000 })
  const after = (await (
    await page.request.get(root + `/learning/${module!.id}/view`)
  ).json()) as LearningView
  const first = after.revision.payload.content.lessons![0]
  expect(
    after.progress.find((p) => p.lessonId === first.id)?.completedAt,
  ).toBeTruthy()
  const expectedCount = after.revision.payload.content.lessons!.filter(
    (lesson) =>
      after.progress.some((p) => p.lessonId === lesson.id && p.completedAt),
  ).length
  await page.goto('/employee/pathway?view=assigned')
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption({ label: assignment.title })
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await expect(
    section.getByText(
      `${expectedCount}/${after.revision.payload.content.lessons!.length} lessons completed`,
      { exact: true },
    ),
  ).toBeVisible({ timeout: 90000 })
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: 'frontend/test-results/REQ-013-R5-timeline.png',
    fullPage: false,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: 'Interactive roadmap', exact: true })
    .click()
  await expect(
    section.getByRole('button', { name: new RegExp(module!.name) }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({
    path: 'frontend/test-results/REQ-013-R5-mobile.png',
    fullPage: false,
  })
  expect(pageErrors).toEqual([])
  expect(
    failedRequests.filter((url) => url.includes('/module-management/')),
  ).toEqual([])
})

test('R6 restores original pathway and lesson UI with real Text Video and persisted progress', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page, 4, '/employee/pathway?view=assigned')
  const assignment = 'R4 - Learning content practice'
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption({ label: assignment }, { timeout: 90000 })
  const section = page.getByRole('region', { name: assignment, exact: true })
  await expect(section.getByTestId('original-roadmap')).toBeVisible({
    timeout: 90000,
  })
  const module = section.getByRole('button', {
    name: /R4 - Lesson review cef9f873/,
  })
  await expect(module).toBeVisible()
  await module.click()
  const dialog = page.getByRole('dialog', {
    name: 'Module details',
    exact: true,
  })
  await expect(dialog.getByText(/1. Introduction/)).toBeVisible()
  await expect(dialog.getByText(/3. Video demonstration/)).toBeVisible()
  await dialog.getByRole('button', { name: /Close|Đóng/ }).click()
  await section
    .getByRole('heading', { name: assignment, exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: r6Artifact('REQ-013-R6-roadmap.png'),
  })
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await expect(section.getByTestId('original-timeline')).toBeVisible()
  await page.screenshot({
    path: r6Artifact('REQ-013-R6-timeline.png'),
  })
  const link = section.getByRole('link', {
    name: 'Open module lessons',
    exact: true,
  })
  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  const id = href!.split('/').at(-1)!
  const snapshot = (await (
    await page.request.get(root + `/learning/${id}/view`)
  ).json()) as LearningView
  const privateVideo = snapshot.revision.payload.content.lessons!.find(
    (lesson) => lesson.type === 'VIDEO' && lesson.assetId,
  )
  expect(privateVideo).toBeTruthy()
  const range = await page.request.get(
    root + `/assets/${privateVideo!.assetId}`,
    { headers: { Range: 'bytes=0-15' }, timeout: 90000 },
  )
  expect(range.status()).toBe(206)
  expect((await range.body()).length).toBe(16)
  await link.click()
  const syllabus = page.getByRole('complementary', { name: 'Module syllabus' })
  await expect(syllabus).toBeVisible({ timeout: 60000 })
  await syllabus.getByRole('button', { name: /1. Introduction/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Introduction', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Take Module Exam', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Lesson completed', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText('Introduction to the skill with a concrete example.', {
      exact: true,
    }),
  ).toBeVisible({ timeout: 60000 })
  await page.screenshot({
    path: r6Artifact('REQ-013-R6-reading.png'),
  })
  await page
    .getByRole('button', { name: 'Go to next item', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Guided practice', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Go to next item', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Video demonstration', exact: true }),
  ).toBeVisible()
  const video = page.locator('video')
  await expect
    .poll(
      () => video.evaluate((element: HTMLVideoElement) => element.readyState),
      { timeout: 60000 },
    )
    .toBeGreaterThanOrEqual(3)
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 0
  })
  await page
    .getByRole('button', { name: 'Play video', exact: true })
    .first()
    .click()
  await expect
    .poll(
      () => video.evaluate((element: HTMLVideoElement) => element.currentTime),
      { timeout: 60000 },
    )
    .toBeGreaterThan(1.5)
  if (!(await video.evaluate((element: HTMLVideoElement) => element.paused)))
    await page.getByRole('button', { name: 'Pause video', exact: true }).click()
  await expect
    .poll(
      async () => {
        const result = await page.request.get(root + `/learning/${id}/view`)
        const view = (await result.json()) as LearningView
        return (
          view.progress.find((p) => p.lessonId === view.activeLessonId)
            ?.positionSeconds ?? 0
        )
      },
      { timeout: 30000 },
    )
    .toBeGreaterThan(0.5)
  await page.screenshot({ path: r6Artifact('REQ-013-R6-video.png') })
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Video demonstration', exact: true }),
  ).toBeVisible({ timeout: 60000 })
  await expect
    .poll(
      () =>
        page
          .locator('video')
          .evaluate((element: HTMLVideoElement) => element.currentTime),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0.5)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(syllabus).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: r6Artifact('REQ-013-R6-reader-mobile.png'),
  })
  await page.getByRole('link', { name: 'Back to Pathway', exact: true }).click()
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption({ label: assignment })
  await expect(section.getByTestId('original-roadmap')).toBeVisible({
    timeout: 90000,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  // The original wide graph scrolls inside its canvas; the page itself stays within the viewport.
  await page.screenshot({
    path: r6Artifact('REQ-013-R6-pathway-mobile.png'),
  })
  expect(errors).toEqual([])
})

test('R6 keeps pathway body blank on an empty result and recovers from a failed read', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 4, '/employee/pathway?view=assigned')
  // UI-only response fixtures; no account assignments or persisted data are deleted.
  await page.route('**/api/v1/module-management/pathways', (route) =>
    route.fulfill({ status: 200, json: [] }),
  )
  await page.reload()
  await expect(page.getByTestId('empty-pathway')).toBeEmpty({ timeout: 30000 })
  await expect(
    page.locator(
      '[data-testid="original-roadmap"], [data-testid="original-timeline"]',
    ),
  ).toHaveCount(0)
  await expect(
    page.getByText(/No assigned|Contact your Expert|MOD-CYP-101/),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await expect(page.getByTestId('empty-pathway')).toBeEmpty({ timeout: 30000 })
  await page.route('**/api/v1/module-management/pathways', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Pathway temporarily unavailable' },
    }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Pathway temporarily unavailable',
    { timeout: 30000 },
  )
  await page.unroute('**/api/v1/module-management/pathways')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(
    page.getByLabel('Learning pathway', { exact: true }),
  ).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('empty-pathway')).toHaveCount(0)
})

test('R6 mobile original canvas scrolls to actual module and opens real lessons', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(360000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  await login(page, 4, '/employee/pathway?view=assigned')
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption(
      { label: 'R4 - Learning content practice' },
      { timeout: 90000 },
    )
  await page.setViewportSize({ width: 390, height: 844 })
  const canvas = page.getByTestId('original-roadmap')
  await expect(canvas).toBeVisible({ timeout: 90000 })
  await canvas.evaluate((element) => {
    element.scrollLeft = (element.scrollWidth - element.clientWidth) / 2
  })
  const module = page.getByRole('button', {
    name: /R4 - Lesson review cef9f873/,
  })
  await expect(module).toBeInViewport()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: r6Artifact('REQ-013-R6-pathway-mobile.png') })
  await module.click()
  const dialog = page.getByRole('dialog', {
    name: 'Module details',
    exact: true,
  })
  await expect(dialog.getByText(/3. Video demonstration/)).toBeVisible()
  await dialog
    .getByRole('link', { name: 'Open module lessons', exact: true })
    .click()
  const content = page.getByRole('region', {
    name: 'Lesson content',
    exact: true,
  })
  await expect(
    content.getByRole('heading', { name: 'Video demonstration', exact: true }),
  ).toBeVisible({ timeout: 60000 })
  await content.scrollIntoViewIfNeeded()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: r6Artifact('REQ-013-R6-player-mobile.png') })
})

test('R7 source-style pathway toolbar dialogs and timeline use actual assigned content', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const artifact = (name: string) =>
    fileURLToPath(
      new URL(
        '../../documents/testing/system/artifacts/REQ-013-learning-content-R7/' +
          name,
        import.meta.url,
      ),
    )
  await login(page, 4, '/employee/pathway?view=assigned')
  await page
    .getByLabel('Learning pathway', { exact: true })
    .selectOption(
      { label: 'R4 - Learning content practice' },
      { timeout: 90000 },
    )
  const region = page.getByRole('region', {
    name: 'R4 - Learning content practice',
    exact: true,
  })
  const roadmap = region.getByTestId('original-roadmap')
  await expect(roadmap).toBeVisible({ timeout: 90000 })
  const learning = (await (
    await page.request.get(
      root + '/learning/MOD-e52f4286-6713-4426-b98d-24b02584bcc8/view',
    )
  ).json()) as LearningView
  const lessons = learning.revision.payload.content.lessons ?? []
  const allCompleted =
    lessons.length > 0 &&
    lessons.every((lesson) =>
      learning.progress.some(
        (progress) => progress.lessonId === lesson.id && progress.completedAt,
      ),
    )
  await expect(
    region.getByText(
      `${allCompleted ? 1 : 0} / 1 modules with content completed`,
    ),
  ).toBeVisible()
  await page.screenshot({ path: artifact('roadmap.png') })
  const module = roadmap.getByRole('button', {
    name: /R4 - Lesson review cef9f873/,
  })
  await module.focus()
  await page.keyboard.press('Enter')
  const details = page.getByRole('dialog', {
    name: 'Module details',
    exact: true,
  })
  await expect(details.getByText('Estimated duration')).toBeVisible()
  await expect(
    details.getByRole('heading', { name: 'Micro-skills taught' }),
  ).toBeVisible()
  await expect(details.getByText(/3. Video demonstration/)).toBeVisible()
  await page.screenshot({ path: artifact('module-details.png') })
  await details
    .getByRole('button', {
      name: 'Analyse information security risks',
      exact: true,
    })
    .click()
  const skill = page.getByRole('dialog', { name: 'Skill details', exact: true })
  await expect(skill.getByText('Teaching focus', { exact: true })).toBeVisible()
  await expect(skill.getByText('Difficulty', { exact: true })).toBeVisible()
  await page.screenshot({ path: artifact('skill-details.png') })
  await page.keyboard.press('Escape')
  await expect(skill).not.toBeVisible()
  await page
    .getByLabel('Search micro-skills', { exact: true })
    .fill('no-skill-matches-this')
  await expect(roadmap.locator('.roadmap-skill-box')).toHaveClass(/opacity-30/)
  await page.getByLabel('Search micro-skills', { exact: true }).fill('')
  await page
    .getByRole('button', { name: 'Learning timeline', exact: true })
    .click()
  await expect(
    region.getByText('Expert-confirmed pathway · Actual content progress'),
  ).toBeVisible()
  await expect(
    region.getByRole('link', { name: 'Open module lessons' }),
  ).toHaveAttribute('href', /MOD-/)
  await expect(
    region.getByText(
      /Certified|Next Best Action|Locked Gate|AI-Driven|Simulate/,
    ),
  ).toHaveCount(0)
  await page.screenshot({ path: artifact('timeline.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: artifact('timeline-mobile.png') })
  expect(errors).toEqual([])
})

test('merge main keeps generated pathway presentation and real assigned lessons independently accessible', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240000)
  test.skip(baseURL !== 'http://localhost:8088', 'Dedicated dev stack required')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page, 4, '/employee/pathway?view=role')
  await expect(page.getByTestId('empty-initial-pathway')).toBeEmpty({
    timeout: 90000,
  })
  await page
    .getByRole('link', { name: 'Assigned modules', exact: true })
    .click()
  await expect(
    page.getByLabel('Learning pathway', { exact: true }),
  ).toBeVisible({ timeout: 90000 })
  const id = 'MOD-e52f4286-6713-4426-b98d-24b02584bcc8'
  const learning = (await (
    await page.request.get(root + `/learning/${id}/view`)
  ).json()) as LearningView
  const payload = learning.revision.payload
  // Explicit UI response fixture, not a persisted/generated algorithm outcome.
  await page.route('**/api/v1/employee/pathway', (route) =>
    route.fulfill({
      json: {
        status: {
          requestId: '00000000-0000-0000-0000-000000000019',
          generationStatus: 'SUCCEEDED',
          reviewStatus: 'APPROVED',
          validationStatus: 'VALID',
          displayState: 'APPROVED',
          reasonCode: null,
          revision: 1,
          revisionContentHash: 'a'.repeat(64),
          roleName: 'Merge UI fixture role',
          levelName: 'Fixture level',
        },
        archived: false,
        baseline: null,
        context: null,
        dependencies: [],
        modules: [
          {
            module: {
              id,
              title: payload.title,
              contentVersion: payload.contentVersion,
              ordinal: 1,
              durationMinutes: payload.duration,
              priceVnd: payload.price,
              targets: payload.teachings.map((teaching) => ({
                skillId: teaching.skillId,
                instructionLevel: null,
                teachingFocus: teaching.teachingFocus,
                difficultyLevel: teaching.difficultyLevel,
                coverageRole:
                  teaching.teachingFocus === 'INCIDENTAL'
                    ? 'ANCILLARY'
                    : 'COVERAGE',
                expertAttention: false,
                attentionReason: null,
              })),
            },
            accessState: 'AVAILABLE',
            reasonCode: null,
            entry: `/employee/modules/${id}`,
          },
        ],
      },
    }),
  )
  await page.goto('/employee/pathway?view=role')
  await expect(
    page.getByRole('heading', { name: 'Merge UI fixture role', exact: true }),
  ).toBeVisible({ timeout: 90000 })
  const mergeArtifact = (name: string) => fileURLToPath(new URL('../../documents/testing/system/artifacts/REQ-013-main-integration/' + name, import.meta.url))
  await page.screenshot({ path: mergeArtifact('generated-ui-fixture.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: mergeArtifact('generated-ui-fixture-mobile.png') })
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.getByRole('button', { name: new RegExp(payload.title) }).click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText(payload.contentVersion, { exact: false }).first(),
  ).toBeVisible()
  await dialog.locator(`a[href="/employee/modules/${id}"]`).click()
  await expect(
    page.getByRole('complementary', { name: 'Module syllabus' }),
  ).toBeVisible({ timeout: 60000 })
  await page.screenshot({
    path: fileURLToPath(
      new URL(
        '../../documents/testing/system/artifacts/REQ-013-main-integration/real-reader.png',
        import.meta.url,
      ),
    ),
  })
  await page.getByRole('link', { name: 'Back to Pathway', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Merge UI fixture role', exact: true }),
  ).toBeVisible({ timeout: 90000 })
  expect(errors).toEqual([])
})
