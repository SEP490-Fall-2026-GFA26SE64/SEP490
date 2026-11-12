import { test, expect as baseExpect, type Page } from '@playwright/test'
const expect = baseExpect.configure({ timeout: 20000 })
test.setTimeout(90000)
const slug = 'document-reader-test'
const html = `<h2>Why graph modeling matters</h2><p>A clear model connects <strong>requirements</strong> to <em>observable results</em> and <code>stable identities</code>.</p>
<blockquote><p>[!NOTE]\nUse exact requirements, not invented completion states.</p></blockquote>
<h3>Core concepts</h3><ol><li>Identify the actor<ul><li>Define ownership</li><li>Keep valid nulls</li></ul></li><li>Verify the result</li></ol>
<h4>A concrete example</h4><table><thead><tr><th>Action</th><th>Expected result</th></tr></thead><tbody><tr><td>Complete lesson</td><td>Persisted content completion</td></tr></tbody></table><hr>
<h2>Pattern matching example</h2><pre><code class="language-cypher">// Read the current catalog\nMATCH (role:TargetRole)-[:REQUIRES]-&gt;(skill:MicroSkill)\nRETURN skill.name, "${'long line '.repeat(30)}";</code></pre>
<blockquote><p>[!IMPORTANT]\nContent completion and official achievement remain separate.</p></blockquote><blockquote><p>[!WARNING]\nCheck prerequisites before assessment.</p></blockquote><blockquote><p>[!TIP]\nUse a small repeatable example.</p></blockquote><p>End of lesson.</p>`
async function fixture(page: Page, body = html, format: 'HTML' | 'MARKDOWN' = 'HTML', rendered = body) {
  const progress: Record<string, unknown>[] = []
  let active = 'read'
  const previews: { body: string; format: string }[] = []
  const lessons = [
    { id: 'read', title: 'Define and verify a learning graph', type: 'TEXT', body, bodyFormat: format, durationSeconds: 300, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null },
    { id: 'next', title: 'Apply the concepts', type: 'TEXT', body: '<p>Try a bounded practical example.</p>', bodyFormat: 'HTML', durationSeconds: 60, durationSource: 'ESTIMATED', videoSource: null, assetId: null, videoUrl: null },
  ]
  const payload = { title: 'Graph modeling foundation', metadata: { id: 'reader-fixture', version: '1', status: 'ACTIVE', reviewStatus: 'APPROVED' }, moduleType: 'LESSON_AND_PRACTICE', contentUri: 'content:reader', contentType: 'text/markdown', contentVersion: '1', duration: 6, knowledgeLevel: 'FOUNDATION', skillVersion: '1', teachings: [{ skillId: 'skill-test', skillName: 'Graph modeling' }], content: { id: 'content-reader', title: 'Modeling', markdown: '', contentType: 'text/markdown', contentVersion: '1', jobPositionIds: [], createdBy: 'expert-test', createdAt: '2026-11-12T00:00:00Z', lessons } }
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const data = route.request().method() === 'GET' ? null : route.request().postDataJSON()
    if (path.endsWith('/workspace-auth/current')) return route.fulfill({ json: { accountId: 'employee-test', organizationId: 'org-test', email: 'reader@example.test', fullName: 'Reader Test', roles: ['EMPLOYEE'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: slug } })
    if (path.endsWith('/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'test-only' } })
    if (path.endsWith('/subscription/access')) return route.fulfill({ json: {} })
    if (path.endsWith('/reader-fixture/begin')) return route.fulfill({ json: { revision: { number: 1, state: 'RELEASED', payload }, latestRevision: 1, activeLessonId: active, progress } })
    if (path.endsWith('/text/preview')) { previews.push(data); return route.fulfill({ json: { html: data.body === body ? rendered : data.body } }) }
    if (path.endsWith('/progress')) {
      active = path.split('/lessons/')[1].split('/')[0]
      const old = progress.find(p => p.lessonId === active)
      const updated = { lessonId: active, positionSeconds: 0, reachedEnd: Boolean(old?.reachedEnd || data.reachedEnd), completedAt: old?.completedAt ?? (data.complete ? new Date().toISOString() : null), watchedIntervals: [], updatedAt: new Date().toISOString(), coverageUpdatedAt: null }
      const index = progress.findIndex(p => p.lessonId === active); if (index >= 0) progress[index] = updated; else progress.push(updated)
      return route.fulfill({ json: updated })
    }
    if (path.endsWith('/assessment-eligibility')) return route.fulfill({ json: { skillId: 'skill-test', eligible: false, reason: 'CONTENT_REQUIRED', qualifyingCompletion: null } })
    if (path.endsWith('/modules')) return route.fulfill({ json: [] })
    return route.fulfill({ status: 404, json: { message: 'Outside isolated document fixture' } })
  })
  return { previews }
}
for (const viewport of [{ width: 1440, height: 1000 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
  test(`rich document ${viewport.width}: hierarchy, code, callouts and retained learning flow`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await fixture(page)
    await page.goto(`/workspace/${slug}/employee/modules/reader-fixture`)
    await expect(page.getByRole('heading', { level: 1, name: 'Define and verify a learning graph' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Sidebar navigation' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^(Expand|Collapse) sidebar$/ })).toHaveCount(0)
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Module syllabus' })).toBeVisible()
    const mainBounds = await page.getByRole('main').boundingBox()
    expect(mainBounds?.x).toBe(0)
    expect(mainBounds?.width).toBe(viewport.width)
    await expect(page.getByRole('heading', { level: 4, name: 'A concrete example' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
    if (viewport.width >= 1280) {
      const contents = page.getByRole('navigation', { name: 'On this page' })
      await expect(contents).toBeVisible()
      await contents.getByRole('link', { name: 'Pattern matching example' }).click()
      await expect(page.getByRole('heading', { name: 'Pattern matching example' })).toBeFocused()
    }
    for (const label of ['Information', 'Important note', 'Warning', 'Best practice']) await expect(page.getByRole('complementary', { name: label, exact: true })).toBeVisible()
    await expect(page.locator('.hljs-keyword').first()).toHaveText('MATCH')
    await page.getByRole('button', { name: 'Copy code: Cypher', exact: true }).click()
    await expect(page.getByText('Copied', { exact: true })).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('MATCH (role:TargetRole)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (viewport.width === 1440) await page.screenshot({ path: '/tmp/learning-modern-desktop.png', fullPage: true })
    await page.getByRole('button', { name: 'Hide lessons', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Module syllabus' })).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `/tmp/learning-modern-${viewport.width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'Show lessons', exact: true }).click()
    const complete = page.getByRole('button', { name: 'Mark as completed', exact: true })
    await complete.scrollIntoViewIfNeeded(); await expect(complete).toBeEnabled(); await complete.click()
    await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Next lesson', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Apply the concepts' })).toBeVisible()
    await expect(page.getByText('Saving progress…', { exact: true })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Apply the concepts' })).toBeVisible()
    await page.getByRole('button', { name: 'Previous lesson', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lesson completed', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to Pathway', exact: true })).toHaveAttribute('href', `/workspace/${slug}/employee/pathway`)
    await page.getByRole('link', { name: 'Back to Pathway', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/workspace/${slug}/employee/pathway$`))
    await expect(page.getByRole('complementary', { name: 'Sidebar navigation' })).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^(Expand|Collapse) sidebar$/ })).toBeVisible()
    expect(errors).toEqual([])
  })
}
for (const kind of ['short-markdown', 'long-markdown', 'plain'] as const) {
  test(`${kind}: existing preview contract and long-line containment`, async ({ page }) => {
    const markdown = kind === 'plain' ? 'Readable content with no formatting.' : '# Technical lesson\n\n' + (kind === 'long-markdown' ? 'A technical explanation. '.repeat(1200) : 'A short explanation.') + '\n\n```unknown\n' + 'x'.repeat(500) + '\n```'
    const rendered = kind === 'plain' ? '<p>Readable content with no formatting.</p>' : '<h1>Technical lesson</h1><p>' + (kind === 'long-markdown' ? 'A technical explanation. '.repeat(1200) : 'A short explanation.') + '</p><pre><code class="language-unknown">' + 'x'.repeat(500) + '</code></pre>'
    const state = await fixture(page, markdown, 'MARKDOWN', rendered)
    await page.goto(`/workspace/${slug}/employee/modules/reader-fixture`)
    await expect(page.getByRole('heading', { level: 1, name: 'Define and verify a learning graph' })).toBeVisible()
    if (kind === 'plain') await expect(page.getByText('Readable content with no formatting.', { exact: true })).toBeVisible()
    else await expect(page.getByRole('heading', { level: 2, name: 'Technical lesson' })).toBeVisible()
    expect(state.previews[0]).toEqual({ body: markdown, format: 'MARKDOWN' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.locator('.learning-document-page').evaluate(e => getComputedStyle(e).boxShadow)).toBe('none')
  })
}
