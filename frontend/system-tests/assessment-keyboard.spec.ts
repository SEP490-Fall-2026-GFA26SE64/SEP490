import { expect, test } from '@playwright/test'

// Browser/component evidence only. API commands are supplied by the isolated fixture.
for (const purpose of ['BASELINE', 'SKILL_ASSESSMENT']) {
  for (const language of ['en', 'vi']) {
    test(`${purpose} ${language}: numeric answers, acknowledged navigation, explicit submission`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route(url => url.pathname.startsWith('/api/'), route => route.abort())
      await page.addInitScript(lang => localStorage.setItem('app_language', lang), language)
      await page.goto(`/system-tests/support/assessment-keyboard.html?purpose=${purpose}`)
      await expect(page.getByText('Question fixture 1', { exact: true })).toBeVisible()
      await page.keyboard.press('2')
      await expect(page.getByRole('radio', { name: 'Option b' })).toBeChecked()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
      await expect(page.getByText('Question fixture 2', { exact: true })).toBeVisible()
      const firstCommands = JSON.parse(await page.getByTestId('commands').textContent() ?? '[]')
      expect(firstCommands).toHaveLength(1)
      expect(JSON.parse(firstCommands[0].body)).toMatchObject({ position: 1, selectedOptionId: 'b' })
      await page.keyboard.press('1')
      await expect(page.getByRole('radio', { name: 'Option a' })).toBeChecked()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(page.getByTestId('commands')).not.toContainText('/submit')
      await page.keyboard.press('4')
      await expect(dialog).toBeVisible()
      await dialog.getByRole('button', { name: language === 'vi' ? 'Xác nhận nộp' : 'Confirm submission', exact: true }).click()
      await expect(page.getByText('Explicit submission accepted')).toBeVisible()
      const commands = JSON.parse(await page.getByTestId('commands').textContent() ?? '[]')
      expect(commands).toHaveLength(3)
      expect(commands.map((command: { path: string }) => command.path.split('/').at(-1))).toEqual(['answers', 'answers', 'submit'])
      expect(errors).toEqual([])
    })
  }
}

test('mobile: failed save retains answer and question, retry advances once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route(url => url.pathname.startsWith('/api/'), route => route.abort())
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.goto('/system-tests/support/assessment-keyboard.html?fail=1')
  await expect(page.getByText('Question fixture 1', { exact: true })).toBeVisible()
  await page.keyboard.press('3'); await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Simulated save failure')
  await expect(page.getByText('Question fixture 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Option c' })).toBeChecked()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Question fixture 2', { exact: true })).toBeVisible()
  expect(JSON.parse(await page.getByTestId('commands').textContent() ?? '[]')).toHaveLength(2)
  // Hide the instrumentation before the layout/screenshot check.
  await page.getByTestId('commands').evaluate(element => { element.style.display = 'none' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('mobile-keyboard.png'), fullPage: true })
})
