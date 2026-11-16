import { test, expect } from '@playwright/test'
// UI-only fixture assertions. These are not real database or assessment acceptance.
for (const width of [1440, 390]) {
  test(`skill module browser UI at ${width}px: loading, locks, empty, retry and start navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await page.route('**/api/v1/organizations/e0000000-0000-0000-0000-000000000099/micro-skills', route => route.fulfill({ json: [{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }, { id: 'empty', code: 'EMPTY', name: 'No content skill', status: 'ACTIVE', version: 'v1' }] }))
    await page.route(/\/api\/v1\/employee\/knowledge-profile\?/, route => route.fulfill({ json: { items: new URL(route.request().url()).searchParams.get('skillId') === 'java' ? [{ kind: 'EVIDENCE', id: 'e1', skillId: 'java', skillName: 'Java', skillVersion: 'v1', knowledgeLevel: 'FOUNDATION', observedAt: '2026-11-15T00:00:00Z', purpose: null, attemptId: 'a1', correctCount: null, totalCount: null, passed: null, mandatorySatisfied: null, vetoTriggered: null, reasons: [], sourceKind: 'MODULE_ASSESSMENT', sourceId: 'a1', reviewState: null }] : [], page: 0, pageSize: 20, hasMore: false } }))
    let attempts = 0
    await page.route('**/api/v1/module-management/skills/java/modules', route => {
      attempts++
      return route.fulfill({ status: attempts === 1 ? 503 : 200, json: attempts === 1 ? { message: 'fixture unavailable' } : [
        { moduleId: 'locked', title: 'Prerequisite module', contentVersion: 'v1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', started: false, completed: false, unavailableReason: 'PREREQUISITE_NOT_MET' },
        { moduleId: 'open', title: 'Java Foundation', contentVersion: 'v1', knowledgeLevel: 'FOUNDATION', skillVersion: 'v1', started: false, completed: false, unavailableReason: null },
      ] })
    })
    await page.route('**/api/v1/module-management/skills/empty/modules', route => route.fulfill({ json: [] }))
    await page.route('**/api/v1/module-management/skills/java/modules/open/learning', route => route.fulfill({ status: 204 }))
    await page.route('**/api/v1/workspace-auth/csrf', route => route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'fixture' } }))
    await page.goto('/system-tests/support/individual-skill.html')
    await page.getByRole('searchbox').fill('No content')
    await page.getByRole('button', { name: 'View modules' }).click()
    await expect(page.getByRole('dialog')).toContainText('No approved modules')
    await page.getByRole('button', { name: 'Close dialog' }).click()
    await page.getByRole('searchbox').fill('Java')
    await page.getByRole('button', { name: 'View modules' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not load modules')
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    const buttons = page.getByRole('button', { name: 'Start learning', exact: true })
    await expect(buttons.nth(0)).toBeDisabled(); await expect(buttons.nth(1)).toBeEnabled()
    await expect(page.getByRole('dialog')).toContainText('Prerequisite knowledge has not been achieved.')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Foundation/ })).toContainText('Achieved')
    await page.getByRole('tab', { name: /Advanced/ }).click()
    await expect(page.getByText('No approved modules are available at this knowledge level.')).toBeVisible()
    await page.getByRole('tab', { name: /Foundation/ }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/individual-skill-ui-${width}.png`, fullPage: true })
    await buttons.nth(1).click(); await expect(page.getByRole('heading', { name: 'Reader navigation reached' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

for (const width of [1440, 390]) {
  test(`module search filters, direct start and reset at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
    await page.route('**/api/v1/organizations/*/micro-skills', route => route.fulfill({ json: [{ id: 'java', code: 'JAVA', name: 'Java', status: 'ACTIVE', version: 'v1' }] }))
    const failedRequests: string[] = [], consoleErrors: string[] = []
    page.on('requestfailed', r => { if (!r.failure()?.errorText.includes('ERR_ABORTED')) failedRequests.push(r.url()) })
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    const searches: URL[] = []
    let fail = true
    await page.route('**/api/v1/module-management/skills/modules?*', route => {
      const url = new URL(route.request().url()); searches.push(url)
      if (fail) { fail = false; return route.fulfill({ status: 503, json: { message: 'fixture offline' } }) }
      const level = url.searchParams.get('knowledgeLevel')
      const query = url.searchParams.get('search') ?? ''
      const items = query === 'absent' ? [] : [{ skillId: 'java', skillName: 'Java', module: { moduleId: 'collections', title: 'Java Collections', knowledgeLevel: level || 'INTERMEDIATE', skillVersion: 'v1', contentVersion: '1', started: true, completed: false } }]
      return route.fulfill({ json: { items, page: Number(url.searchParams.get('page')), pageSize: 20, totalItems: query === 'paged' ? 21 : items.length } })
    })
    await page.route('**/api/v1/workspace-auth/csrf', route => route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'fixture' } }))
    await page.route('**/api/v1/module-management/skills/java/modules/collections/learning', route => route.fulfill({ status: 204 }))
    await page.goto('/system-tests/support/individual-skill.html')
    await page.getByRole('button', { name: 'Modules', exact: true }).click()
    await page.getByRole('button', { name: 'Retry module search' }).click()
    await expect(page.getByRole('heading', { name: 'Java Collections' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Learning modules' })).toBeVisible()
    await expect(page.locator(width >= 900 ? '.catalog-owner' : '.catalog-mobile-skill')).toContainText('Java')
    await page.getByRole('button', { name: 'Card view' }).click()
    await expect(page.getByRole('table', { name: 'Learning modules' })).toHaveCount(0)
    await page.getByRole('button', { name: 'List view' }).click()
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByLabel('Belongs to skill', { exact: true }).click(); await page.getByRole('option', { name: /Java/ }).click()
    await page.getByLabel('Module knowledge level', { exact: true }).click(); await page.getByRole('option', { name: 'Advanced', exact: true }).click()
    await page.getByRole('button', { name: 'Show results', exact: true }).click()
    await expect.poll(() => searches.at(-1)?.searchParams.get('knowledgeLevel')).toBe('ADVANCED')
    expect(searches.at(-1)?.searchParams.get('skillId')).toBe('java')
    await page.getByRole('searchbox').fill('paged')
    await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Next page', exact: true }).click()
    await expect.poll(() => searches.at(-1)?.searchParams.get('page')).toBe('1')
    await page.getByRole('searchbox').fill('absent')
    await expect(page.getByText(/No matching modules/)).toBeVisible()
    expect(searches.at(-1)?.searchParams.get('page')).toBe('0')
    await page.getByRole('searchbox').fill('Collections')
    await expect(page.getByRole('heading', { name: 'Java Collections' })).toBeVisible()
    await page.screenshot({ path: `test-results/individual-skill-search-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Continue learning', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Reader navigation reached' })).toBeVisible()
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
    await test.info().attach('console-errors-including-intentional-503', { body: JSON.stringify(consoleErrors), contentType: 'application/json' })
    await page.goto('/system-tests/support/individual-skill.html')
    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Skills', exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Modules', exact: true })).toBeVisible()
    await page.getByRole('searchbox').fill('Collections')
    await page.getByRole('button', { name: 'Reset filters' }).click()
    await expect(page.getByRole('region', { name: 'Modules', exact: true })).toHaveCount(0)
  })
}
