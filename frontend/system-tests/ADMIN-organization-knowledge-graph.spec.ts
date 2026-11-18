import { expect, test, type Page } from '@playwright/test'
import { waitForWorkspaceEntry } from './subscriptionHelpers'

/**
 * Organization Administrator views the organization knowledge graph at /admin/knowledge-graph (read-only canvas, real API).
 * Runs against a Compose development stack on 8088:
 *   npm run test:system:f02 -- ADMIN-organization-knowledge-graph
 */
const shots = 'test-results/ADMIN-organization-knowledge-graph'
const LABELS = ['JobPosition', 'TargetRole', 'Level', 'Competency', 'MicroSkill', 'LearningModule', 'Certificate']
type Graph = { nodes: { id: string; label: string; name: string }[]; edges: { from: string; to: string; type: string }[] }

async function login(page: Page, email: string) {
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/login')
  await page.getByPlaceholder('Enter your email').fill(email)
  await page.locator('input[type="password"]').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await waitForWorkspaceEntry(page)
  await expect(page.getByRole('button', { name: 'User actions menu', exact: true })).toBeVisible({ timeout: 30_000 })
}

function watch(page: Page) {
  const problems: string[] = []
  page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`) })
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('response', response => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`)
  })
  return problems
}

async function openGraph(page: Page) {
  const graphResponse = page.waitForResponse(response => /\/api\/v1\/organizations\/[^/]+\/knowledge-graph$/.test(new URL(response.url()).pathname))
  await page.goto('/admin/knowledge-graph')
  const response = await graphResponse
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const graph = await response.json() as Graph
  await expect(page.getByRole('application', { name: /Organization knowledge graph/ }).locator('canvas')).toBeVisible({ timeout: 30_000 })
  return { graph, organizationId: new URL(response.url()).pathname.split('/')[4] }
}

async function focusSingleJobPosition(page: Page, name: string) {
  const filters = page.getByRole('complementary', { name: 'Knowledge graph filters' })
  await filters.getByRole('combobox', { name: /^Job position/ }).selectOption({ label: name })
  await filters.getByLabel('Node type').selectOption('JobPosition')
  await expect(page.getByTestId('knowledge-graph-summary')).toHaveText(/^1 of \d+ nodes shown$/)
  await page.getByRole('button', { name: 'Fit graph' }).click()
  await page.waitForTimeout(800)
  const box = (await page.getByTestId('catalog-graph').boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe.configure({ mode: 'serial' })

test('organization administrator explores the real organization knowledge graph on desktop', async ({ page }) => {
  test.setTimeout(150_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await login(page, 'admin@technova.com')
  const problems = watch(page)
  const { graph } = await openGraph(page)

  const present = new Set(graph.nodes.map(node => node.label))
  expect(LABELS.filter(label => present.has(label))).toEqual(LABELS)
  expect(graph.edges.some(edge => edge.type === 'HAS_SKILL_PREREQUISITE')).toBe(true)
  await expect(page.getByText('Competency Graph Engine Connected')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Knowledge graph', level: 1 })).toBeVisible()
  await expect(page.getByTestId('knowledge-graph-summary')).toHaveText(`${graph.nodes.length} of ${graph.nodes.length} nodes shown`)
  const legend = page.getByRole('list', { name: 'Graph node types' })
  for (const text of ['Job position', 'Target role', 'Level', 'Competency', 'Micro-skill', 'Learning module', 'Certificate', 'Prerequisite'])
    await expect(legend.getByText(text, { exact: true })).toBeVisible()
  for (const control of ['Zoom in', 'Zoom out', 'Fit graph', 'Re-arrange layout', 'Fullscreen graph'])
    await expect(page.getByRole('button', { name: control })).toBeVisible()
  await page.screenshot({ path: `${shots}/desktop-overview.png`, fullPage: true })

  const filters = page.getByRole('complementary', { name: 'Knowledge graph filters' })
  const skill = graph.nodes.find(node => node.label === 'MicroSkill')!
  await filters.getByPlaceholder('Name or code').fill(skill.name)
  await expect(page.getByTestId('knowledge-graph-summary')).toHaveText(/^\d+ highlighted of \d+ nodes shown$/)
  await filters.getByLabel('Learning modules').uncheck()
  await filters.getByLabel('Certificates').uncheck()
  await filters.getByLabel('Competencies').uncheck()
  await page.screenshot({ path: `${shots}/desktop-search-layers.png`, fullPage: true })
  await filters.getByRole('button', { name: 'Clear filters' }).click()
  await expect(filters.getByLabel('Learning modules')).toBeChecked()

  const job = graph.nodes.find(node => node.label === 'JobPosition' && graph.edges.some(edge => edge.from === node.id && edge.type === 'HAS_ROLE'))!
  const center = await focusSingleJobPosition(page, job.name)
  await page.mouse.click(center.x, center.y)
  const details = page.getByTestId('knowledge-graph-details')
  await expect(details.getByRole('heading', { name: job.name })).toBeVisible()
  await expect(details.getByText('Target roles:')).toBeVisible()
  await details.getByRole('button', { name: 'Explore branch' }).click()
  await expect(filters.getByLabel('Node type')).toHaveValue('TargetRole')
  await expect(page.getByTestId('knowledge-graph-summary')).not.toHaveText(/^1 of/)
  await page.screenshot({ path: `${shots}/desktop-explore-branch.png`, fullPage: true })

  expect(problems).toEqual([])
})

test('organization administrator views the knowledge graph on mobile', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'admin@technova.com')
  const problems = watch(page)
  await openGraph(page)
  await expect(page.getByRole('complementary', { name: 'Knowledge graph filters' })).toBeHidden()
  await page.screenshot({ path: `${shots}/mobile-graph.png`, fullPage: true })
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Knowledge graph filters' })).toBeVisible()
  await expect(page.getByTestId('catalog-graph')).toBeHidden()
  await page.screenshot({ path: `${shots}/mobile-filters.png`, fullPage: true })
  await page.getByRole('button', { name: 'Graph', exact: true }).click()
  await expect(page.getByTestId('catalog-graph')).toBeVisible()
  expect(problems).toEqual([])
})

test('non-administrators cannot read the organization knowledge graph', async ({ page }) => {
  test.setTimeout(120_000)
  await login(page, 'admin@technova.com')
  const { organizationId } = await openGraph(page)
  await page.request.post('/api/v1/workspace-auth/logout').catch(() => undefined)
  await page.context().clearCookies()
  await login(page, 'manager@technova.com')
  const denied = await page.request.get(`/api/v1/organizations/${organizationId}/knowledge-graph`)
  expect(denied.status()).toBe(403)
  const other = await page.request.get('/api/v1/organizations/00000000-0000-0000-0000-00000000dead/knowledge-graph')
  expect(other.status()).toBe(403)
})
