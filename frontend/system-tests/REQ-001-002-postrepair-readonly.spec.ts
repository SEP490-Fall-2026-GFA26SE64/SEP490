import { expect, test } from '@playwright/test'

// Reads the completed, retained system fixture. No baseline/Draft/selection command or reset.
test('RB07/14/VB02/MM04/MM05 final repair reads original history and EN/VI mobile version without domain writes', async ({ page }) => {
  const writes: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !request.url().endsWith('/local-baseline-demo/session')) writes.push(request.method() + ' ' + request.url())
  })
  const manager = '/api/v1/ld/adaptive-baseline-blueprints/occupations/OCC-15-1212.00'
  expect((await page.request.post('/api/v1/local-baseline-demo/session', { data: { persona: 'ld' } })).status()).toBe(204)
  const beforeResponse = await page.request.get(manager)
  expect(beforeResponse.status()).toBe(200)
  const before = await beforeResponse.json() as { current: null; working: null }
  // The ninth journey deliberately deactivates v2. Discover the retained v1 through the read API.
  expect(before.current).toBeNull()
  expect(before.working).toBeNull()
  const listed = await page.request.get('/api/v1/ld/adaptive-baseline-blueprints?search=C3&direction=NEWEST&page=0&size=20')
  expect(listed.status()).toBe(200)
  const rows = await listed.json() as { rows: { blueprintId: string; occupationId: string; version: number | null }[] }
  const original = rows.rows.find(row => row.occupationId === 'OCC-15-1212.00' && row.version === 1)
  expect(original).toBeDefined()
  for (const language of ['en', 'vi']) for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`/ld-manager/baseline-assessments/OCC-15-1212.00?blueprint=${original!.blueprintId}&version=1`)
    await page.getByRole('button', { name: language.toUpperCase(), exact: true }).click()
    const maximum = page.getByLabel(language === 'en' ? 'Maximum questions' : 'Số câu tối đa', { exact: true })
    await expect(maximum).toHaveValue('45'); await expect(maximum).toBeDisabled()
    await expect(page.getByLabel(language === 'en' ? 'Total duration (minutes)' : 'Tổng thời gian (phút)', { exact: true })).toHaveValue('50')
    await page.evaluate(() => document.fonts.ready)
    const layout = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth, overflow: [...document.querySelectorAll('*')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).map(element => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right, text: element.textContent?.slice(0, 90) })) }))
    await test.info().attach('layout.json', { body: JSON.stringify(layout), contentType: 'application/json' })
    await test.info().attach('intrinsic-overflow.json', { body: JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body, body *')].filter(element => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1).map(element => ({ tag: element.tagName, class: element.className, width: element.clientWidth, scroll: element.scrollWidth, wrap: getComputedStyle(element).overflowWrap, whiteSpace: getComputedStyle(element).whiteSpace, text: element.textContent?.slice(0, 100) })))), contentType: 'application/json' })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(layout.document, JSON.stringify(layout)).toBeLessThanOrEqual(width)
    await page.screenshot({ path: test.info().outputPath(`real-version-${language}-${width}.png`), fullPage: true })
  }
  expect(await (await page.request.get(manager)).json()).toEqual(before)
  expect((await page.request.post('/api/v1/local-baseline-demo/session', { data: { persona: 'employee-a' } })).status()).toBe(204)
  const historyBefore = await (await page.request.get('/api/v1/employee/baseline-attempts/history')).json()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/employee/upskilling')
  const history = page.getByRole('link', { name: 'Lịch sử đánh giá đầu vào', exact: true })
  await expect(history).toHaveClass(/\bborder\b/)
  await expect(history.locator('..').getByRole('link')).toHaveCount(1)
  await page.screenshot({ path: test.info().outputPath('completed-role-summary.png'), fullPage: true })
  expect(await (await page.request.get('/api/v1/employee/baseline-attempts/history')).json()).toEqual(historyBefore)
  expect(writes).toEqual([])
})
