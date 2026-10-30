import { expect, test, type Page } from '@playwright/test'
import { role, flow, profiles, workspace, attempt, result } from './support/ui-surfaces.fixture'
// Actual App/components + synthetic HTTP fixtures. This suite does not certify backend integration.
async function setup(page: Page, lang: string) {
  const writes: string[] = []
  await page.addInitScript(language => localStorage.setItem('app_language', language), lang)
  await page.route('http://127.0.0.1:28188/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() !== 'GET') { writes.push(path); await route.abort(); return }
    let body: unknown
    if (path.endsWith('/employee/target-roles')) body = [role]
    else if (path.endsWith('/target-role-selection/mastery')) body = profiles
    else if (path.endsWith('/target-role-selection')) body = flow
    else if (path.endsWith('/baseline-attempts/history')) body = [result]
    else if (path.endsWith('/attempt-v1/result')) body = result
    else if (path.endsWith('/baseline-attempts/attempt-v1')) body = attempt
    else if (path.endsWith('/occupations/occ-a')) body = workspace
    else if (path.includes('/versions/')) body = { version: workspace.current, status: 'ACTIVE' }
    else if (path.endsWith('/ld/adaptive-baseline-blueprints')) body = { rows: [], total: 0, page: 0, size: 12 }
    else if (path.endsWith('/micro-skills')) body = [{ id: 's1', code: 'S1', name: 'Unique Search Skill' }]
    else { await route.fulfill({ status: 503, json: { code: 'FIXTURE_UNAVAILABLE' } }); return }
    await route.fulfill({ json: body })
  })
  return writes
}
async function layout(page: Page) {
  const value = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, url: location.href,
    overflow: [...document.querySelectorAll('main *, .workspace-content *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0,15).map(e => ({tag:e.tagName, class:e.className, right:e.getBoundingClientRect().right, text:e.textContent?.slice(0,90)})) }))
  await test.info().attach('layout.json', { body: JSON.stringify(value), contentType: 'application/json' })
  await page.screenshot({ path: test.info().outputPath('surface-' + test.info().attachments.length + '.png'), fullPage: true })
  // Keep the overflow assertion failing while continuing independent version/Draft observations.
  expect.soft(value.document, value.url).toBeLessThanOrEqual(value.viewport)
  await expect(page.getByRole('heading', { level: 1 })).toHaveClass(/sr-only/)
}
for (const language of ['en', 'vi']) for (const [width, height] of [[320, 640], [390, 844], [768, 800], [844, 390], [1280, 900]]) {
  test(`RB01/MM05 Role/mastery/result/history long text ${language} ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); const writes = await setup(page, language)
    await page.goto('/employee/target-roles?search=Security#catalog')
    await expect(page).toHaveURL(/employee\/upskilling\?search=Security&tab=roles#catalog/)
    const rolesTab = page.getByRole('tab', { name: language === 'en' ? 'Roles' : 'Vị trí', exact: true })
    await expect(rolesTab).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText(role.name, { exact: true }).first()).toBeVisible()
    const history = page.getByRole('link', { name: language === 'en' ? 'Baseline history' : 'Lịch sử đánh giá đầu vào', exact: true })
    await expect(history.locator('..').getByRole('link')).toHaveCount(1)
    await expect(history).toHaveClass(/\bborder\b/)
    await layout(page)
    await rolesTab.focus(); await page.keyboard.press('Home'); await expect(rolesTab).toHaveAttribute('aria-selected', 'false')
    await page.keyboard.press('End'); await expect(rolesTab).toHaveAttribute('aria-selected', 'true')
    await page.goto('/employee/my-mastery'); await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'); await layout(page)
    await page.goto('/employee/baseline-assessment/attempt-v1'); await expect(page.getByText('100.0%', { exact: true })).toBeVisible(); await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'); await layout(page)
    await page.goto('/employee/baseline-assessment'); await expect(page.getByRole('link', { name: role.occupationName, exact: true })).toHaveAttribute('href', '/employee/baseline-assessment/attempt-v1'); await layout(page)
    expect(writes).toEqual([])
  })
  test(`VB02/MM04/MM05 exact version and Draft form ${language} ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); const writes = await setup(page, language)
    const maximum = language === 'en' ? 'Maximum questions' : 'Số câu tối đa'
    const duration = language === 'en' ? 'Total duration (minutes)' : 'Tổng thời gian (phút)'
    await page.goto('/ld-manager/baseline-assessments/occ-a?blueprint=blueprint-a&version=1')
    await expect(page.getByLabel(maximum, { exact: true })).toHaveValue('45'); await expect(page.getByLabel(maximum, { exact: true })).toBeDisabled()
    await expect(page.getByText(role.levels[0].skills[0].name, { exact: true })).toBeVisible()
    await expect(page.getByLabel(duration, { exact: true })).toHaveValue('50'); await layout(page)
    await page.goto('/ld-manager/baseline-assessments/occ-a?draft=draft-a')
    await expect(page.getByLabel(maximum, { exact: true })).toHaveValue('100')
    await expect(page.getByLabel(duration, { exact: true })).toHaveValue('110'); await layout(page)
    expect(writes).toEqual([])
  })
}
test('RB01 browser global search routes Role and Skill to their intended tabs', async ({ page }) => {
  const writes = await setup(page, 'en'); await page.goto('/employee/upskilling')
  const search = page.getByRole('searchbox', { name: 'Search skills and target roles directly' })
  await search.fill('Security'); await page.getByRole('button', { name: new RegExp('Security Role') }).click()
  await expect(page).toHaveURL(/upskilling\?tab=roles&search=/)
  await search.fill('Unique Search Skill'); await page.getByRole('button', { name: /Unique Search Skill/ }).click()
  await expect(page).toHaveURL(/upskilling\?tab=skills&search=Unique%20Search%20Skill/)
  expect(writes).toEqual([])
})
