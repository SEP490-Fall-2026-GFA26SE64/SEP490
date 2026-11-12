import { test, expect, type Page } from '@playwright/test'
import type { BankSession, BankView, BankContent } from '../src/shared/api/questionBankApi'
async function fixture(page: Page) {
  const writes: { content: BankContent }[] = [], errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const bank: BankView = { id: 'bank', name: 'Fixture bank', questions: [], history: [] }
  const session: BankSession = { actor: { id: 'expert', organization: 'org', role: 'DOMAIN_EXPERT' }, skills: [{ id: 'skill', name: 'Cypher' }], experts: [], people: [], knowledge: [{ skillId: 'skill', knowledgeLevel: 'FOUNDATION', outcomes: [] }], maxImportRows: 500, maxImportBytes: 10485760 }
  await page.addInitScript(() => localStorage.setItem('app_language', 'en'))
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/workspace-auth/current')) return route.fulfill({ json: { accountId: 'expert', organizationId: 'org', email: 'expert@example.test', fullName: 'Expert', roles: ['DOMAIN_EXPERT'], stage: 'COMPLETE', workspaceReady: true, workspaceSlug: 'question-test' } })
    if (path.endsWith('/csrf')) return route.fulfill({ json: { headerName: 'X-CSRF-TOKEN', token: 'test-only' } })
    if (path.endsWith('/subscription/access')) return route.fulfill({ json: {} })
    if (path.endsWith('/question-bank/session')) return route.fulfill({ json: session })
    if (path.endsWith('/question-bank/notifications')) return route.fulfill({ json: [] })
    if (path.endsWith('/question-bank/questions')) { writes.push(route.request().postDataJSON()); return route.fulfill({ json: bank }) }
    if (path.endsWith('/question-bank')) return route.fulfill({ json: bank })
    return route.fulfill({ status: 404, json: { message: 'Outside isolated question fixture' } })
  })
  return { writes, errors }
}
for (const width of [1440, 1024, 390]) test(`Long question fields and fixed answer labels at ${width}`, async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width, height: 950 })
  const state = await fixture(page)
  await page.goto('/workspace/question-test/expert/assessment-bank')
  await page.getByRole('button', { name: 'Create question', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('MicroSkill', { exact: true }).selectOption('skill')
  const prompt = dialog.getByLabel('Question prompt', { exact: true })
  const explanation = dialog.getByLabel('Answer explanation', { exact: true })
  await prompt.fill('Short question')
  const shortHeight = (await prompt.boundingBox())!.height
  let longPrompt = 'Which query preserves the intended graph relationships?\n'.repeat(24) + 'UNBROKEN_' + 'Z'.repeat(250)
  const answer = 'MATCH keeps relationships explicit.\n'.repeat(18) + 'A'.repeat(300)
  const reason = 'Apply the condition and remove duplicates.\n'.repeat(24) + 'R'.repeat(250)
  await prompt.fill(longPrompt)
  await expect.poll(async () => (await prompt.boundingBox())!.height).toBeGreaterThan(shortHeight)
  await dialog.getByLabel('Option A', { exact: true }).fill(answer)
  await dialog.getByLabel('Option B', { exact: true }).fill('Second answer\nSecond line')
  await dialog.getByLabel('Option C', { exact: true }).fill('Third answer')
  await dialog.getByLabel('Option D', { exact: true }).fill('Fourth answer')
  await explanation.fill(reason)
  await dialog.getByLabel('Correct answer A', { exact: true }).click()
  for (const field of [prompt, explanation, dialog.getByLabel('Option A', { exact: true })]) {
    const size = await field.evaluate((node: HTMLTextAreaElement) => ({ height: node.getBoundingClientRect().height, cap: parseFloat(getComputedStyle(node).maxHeight), noHorizontalOverflow: node.scrollWidth <= node.clientWidth, verticalScroll: node.scrollHeight > node.clientHeight, resize: getComputedStyle(node).resize }))
    expect(size.height).toBeLessThanOrEqual(size.cap + 1)
    expect(size.noHorizontalOverflow).toBe(true)
    expect(size.verticalScroll).toBe(true)
    expect(size.resize).toBe('none')
  }
  await prompt.evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(node.value.length, node.value.length); node.scrollTop = node.scrollHeight })
  await prompt.press('q'); longPrompt += 'q'
  await expect.poll(() => prompt.evaluate(node => node.scrollTop)).toBeGreaterThan(0)
  if (width < 1024) await dialog.getByRole('button', { name: 'Live preview', exact: true }).click()
  const preview = dialog.getByRole('complementary', { name: 'Question preview', exact: true })
  const scroller = preview.getByRole('region', { name: 'Scrollable question preview', exact: true })
  const rows = preview.getByRole('list', { name: 'Answer choices' }).getByRole('listitem')
  await expect(rows).toHaveCount(4)
  const badge = rows.first().getByText('A', { exact: true })
  await badge.scrollIntoViewIfNeeded()
  const label = await badge.boundingBox(), row = await rows.first().boundingBox()
  const badgeSize = await page.evaluate(() => 1.75 * parseFloat(getComputedStyle(document.documentElement).fontSize))
  expect(label!.width).toBe(badgeSize); expect(label!.height).toBe(badgeSize)
  expect(row!.height).toBeGreaterThan(label!.height)
  expect(Math.abs(label!.y - row!.y - 13)).toBeLessThanOrEqual(1)
  expect(await rows.first().textContent()).toContain(answer)
  expect(await preview.textContent()).toContain(longPrompt)
  expect(await preview.textContent()).toContain(reason)
  expect(await scroller.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await scroller.evaluate(el => { el.scrollTop = 0 })
  await scroller.focus(); await scroller.press('End')
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await scroller.press('Home')
  await prompt.focus()
  const leftClearance = await prompt.evaluate(node => {
    let parent = node.parentElement
    while (parent && !['auto', 'scroll'].includes(getComputedStyle(parent).overflowY)) parent = parent.parentElement
    return parent ? node.getBoundingClientRect().left - parent.getBoundingClientRect().left : 0
  })
  expect(leftClearance).toBeGreaterThanOrEqual(4)
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  const save = dialog.getByRole('button', { name: 'Save draft', exact: true })
  const saveBounds = await save.boundingBox()
  expect(saveBounds!.y + saveBounds!.height).toBeLessThanOrEqual(950)
  if (width === 1440) { await badge.scrollIntoViewIfNeeded(); await page.screenshot({ path: '/tmp/question-long-content-1440.png' }) }
  await save.click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].content).toMatchObject({ prompt: longPrompt, options: [answer, 'Second answer\nSecond line', 'Third answer', 'Fourth answer'], explanation: reason, correctAnswer: 0, skillId: 'skill', knowledgeLevel: null })
  expect(state.errors).toEqual([])
})
