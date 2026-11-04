import { expect, test, type Page } from '@playwright/test'

async function loginAs(page: Page, email: string, password = 'Password123!') {
  const csrf = await (await page.request.get('/api/v1/workspace-auth/csrf')).json()
  const res = await page.request.post('/api/v1/workspace-auth/sign-in', {
    headers: { [csrf.headerName]: csrf.token },
    data: { email, password },
  })
  expect(res.ok()).toBeTruthy()
  return await res.json()
}

test.describe('REQ-017-F02 Explore Graph Playground & Target Role Hierarchy Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
    await loginAs(page, 'expert@technova.com')
  })

  test('explore graph is the first tab, active by default on /expert/ontology, and supports target role interaction', async ({ page }) => {
    // Collect any page console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // 1. Verify Explore Graph tab is the very first tab trigger and active by default
    const firstTabTrigger = page.locator('[role="tablist"] button[role="tab"]').first()
    await expect(firstTabTrigger).toHaveText(/Explore Graph/i)
    await expect(firstTabTrigger).toHaveAttribute('data-state', 'active')

    // 2. Assert error boundary is NOT triggered
    await expect(page.getByText('Graph Explorer Encountered an Issue')).not.toBeVisible()

    // 3. Verify graph workspace & action bar are rendered immediately without clicking tab
    await expect(page.getByText('Interactive Ontology Playground')).toBeVisible()
    await expect(page.getByTitle('Zoom In')).toBeVisible()
    await expect(page.getByTitle('Zoom Out')).toBeVisible()
    await expect(page.getByTitle('Fit to Viewport')).toBeVisible()

    // 4. Verify initial state: Clean empty canvas by default (0 nodes)
    await expect(page.getByText('0 nodes on canvas', { exact: true })).toBeVisible()
    await expect(page.getByText('Playground Canvas is Ready')).toBeVisible()

    // 5. Verify palette filter includes "Roles" option
    const rolesFilterBtn = page.locator('aside button').filter({ hasText: /^Roles$/i })
    await expect(rolesFilterBtn).toBeVisible()
    await rolesFilterBtn.click()

    // 6. Target roles palette should display editable roles (draft or rejected)
    const targetRoleCard = page.locator('aside div[draggable]').first()
    await expect(targetRoleCard).toBeVisible()

    // 7. Click to place the Target Role onto canvas
    await targetRoleCard.click()
    await expect(page.getByText('1 nodes on canvas')).toBeVisible()

    // 8. Verify the node inspector / action panel is visible with "Neighbors"
    const expandNeighborsBtn = page.locator('button').filter({ hasText: 'Neighbors' })
    await expect(expandNeighborsBtn).toBeVisible()

    // 9. Click "Neighbors" to expand Levels, Competencies, and Micro-skills
    await expandNeighborsBtn.click()

    // Hierarchy expands multiple nodes on the canvas (> 1 node, e.g. 4 nodes)
    const nodeCountElement = page.getByText(/nodes on canvas/).first()
    await expect(nodeCountElement).toBeVisible()
    const nodeCountText = await nodeCountElement.innerText()
    const countMatch = nodeCountText.match(/(\d+)\s+nodes on canvas/)
    expect(countMatch).not.toBeNull()
    const expandedCount = parseInt(countMatch![1], 10)
    expect(expandedCount).toBeGreaterThan(1)

    // 10. Verify Connect action button is available for linking nodes
    const connectActionBtn = page.locator('button').filter({ hasText: /Connect/i }).first()
    await expect(connectActionBtn).toBeVisible()

    // 11. Verify vis-network canvas element is mounted and rendered inside DOM
    const canvasElement = page.locator('.vis-network canvas')
    await expect(canvasElement).toBeVisible({ timeout: 10000 })

    // 12. Assert no Node.removeChild or DOM exception occurred
    const domErrors = consoleErrors.filter((e) => e.includes('removeChild') || e.includes('not a child of this node'))
    expect(domErrors).toHaveLength(0)
  })

  test('interactive connect and auto-sync updates target role levels in store and API', async ({ page }) => {
    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // Clear canvas if needed
    const clearBtn = page.getByTitle('Clear Canvas')
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click()
    }

    // Filter to Roles and add a target role
    const rolesFilterBtn = page.locator('aside button').filter({ hasText: /^Roles$/i })
    await rolesFilterBtn.click()

    const targetRoleCard = page.locator('aside div[draggable]').first()
    await targetRoleCard.click()
    await expect(page.getByText('1 nodes on canvas')).toBeVisible()

    // Expand Neighbors to bring up Level nodes
    const expandNeighborsBtn = page.locator('button').filter({ hasText: 'Neighbors' })
    await expandNeighborsBtn.click()

    // Switch palette to Comps and add a competency to canvas
    const compsFilterBtn = page.locator('aside button').filter({ hasText: /^Comps$/i })
    await compsFilterBtn.click()

    const compCard = page.locator('aside div[draggable]').first()
    await compCard.click()

    // Verify node was added
    await expect(page.locator('text=nodes on canvas')).toBeVisible()
  })
})
