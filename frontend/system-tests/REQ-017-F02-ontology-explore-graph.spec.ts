import { expect, test } from '@playwright/test'

test.describe('REQ-017-F02 Explore Graph Playground Verification', () => {
  test('explore graph initializes with clean empty canvas, supports on-demand loading, palette interaction, and clear', async ({ page }) => {
    // Collect any page console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/expert/ontology')
    await expect(page.locator('main')).toBeVisible()

    // 1. Locate and click the "Explore Graph" tab
    const exploreGraphTab = page.locator('button').filter({ hasText: 'Explore Graph' })
    await expect(exploreGraphTab).toBeVisible()
    await exploreGraphTab.click()

    // 2. Assert error boundary is NOT triggered
    await expect(page.getByText('Graph Explorer Encountered an Issue')).not.toBeVisible()

    // 3. Verify graph workspace & action bar are rendered
    await expect(page.getByText('Interactive Ontology Playground')).toBeVisible()
    await expect(page.getByTitle('Zoom In')).toBeVisible()
    await expect(page.getByTitle('Zoom Out')).toBeVisible()
    await expect(page.getByTitle('Fit to Viewport')).toBeVisible()

    // 4. Verify initial state: Clean empty canvas by default (0 nodes)
    await expect(page.getByText('0 nodes on canvas', { exact: true })).toBeVisible()
    await expect(page.getByText('Playground Canvas is Ready')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quick Sample (5 Competencies)' })).toBeVisible()

    // 5. Verify palette sidebar is visible with search
    const searchInput = page.getByPlaceholder('Search code or name...')
    await expect(searchInput).toBeVisible()

    // 6. Test Quick Sample loading
    const quickSampleBtn = page.getByRole('button', { name: 'Quick Sample (5 Competencies)' })
    await quickSampleBtn.click()

    // Canvas should now have nodes and the drag hint overlay is hidden
    await expect(page.getByText('0 nodes on canvas', { exact: true })).not.toBeVisible()
    await expect(page.getByText('nodes on canvas')).toBeVisible()
    await expect(page.getByText('Playground Canvas is Ready')).not.toBeVisible()

    // 7. Verify Clear Canvas button resets to 0 nodes
    const clearBtn = page.getByTitle('Clear Canvas')
    await clearBtn.click()
    await expect(page.getByText('0 nodes on canvas', { exact: true })).toBeVisible()
    await expect(page.getByText('Playground Canvas is Ready')).toBeVisible()

    // 8. Test adding a node from palette
    await searchInput.fill('MS-CORE01')
    const paletteCard = page.locator('aside div[draggable]').first()
    await expect(paletteCard).toBeVisible()
    await paletteCard.click()

    // Node added to canvas
    await expect(page.getByText('1 nodes on canvas')).toBeVisible()

    // 9. Verify vis-network canvas element is mounted and rendered inside DOM
    const canvasElement = page.locator('.vis-network canvas')
    await expect(canvasElement).toBeVisible({ timeout: 10000 })

    // 10. Assert no Node.removeChild or DOM exception occurred
    const domErrors = consoleErrors.filter((e) => e.includes('removeChild') || e.includes('not a child of this node'))
    expect(domErrors).toHaveLength(0)
  })
})
