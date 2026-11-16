import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { mutate, observe, record, text } from './subscriptionHelpers'
import type { CatalogClosure, PlatformCatalog } from '../src/features/guest/platformCatalogApi'

test.setTimeout(180_000)
test.beforeEach(async ({ page, baseURL }) => {
  if (baseURL !== 'http://127.0.0.1:8096') throw new Error('Use only the isolated alg-starter-r3 stack on port 8096.')
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
})

function watch(page: Page) {
  const seen = observe(page)
  page.on('console', message => {
    if (message.type() !== 'error') return
    const path = new URL(message.location().url || page.url()).pathname
    if (message.text().includes('status of 401') && ['/api/v1/registration/current', '/api/v1/workspace-auth/current'].includes(path)) return
    seen.errors.push(`${message.text()} (${path})`)
  })
  page.on('response', response => { if (response.status() >= 500) seen.errors.push(`${response.status()} ${response.url()}`) })
  return seen
}

async function openPicker(page: Page) {
  await page.goto('/guest/register')
  await page.getByRole('button', { name: 'Choose catalog', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Choose starter catalog' })).toBeVisible()
}
async function panel(page: Page, name: string) {
  const button = page.getByRole('group', { name: 'Catalog panels' }).getByRole('button', { name, exact: true })
  if (await button.isVisible()) await button.click()
}
async function preview(page: Page, ids: string[]): Promise<CatalogClosure> {
  const response = await mutate(page.request, '/api/v1/registration/catalog-closure', { nodeIds: ids })
  expect(response.status()).toBe(200)
  return await response.json() as CatalogClosure
}
function copiedGraph(organization: string) {
  if (!/^[a-f0-9-]{36}$/.test(organization)) throw new Error('Invalid test organization')
  const query = `MATCH (n {organizationId:"${organization}"}) RETURN "NODE|" + n.sourceId AS value UNION ALL MATCH ()-[r {organizationId:"${organization}"}]->() RETURN "EDGE|" + r.sourceId AS value`
  const output = execFileSync('docker', ['exec', 'alg-starter-r3-neo4j-1', 'sh', '-c',
    `cypher-shell -u neo4j -p "\${NEO4J_AUTH#*/}" --format plain '${query}'`], { encoding: 'utf8' })
  const values = output.trim().split(/\r?\n/).slice(1).map(line => String(JSON.parse(line)))
  return { nodes: values.filter(v => v.startsWith('NODE|')).map(v => v.slice(5)).sort(),
    edges: values.filter(v => v.startsWith('EDGE|')).map(v => v.slice(5)).sort() }
}
async function finishRegistration(page: Page, ids: string[], width: number) {
  const email = `starter-r3-${randomUUID()}@example.test`
  await page.getByLabel('Business name', { exact: false }).fill(`Starter R3 ${width} ${randomUUID().slice(0, 6)}`)
  await page.getByRole('button', { name: 'Continue to account', exact: true }).click()
  await page.getByLabel('Full name', { exact: false }).fill('Starter Test Owner')
  await page.getByLabel('Login email', { exact: false }).fill(email)
  await page.getByLabel('Phone number', { exact: false }).fill('0901234567')
  await page.getByRole('checkbox', { name: /I agree/ }).check()
  await page.getByLabel(/^Password/).fill('Isolated starter test password!')
  await page.getByLabel(/^Confirm Password/).fill('Isolated starter test password!')
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/registration') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const registered = await response
  expect(registered.status()).toBe(201)
  expect(JSON.parse(registered.request().postData()!).catalogSelection.sort()).toEqual([...ids].sort())
  const saved = execFileSync('docker', ['exec', 'alg-starter-r3-postgres-1', 'psql', '-U', 'adapt_learn_graph', '-d', 'adapt_learn_graph', '-At', '-c',
    `SELECT coalesce((SELECT array_to_json(s.selected_node_ids)::text FROM platform.registration_catalog_selection s JOIN platform.organization_registration r USING (registration_id) JOIN platform.account a ON a.account_id=r.account_id WHERE a.normalized_identifier='${email}'),'[]')`], { encoding: 'utf8' })
  expect((JSON.parse(saved.trim()) as string[]).sort()).toEqual([...ids].sort())
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Registration complete', exact: true })).toBeVisible()
  await page.goto('/guest/plans')
  await page.getByRole('button', { name: 'Select Starter', exact: true }).click()
  await page.getByRole('dialog', { name: 'Confirm purchase terms' }).getByRole('button', { name: 'Create payment order', exact: true }).click()
  await expect(page.getByText('Development payment bypass', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Enter workspace', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: 'Enter workspace', exact: true }).click()
  await expect(page).toHaveURL(/\/workspace\/[a-z0-9-]+\/admin\/subscription$/, { timeout: 30_000 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Organization subscription', exact: true })).toBeVisible({ timeout: 30_000 })
  const identity = record(await (await page.request.get('/api/v1/workspace-auth/current')).json())
  return text(identity.organizationId)
}

for (const width of [1440, 390]) {
  test(`guided catalog prunes, locks prerequisites and copies exactly the preview (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const seen = watch(page)
    const writes: string[] = []
    page.on('request', request => { if (request.method() !== 'GET' && request.url().includes('/api/v1/organizations/')) writes.push(request.url()) })
    await openPicker(page)
    const catalog = await (await page.request.get('/api/v1/platform-catalog')).json() as PlatformCatalog
    expect(new Set(catalog.nodes.map(node => node.label))).toEqual(new Set(['JobPosition', 'TargetRole', 'Level', 'Competency', 'MicroSkill']))
    const job = catalog.nodes.find(node => node.label === 'JobPosition')!
    await page.getByRole('button', { name: `Explore ${job.name}`, exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Item type', exact: true })).toHaveValue('TargetRole')
    const roleId = catalog.edges.find(edge => edge.from === job.id && edge.type === 'HAS_ROLE')!.to
    const role = catalog.nodes.find(node => node.id === roleId)!
    const added = page.waitForResponse(r => r.url().endsWith('/registration/catalog-closure') && r.request().method() === 'POST')
    await page.getByRole('button', { name: `Add ${role.name}`, exact: true }).click()
    const initial = await (await added).json() as CatalogClosure
    expect(initial.nodeCount).toBeGreaterThan(5)
    await panel(page, 'Your catalog')
    await expect(page.getByTestId('catalog-closure-summary')).toContainText(`${initial.nodeCount} items`)
    const roleLevel = catalog.edges.find(e => e.from === role.id && e.type === 'HAS_LEVEL')!.to
    const compId = catalog.edges.find(e => e.from === roleLevel && e.type === 'HAS_COMPETENCY')!.to
    const comp = catalog.nodes.find(n => n.id === compId)!
    const pruned = page.waitForResponse(r => r.url().endsWith('/registration/catalog-closure') && r.request().method() === 'POST')
    await page.getByRole('button', { name: `Remove ${comp.name}`, exact: true }).click()
    let expected = await (await pruned).json() as CatalogClosure
    expect(expected.nodeIds).not.toContain(comp.id)
    expect(expected.nodeIds).toContain(role.id)
    await panel(page, 'Browse')
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
    await page.getByRole('combobox', { name: 'Item type', exact: true }).selectOption('MicroSkill')
    const prereqEdge = catalog.edges.find(e => e.type === 'HAS_SKILL_PREREQUISITE')!
    const dependent = catalog.nodes.find(n => n.id === prereqEdge.from)!
    const prerequisite = catalog.nodes.find(n => n.id === prereqEdge.to)!
    await page.getByRole('textbox', { name: 'Search catalog items' }).fill(dependent.code ?? dependent.name)
    if (!expected.nodeIds.includes(dependent.id)) {
      const withPrereq = page.waitForResponse(r => r.url().endsWith('/registration/catalog-closure') && r.request().method() === 'POST')
      await page.getByRole('button', { name: `Add ${dependent.name}`, exact: true }).click()
      expected = await (await withPrereq).json() as CatalogClosure
    }
    await panel(page, 'Your catalog')
    await expect(page.getByRole('button', { name: `Remove ${prerequisite.name}`, exact: true })).toBeDisabled()
    await panel(page, 'Graph')
    await expect(page.getByTestId('catalog-graph').locator('canvas')).toBeVisible()
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
    await page.getByRole('button', { name: 'Fit graph', exact: true }).click()
    await expect.poll(() => page.getByTestId('catalog-graph').locator('canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement
      const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
      let green = 0
      for (let i = 0; i < data.length; i += 4) if (data[i + 1] > data[i] * 1.3 && data[i + 1] > data[i + 2] * 1.3 && data[i + 3] > 100) green++
      return green
    }), { message: 'Graph draws actual skill nodes after mobile tab resize, not just an empty canvas' }).toBeGreaterThan(50)
    await page.screenshot({ path: test.info().outputPath(`catalog-graph-${width}.png`), animations: 'disabled' })
    await panel(page, 'Your catalog')
    await page.screenshot({ path: test.info().outputPath(`catalog-selection-${width}.png`) })
    await page.getByRole('button', { name: 'Apply catalog', exact: true }).click()
    await page.getByRole('button', { name: 'Edit catalog', exact: true }).click()
    await panel(page, 'Your catalog')
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect(await preview(page, expected.selected)).toEqual(expected)
    const organization = await finishRegistration(page, expected.selected, width)
    expect(copiedGraph(organization)).toEqual({ nodes: [...expected.nodeIds].sort(), edges: expected.edges.map(edge => edge.id).sort() })
    await page.screenshot({ path: test.info().outputPath(`workspace-ready-${width}.png`), fullPage: true })
    expect(writes).toEqual([])
    expect(seen.errors).toEqual([])
    expect(seen.network).toEqual([])
  })
}

test('empty catalog, invalid module roots and missing CSRF remain explicit', async ({ page }) => {
  await openPicker(page)
  expect((await page.request.post('/api/v1/registration/catalog-closure', { data: { nodeIds: [] } })).status()).toBe(403)
  const invalid = await mutate(page.request, '/api/v1/registration/catalog-closure', { nodeIds: ['MOD-A'] })
  expect(invalid.status()).toBe(400)
  expect(record(await invalid.json()).field).toBe('catalogSelection')
  await page.getByRole('button', { name: 'Apply catalog', exact: true }).click()
  const organization = await finishRegistration(page, [], 0)
  expect(copiedGraph(organization)).toEqual({ nodes: [], edges: [] })
})

test('browser-only failure/loading fixtures preserve draft, retry and keyboard close at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.route('**/api/v1/platform-catalog', async route => route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Injected catalog failure' } }))
  await page.goto('/guest/register')
  await page.getByRole('button', { name: 'Choose catalog', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The platform catalog is unavailable')
  await page.unroute('**/api/v1/platform-catalog')
  await page.getByRole('button', { name: 'Retry catalog', exact: true }).click()
  const job = page.getByRole('list', { name: 'Platform catalog items' }).getByRole('button', { name: /^Add / }).first()
  let release: (() => void) | undefined
  await page.route('**/api/v1/registration/catalog-closure', async route => {
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE', message: 'Injected preview failure' } })
  })
  await job.click()
  await expect(page.getByRole('button', { name: 'Apply catalog', exact: true })).toBeDisabled()
  await expect.poll(() => !!release).toBe(true)
  release!()
  await panel(page, 'Your catalog')
  await expect(page.getByText(/Could not preview this selection/)).toBeVisible()
  await page.unroute('**/api/v1/registration/catalog-closure')
  await page.getByRole('button', { name: 'Retry preview', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Apply catalog', exact: true })).toBeEnabled()
  const overflow = await page.getByRole('dialog').evaluate(element => element.scrollWidth > element.clientWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: test.info().outputPath('catalog-mobile-375.png') })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose catalog', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'VI', exact: true }).click()
  await page.getByRole('button', { name: 'Chọn catalog', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Chọn catalog khởi tạo' })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.getByRole('button', { name: 'Graph', exact: true }).click()
  await page.screenshot({ path: test.info().outputPath('catalog-mobile-vi-dark.png'), animations: 'disabled' })
})

test('Expert Explore Graph still renders the shared node appearance without Guest mutations', async ({ page }) => {
  const seen = watch(page)
  const password = process.env.WORKSPACE_DEVELOPMENT_PASSWORD
  if (!password) throw new Error('Provide the isolated development fixture password through the test environment.')
  const signedIn = await mutate(page.request, '/api/v1/workspace-auth/sign-in', { email: 'expert@workspace.dev.invalid', password })
  expect(signedIn.ok()).toBe(true)
  await page.goto('/expert/ontology')
  await page.getByRole('tab', { name: /Explore Graph/ }).click()
  await expect(page.getByText('Interactive Ontology Playground', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Palette \([1-9]\d*\)/ })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Quick Sample', exact: true }).click()
  await expect(page.getByText(/[1-9]\d* nodes on canvas/)).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('expert-graph-shared-appearance.png') })
  expect(seen.errors).toEqual([])
  expect(seen.network).toEqual([])
})
