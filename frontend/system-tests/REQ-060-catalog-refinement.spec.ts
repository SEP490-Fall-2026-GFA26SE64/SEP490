import { expect, test } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

test.setTimeout(120_000)
for (const width of [1440, 390]) {
  test(`catalog graph and organized selection at ${width}px`, async ({ page, baseURL }, testInfo) => {
    expect(baseURL).toBe('http://127.0.0.1:8096')
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/guest/register')
    await page.getByRole('button', { name: 'Choose catalog', exact: true }).click()
    await page.getByRole('button', { name: 'Add Software Developers', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Apply catalog', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
    await expect(page.getByText('748 matching items', { exact: true })).toBeVisible()
    const panels = page.getByRole('group', { name: 'Catalog panels' })
    if (width < 1024) await panels.getByRole('button', { name: 'Your catalog', exact: true }).click()
    const selection = page.getByRole('list', { name: 'Selected catalog items', exact: true })
    await expect(selection.locator('details')).toHaveCount(5)
    const first = selection.locator('summary').first()
    await first.click()
    await expect(selection.locator('details').first()).not.toHaveAttribute('open')
    await first.click()
    await expect(selection.getByRole('button', { name: /^Remove / }).first()).toBeVisible()
    if (width < 1024) await panels.getByRole('button', { name: 'Graph', exact: true }).click()
    await expect(page.getByLabel('Graph node types')).toBeVisible()
    await page.getByRole('button', { name: 'Fit graph', exact: true }).click()
    const graph = page.getByTestId('catalog-graph')
    const box = (await graph.boundingBox())!
    await page.waitForTimeout(1000)
    await page.evaluate(() => {
      const state = { times: [] as number[], active: true }
      Object.assign(window, { catalogFrames: state })
      let previous = performance.now()
      function frame(now: number) {
        state.times.push(now - previous)
        previous = now
        if (state.active) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65)
    await page.mouse.down()
    for (let i = 0; i < 80; i++) {
      await page.mouse.move(box.x + box.width * (0.6 + Math.sin(i / 10) * 0.15), box.y + box.height * 0.65)
      await page.waitForTimeout(16)
    }
    await page.mouse.up()
    const metrics = await page.evaluate(() => {
      const state = (window as Window & { catalogFrames?: { times: number[], active: boolean } }).catalogFrames!
      state.active = false
      const sorted = state.times.slice(2).sort((a, b) => a - b)
      return { samples: sorted.length, p95: sorted[Math.floor(sorted.length * 0.95)] }
    })
    await testInfo.attach('mouse-frame-timings', { body: JSON.stringify(metrics), contentType: 'application/json' })
    await writeFile(testInfo.outputPath('mouse-frame-timings.json'), JSON.stringify(metrics))
    expect(metrics.samples).toBeGreaterThan(30)
    expect(metrics.p95).toBeLessThanOrEqual(33)
    await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`) })
    expect(errors).toEqual([])
    await page.getByRole('button', { name: 'Apply catalog', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Edit catalog', exact: true })).toBeVisible()
  })
}
